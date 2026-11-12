import test from "node:test";
import assert from "node:assert/strict";
import {
  call,
  cookieValue,
  fakePng,
  fakePdf,
  login,
  makeHandler,
  memoryStore,
  sampleContent,
} from "./helpers.mjs";
import { createMediaHandler } from "../netlify/functions/media.mjs";
import { INDEX_KEY } from "../netlify/lib/media-store.mjs";

async function signedIn(store) {
  const handler = makeHandler(store);
  const response = await login(handler);
  const cookie = cookieValue(response);
  const body = await response.json();
  return { handler, cookie, csrfToken: body.csrfToken };
}

async function upload(handler, cookie, csrfToken, uploadFields = {}) {
  const form = new FormData();
  const full = uploadFields.full ?? fakePng(64);
  const thumb = uploadFields.thumb ?? fakePng(48);
  form.set("full", new Blob([full]), "photo.png");
  form.set("thumb", new Blob([thumb]), "photo-thumb.png");
  form.set("filename", uploadFields.filename ?? "photo.png");
  form.set("alt", uploadFields.alt ?? "A test image");
  form.set("width", String(uploadFields.width ?? 1200));
  form.set("height", String(uploadFields.height ?? 800));

  const headers = new Headers({
    "x-forwarded-host": "portfolio.test",
    "x-forwarded-proto": "https",
    "x-csrf-token": csrfToken,
  });
  if (cookie) headers.set("cookie", `admin_session=${cookie}`);

  return handler(
    new Request("https://portfolio.test/api/media", {
      method: "POST",
      headers,
      body: form,
    }),
  );
}

test("media uploads require a session and a multipart body", async () => {
  const handler = makeHandler(memoryStore());

  const anonymous = await upload(handler, null, null);
  assert.equal(anonymous.status, 401);

  const { handler: authed, cookie, csrfToken } = await signedIn(memoryStore());
  const json = await call(authed, "POST", "/api/media", {
    cookie,
    headers: { "x-csrf-token": csrfToken },
    body: { filename: "photo.png" },
  });
  assert.equal(json.status, 415);
});

test("media uploads validate the image bytes", async () => {
  const { handler, cookie, csrfToken } = await signedIn(memoryStore());

  const bad = await upload(handler, cookie, csrfToken, {
    full: new Blob([new Uint8Array([1, 2, 3])]),
    thumb: new Blob([new Uint8Array([4, 5, 6])]),
  });
  assert.equal(bad.status, 415);
});

test("uploading an image stores both sizes and deduplicates by hash", async () => {
  const { handler, cookie, csrfToken } = await signedIn(memoryStore());

  const first = await upload(handler, cookie, csrfToken);
  assert.equal(first.status, 201);
  const firstBody = await first.json();
  assert.ok(firstBody.item.key.endsWith(".png") || firstBody.item.key.endsWith(".webp"));

  const again = await upload(handler, cookie, csrfToken);
  assert.equal(again.status, 200);
  assert.equal((await again.json()).existing, true);
});

test("referenced images cannot be deleted, unused ones can", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await signedIn(store);

  const uploaded = await upload(handler, cookie, csrfToken);
  assert.equal(uploaded.status, 201);
  const first = await uploaded.json();

  const contentWithImage = sampleContent({});
  contentWithImage.projects[0].cover = "/" + first.item.key;

  await call(handler, "PUT", "/api/content", {
    cookie,
    headers: { "x-csrf-token": csrfToken, "content-type": "application/json" },
    body: { content: contentWithImage, baseVersion: 0 },
  });

  const blocked = await call(handler, "DELETE", `/api/media/${first.item.id}`, {
    cookie,
    headers: { "x-csrf-token": csrfToken },
  });
  assert.equal(blocked.status, 409);
  assert.match((await blocked.json()).error, /still used/);
  assert.ok(store.values.has(first.item.key));

  const unused = await upload(handler, cookie, csrfToken, {
    filename: "unused.png",
    full: fakePng(128),
    thumb: fakePng(64),
  });
  assert.equal(unused.status, 201);
  const second = await (unused.json());

  const removed = await call(handler, "DELETE", `/api/media/${second.item.id}`, {
    cookie,
    headers: { "x-csrf-token": csrfToken },
  });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).ok, true);
  assert.equal(store.values.has(second.item.key), false);
  assert.equal(store.values.has(second.item.thumbKey), false);

  const index = store.values.get(INDEX_KEY);
  assert.equal(index.items.length, 1);
  assert.equal(index.items[0].id, first.item.id);

  const missing = await call(handler, "DELETE", "/api/media/deadbeef", {
    cookie,
    headers: { "x-csrf-token": csrfToken },
  });
  assert.equal(missing.status, 404);
});

test("media delivery serves immutable bytes and rejects bad keys", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await signedIn(store);
  const uploaded = await (await upload(handler, cookie, csrfToken)).json();

  const media = createMediaHandler({ store });
  const path = uploaded.item.key.replace(/^media\//, "/media/");

  const response = await media(
    new Request(`https://portfolio.test${path}`, { method: "GET" }),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.match(response.headers.get("cache-control"), /immutable/);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes[0], 0x89);
  assert.equal(bytes.length, 64);

  const head = await media(
    new Request(`https://portfolio.test${path}`, { method: "HEAD" }),
  );
  assert.equal(head.status, 200);
  assert.equal((await head.arrayBuffer()).byteLength, 0);

  const etag = response.headers.get("etag");
  const cached = await media(
    new Request(`https://portfolio.test${path}`, {
      headers: { "if-none-match": etag },
    }),
  );
  assert.equal(cached.status, 304);

  const traversal = await media(
    new Request("https://portfolio.test/media/..%2Fcontent.json"),
  );
  assert.equal(traversal.status, 404);

  const post = await media(
    new Request(`https://portfolio.test${path}`, { method: "POST" }),
  );
  assert.equal(post.status, 405);

  const missing = await media(
    new Request("https://portfolio.test/media/0123456789abcdef0123456789abcdef.png"),
  );
  assert.equal(missing.status, 404);
});

test("CV upload stores a PDF and serves it with correct content type", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await signedIn(store);

  const csrfResponse = await call(handler, "GET", "/api/csrf", { cookie });
  const csrfBody = await csrfResponse.json();
  const tokenFromEndpoint = csrfBody.csrfToken;

  const form = new FormData();
  form.set("file", new Blob([fakePdf(64)]), "my-cv.pdf");
  form.set("filename", "my-cv.pdf");

  const headers = new Headers({
    "x-forwarded-host": "portfolio.test",
    "x-forwarded-proto": "https",
    "x-csrf-token": tokenFromEndpoint || csrfToken,
  });
  if (cookie) headers.set("cookie", `admin_session=${cookie}`);

  const response = await handler(
    new Request("https://portfolio.test/api/cv", {
      method: "POST",
      headers,
      body: form,
    }),
  );
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.ok(body.item.key.endsWith(".pdf"));
  assert.equal(body.item.filename, "my-cv.pdf");
  assert.equal(body.item.size, 64);

  const media = createMediaHandler({ store });
  const path = "/" + body.item.key;
  const served = await media(
    new Request(`https://portfolio.test${path}`, { method: "GET" }),
  );
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "application/pdf");
  const bytes = Buffer.from(await served.arrayBuffer());
  assert.equal(bytes.toString("utf8", 0, 5), "%PDF-");

  const againForm = new FormData();
  againForm.set("file", new Blob([fakePdf(64)]), "my-cv.pdf");
  againForm.set("filename", "my-cv.pdf");
  const againHeaders = new Headers({
    "x-forwarded-host": "portfolio.test",
    "x-forwarded-proto": "https",
    "x-csrf-token": tokenFromEndpoint || csrfToken,
  });
  if (cookie) againHeaders.set("cookie", `admin_session=${cookie}`);
  const again = await handler(
    new Request("https://portfolio.test/api/cv", {
      method: "POST",
      headers: againHeaders,
      body: againForm,
    }),
  );
  assert.equal(again.status, 200);
  assert.equal((await again.json()).existing, true);

  const badForm = new FormData();
  badForm.set("file", new Blob([fakePng(64)]), "photo.png");
  badForm.set("filename", "photo.png");
  const rejected = await handler(
    new Request("https://portfolio.test/api/cv", {
      method: "POST",
      headers,
      body: badForm,
    }),
  );
  assert.equal(rejected.status, 415);
});

test("removing an image from the content deletes the stored file", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await signedIn(store);
  const uploaded = await (await upload(handler, cookie, csrfToken)).json();

  const withImage = sampleContent({});
  withImage.projects[0].cover = "/" + uploaded.item.key;
  const first = await call(handler, "PUT", "/api/content", {
    cookie,
    headers: { "x-csrf-token": csrfToken },
    body: { content: withImage, baseVersion: 0 },
  });
  assert.equal(first.status, 200);
  assert.ok(store.values.has(uploaded.item.key));

  const without = sampleContent({});
  without.projects[0].cover = "";
  const second = await call(handler, "PUT", "/api/content", {
    cookie,
    headers: { "x-csrf-token": csrfToken },
    body: { content: without, baseVersion: (await first.json()).version },
  });
  assert.equal(second.status, 200);

  // The project is gone, so the image it used is gone from storage too.
  assert.equal(store.values.has(uploaded.item.key), false);
  assert.equal(store.values.has(uploaded.item.thumbKey), false);
  assert.equal(store.values.get(INDEX_KEY).items.length, 0);
});

test("an image still used by another project survives a save", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await signedIn(store);
  const uploaded = await (await upload(handler, cookie, csrfToken)).json();

  const content = sampleContent({});
  content.projects[0].cover = "/" + uploaded.item.key;
  content.projects[0].gallery = ["/" + uploaded.item.key];
  const first = await call(handler, "PUT", "/api/content", {
    cookie,
    headers: { "x-csrf-token": csrfToken },
    body: { content, baseVersion: 0 },
  });
  assert.equal(first.status, 200);

  const next = structuredClone(content);
  next.projects[0].cover = "";
  const second = await call(handler, "PUT", "/api/content", {
    cookie,
    headers: { "x-csrf-token": csrfToken },
    body: { content: next, baseVersion: (await first.json()).version },
  });
  assert.equal(second.status, 200);
  assert.ok(store.values.has(uploaded.item.key));
});

test("deleting a project removes its Cloudinary video through the video endpoint", async () => {
  const previous = process.env.CLOUDINARY_URL;
  process.env.CLOUDINARY_URL = "cloudinary://123456789:test-secret@demo-cloud";
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ result: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const store = memoryStore();
    const { handler, cookie, csrfToken } = await signedIn(store);

    const content = sampleContent({});
    content.projects[0].type = "video";
    content.projects[0].videoUrl =
      "https://res.cloudinary.com/demo-cloud/video/upload/v1/portfolio/reel.mp4";
    const first = await call(handler, "PUT", "/api/content", {
      cookie,
      headers: { "x-csrf-token": csrfToken },
      body: { content, baseVersion: 0 },
    });
    assert.equal(first.status, 200);

    const next = sampleContent({});
    next.projects = next.projects.slice(1);
    const second = await call(handler, "PUT", "/api/content", {
      cookie,
      headers: { "x-csrf-token": csrfToken },
      body: { content: next, baseVersion: (await first.json()).version },
    });
    assert.equal(second.status, 200);

    assert.equal(calls.length, 1);
    assert.equal(
      calls[0].url,
      "https://api.cloudinary.com/v1_1/demo-cloud/video/destroy",
    );
    const payload = JSON.parse(calls[0].init.body);
    assert.equal(payload.public_id, "portfolio/reel");
    assert.equal("resource_type" in payload, false);
    assert.match(payload.signature, /^[a-f0-9]{40}$/);
  } finally {
    globalThis.fetch = realFetch;
    if (previous === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = previous;
  }
});

test("the video delete endpoint signs a video destroy request", async () => {
  const previous = process.env.CLOUDINARY_URL;
  process.env.CLOUDINARY_URL = "cloudinary://123456789:test-secret@demo-cloud";
  const realFetch = globalThis.fetch;
  let requested;
  globalThis.fetch = async (url, init) => {
    requested = { url: String(url), init };
    return new Response(JSON.stringify({ result: "ok" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const { handler, cookie, csrfToken } = await signedIn(memoryStore());
    const response = await call(handler, "POST", "/api/video-delete", {
      cookie,
      headers: { "x-csrf-token": csrfToken },
      body: {
        url: "https://res.cloudinary.com/demo-cloud/video/upload/v1/portfolio/reel.mp4",
      },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).public_id, "portfolio/reel");
    assert.equal(
      requested.url,
      "https://api.cloudinary.com/v1_1/demo-cloud/video/destroy",
    );
  } finally {
    globalThis.fetch = realFetch;
    if (previous === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = previous;
  }
});

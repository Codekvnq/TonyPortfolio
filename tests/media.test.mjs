import test from "node:test";
import assert from "node:assert/strict";
import {
  call,
  cookieValue,
  fakePng,
  login,
  makeHandler,
  memoryStore,
  sampleContent,
} from "./helpers.mjs";
import { createMediaHandler } from "../netlify/functions/media.mjs";
import { INDEX_KEY } from "../netlify/lib/media-store.mjs";

async function signedIn(store) {
  const handler = makeHandler(store);
  const cookie = cookieValue(await login(handler));
  return { handler, cookie };
}

async function upload(handler, cookie, uploadFields = {}) {
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

  const anonymous = await upload(handler, null);
  assert.equal(anonymous.status, 401);

  const { handler: authed, cookie } = await signedIn(memoryStore());
  const json = await call(authed, "POST", "/api/media", {
    cookie,
    body: { filename: "photo.png" },
  });
  assert.equal(json.status, 415);
});

test("media uploads validate the image bytes", async () => {
  const store = memoryStore();
  const { handler, cookie } = await signedIn(store);

  const notAnImage = Buffer.alloc(64, 0x41);
  const response = await upload(handler, cookie, { full: notAnImage, thumb: notAnImage });
  assert.equal(response.status, 415);
  assert.match((await response.json()).error, /WebP, JPEG or PNG/);
});

test("uploading an image stores both sizes and deduplicates by hash", async () => {
  const store = memoryStore();
  const { handler, cookie } = await signedIn(store);

  const response = await upload(handler, cookie);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.match(body.item.id, /^[a-f0-9]{32}$/);
  assert.match(body.item.key, /^media\/[a-f0-9]{32}\.png$/);
  assert.match(body.item.thumbKey, /^media\/[a-f0-9]{32}-thumb\.png$/);
  assert.equal(body.item.width, 1200);
  assert.equal(body.item.height, 800);
  assert.equal(body.item.alt, "A test image");
  assert.ok(store.values.has(body.item.key));
  assert.ok(store.values.has(body.item.thumbKey));

  const again = await upload(handler, cookie);
  assert.equal(again.status, 200);
  const duplicate = await again.json();
  assert.equal(duplicate.existing, true);
  assert.equal(duplicate.item.id, body.item.id);

  const list = await call(handler, "GET", "/api/media", { cookie });
  assert.equal(list.status, 200);
  const items = (await list.json()).items;
  assert.equal(items.length, 1);
  assert.equal(items[0].id, body.item.id);
});

test("referenced images cannot be deleted, unused ones can", async () => {
  const store = memoryStore();
  const { handler, cookie } = await signedIn(store);

  const first = await (await upload(handler, cookie)).json();
  const second = await (
    await upload(handler, cookie, { full: fakePng(80), thumb: fakePng(56) })
  ).json();

  const content = sampleContent({
    profile: { ...sampleContent().profile, portrait: first.item.key },
  });
  await call(handler, "PUT", "/api/content", {
    cookie,
    body: { content, baseVersion: 0 },
  });

  const blocked = await call(handler, "DELETE", `/api/media/${first.item.id}`, {
    cookie,
  });
  assert.equal(blocked.status, 409);
  assert.match((await blocked.json()).error, /still used/);
  assert.ok(store.values.has(first.item.key));

  const removed = await call(handler, "DELETE", `/api/media/${second.item.id}`, {
    cookie,
  });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).ok, true);
  assert.equal(store.values.has(second.item.key), false);
  assert.equal(store.values.has(second.item.thumbKey), false);

  const index = store.values.get(INDEX_KEY);
  assert.equal(index.items.length, 1);
  assert.equal(index.items[0].id, first.item.id);

  const missing = await call(handler, "DELETE", "/api/media/deadbeef", { cookie });
  assert.equal(missing.status, 404);
});

test("media delivery serves immutable bytes and rejects bad keys", async () => {
  const store = memoryStore();
  const { handler, cookie } = await signedIn(store);
  const uploaded = await (await upload(handler, cookie)).json();

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

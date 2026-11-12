import test from "node:test";
import assert from "node:assert/strict";
import {
  call,
  cookieValue,
  login,
  makeHandler,
  memoryStore,
  sampleContent,
} from "./helpers.mjs";
import {
  CONTENT_KEY,
  MAX_REVISIONS,
  REVISIONS_PREFIX,
} from "../netlify/lib/content-store.mjs";

function clock(start = Date.parse("2026-11-02T12:00:00.000Z")) {
  let current = start;
  return () => {
    current += 1000;
    return current;
  };
}

function handlerWithClock(store) {
  return makeHandler(store, { now: clock() });
}

async function loginWithCsrf(store) {
  const handler = handlerWithClock(store);
  const response = await login(handler);
  assert.equal(response.status, 200);
  const body = await response.json();
  const cookie = cookieValue(response);
  return { handler, cookie, csrfToken: body.csrfToken };
}

async function callWithCsrf(
  handler,
  method,
  path,
  { body, cookie, csrfToken, headers: extra } = {},
) {
  const headers = new Headers({
    "x-forwarded-host": "portfolio.test",
    "x-forwarded-proto": "https",
    "content-type": "application/json",
  });
  if (cookie) headers.set("cookie", `admin_session=${cookie}`);
  if (csrfToken) headers.set("x-csrf-token", csrfToken);
  if (extra) {
    for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  }
  return handler(
    new Request(`https://portfolio.test${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

test("content is publicly readable and never served from a stale CDN copy", async () => {
  const handler = makeHandler(memoryStore());

  const response = await call(handler, "GET", "/api/content");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("netlify-cdn-cache-control"), "no-store");
  assert.deepEqual(await response.json(), {
    content: null,
    version: 0,
    updatedAt: null,
  });
});

test("content saves require a session", async () => {
  const handler = makeHandler(memoryStore());
  const response = await call(handler, "PUT", "/api/content", {
    body: { content: sampleContent(), baseVersion: 0 },
  });
  assert.equal(response.status, 401);
});

test("content saves validate the payload and the base version", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await loginWithCsrf(store);

  const missing = await callWithCsrf(handler, "PUT", "/api/content", {
    cookie,
    csrfToken,
    body: { content: { profile: {} }, baseVersion: 0 },
  });
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).error, /missing/);

  const badVersion = await callWithCsrf(handler, "PUT", "/api/content", {
    cookie,
    csrfToken,
    body: { content: sampleContent(), baseVersion: "zero" },
  });
  assert.equal(badVersion.status, 400);

  const stale = await callWithCsrf(handler, "PUT", "/api/content", {
    cookie,
    csrfToken,
    body: { content: sampleContent(), baseVersion: 5 },
  });
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).currentVersion, 0);
});

test("a saved content version round-trips and rejects stale writes", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await loginWithCsrf(store);

  const save = await callWithCsrf(handler, "PUT", "/api/content", {
    cookie,
    csrfToken,
    body: { content: sampleContent(), baseVersion: 0 },
  });
  assert.equal(save.status, 200);
  const saved = await save.json();
  assert.equal(saved.version, 1);
  assert.ok(saved.updatedAt);

  const read = await call(handler, "GET", "/api/content");
  const body = await read.json();
  assert.equal(body.version, 1);
  assert.equal(body.content.profile.name, "Anthony Ampaabeng");
  assert.ok(body.updatedAt);

  const stale = await callWithCsrf(handler, "PUT", "/api/content", {
    cookie,
    csrfToken,
    body: {
      content: sampleContent({ profile: { ...sampleContent().profile, name: "Stale" } }),
      baseVersion: 0,
    },
  });
  assert.equal(stale.status, 409);

  const unchanged = await (await call(handler, "GET", "/api/content")).json();
  assert.equal(unchanged.content.profile.name, "Anthony Ampaabeng");
});

test("content reads support ETag revalidation and a fresh bypass", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await loginWithCsrf(store);
  await callWithCsrf(handler, "PUT", "/api/content", {
    cookie,
    csrfToken,
    body: { content: sampleContent(), baseVersion: 0 },
  });

  const first = await call(handler, "GET", "/api/content");
  const etag = first.headers.get("etag");
  assert.ok(etag);

  const revalidated = await call(handler, "GET", "/api/content", {
    headers: { "if-none-match": etag },
  });
  assert.equal(revalidated.status, 304);

  const fresh = await call(handler, "GET", "/api/content?fresh");
  assert.equal(fresh.headers.get("cache-control"), "no-store");
  assert.equal((await fresh.json()).version, 1);
});

test("revisions list, read and restore older content", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await loginWithCsrf(store);

  await callWithCsrf(handler, "PUT", "/api/content", {
    cookie,
    csrfToken,
    body: { content: sampleContent(), baseVersion: 0 },
  });
  await callWithCsrf(handler, "PUT", "/api/content", {
    cookie,
    csrfToken,
    body: {
      content: sampleContent({
        profile: { ...sampleContent().profile, name: "Second Version" },
      }),
      baseVersion: 1,
    },
  });

  const list = await call(handler, "GET", "/api/revisions", { cookie });
  assert.equal(list.status, 200);
  const { items } = await list.json();
  assert.equal(items.length, 2);
  assert.equal(items[0].version, 2);
  assert.equal(items[1].version, 1);

  const revision = await call(
    handler,
    "GET",
    `/api/revisions/${items[1].id}`,
    { cookie },
  );
  assert.equal(revision.status, 200);
  const revisionBody = await revision.json();
  assert.equal(revisionBody.content.profile.name, "Anthony Ampaabeng");

  const restore = await callWithCsrf(
    handler,
    "POST",
    `/api/revisions/${items[1].id}/restore`,
    { cookie, csrfToken },
  );
  assert.equal(restore.status, 200);
  assert.equal((await restore.json()).version, 3);

  const current = await (await call(handler, "GET", "/api/content?fresh")).json();
  assert.equal(current.version, 3);
  assert.equal(current.content.profile.name, "Anthony Ampaabeng");

  const missing = await callWithCsrf(
    handler,
    "POST",
    "/api/revisions/not-a-revision/restore",
    { cookie, csrfToken },
  );
  assert.equal(missing.status, 404);
});

test("revisions are pruned to the newest snapshots", async () => {
  const store = memoryStore();
  const { handler, cookie, csrfToken } = await loginWithCsrf(store);

  let version = 0;
  for (let index = 0; index < MAX_REVISIONS + 3; index += 1) {
    const response = await callWithCsrf(handler, "PUT", "/api/content", {
      cookie,
      csrfToken,
      body: {
        content: sampleContent({
          meta: { updatedAt: null, note: `save-${index}` },
        }),
        baseVersion: version,
      },
    });
    assert.equal(response.status, 200);
    version = (await response.json()).version;
  }

  const list = await (await call(handler, "GET", "/api/revisions", { cookie })).json();
  assert.equal(list.items.length, MAX_REVISIONS);

  const revisionKeys = [...store.values.keys()].filter((key) =>
    key.startsWith(REVISIONS_PREFIX),
  );
  assert.equal(revisionKeys.length, MAX_REVISIONS);
  assert.ok(store.values.has(CONTENT_KEY));
});

test("content revisions cannot be listed without a session", async () => {
  const handler = makeHandler(memoryStore());
  const list = await call(handler, "GET", "/api/revisions");
  assert.equal(list.status, 401);
});

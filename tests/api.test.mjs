import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { signSession } from "../netlify/lib/auth.mjs";
import {
  call,
  cookieValue,
  login,
  makeHandler,
  memoryStore,
} from "./helpers.mjs";

async function loginWithCsrf(handler, username = "admin", password = "admin123!") {
  const response = await login(handler, username, password);
  assert.equal(response.status, 200);
  const body = await response.json();
  const cookie = cookieValue(response);
  return { cookie, csrfToken: body.csrfToken };
}

async function callWithCsrf(
  handler,
  method,
  path,
  { body, cookie, csrfToken, origin, headers: extra } = {},
) {
  const headers = new Headers({
    "x-forwarded-host": "portfolio.test",
    "x-forwarded-proto": "https",
    "content-type": "application/json",
  });
  if (origin) headers.set("origin", origin);
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

test("default credentials log in and start a session", async () => {
  const handler = makeHandler(memoryStore());

  const response = await login(handler);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.username, "admin");
  assert.equal(body.mustChange, true);

  const cookie = cookieValue(response);
  assert.ok(cookie);

  const session = await call(handler, "GET", "/api/session", { cookie });
  assert.equal(session.status, 200);
  const sessionBody = await session.json();
  assert.equal(sessionBody.authenticated, true);
  assert.equal(sessionBody.username, "admin");
  assert.equal(sessionBody.mustChange, true);
  assert.ok(sessionBody.csrfToken);
});

test("remember me extends the session to 30 days", async () => {
  const handler = makeHandler(memoryStore());

  const response = await call(handler, "POST", "/api/login", {
    body: { username: "admin", password: "admin123!", remember: true },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Max-Age=2592000/);

  const token = cookieValue(response);
  const payload = JSON.parse(
    Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
  );
  assert.equal(payload.exp - payload.iat, 60 * 60 * 24 * 30);
});

test("wrong credentials are rejected without a cookie", async () => {
  const handler = makeHandler(memoryStore());

  const response = await login(handler, "admin", "not-the-password");
  assert.equal(response.status, 401);
  assert.equal(cookieValue(response), null);
  assert.match((await response.json()).error, /not correct/);

  const wrongUser = await login(handler, "someone-else", "admin123!");
  assert.equal(wrongUser.status, 401);
});

test("five failures trigger a temporary lockout", async () => {
  const handler = makeHandler(memoryStore());

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await login(handler, "admin", `wrong-${attempt}`);
    assert.equal(response.status, 401);
  }

  const blocked = await login(handler, "admin", "admin123!");
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("account changes bump the version and invalidate old sessions", async () => {
  const handler = makeHandler(memoryStore());
  const { cookie, csrfToken } = await loginWithCsrf(handler);

  const change = await callWithCsrf(handler, "PUT", "/api/account", {
    cookie,
    csrfToken,
    body: {
      currentPassword: "admin123!",
      username: "tony",
      newPassword: "NewStrongPass123",
    },
  });
  assert.equal(change.status, 200);
  const newCookie = cookieValue(change);
  assert.ok(newCookie);
  assert.notEqual(newCookie, cookie);
  assert.equal((await change.json()).username, "tony");

  const oldSession = await call(handler, "GET", "/api/session", { cookie });
  assert.equal((await oldSession.json()).authenticated, false);

  const newSession = await callWithCsrf(handler, "GET", "/api/session", {
    cookie: newCookie,
    csrfToken,
  });
  const newSessionBody = await newSession.json();
  assert.equal(newSessionBody.authenticated, true);
  assert.equal(newSessionBody.username, "tony");
  assert.equal(newSessionBody.mustChange, false);
  assert.ok(newSessionBody.csrfToken);

  const oldLogin = await login(handler);
  assert.equal(oldLogin.status, 401);

  const newLogin = await login(handler, "tony", "NewStrongPass123");
  assert.equal(newLogin.status, 200);
  assert.equal((await newLogin.json()).mustChange, false);
});

test("account changes require the current password and a valid new one", async () => {
  const handler = makeHandler(memoryStore());
  const { cookie, csrfToken } = await loginWithCsrf(handler);

  const wrongCurrent = await callWithCsrf(handler, "PUT", "/api/account", {
    cookie,
    csrfToken,
    body: { currentPassword: "nope", username: "tony" },
  });
  assert.equal(wrongCurrent.status, 401);

  const weak = await callWithCsrf(handler, "PUT", "/api/account", {
    cookie,
    csrfToken,
    body: { currentPassword: "admin123!", newPassword: "short" },
  });
  assert.equal(weak.status, 400);
  assert.match((await weak.json()).error, /at least 10/);

  const sameDefault = await callWithCsrf(handler, "PUT", "/api/account", {
    cookie,
    csrfToken,
    body: { currentPassword: "admin123!", newPassword: "admin123!" },
  });
  assert.equal(sameDefault.status, 400);
});

test("account updates are rejected without a session", async () => {
  const handler = makeHandler(memoryStore());
  const response = await call(handler, "PUT", "/api/account", {
    body: { currentPassword: "admin123!", username: "tony" },
  });
  assert.equal(response.status, 401);
});

test("logout clears the cookie and cross-origin writes are refused", async () => {
  const handler = makeHandler(memoryStore());
  const { cookie, csrfToken } = await loginWithCsrf(handler);

  const logout = await callWithCsrf(handler, "POST", "/api/logout", {
    cookie,
    csrfToken,
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);

  const crossOrigin = await call(handler, "POST", "/api/login", {
    origin: "https://evil.test",
    body: { username: "admin", password: "admin123!" },
  });
  assert.equal(crossOrigin.status, 403);
});

test("mutating requests without CSRF token are refused", async () => {
  const handler = makeHandler(memoryStore());
  const { cookie } = await loginWithCsrf(handler);

  const noToken = await call(handler, "PUT", "/api/account", {
    cookie,
    body: { currentPassword: "admin123!", username: "tony" },
  });
  assert.equal(noToken.status, 403);
  assert.match((await noToken.json()).error, /CSRF/);
});

test("a conflicting credential write is refused", async () => {
  const store = memoryStore();
  const handler = makeHandler(store);
  const { cookie, csrfToken } = await loginWithCsrf(handler);

  store.failNextMatch = true;
  const response = await callWithCsrf(handler, "PUT", "/api/account", {
    cookie,
    csrfToken,
    body: { currentPassword: "admin123!", username: "tony" },
  });

  assert.equal(response.status, 409);
  assert.match((await response.json()).error, /another session/);
});

test("session tokens cannot be reused for a different username", async () => {
  const store = memoryStore();
  const handler = makeHandler(store);
  await login(handler);

  const auth = store.values.get("auth.json");
  const secret = store.values.get("session-secret");
  const forged = signSession({
    secret,
    username: "intruder",
    version: auth.version,
  });

  const response = await call(handler, "GET", "/api/session", { cookie: forged });
  assert.deepEqual(await response.json(), { authenticated: false });
});

test("unknown routes return 404 and ping reports readiness", async () => {
  const handler = makeHandler(memoryStore());

  const ping = await call(handler, "GET", "/api/ping");
  assert.equal(ping.status, 200);
  assert.equal((await ping.json()).ok, true);

  const missing = await call(handler, "GET", "/api/nope");
  assert.equal(missing.status, 404);
});

test("signing in on another device signs the previous session out", async () => {
  const handler = makeHandler(memoryStore());

  const first = await loginWithCsrf(handler);
  const stillValid = await call(handler, "GET", "/api/session", { cookie: first.cookie });
  assert.equal((await stillValid.json()).authenticated, true);

  const second = await loginWithCsrf(handler);

  const oldDevice = await call(handler, "GET", "/api/session", { cookie: first.cookie });
  assert.deepEqual(await oldDevice.json(), { authenticated: false });

  const newDevice = await call(handler, "GET", "/api/session", { cookie: second.cookie });
  assert.equal((await newDevice.json()).authenticated, true);
});

test("video signing returns a Cloudinary SHA-1 signature", async () => {
  const handler = makeHandler(memoryStore());
  const { cookie, csrfToken } = await loginWithCsrf(handler);
  const previous = process.env.CLOUDINARY_URL;
  process.env.CLOUDINARY_URL = "cloudinary://123456789:secret-key@demo-cloud";

  try {
    const response = await callWithCsrf(handler, "POST", "/api/video-sign", {
      cookie,
      csrfToken,
      body: {},
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    const expected = createHash("sha1")
      .update(`folder=portfolio&timestamp=${body.timestamp}secret-key`)
      .digest("hex");
    assert.equal(body.signature, expected);
    assert.equal(body.apiKey, "123456789");
    assert.equal(body.uploadUrl, "https://api.cloudinary.com/v1_1/demo-cloud/video/upload");
  } finally {
    if (previous === undefined) delete process.env.CLOUDINARY_URL;
    else process.env.CLOUDINARY_URL = previous;
  }
});

test("video signing refuses to run without Cloudinary credentials", async () => {
  const handler = makeHandler(memoryStore());
  const { cookie, csrfToken } = await loginWithCsrf(handler);
  const previous = process.env.CLOUDINARY_URL;
  delete process.env.CLOUDINARY_URL;

  try {
    const response = await callWithCsrf(handler, "POST", "/api/video-sign", {
      cookie,
      csrfToken,
      body: {},
    });
    assert.equal(response.status, 500);
    assert.match((await response.json()).error, /not configured/i);
  } finally {
    if (previous !== undefined) process.env.CLOUDINARY_URL = previous;
  }
});

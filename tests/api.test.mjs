import test from "node:test";
import assert from "node:assert/strict";
import { signSession } from "../netlify/lib/auth.mjs";
import {
  call,
  cookieValue,
  login,
  makeHandler,
  memoryStore,
} from "./helpers.mjs";

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
  assert.deepEqual(await session.json(), {
    authenticated: true,
    username: "admin",
    mustChange: true,
  });
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
  const oldResponse = await login(handler);
  const oldCookie = cookieValue(oldResponse);

  const change = await call(handler, "PUT", "/api/account", {
    cookie: oldCookie,
    body: {
      currentPassword: "admin123!",
      username: "tony",
      newPassword: "NewStrongPass123",
    },
  });
  assert.equal(change.status, 200);
  const newCookie = cookieValue(change);
  assert.ok(newCookie);
  assert.notEqual(newCookie, oldCookie);
  assert.equal((await change.json()).username, "tony");

  const oldSession = await call(handler, "GET", "/api/session", { cookie: oldCookie });
  assert.deepEqual(await oldSession.json(), { authenticated: false });

  const newSession = await call(handler, "GET", "/api/session", { cookie: newCookie });
  assert.deepEqual(await newSession.json(), {
    authenticated: true,
    username: "tony",
    mustChange: false,
  });

  const oldLogin = await login(handler);
  assert.equal(oldLogin.status, 401);

  const newLogin = await login(handler, "tony", "NewStrongPass123");
  assert.equal(newLogin.status, 200);
  assert.equal((await newLogin.json()).mustChange, false);
});

test("account changes require the current password and a valid new one", async () => {
  const handler = makeHandler(memoryStore());
  const cookie = cookieValue(await login(handler));

  const wrongCurrent = await call(handler, "PUT", "/api/account", {
    cookie,
    body: { currentPassword: "nope", username: "tony" },
  });
  assert.equal(wrongCurrent.status, 401);

  const weak = await call(handler, "PUT", "/api/account", {
    cookie,
    body: { currentPassword: "admin123!", newPassword: "short" },
  });
  assert.equal(weak.status, 400);
  assert.match((await weak.json()).error, /at least 10/);

  const sameDefault = await call(handler, "PUT", "/api/account", {
    cookie,
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
  const cookie = cookieValue(await login(handler));

  const logout = await call(handler, "POST", "/api/logout", { cookie });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);

  const crossOrigin = await call(handler, "POST", "/api/login", {
    origin: "https://evil.test",
    body: { username: "admin", password: "admin123!" },
  });
  assert.equal(crossOrigin.status, 403);
});

test("a conflicting credential write is refused", async () => {
  const store = memoryStore();
  const handler = makeHandler(store);
  const cookie = cookieValue(await login(handler));

  store.failNextMatch = true;
  const response = await call(handler, "PUT", "/api/account", {
    cookie,
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

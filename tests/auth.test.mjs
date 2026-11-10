import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PASSWORD,
  createAuthRecord,
  expiredSessionCookie,
  hashPassword,
  isSecureRequest,
  parseCookies,
  safeEqual,
  sessionCookie,
  signSession,
  validateNewPassword,
  validateUsername,
  verifyPassword,
  verifySession,
} from "../netlify/lib/auth.mjs";

const ITERATIONS = 1_000;
const SECRET = "test-session-secret";

test("password hashes verify and reject the wrong password", async () => {
  const record = await createAuthRecord({
    username: "tony",
    password: "CorrectHorse123",
    iterations: ITERATIONS,
  });

  assert.equal(
    await verifyPassword("CorrectHorse123", record.salt, record.iterations, record.hash),
    true,
  );
  assert.equal(
    await verifyPassword("wrong-password", record.salt, record.iterations, record.hash),
    false,
  );
});

test("the same password produces a different hash with a new salt", async () => {
  const first = await createAuthRecord({ password: "SamePassword123", iterations: ITERATIONS });
  const second = await createAuthRecord({ password: "SamePassword123", iterations: ITERATIONS });

  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await hashPassword("SamePassword123", first.salt, ITERATIONS), first.hash);
});

test("default credentials are flagged for change", async () => {
  const record = await createAuthRecord({ iterations: ITERATIONS });
  assert.equal(record.username, "admin");
  assert.equal(record.mustChange, true);
  assert.equal(
    await verifyPassword(DEFAULT_PASSWORD, record.salt, record.iterations, record.hash),
    true,
  );
});

test("session tokens verify, expire and reject tampering", () => {
  const now = 1_700_000_000_000;
  const token = signSession({
    secret: SECRET,
    username: "admin",
    version: 3,
    now,
  });

  const payload = verifySession({ secret: SECRET, token, version: 3, now });
  assert.equal(payload.sub, "admin");
  assert.equal(payload.v, 3);

  assert.equal(
    verifySession({ secret: SECRET, token, version: 4, now }),
    null,
    "a version bump must invalidate old tokens",
  );
  assert.equal(
    verifySession({ secret: SECRET, token, version: 3, now: now + 8 * 24 * 60 * 60 * 1000 }),
    null,
    "expired tokens must be rejected",
  );

  const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
  assert.equal(verifySession({ secret: SECRET, token: tampered, version: 3, now }), null);
  assert.equal(verifySession({ secret: "other-secret", token, version: 3, now }), null);
});

test("cookie helpers set the security attributes", () => {
  const cookie = sessionCookie("abc.def", { secure: true });
  assert.match(cookie, /^admin_session=abc\.def;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.doesNotMatch(cookie, /Max-Age/);

  const rememberCookie = sessionCookie("abc.def", { secure: true, maxAge: 2592000 });
  assert.match(rememberCookie, /Max-Age=2592000/);

  const cleared = expiredSessionCookie({ secure: false });
  assert.match(cleared, /Max-Age=0/);
  assert.doesNotMatch(cleared, /Secure/);

  assert.deepEqual(parseCookies("a=1; admin_session=xyz; b=two"), {
    a: "1",
    admin_session: "xyz",
    b: "two",
  });
});

test("cookies are marked secure only on HTTPS", () => {
  const secure = new Request("https://portfolio.test/api/session", {
    headers: { "x-forwarded-proto": "https" },
  });
  const insecure = new Request("http://localhost:8888/api/session");
  const proxied = new Request("http://internal/api/session", {
    headers: { "x-forwarded-proto": "https" },
  });

  assert.equal(isSecureRequest(secure), true);
  assert.equal(isSecureRequest(insecure), false);
  assert.equal(isSecureRequest(proxied), true);
});

test("safeEqual compares without leaking length differences", () => {
  assert.equal(safeEqual("same", "same"), true);
  assert.equal(safeEqual("same", "diff"), false);
  assert.equal(safeEqual("short", "longer"), false);
});

test("username and password validation enforce the policy", () => {
  assert.equal(validateUsername("tony"), null);
  assert.equal(validateUsername("tony.amp"), null);
  assert.match(validateUsername("ab"), /3–32/);
  assert.match(validateUsername("bad name"), /3–32/);

  assert.equal(validateNewPassword("LongEnough123", "tony"), null);
  assert.match(validateNewPassword("short", "tony"), /at least 10/);
  assert.match(validateNewPassword(DEFAULT_PASSWORD, "tony"), /default/);
  assert.match(validateNewPassword("tony", "tony"), /at least 10/);
  assert.match(validateNewPassword("TonyTonyTony", "tonytonytony"), /username/);
});

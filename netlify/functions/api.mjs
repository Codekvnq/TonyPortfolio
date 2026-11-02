import {
  DEFAULT_ITERATIONS,
  SESSION_COOKIE,
  clientIp,
  createAuthRecord,
  expiredSessionCookie,
  hashIdentifier,
  hashPassword,
  isSameOrigin,
  isSecureRequest,
  makeSalt,
  makeSessionSecret,
  parseCookies,
  sessionCookie,
  signSession,
  validateNewPassword,
  validateUsername,
  verifyPassword,
  verifySession,
} from "../lib/auth.mjs";
import { getPortfolioStore, readJson, readText } from "../lib/store.mjs";

const MAX_BODY_BYTES = 16 * 1024;
const THROTTLE_LIMIT = 5;
const THROTTLE_WINDOW_MS = 15 * 60 * 1000;
const FAILURE_DELAY_MS = 350;
const AUTH_KEY = "auth.json";
const SECRET_KEY = "session-secret";

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

async function readBody(req) {
  const length = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    return { error: "Request is too large.", status: 413 };
  }
  let text;
  try {
    text = await req.text();
  } catch {
    return { error: "Could not read the request.", status: 400 };
  }
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    return { error: "Request is too large.", status: 413 };
  }
  if (!text) return { value: {} };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: "Invalid JSON.", status: 400 };
  }
}

export function createApiHandler({
  store,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  secureCookie,
  iterations = DEFAULT_ITERATIONS,
} = {}) {
  async function database() {
    return store || getPortfolioStore();
  }

  async function loadAuth(db) {
    const existing = await readJson(db, AUTH_KEY);
    if (existing) return existing;

    const record = await createAuthRecord({ iterations });
    let accepted = true;
    try {
      const result = await db.setJSON(AUTH_KEY, record, { onlyIfNew: true });
      accepted = !result || result.modified !== false;
    } catch {
      accepted = false;
    }
    const seeded = await readJson(db, AUTH_KEY);
    if (seeded) return seeded;
    if (!accepted) throw new Error("Could not initialise credentials.");
    return { value: record, etag: null };
  }

  async function loadSecret(db) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existing = await readText(db, SECRET_KEY);
      if (existing) return existing;

      const secret = makeSessionSecret();
      try {
        const result = await db.set(SECRET_KEY, secret, { onlyIfNew: true });
        if (!result || result.modified !== false) return secret;
      } catch {
        // Another instance wrote a secret first; retry the read.
      }
    }
    throw new Error("Could not initialise the session secret.");
  }

  async function readSession(req, db) {
    const cookies = parseCookies(req.headers.get("cookie") || "");
    const token = cookies[SESSION_COOKIE];
    if (!token) return { authenticated: false };

    const auth = await loadAuth(db);
    const secret = await loadSecret(db);
    const payload = verifySession({
      secret,
      token,
      version: auth.value.version,
      now: now(),
    });

    if (!payload) return { authenticated: false, invalid: true };
    if (payload.sub !== auth.value.username) {
      return { authenticated: false, invalid: true };
    }
    return { authenticated: true, auth, payload };
  }

  function secureFor(req) {
    return secureCookie === undefined ? isSecureRequest(req) : secureCookie;
  }

  function throttleKey(req) {
    return `throttle/${hashIdentifier(clientIp(req))}`;
  }

  async function recordFailure(db, key, timestamp) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const entry = await readJson(db, key).catch(() => null);
      const active =
        entry?.value &&
        Number(entry.value.resetAt) > timestamp &&
        Number(entry.value.count) >= 1;
      const next = {
        count: active ? Number(entry.value.count) + 1 : 1,
        resetAt: active ? Number(entry.value.resetAt) : timestamp + THROTTLE_WINDOW_MS,
      };
      try {
        const result =
          entry?.etag
            ? await db.setJSON(key, next, { onlyIfMatch: entry.etag })
            : await db.setJSON(key, next, { onlyIfNew: true });
        if (!result || result.modified !== false) return;
      } catch {
        // A concurrent write changed the counter; retry once.
      }
    }
  }

  async function handleLogin(req, db) {
    const body = await readBody(req);
    if (body.error) return json({ error: body.error }, body.status);

    const username = String(body.value.username ?? "").trim();
    const password = String(body.value.password ?? "");
    if (!username || !password) {
      return json({ error: "Enter your username and password." }, 400);
    }
    if (username.length > 64 || password.length > 200) {
      return json({ error: "That username or password is not correct." }, 401);
    }

    const key = throttleKey(req);
    const timestamp = now();
    const throttle = await readJson(db, key).catch(() => null);
    if (
      throttle?.value &&
      Number(throttle.value.resetAt) > timestamp &&
      Number(throttle.value.count) >= THROTTLE_LIMIT
    ) {
      const retryAfter = Math.max(
        1,
        Math.ceil((Number(throttle.value.resetAt) - timestamp) / 1000),
      );
      return json(
        { error: "Too many attempts. Try again shortly." },
        429,
        { "retry-after": String(retryAfter) },
      );
    }

    const auth = await loadAuth(db);
    const record = auth.value;

    // Always run PBKDF2 so a wrong username costs the same as a wrong password.
    const passwordMatches = await verifyPassword(
      password,
      record.salt,
      record.iterations,
      record.hash,
    );
    const usernameMatches =
      String(record.username).toLowerCase() === username.toLowerCase();

    if (!usernameMatches || !passwordMatches) {
      await sleep(FAILURE_DELAY_MS);
      await recordFailure(db, key, timestamp);
      return json({ error: "That username or password is not correct." }, 401);
    }

    await db.delete(key).catch(() => {});
    const secret = await loadSecret(db);
    const token = signSession({
      secret,
      username: record.username,
      version: record.version,
      now: timestamp,
    });

    return json(
      { ok: true, username: record.username, mustChange: Boolean(record.mustChange) },
      200,
      {
        "set-cookie": sessionCookie(token, { secure: secureFor(req) }),
      },
    );
  }

  async function handleSession(req, db) {
    const session = await readSession(req, db);
    if (!session.authenticated) {
      const headers = session.invalid
        ? { "set-cookie": expiredSessionCookie({ secure: secureFor(req) }) }
        : {};
      return json({ authenticated: false }, 200, headers);
    }

    return json({
      authenticated: true,
      username: session.auth.value.username,
      mustChange: Boolean(session.auth.value.mustChange),
    });
  }

  async function handleAccount(req, db) {
    const session = await readSession(req, db);
    if (!session.authenticated) {
      return json({ error: "Sign in to continue." }, 401);
    }

    const body = await readBody(req);
    if (body.error) return json({ error: body.error }, body.status);

    const currentPassword = String(body.value.currentPassword ?? "");
    if (!currentPassword) {
      return json({ error: "Enter your current password." }, 400);
    }

    const current = session.auth.value;
    const passwordMatches = await verifyPassword(
      currentPassword,
      current.salt,
      current.iterations,
      current.hash,
    );
    if (!passwordMatches) {
      await sleep(FAILURE_DELAY_MS);
      return json({ error: "Current password is not correct." }, 401);
    }

    const requestedUsername =
      body.value.username === undefined
        ? undefined
        : String(body.value.username).trim();
    const requestedPassword =
      body.value.newPassword === undefined
        ? undefined
        : String(body.value.newPassword);

    const usernameChanged =
      requestedUsername !== undefined && requestedUsername !== current.username;
    const passwordChanged =
      requestedPassword !== undefined && requestedPassword !== "";

    if (!usernameChanged && !passwordChanged) {
      return json({ error: "Nothing to change." }, 400);
    }

    let nextUsername = current.username;
    if (usernameChanged) {
      const error = validateUsername(requestedUsername);
      if (error) return json({ error }, 400);
      nextUsername = requestedUsername;
    }

    let salt = current.salt;
    let hash = current.hash;
    if (passwordChanged) {
      const error = validateNewPassword(requestedPassword, nextUsername);
      if (error) return json({ error }, 400);
      salt = makeSalt();
      hash = await hashPassword(requestedPassword, salt, current.iterations);
    }

    const updated = {
      ...current,
      username: nextUsername,
      salt,
      hash,
      version: Number(current.version || 0) + 1,
      mustChange: false,
      updatedAt: new Date().toISOString(),
    };

    try {
      const result = session.auth.etag
        ? await db.setJSON(AUTH_KEY, updated, {
            onlyIfMatch: session.auth.etag,
          })
        : await db.setJSON(AUTH_KEY, updated);
      if (result && result.modified === false) {
        return json(
          { error: "Credentials changed in another session. Sign in again." },
          409,
        );
      }
    } catch {
      return json(
        { error: "Credentials changed in another session. Sign in again." },
        409,
      );
    }

    const secret = await loadSecret(db);
    const token = signSession({
      secret,
      username: nextUsername,
      version: updated.version,
      now: now(),
    });

    return json(
      { ok: true, username: nextUsername },
      200,
      {
        "set-cookie": sessionCookie(token, { secure: secureFor(req) }),
      },
    );
  }

  return async function handler(req) {
    let path;
    try {
      path = new URL(req.url).pathname.replace(/\/+$/, "") || "/";
    } catch {
      return json({ error: "Bad request." }, 400);
    }

    if (!isSameOrigin(req)) {
      return json({ error: "Request rejected." }, 403);
    }

    try {
      const db = await database();

      if (req.method === "GET" && path === "/api/ping") {
        return json({
          ok: true,
          service: "portfolio-admin-api",
          now: new Date(now()).toISOString(),
        });
      }
      if (req.method === "POST" && path === "/api/login") {
        return await handleLogin(req, db);
      }
      if (req.method === "GET" && path === "/api/session") {
        return await handleSession(req, db);
      }
      if (req.method === "POST" && path === "/api/logout") {
        return json(
          { ok: true },
          200,
          {
            "set-cookie": expiredSessionCookie({ secure: secureFor(req) }),
          },
        );
      }
      if (req.method === "PUT" && path === "/api/account") {
        return await handleAccount(req, db);
      }
      return json({ error: "Not found." }, 404);
    } catch (error) {
      console.error("admin api error", error);
      return json({ error: "Something went wrong. Try again." }, 500);
    }
  };
}

export default createApiHandler();
export const config = { path: "/api/*" };

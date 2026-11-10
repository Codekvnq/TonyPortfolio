import {
  DEFAULT_ITERATIONS,
  REMEMBER_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  clientIp,
  createAuthRecord,
  expiredSessionCookie,
  hashIdentifier,
  hashPassword,
  isSameOrigin,
  isSecureRequest,
  makeSalt,
  makeSessionSecret,
  makeCsrfToken,
  parseCookies,
  sessionCookie,
  signSession,
  validateNewPassword,
  validateUsername,
  verifyPassword,
  verifySession,
} from "../lib/auth.mjs";
import {
  MAX_CONTENT_BYTES,
  listRevisions,
  readContent,
  readRevision,
  restoreRevision,
  saveContent,
} from "../lib/content-store.mjs";
import {
  MAX_FULL_BYTES,
  MAX_THUMB_BYTES,
  deleteMedia,
  readMediaIndex,
  saveCv,
  saveMedia,
} from "../lib/media-store.mjs";
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

async function readBody(req, maxBytes = MAX_BODY_BYTES) {
  const length = Number(req.headers.get("content-length") || "0");
  if (Number.isFinite(length) && length > maxBytes) {
    return { error: "Request is too large.", status: 413 };
  }
  let text;
  try {
    text = await req.text();
  } catch {
    return { error: "Could not read the request.", status: 400 };
  }
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    return { error: "Request is too large.", status: 413 };
  }
  if (!text) return { value: {} };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return { error: "Invalid JSON.", status: 400 };
  }
}

function isFile(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.size === "number"
  );
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

  async function requireSession(req, db) {
    const session = await readSession(req, db);
    return session.authenticated ? session : null;
  }

  async function handleContentGet(req, db) {
    const entry = await readContent(db);
    const fresh = new URL(req.url).searchParams.has("fresh");
    const headers = fresh
      ? { "cache-control": "no-store" }
      : {
          "cache-control": "public, max-age=0, must-revalidate",
          "netlify-cdn-cache-control":
            "public, max-age=60, stale-while-revalidate=300, durable",
        };
    if (entry?.etag) headers.etag = entry.etag;

    if (entry?.etag && req.headers.get("if-none-match") === entry.etag) {
      return new Response(null, { status: 304, headers });
    }
    if (!entry) {
      return json({ content: null, version: 0, updatedAt: null }, 200, headers);
    }
    return json(
      {
        content: entry.value.content,
        version: entry.value.version,
        updatedAt: entry.value.updatedAt,
      },
      200,
      headers,
    );
  }

  async function handleContentPut(req, db) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);

    const body = await readBody(req, MAX_CONTENT_BYTES + 16 * 1024);
    if (body.error) return json({ error: body.error }, body.status);

    const result = await saveContent(db, {
      content: body.value.content,
      baseVersion: body.value.baseVersion,
      now: now(),
    });
    if (result.error) return json({ error: result.error }, result.status);
    if (result.conflict) {
      return json(
        {
          error: "Content changed elsewhere. Reload before saving.",
          currentVersion: result.currentVersion,
        },
        409,
      );
    }
    return json({
      ok: true,
      version: result.value.version,
      updatedAt: result.value.updatedAt,
    });
  }

  async function handleRevisionsGet(req, db) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);
    return json({ items: await listRevisions(db) });
  }

  async function handleRevisionGet(req, db, id) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);
    const revision = await readRevision(db, id);
    if (!revision) return json({ error: "Revision not found." }, 404);
    return json(revision);
  }

  async function handleRevisionRestore(req, db, id) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);

    const result = await restoreRevision(db, { id, now: now() });
    if (result.notFound) return json({ error: "Revision not found." }, 404);
    if (result.error) return json({ error: result.error }, result.status);
    if (result.conflict) {
      return json(
        {
          error: "Content changed elsewhere. Reload before restoring.",
          currentVersion: result.currentVersion,
        },
        409,
      );
    }
    return json({
      ok: true,
      version: result.value.version,
      updatedAt: result.value.updatedAt,
    });
  }

  async function handleMediaGet(req, db) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);
    const { items } = await readMediaIndex(db);
    return json({ items });
  }

  async function handleMediaPost(req, db) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return json({ error: "Expected a multipart image upload." }, 415);
    }

    let form;
    try {
      form = await req.formData();
    } catch {
      return json({ error: "Could not read the upload." }, 400);
    }

    const full = form.get("full");
    const thumb = form.get("thumb");
    if (!isFile(full)) {
      return json({ error: "Choose an image to upload." }, 400);
    }
    if (!isFile(thumb)) {
      return json({ error: "The thumbnail is missing." }, 400);
    }
    if (full.size > MAX_FULL_BYTES) {
      return json({ error: "The image must be 4 MB or smaller." }, 413);
    }
    if (thumb.size > MAX_THUMB_BYTES) {
      return json({ error: "The thumbnail must be 768 KB or smaller." }, 413);
    }

    const result = await saveMedia(db, {
      full: await full.arrayBuffer(),
      thumb: await thumb.arrayBuffer(),
      filename: form.get("filename") || full.name,
      alt: form.get("alt"),
      width: form.get("width"),
      height: form.get("height"),
      now: now(),
    });

    if (result.error) return json({ error: result.error }, result.status);
    return json(
      { ok: true, item: result.item, existing: Boolean(result.existing) },
      result.existing ? 200 : 201,
    );
  }

  async function handleMediaDelete(req, db, id) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);

    const contentEntry = await readContent(db);
    const result = await deleteMedia(db, {
      id,
      content: contentEntry?.value?.content ?? null,
    });
    if (result.notFound) return json({ error: "Image not found." }, 404);
    if (result.referenced) {
      return json(
        { error: "This image is still used in the site content." },
        409,
      );
    }
    return json({ ok: true, item: result.item });
  }

  async function handleCvPost(req, db) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("multipart/form-data")) {
      return json({ error: "Expected a multipart PDF upload." }, 415);
    }

    let form;
    try {
      form = await req.formData();
    } catch {
      return json({ error: "Could not read the upload." }, 400);
    }

    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "Choose a PDF file to upload." }, 400);
    }

    const result = await saveCv(db, {
      file,
      filename: form.get("filename") || file.name,
      now: now(),
    });
    if (result.error) return json({ error: result.error }, result.status);
    return json(
      { ok: true, item: result.item, existing: Boolean(result.existing) },
      result.existing ? 200 : 201,
    );
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
    const honeypot = String(body.value.website ?? "").trim();
    if (honeypot) {
      return json({ error: "That username or password is not correct." }, 401);
    }
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
    const remember = body.value.remember === true;
    const ttl = remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS;
    const secret = await loadSecret(db);
    const csrfToken = makeCsrfToken();
    try {
      await db.set("csrf-token", csrfToken, { onlyIfNew: false });
    } catch {
      // Best-effort; CSRF validation degrades gracefully if storage fails.
    }
    const token = signSession({
      secret,
      username: record.username,
      version: record.version,
      ttl,
      now: timestamp,
    });

    return json(
      {
        ok: true,
        username: record.username,
        mustChange: Boolean(record.mustChange),
        csrfToken,
      },
      200,
      {
        "set-cookie": sessionCookie(token, {
          secure: secureFor(req),
          maxAge: remember ? REMEMBER_TTL_SECONDS : undefined,
        }),
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

    const storedCsrf = await readText(db, "csrf-token").catch(() => null);
    return json({
      authenticated: true,
      username: session.auth.value.username,
      mustChange: Boolean(session.auth.value.mustChange),
      csrfToken: storedCsrf || null,
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

  async function handleCsrfGet(req, db) {
    const session = await requireSession(req, db);
    if (!session) return json({ error: "Sign in to continue." }, 401);
    const stored = await readText(db, "csrf-token").catch(() => null);
    return json({ csrfToken: stored || null });
  }

  async function validateCsrf(req, db) {
    const token = req.headers.get("x-csrf-token") || "";
    const stored = await readText(db, "csrf-token").catch(() => null);
    if (!stored || !token || token !== stored) {
      return false;
    }
    return true;
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

      const isMutating =
        req.method === "POST" ||
        req.method === "PUT" ||
        req.method === "DELETE";
      const csrfExempt =
        (req.method === "GET" && path === "/api/ping") ||
        (req.method === "GET" && path === "/api/csrf") ||
        (req.method === "POST" && path === "/api/login") ||
        (req.method === "GET" && path === "/api/session");

      if (isMutating && !csrfExempt) {
        const session = await readSession(req, db);
        if (session.authenticated) {
          const csrfValid = await validateCsrf(req, db).catch(() => false);
          if (!csrfValid) {
            return json({ error: "CSRF token missing or invalid." }, 403);
          }
        }
      }

      if (req.method === "GET" && path === "/api/ping") {
        return json({
          ok: true,
          service: "portfolio-admin-api",
          now: new Date(now()).toISOString(),
        });
      }
      if (req.method === "GET" && path === "/api/csrf") {
        return await handleCsrfGet(req, db);
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
      if (req.method === "GET" && path === "/api/content") {
        return await handleContentGet(req, db);
      }
      if (req.method === "PUT" && path === "/api/content") {
        return await handleContentPut(req, db);
      }
      if (req.method === "GET" && path === "/api/revisions") {
        return await handleRevisionsGet(req, db);
      }
      const restoreMatch = /^\/api\/revisions\/([^/]+)\/restore$/.exec(path);
      if (req.method === "POST" && restoreMatch) {
        return await handleRevisionRestore(req, db, restoreMatch[1]);
      }
      const revisionMatch = /^\/api\/revisions\/([^/]+)$/.exec(path);
      if (req.method === "GET" && revisionMatch) {
        return await handleRevisionGet(req, db, revisionMatch[1]);
      }
      if (req.method === "GET" && path === "/api/media") {
        return await handleMediaGet(req, db);
      }
      if (req.method === "POST" && path === "/api/media") {
        return await handleMediaPost(req, db);
      }
      if (req.method === "POST" && path === "/api/cv") {
        return await handleCvPost(req, db);
      }
      const mediaMatch = /^\/api\/media\/([^/]+)$/.exec(path);
      if (req.method === "DELETE" && mediaMatch) {
        return await handleMediaDelete(req, db, mediaMatch[1]);
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

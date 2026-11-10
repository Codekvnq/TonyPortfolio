import {
  createHash,
  createHmac,
  randomBytes,
  pbkdf2,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const pbkdf2Async = promisify(pbkdf2);

export const DEFAULT_USERNAME = "admin";
export const DEFAULT_PASSWORD = "admin123!";
export const DEFAULT_ITERATIONS = 210_000;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_COOKIE = "admin_session";
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

export function makeSalt() {
  return randomBytes(16).toString("base64");
}

export function makeSessionSecret() {
  return randomBytes(32).toString("base64url");
}

export async function hashPassword(
  password,
  salt,
  iterations = DEFAULT_ITERATIONS,
) {
  const key = await pbkdf2Async(password, salt, iterations, 32, "sha256");
  return key.toString("base64");
}

export async function verifyPassword(
  password,
  salt,
  iterations,
  expectedHash,
) {
  const actual = await hashPassword(password, salt, iterations);
  return safeEqual(actual, expectedHash);
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function hashIdentifier(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export async function createAuthRecord({
  username = DEFAULT_USERNAME,
  password = DEFAULT_PASSWORD,
  iterations = DEFAULT_ITERATIONS,
} = {}) {
  const salt = makeSalt();
  return {
    username,
    salt,
    iterations,
    hash: await hashPassword(password, salt, iterations),
    version: 1,
    mustChange: true,
    updatedAt: new Date().toISOString(),
  };
}

export function validateUsername(value) {
  if (typeof value !== "string") return "Username is required.";
  const username = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$/.test(username)) {
    return "Use 3–32 letters, numbers, dots, dashes or underscores.";
  }
  return null;
}

export function validateNewPassword(password, username) {
  if (typeof password !== "string" || !password) {
    return "New password is required.";
  }
  if (password === DEFAULT_PASSWORD) {
    return "Choose a password different from the default.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  if (
    typeof username === "string" &&
    password.toLowerCase() === username.toLowerCase()
  ) {
    return "Password must be different from the username.";
  }
  return null;
}

export function signSession({
  secret,
  username,
  version,
  ttl = SESSION_TTL_SECONDS,
  now = Date.now(),
}) {
  const issuedAt = Math.floor(now / 1000);
  const payload = {
    sub: username,
    v: version,
    iat: issuedAt,
    exp: issuedAt + ttl,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifySession({
  secret,
  token,
  version,
  now = Date.now(),
}) {
  if (typeof token !== "string" || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (!payload || typeof payload.sub !== "string") return null;
  if (!Number.isInteger(payload.v) || payload.v !== version) return null;
  if (!Number.isInteger(payload.exp) || payload.exp * 1000 <= now) return null;
  return payload;
}

export function sessionCookie(token, { secure, maxAge = SESSION_TTL_SECONDS }) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${
    secure ? "; Secure" : ""
  }`;
}

export function expiredSessionCookie({ secure }) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${
    secure ? "; Secure" : ""
  }`;
}

export function parseCookies(header = "") {
  const cookies = {};
  for (const part of String(header).split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    const value = part.slice(index + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

export function isSecureRequest(req) {
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0].trim() === "https";
  try {
    const url = new URL(req.url);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export function isSameOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = req.headers.get("host") || req.headers.get("x-forwarded-host");
  return !host || originHost === host;
}

export function clientIp(req) {
  const netlifyIp = req.headers.get("x-nf-client-connection-ip");
  if (netlifyIp) return netlifyIp.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

import { getPortfolioStore } from "../lib/store.mjs";

const KEY_PATTERN = /^[a-f0-9]{16,64}(-thumb)?\.(webp|jpg|png)$/;
const CACHE = "public, max-age=31536000, immutable";

function contentType(key) {
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".jpg")) return "image/jpeg";
  return "image/png";
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "cache-control": "no-store" },
  });
}

export function createMediaHandler({ store } = {}) {
  return async function handler(req) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD", "cache-control": "no-store" },
      });
    }

    let key;
    try {
      const url = new URL(req.url);
      key = decodeURIComponent(url.pathname.replace(/^\/media\//, ""));
    } catch {
      return notFound();
    }

    if (!KEY_PATTERN.test(key)) return notFound();

    const db = store || (await getPortfolioStore());
    let entry;
    try {
      entry = await db.getWithMetadata(`media/${key}`, {
        type: "arrayBuffer",
        consistency: "strong",
      });
    } catch (error) {
      console.error("media read failed", error);
      return new Response("Image unavailable", {
        status: 503,
        headers: { "cache-control": "no-store" },
      });
    }

    if (!entry || !entry.data) return notFound();

    const headers = {
      "content-type": contentType(key),
      "content-length": String(entry.data.byteLength),
      "cache-control": CACHE,
      "netlify-cdn-cache-control": `${CACHE}, durable`,
      "x-content-type-options": "nosniff",
      etag: entry.etag,
    };

    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch && entry.etag && ifNoneMatch.includes(entry.etag)) {
      return new Response(null, { status: 304, headers });
    }

    if (req.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }
    return new Response(entry.data, { status: 200, headers });
  };
}

export default createMediaHandler();
export const config = { path: "/media/*" };

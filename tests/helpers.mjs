import { createApiHandler } from "../netlify/functions/api.mjs";

/**
 * Minimal in-memory stand-in for a Netlify Blobs store. It supports the
 * operations the backend uses: get/getWithMetadata, set/setJSON with
 * onlyIfNew/onlyIfMatch, delete and prefix listing.
 */
export function memoryStore() {
  const values = new Map();
  const etags = new Map();
  let sequence = 0;

  function canWrite(key, options = {}) {
    if (options.onlyIfNew && values.has(key)) return false;
    if (options.onlyIfMatch && etags.get(key) !== options.onlyIfMatch) return false;
    return true;
  }

  function clone(value, type) {
    if (type === "json") return structuredClone(value);
    if (type === "arrayBuffer") {
      if (value instanceof ArrayBuffer) return value.slice(0);
      if (ArrayBuffer.isView(value)) {
        return value.buffer.slice(
          value.byteOffset,
          value.byteOffset + value.byteLength,
        );
      }
      return value;
    }
    return value;
  }

  return {
    values,
    etags,
    failNextMatch: false,
    async get(key, options = {}) {
      if (!values.has(key)) return null;
      return clone(values.get(key), options.type);
    },
    async getWithMetadata(key, options = {}) {
      if (!values.has(key)) return null;
      return {
        data: clone(values.get(key), options.type),
        etag: etags.get(key) ?? null,
      };
    },
    async setJSON(key, value, options = {}) {
      if (options.onlyIfMatch && this.failNextMatch) {
        this.failNextMatch = false;
        return { modified: false };
      }
      if (!canWrite(key, options)) return { modified: false };
      values.set(key, structuredClone(value));
      const etag = `"etag-${++sequence}"`;
      etags.set(key, etag);
      return { modified: true, etag };
    },
    async set(key, value, options = {}) {
      if (options.onlyIfMatch && this.failNextMatch) {
        this.failNextMatch = false;
        return { modified: false };
      }
      if (!canWrite(key, options)) return { modified: false };
      values.set(key, value);
      const etag = `"etag-${++sequence}"`;
      etags.set(key, etag);
      return { modified: true, etag };
    },
    async delete(key) {
      values.delete(key);
      etags.delete(key);
    },
    async list(options = {}) {
      const prefix = options.prefix ?? "";
      return {
        blobs: [...values.keys()]
          .filter((key) => key.startsWith(prefix))
          .map((key) => ({ key, etag: etags.get(key) ?? null })),
        directories: [],
      };
    },
  };
}

export function makeHandler(store, options = {}) {
  return createApiHandler({
    store,
    iterations: 1_000,
    sleep: async () => {},
    ...options,
  });
}

export async function call(
  handler,
  method,
  path,
  { body, cookie, origin, headers: extra } = {},
) {
  const headers = new Headers({
    "x-forwarded-host": "portfolio.test",
    "x-forwarded-proto": "https",
  });
  if (origin !== undefined) headers.set("origin", origin);
  if (cookie) headers.set("cookie", `admin_session=${cookie}`);
  if (body !== undefined) headers.set("content-type", "application/json");
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

export function cookieValue(response) {
  const header = response.headers.get("set-cookie");
  if (!header) return null;
  const first = header.split(";")[0];
  return first.slice(first.indexOf("=") + 1) || null;
}

export async function login(handler, username = "admin", password = "admin123!") {
  return call(handler, "POST", "/api/login", { body: { username, password } });
}

export function sampleContent(overrides = {}) {
  return {
    version: 1,
    profile: {
      name: "Anthony Ampaabeng",
      title: "Graphic Designer",
      intro: "Creative visuals.",
      marquee: "Always in search of great design.",
      portrait: "images/site/about.jpeg",
    },
    contact: {
      email: "hello@example.com",
      phone: "+233 55 252 0247",
      location: "Kumasi, Ghana",
      availability: "Freelance Available",
      whatsapp: "https://wa.me/2330552520247",
    },
    socials: [
      {
        id: "social-linkedin",
        platform: "linkedin",
        label: "LinkedIn",
        url: "https://example.com/linkedin",
        visible: true,
      },
    ],
    resume: {
      headline: "Graphic Designer",
      summary: "Design for brands.",
      skills: ["Branding", "Layout"],
      experience: [],
      education: [],
    },
    projects: [
      {
        id: "project-one",
        title: "Project One",
        category: "Branding",
        description: "A brand project.",
        image: "images/projects/one.jpg",
        thumb: "images/projects/one.jpg",
        tags: ["Branding"],
        visible: true,
      },
    ],
    meta: { updatedAt: null },
    ...overrides,
  };
}

/** Smallest valid PNG header so image sniffing succeeds without a real file. */
export function fakePng(bytes = 32) {
  const buffer = Buffer.alloc(bytes, 0);
  buffer[0] = 0x89;
  buffer[1] = 0x50;
  buffer[2] = 0x4e;
  buffer[3] = 0x47;
  buffer[4] = 0x0d;
  buffer[5] = 0x0a;
  buffer[6] = 0x1a;
  buffer[7] = 0x0a;
  return buffer;
}

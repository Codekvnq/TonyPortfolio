import { createHash } from "node:crypto";
import { readJson } from "./store.mjs";

export const INDEX_KEY = "media-index.json";
export const MAX_FULL_BYTES = 4 * 1024 * 1024;
export const MAX_THUMB_BYTES = 768 * 1024;
export const MAX_INDEX_ITEMS = 500;

export function detectImage(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return null;

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ext: "png", mime: "image/png" };
  }
  return null;
}

export function hashBytes(buffer) {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex").slice(0, 32);
}

function cleanText(value, maxLength) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

function dimension(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const rounded = Math.round(number);
  if (rounded < 1 || rounded > 20000) return null;
  return rounded;
}

export async function readMediaIndex(store) {
  const entry = await readJson(store, INDEX_KEY);
  if (!entry) return { items: [] };
  const items = Array.isArray(entry.value?.items) ? entry.value.items : [];
  return { items };
}

async function addToIndex(store, item) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const entry = await readJson(store, INDEX_KEY);
    const index = entry?.value?.items ? entry.value : { items: [] };
    const existing = index.items.find((candidate) => candidate.id === item.id);
    if (existing) return existing;

    const next = { items: [item, ...index.items].slice(0, MAX_INDEX_ITEMS) };
    try {
      const result = entry?.etag
        ? await store.setJSON(INDEX_KEY, next, { onlyIfMatch: entry.etag })
        : await store.setJSON(INDEX_KEY, next, { onlyIfNew: true });
      if (!result || result.modified !== false) return item;
    } catch {
      // Retry with a fresh index.
    }
  }
  throw new Error("Could not update the media index.");
}

export async function saveMedia(
  store,
  { full, thumb, filename, alt, width, height, now = Date.now() },
) {
  const fullType = detectImage(full);
  if (!fullType) {
    return { error: "Use a WebP, JPEG or PNG image.", status: 415 };
  }
  if (full.byteLength > MAX_FULL_BYTES) {
    return { error: "The image must be 4 MB or smaller.", status: 413 };
  }

  const thumbType = thumb ? detectImage(thumb) : null;
  if (thumb && !thumbType) {
    return { error: "The thumbnail must be a WebP, JPEG or PNG image.", status: 415 };
  }
  if (thumb && thumb.byteLength > MAX_THUMB_BYTES) {
    return { error: "The thumbnail must be 768 KB or smaller.", status: 413 };
  }

  const hash = hashBytes(full);
  const key = `media/${hash}.${fullType.ext}`;
  const thumbKey = thumb
    ? `media/${hash}-thumb.${thumbType.ext}`
    : key;

  const existing = (await readMediaIndex(store)).items.find(
    (item) => item.id === hash,
  );
  if (existing) return { item: existing, existing: true };

  await store.set(key, full, { metadata: { contentType: fullType.mime } });
  if (thumb) {
    await store.set(thumbKey, thumb, { metadata: { contentType: thumbType.mime } });
  }

  const item = {
    id: hash,
    key,
    thumbKey,
    filename: cleanText(filename, 160) || `image.${fullType.ext}`,
    alt: cleanText(alt, 200),
    width: dimension(width),
    height: dimension(height),
    size: full.byteLength,
    createdAt: new Date(now).toISOString(),
  };

  const stored = await addToIndex(store, item);
  return { item: stored, existing: stored !== item };
}

async function removeFromIndex(store, id) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const entry = await readJson(store, INDEX_KEY);
    const items = entry?.value?.items ?? [];
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return null;

    const next = { items: items.filter((candidate) => candidate.id !== id) };
    try {
      const result = entry?.etag
        ? await store.setJSON(INDEX_KEY, next, { onlyIfMatch: entry.etag })
        : await store.setJSON(INDEX_KEY, next);
      if (!result || result.modified !== false) return item;
    } catch {
      // Retry with a fresh index.
    }
  }
  throw new Error("Could not update the media index.");
}

export async function deleteMedia(store, { id, content }) {
  const existing = (await readMediaIndex(store)).items.find(
    (candidate) => candidate.id === id,
  );
  if (!existing) return { notFound: true };

  const serialised = content ? JSON.stringify(content) : "";
  if (
    serialised.includes(existing.key) ||
    serialised.includes(existing.thumbKey)
  ) {
    return { referenced: true, item: existing };
  }

  const item = await removeFromIndex(store, id);
  if (!item) return { notFound: true };

  await store.delete(item.key).catch(() => {});
  if (item.thumbKey && item.thumbKey !== item.key) {
    await store.delete(item.thumbKey).catch(() => {});
  }
  return { item };
}

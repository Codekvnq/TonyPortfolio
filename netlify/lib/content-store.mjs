import { readJson } from "./store.mjs";

export const CONTENT_KEY = "content.json";
export const REVISIONS_PREFIX = "revisions/";
export const MAX_CONTENT_BYTES = 512 * 1024;
export const MAX_REVISIONS = 20;

const REQUIRED_KEYS = ["profile", "contact", "socials", "resume", "projects"];

export function validateContent(content) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "Content must be a JSON object.";
  }
  for (const key of REQUIRED_KEYS) {
    if (!(key in content)) return `Content is missing "${key}".`;
  }
  if (
    typeof content.profile !== "object" ||
    content.profile === null ||
    Array.isArray(content.profile)
  ) {
    return '"profile" must be an object.';
  }
  if (
    typeof content.contact !== "object" ||
    content.contact === null ||
    Array.isArray(content.contact)
  ) {
    return '"contact" must be an object.';
  }
  if (
    typeof content.resume !== "object" ||
    content.resume === null ||
    Array.isArray(content.resume)
  ) {
    return '"resume" must be an object.';
  }
  if (!Array.isArray(content.socials)) return '"socials" must be an array.';
  if (!Array.isArray(content.projects)) return '"projects" must be an array.';

  let serialised;
  try {
    serialised = JSON.stringify(content);
  } catch {
    return "Content could not be serialised.";
  }
  if (Buffer.byteLength(serialised, "utf8") > MAX_CONTENT_BYTES) {
    return "Content is larger than 512 KB.";
  }
  return null;
}

export async function readContent(store) {
  return readJson(store, CONTENT_KEY);
}

export function parseRevisionId(id) {
  const match = /^(\d{10,16})-v(\d+)$/.exec(String(id));
  if (!match) return null;
  return {
    id: `${match[1]}-v${match[2]}`,
    version: Number(match[2]),
    createdAt: new Date(Number(match[1])).toISOString(),
  };
}

export async function listRevisions(store) {
  const { blobs } = await store.list({ prefix: REVISIONS_PREFIX });
  return blobs
    .map((blob) => parseRevisionId(blob.key.slice(REVISIONS_PREFIX.length).replace(/\.json$/, "")))
    .filter(Boolean)
    .sort((left, right) => right.id.localeCompare(left.id));
}

export async function readRevision(store, id) {
  if (!parseRevisionId(id)) return null;
  const entry = await readJson(store, `${REVISIONS_PREFIX}${id}.json`);
  if (!entry) return null;
  return { id, ...entry.value };
}

async function writeRevision(store, record) {
  const timestamp = Date.parse(record.updatedAt);
  const id = `${Number.isFinite(timestamp) ? timestamp : Date.now()}-v${record.version}`;
  await store.setJSON(`${REVISIONS_PREFIX}${id}.json`, {
    version: record.version,
    createdAt: record.updatedAt,
    content: record.content,
  });
}

async function pruneRevisions(store, keep = MAX_REVISIONS) {
  const revisions = await listRevisions(store);
  for (const revision of revisions.slice(keep)) {
    await store.delete(`${REVISIONS_PREFIX}${revision.id}.json`);
  }
}

async function persist(store, current, next) {
  const result = current?.etag
    ? await store.setJSON(CONTENT_KEY, next, { onlyIfMatch: current.etag })
    : await store.setJSON(CONTENT_KEY, next, { onlyIfNew: true });
  return !result || result.modified !== false;
}

export async function saveContent(
  store,
  { content, baseVersion, now = Date.now() },
) {
  const validationError = validateContent(content);
  if (validationError) return { error: validationError, status: 400 };
  if (!Number.isInteger(baseVersion) || baseVersion < 0) {
    return { error: "baseVersion must be a positive integer.", status: 400 };
  }

  const current = await readContent(store);
  const currentVersion = Number(current?.value?.version ?? 0);
  if (baseVersion !== currentVersion) {
    return { conflict: true, currentVersion };
  }

  const updatedAt = new Date(now).toISOString();
  const next = { version: currentVersion + 1, updatedAt, content };
  if (!(await persist(store, current, next))) {
    return { conflict: true, currentVersion };
  }

  try {
    await writeRevision(store, next);
    await pruneRevisions(store);
  } catch (error) {
    console.error("revision write failed", error);
  }
  return { value: next };
}

export async function restoreRevision(
  store,
  { id, now = Date.now() },
) {
  const revision = await readRevision(store, id);
  if (!revision) return { notFound: true };

  const validationError = validateContent(revision.content);
  if (validationError) return { error: validationError, status: 400 };

  const current = await readContent(store);
  const currentVersion = Number(current?.value?.version ?? 0);
  const updatedAt = new Date(now).toISOString();
  const next = {
    version: currentVersion + 1,
    updatedAt,
    content: revision.content,
  };

  if (!(await persist(store, current, next))) {
    return { conflict: true, currentVersion };
  }

  try {
    await writeRevision(store, next);
    await pruneRevisions(store);
  } catch (error) {
    console.error("revision write failed", error);
  }
  return { value: next };
}

import test from "node:test";
import assert from "node:assert/strict";
import {
  isBlobsAuthError,
  withStoreRetry,
} from "../netlify/lib/store.mjs";
import { mediaRefToKey } from "../netlify/lib/media-store.mjs";
import { videoPublicId } from "../netlify/functions/api.mjs";

const EXPIRED =
  "Netlify Blobs has generated an internal error (Failed to decode token: Token expired)";

test("an expired Blobs token is retried once with a fresh handle", async () => {
  let calls = 0;
  const stale = {
    async get() {
      calls += 1;
      throw new Error(EXPIRED);
    },
  };
  const fresh = {
    async get(key) {
      calls += 1;
      return `value:${key}`;
    },
  };

  const store = withStoreRetry(stale, { getFresh: async () => fresh });
  assert.equal(await store.get("content.json"), "value:content.json");
  assert.equal(calls, 2);
});

test("only Blobs token errors are retried", async () => {
  let freshCalls = 0;
  const broken = {
    async get() {
      throw new Error("Something else went wrong");
    },
  };
  const store = withStoreRetry(broken, {
    getFresh: async () => {
      freshCalls += 1;
      return broken;
    },
  });

  await assert.rejects(() => store.get("key"), /Something else went wrong/);
  assert.equal(freshCalls, 0);
  assert.equal(isBlobsAuthError(new Error(EXPIRED)), true);
  assert.equal(isBlobsAuthError(new Error("nope")), false);
});

test("a media URL maps back to its Blobs key", () => {
  assert.equal(mediaRefToKey("/media/abc123.webp"), "media/abc123.webp");
  assert.equal(
    mediaRefToKey("https://portfolio.test/media/abc123.webp?x=1"),
    "media/abc123.webp",
  );
  assert.equal(mediaRefToKey("images/portfolio/01.jpeg"), "");
  assert.equal(mediaRefToKey(""), "");
});

test("a Cloudinary video URL yields its public_id", () => {
  assert.equal(
    videoPublicId(
      "https://res.cloudinary.com/demo/video/upload/v1730000000/portfolio/reel-final.mp4",
    ),
    "portfolio/reel-final",
  );
  assert.equal(
    videoPublicId("https://res.cloudinary.com/demo/video/upload/portfolio/a.webm?x=1"),
    "portfolio/a",
  );
  assert.equal(videoPublicId("https://youtu.be/abc123"), "");
  assert.equal(videoPublicId(""), "");
});

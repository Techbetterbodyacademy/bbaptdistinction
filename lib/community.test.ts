import { describe, test, expect } from "vitest";
import {
  prepareCommunityPost,
  prepareCommunityComment,
  formatEngagement
} from "./community";

describe("prepareCommunityPost", () => {
  test("clean record", () => {
    const r = prepareCommunityPost({ body: "  Crushed Monday training!  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.body).toBe("Crushed Monday training!");
  });

  test("rejects empty body", () => {
    const r = prepareCommunityPost({ body: " " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/body/i);
  });

  test("rejects body over 4000 chars", () => {
    const r = prepareCommunityPost({ body: "x".repeat(4001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too long/i);
  });

  test("accepts body at 4000 chars", () => {
    expect(prepareCommunityPost({ body: "x".repeat(4000) }).ok).toBe(true);
  });
});

describe("prepareCommunityComment", () => {
  test("clean record", () => {
    const r = prepareCommunityComment({ body: "  Nice work!  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.body).toBe("Nice work!");
  });

  test("rejects empty", () => {
    expect(prepareCommunityComment({ body: " " }).ok).toBe(false);
  });

  test("rejects over 1000 chars", () => {
    expect(prepareCommunityComment({ body: "x".repeat(1001) }).ok).toBe(false);
  });
});

describe("formatEngagement", () => {
  test("no likes, no comments", () => {
    expect(formatEngagement({ likes: 0, comments: 0 })).toBe("Be the first to react");
  });

  test("only likes", () => {
    expect(formatEngagement({ likes: 5, comments: 0 })).toBe("5 likes");
    expect(formatEngagement({ likes: 1, comments: 0 })).toBe("1 like");
  });

  test("only comments", () => {
    expect(formatEngagement({ likes: 0, comments: 3 })).toBe("3 comments");
    expect(formatEngagement({ likes: 0, comments: 1 })).toBe("1 comment");
  });

  test("both", () => {
    expect(formatEngagement({ likes: 5, comments: 3 })).toBe("5 likes · 3 comments");
  });
});

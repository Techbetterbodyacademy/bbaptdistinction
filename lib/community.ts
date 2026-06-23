export type PostInput = { body: string };
export type PostRecord = { body: string };
export type CommentInput = { body: string };
export type CommentRecord = { body: string };

export type PrepareResult<T> = { ok: true; record: T } | { ok: false; error: string };

const POST_MAX = 4000;
const COMMENT_MAX = 1000;

export function prepareCommunityPost(input: PostInput): PrepareResult<PostRecord> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "body required" };
  if (body.length > POST_MAX) return { ok: false, error: "body too long" };
  return { ok: true, record: { body } };
}

export function prepareCommunityComment(input: CommentInput): PrepareResult<CommentRecord> {
  const body = input.body.trim();
  if (!body) return { ok: false, error: "body required" };
  if (body.length > COMMENT_MAX) return { ok: false, error: "body too long" };
  return { ok: true, record: { body } };
}

export type EngagementCounts = { likes: number; comments: number };

export function formatEngagement(counts: EngagementCounts): string {
  if (counts.likes === 0 && counts.comments === 0) return "Be the first to react";
  const parts: string[] = [];
  if (counts.likes > 0) parts.push(`${counts.likes} like${counts.likes === 1 ? "" : "s"}`);
  if (counts.comments > 0) parts.push(`${counts.comments} comment${counts.comments === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

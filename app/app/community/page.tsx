import { createClient } from "@/lib/supabase/server";
import { createPost, toggleLike, addComment } from "./actions";
import { formatEngagement } from "@/lib/community";

export default async function CommunityPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, name")
    .eq("owner_id", user!.id)
    .single();

  const { data: posts } = await supabase
    .from("community_post")
    .select(`
      id, body, created_at, author_user_id,
      author:author_user_id(user_profile(full_name)),
      community_comment(id, body, created_at, author_user_id, author:author_user_id(user_profile(full_name))),
      community_like(user_id)
    `)
    .eq("workspace_id", workspace!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="px-10 py-10 max-w-3xl">
      <header className="mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">{workspace?.name}</div>
        <h1 className="text-3xl font-extrabold tracking-tight">Community</h1>
        <p className="text-[var(--color-muted)] mt-2">Workspace-wide feed. Wins, questions, accountability.</p>
      </header>

      {sp.saved === "1" ? <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Posted.</div> : null}
      {sp.error ? <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">{sp.error}</div> : null}

      <form action={createPost} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-3">
        <textarea
          name="body"
          rows={3}
          required
          placeholder="Share a win, a question, or a callout for the crew."
          className="input resize-y"
        />
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">Post</button>
        </div>
      </form>

      <div className="space-y-6">
        {(posts ?? []).map((p) => {
          const author = Array.isArray(p.author) ? p.author[0] : p.author;
          const authorProfile = author ? (Array.isArray(author.user_profile) ? author.user_profile[0] : author.user_profile) : null;
          const authorName = authorProfile?.full_name ?? "Someone";

          const comments = Array.isArray(p.community_comment) ? p.community_comment : [];
          const likes = Array.isArray(p.community_like) ? p.community_like : [];
          const liked = likes.some((l) => l.user_id === user!.id);

          return (
            <article key={p.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
              <header className="flex items-baseline justify-between gap-3 mb-3">
                <div className="font-bold">{authorName}</div>
                <div className="text-xs text-[var(--color-subtle)]">{new Date(p.created_at).toLocaleString()}</div>
              </header>
              <div className="whitespace-pre-wrap mb-4">{p.body}</div>

              <div className="flex items-center gap-3 mb-3">
                <form action={toggleLike}>
                  <input type="hidden" name="post_id" value={p.id} />
                  <button
                    type="submit"
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${liked ? "bg-[var(--color-blue)] border-[var(--color-blue)] text-white" : "border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-blue)]"}`}
                  >
                    {liked ? "Liked" : "Like"}
                  </button>
                </form>
                <div className="text-xs text-[var(--color-muted)]">
                  {formatEngagement({ likes: likes.length, comments: comments.length })}
                </div>
              </div>

              {comments.length > 0 ? (
                <div className="border-t border-[var(--color-line)] pt-4 space-y-2 mb-4">
                  {comments.slice().sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).map((c) => {
                    const cAuthor = Array.isArray(c.author) ? c.author[0] : c.author;
                    const cProfile = cAuthor ? (Array.isArray(cAuthor.user_profile) ? cAuthor.user_profile[0] : cAuthor.user_profile) : null;
                    const cName = cProfile?.full_name ?? "Someone";
                    return (
                      <div key={c.id} className="bg-[rgba(255,255,255,0.02)] rounded-lg p-3 text-sm">
                        <div className="font-semibold text-xs mb-1">{cName}</div>
                        <div className="whitespace-pre-wrap">{c.body}</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <form action={addComment} className="flex gap-2">
                <input type="hidden" name="post_id" value={p.id} />
                <input name="body" required placeholder="Add a comment…" className="input flex-1 text-sm" />
                <button type="submit" className="btn btn-ghost text-xs">Comment</button>
              </form>
            </article>
          );
        })}

        {(posts?.length ?? 0) === 0 ? (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-8 text-center text-[var(--color-muted)]">
            No posts yet. Be the first.
          </div>
        ) : null}
      </div>
    </main>
  );
}

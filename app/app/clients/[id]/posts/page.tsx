import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClientPostsListPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clientId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("client_profile")
    .select("id, user_profile:user_id(full_name)")
    .eq("id", clientId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const { data: posts } = await supabase
    .from("transformation_post")
    .select("id, status, caption, hook, hashtags, created_at, generated_by_model")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Client";

  return (
    <main className="px-10 py-10 max-w-4xl">
      <Link href={`/app/clients/${clientId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; {name}
      </Link>

      <header className="flex items-start justify-between gap-4 mt-4 mb-8">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Transformation posts
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{name}&rsquo;s posts</h1>
          <p className="text-[var(--color-muted)] mt-2">
            {posts?.length ?? 0} drafts
          </p>
        </div>
        <Link href={`/app/clients/${clientId}/posts/new`} className="btn btn-primary shrink-0">
          Generate post
        </Link>
      </header>

      {(!posts || posts.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-10 text-center">
          <h2 className="text-lg font-bold mb-2">No posts yet</h2>
          <p className="text-[var(--color-muted)] text-sm mb-5">
            One click and AI drafts a transformation post using their intake, sessions, and check-ins. You edit, you copy, you post.
          </p>
          <Link href={`/app/clients/${clientId}/posts/new`} className="btn btn-primary">Generate first post</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              href={`/app/clients/${clientId}/posts/${p.id}`}
              className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 hover:border-[var(--color-blue)] transition-colors"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div className="font-semibold">{p.hook || "Untitled draft"}</div>
                <StatusBadge status={p.status} />
              </div>
              {p.caption ? (
                <div className="text-sm text-[var(--color-muted)] line-clamp-3 whitespace-pre-wrap">{p.caption}</div>
              ) : null}
              <div className="text-xs text-[var(--color-subtle)] mt-3">
                {new Date(p.created_at).toLocaleString()}
                {p.generated_by_model ? ` · ${p.generated_by_model}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    draft: { bg: "rgba(255,255,255,0.06)", text: "var(--color-muted)" },
    ready: { bg: "rgba(0,174,239,0.15)", text: "var(--color-blue-glow)" },
    published: { bg: "rgba(34,197,94,0.15)", text: "var(--color-ok)" },
    archived: { bg: "rgba(148,163,184,0.15)", text: "var(--color-warn)" }
  };
  const c = map[status] ?? map.draft;
  return (
    <span
      className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {status}
    </span>
  );
}

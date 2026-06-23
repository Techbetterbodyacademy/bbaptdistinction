import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signTransformationPhotos } from "@/lib/storage";
import { updatePost, deletePost, setPostStatus } from "./actions";

export default async function PostDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string; postId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id: clientId, postId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: post } = await supabase
    .from("transformation_post")
    .select(`
      id, status, hook, caption, hashtags, source_photo_id, generated_by_model, created_at, published_at, client_id,
      photo:source_photo_id(blob_url, pose)
    `)
    .eq("id", postId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!post || post.client_id !== clientId) {
    notFound();
  }

  const photo = Array.isArray(post.photo) ? post.photo[0] : post.photo;
  const photoPath = photo?.blob_url ?? null;
  const signed = photoPath ? await signTransformationPhotos(supabase, [photoPath]) : {};
  const photoUrl = photoPath ? signed[photoPath] ?? null : null;

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href={`/app/clients/${clientId}/posts`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; All posts
      </Link>

      <header className="flex items-start justify-between gap-4 mt-4 mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Transformation post
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Draft</h1>
          <div className="text-xs text-[var(--color-subtle)] mt-2">
            Generated {new Date(post.created_at).toLocaleString()}
            {post.generated_by_model ? ` · ${post.generated_by_model}` : ""}
          </div>
        </div>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}

      {photoUrl ? (
        <div className="mb-6 rounded-2xl overflow-hidden bg-black border border-[var(--color-line)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt={photo?.pose ?? "transformation"} className="w-full max-h-[480px] object-contain" />
        </div>
      ) : null}

      <form action={updatePost} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6 space-y-4">
        <input type="hidden" name="post_id" value={post.id} />
        <input type="hidden" name="client_id" value={clientId} />

        <div>
          <label className="label" htmlFor="hook">Hook (1 line)</label>
          <input id="hook" name="hook" type="text" defaultValue={post.hook ?? ""} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="caption">Caption</label>
          <textarea
            id="caption"
            name="caption"
            rows={10}
            defaultValue={post.caption ?? ""}
            className="input resize-y font-mono text-sm"
          />
        </div>

        <div>
          <label className="label" htmlFor="hashtags">Hashtags</label>
          <textarea
            id="hashtags"
            name="hashtags"
            rows={2}
            defaultValue={post.hashtags ?? ""}
            className="input resize-y"
          />
        </div>

        {sp.error ? <div className="text-sm text-[var(--color-danger)]">Could not save. Try again.</div> : null}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary">Save edits</button>
          <CopyButton text={`${post.hook ?? ""}\n\n${post.caption ?? ""}\n\n${post.hashtags ?? ""}`} />
        </div>
      </form>

      <form action={setPostStatus} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 flex items-center justify-between gap-4 mb-6">
        <input type="hidden" name="post_id" value={post.id} />
        <input type="hidden" name="client_id" value={clientId} />
        <div>
          <div className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-1">Status</div>
          <div className="text-base font-bold capitalize">{post.status}</div>
        </div>
        <div className="flex items-center gap-2">
          {post.status !== "ready" ? (
            <button type="submit" name="status" value="ready" className="btn btn-ghost">Mark ready</button>
          ) : null}
          {post.status !== "published" ? (
            <button type="submit" name="status" value="published" className="btn btn-primary">Mark published</button>
          ) : null}
          {post.status !== "draft" ? (
            <button type="submit" name="status" value="draft" className="btn btn-ghost">Back to draft</button>
          ) : null}
          {post.status !== "archived" ? (
            <button type="submit" name="status" value="archived" className="btn btn-ghost">Archive</button>
          ) : null}
        </div>
      </form>

      <div className="flex items-center justify-between gap-4">
        <Link href={`/app/clients/${clientId}/posts/new`} className="btn btn-ghost">
          Regenerate (new draft)
        </Link>
        <form action={deletePost}>
          <input type="hidden" name="post_id" value={post.id} />
          <input type="hidden" name="client_id" value={clientId} />
          <button type="submit" className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]">
            Delete this draft
          </button>
        </form>
      </div>
    </main>
  );
}

function CopyButton({ text }: { text: string }) {
  // Server component, so we render a button with data attribute + tiny inline script
  return (
    <>
      <button
        type="button"
        data-copy={text}
        className="btn btn-ghost copy-btn"
      >
        Copy post
      </button>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.querySelectorAll('.copy-btn').forEach(b=>{
              b.addEventListener('click',async()=>{
                const t=b.getAttribute('data-copy')||'';
                try{await navigator.clipboard.writeText(t);b.textContent='Copied!';setTimeout(()=>b.textContent='Copy post',1800);}catch{b.textContent='Failed';}
              });
            });
          `
        }}
      />
    </>
  );
}

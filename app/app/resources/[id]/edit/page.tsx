import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateResource, deleteResource } from "./actions";

export default async function EditResourcePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: resource } = await supabase
    .from("resource")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!resource) {
    notFound();
  }

  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/resources" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to resources
      </Link>
      <header className="mb-8 mt-4">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Edit resource
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{resource.title}</h1>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}

      <form action={updateResource} className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <input type="hidden" name="id" value={resource.id} />

        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" type="text" required defaultValue={resource.title} className="input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="kind">Kind</label>
            <select id="kind" name="kind" defaultValue={resource.kind} className="input">
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="recipe">Recipe</option>
              <option value="article">Article</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="audience">Audience</label>
            <select id="audience" name="audience" defaultValue={resource.audience ?? ""} className="input">
              <option value="">All members</option>
              <option value="men-40-60">Men 40-60</option>
              <option value="women-35-60">Women 35-60</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="external_url">External URL</label>
          <input id="external_url" name="external_url" type="url" defaultValue={resource.external_url ?? ""} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="tags">Tags</label>
          <input id="tags" name="tags" type="text" defaultValue={resource.tags?.join(", ") ?? ""} className="input" />
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="published" value="1" defaultChecked={resource.published} className="w-4 h-4 accent-[var(--color-blue)]" />
            <span className="text-sm">Published (visible to matching clients)</span>
          </label>
        </div>

        {resource.blob_url ? (
          <div className="text-xs text-[var(--color-subtle)] pt-3 border-t border-[var(--color-line)]">
            Stored file: <span className="font-mono">{resource.blob_url}</span>
          </div>
        ) : null}

        {sp.error ? <div className="text-sm text-[var(--color-danger)]">Could not save. Try again.</div> : null}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary">Save changes</button>
        </div>
      </form>

      <form action={deleteResource} className="mt-8 bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-6">
        <input type="hidden" name="id" value={resource.id} />
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold mb-1">Delete this resource</div>
            <div className="text-sm text-[var(--color-muted)]">
              Removes it from the library. Any uploaded file goes with it.
            </div>
          </div>
          <button type="submit" className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]">
            Delete
          </button>
        </div>
      </form>
    </main>
  );
}

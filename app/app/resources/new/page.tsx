import Link from "next/link";
import { createResource } from "./actions";

export default async function NewResourcePage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="px-10 py-10 max-w-2xl">
      <Link href="/app/resources" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to resources
      </Link>
      <header className="mb-8 mt-4">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          New resource
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Add to the library</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Videos, PDFs, recipes, protocols. Tag by audience and publish when ready.
        </p>
      </header>

      <form action={createResource} encType="multipart/form-data" className="space-y-5 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input id="title" name="title" type="text" required placeholder="Morning mobility flow (5 min)" className="input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="kind">Kind</label>
            <select id="kind" name="kind" required defaultValue="video" className="input">
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
              <option value="recipe">Recipe</option>
              <option value="article">Article</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="audience">Audience</label>
            <select id="audience" name="audience" defaultValue="" className="input">
              <option value="">All members</option>
              <option value="men-40-60">Men 40-60</option>
              <option value="women-35-60">Women 35-60</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="external_url">External URL</label>
          <input id="external_url" name="external_url" type="url" placeholder="https://youtu.be/... or any direct link" className="input" />
          <p className="text-[var(--color-subtle)] text-xs mt-2">Use for YouTube, Vimeo, Loom, or any web link.</p>
        </div>

        <div>
          <label className="label" htmlFor="file">Or upload a file</label>
          <input id="file" name="file" type="file" accept="application/pdf,video/*" className="input" />
          <p className="text-[var(--color-subtle)] text-xs mt-2">For PDFs and short videos. URL above is preferred for long videos.</p>
        </div>

        <div>
          <label className="label" htmlFor="tags">Tags</label>
          <input id="tags" name="tags" type="text" placeholder="mobility, recovery, week-1" className="input" />
          <p className="text-[var(--color-subtle)] text-xs mt-2">Comma-separated.</p>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="published" value="1" defaultChecked className="w-4 h-4 accent-[var(--color-blue)]" />
            <span className="text-sm">Publish immediately (visible to matching clients)</span>
          </label>
        </div>

        {params.error ? (
          <div className="text-sm text-[var(--color-danger)]">Could not save. Try again.</div>
        ) : null}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn btn-primary">Add resource</button>
          <Link href="/app/resources" className="btn btn-ghost">Cancel</Link>
        </div>
      </form>
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import { updateWorkspace } from "./actions";

export default async function WorkspaceSettingsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, name, coach_name, brand_audience, primary_color, slug")
    .eq("owner_id", user!.id)
    .single();

  return (
    <main className="px-10 py-10 max-w-3xl">
      <header className="mb-10">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Settings
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Workspace</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Branding clients see on the app, intake forms, and program PDFs.
        </p>
      </header>

      {params.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">
          Saved.
        </div>
      ) : null}

      {params.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">
          Could not save. Try again.
        </div>
      ) : null}

      <form action={updateWorkspace} className="space-y-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
        <div>
          <label className="label" htmlFor="name">Workspace name</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={workspace?.name ?? ""}
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="coach_name">Coach name</label>
          <input
            id="coach_name"
            name="coach_name"
            type="text"
            required
            defaultValue={workspace?.coach_name ?? ""}
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="audience">Audience focus</label>
          <select
            id="audience"
            name="audience"
            className="input"
            defaultValue={
              workspace?.brand_audience === "women-35-60" ? "women" :
              workspace?.brand_audience === "mixed" ? "both" : "men"
            }
          >
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="primary_color">Brand color (hex)</label>
          <div className="flex items-center gap-3">
            <input
              id="primary_color"
              name="primary_color"
              type="text"
              required
              pattern="^#?[0-9A-Fa-f]{6}$"
              defaultValue={workspace?.primary_color ?? "#00AEEF"}
              className="input"
            />
            <div
              className="w-12 h-12 rounded-xl border border-[var(--color-line-strong)] shrink-0"
              style={{ background: workspace?.primary_color ?? "#00AEEF" }}
            />
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" className="btn btn-primary">Save changes</button>
        </div>
      </form>

      <div className="mt-8 text-sm text-[var(--color-subtle)]">
        Workspace slug: <span className="font-mono text-[var(--color-muted)]">{workspace?.slug}</span>
      </div>
    </main>
  );
}

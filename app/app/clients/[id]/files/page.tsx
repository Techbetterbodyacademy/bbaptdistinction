import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadClientFile, deleteClientFile, toggleVisibility } from "./actions";

export default async function ClientFilesPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

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

  if (!client) notFound();

  const { data: files } = await supabase
    .from("client_file")
    .select("id, file_name, file_path, file_type, file_size_bytes, description, visible_to_client, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const paths = (files ?? []).map((f) => f.file_path).filter(Boolean);
  const signedMap: Record<string, string | null> = {};
  if (paths.length > 0) {
    const { data } = await supabase.storage.from("client-files").createSignedUrls(paths, 60 * 60);
    (data ?? []).forEach((row) => {
      if (row.path) signedMap[row.path] = row.signedUrl ?? null;
    });
  }

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Client";

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href={`/app/clients/${clientId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; {name}
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Files
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{name}&rsquo;s files</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Blood panels, scans, signed waivers, anything you want to keep with this client.
        </p>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}
      {sp.error ? (
        <div className="mb-6 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm">Could not save. Try again.</div>
      ) : null}

      <form action={uploadClientFile} encType="multipart/form-data" className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8 space-y-4">
        <input type="hidden" name="client_id" value={clientId} />
        <div>
          <label className="label" htmlFor="file">File</label>
          <input id="file" name="file" type="file" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <input id="description" name="description" type="text" placeholder="Blood panel Aug 2026" className="input" />
        </div>
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="visible_to_client" value="1" defaultChecked className="w-4 h-4 accent-[var(--color-blue)]" />
            <span className="text-sm">Visible to the client</span>
          </label>
        </div>
        <button type="submit" className="btn btn-primary">Upload file</button>
      </form>

      {(!files || files.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
          No files yet.
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((f) => {
            const url = signedMap[f.file_path] ?? null;
            return (
              <div key={f.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <a href={url ?? "#"} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[var(--color-blue)]">
                    {f.file_name}
                  </a>
                  {f.description ? (
                    <div className="text-xs text-[var(--color-muted)] mt-0.5 truncate">{f.description}</div>
                  ) : null}
                  <div className="text-[10px] text-[var(--color-subtle)] mt-1">
                    {new Date(f.created_at).toLocaleDateString()}
                    {f.file_size_bytes ? ` · ${Math.ceil(f.file_size_bytes / 1024)} KB` : ""}
                  </div>
                </div>
                <form action={toggleVisibility}>
                  <input type="hidden" name="client_id" value={clientId} />
                  <input type="hidden" name="file_id" value={f.id} />
                  <input type="hidden" name="visible" value={f.visible_to_client ? "0" : "1"} />
                  <button
                    type="submit"
                    className={`text-[10px] uppercase tracking-[1.5px] font-bold px-2.5 py-1 rounded-full ${
                      f.visible_to_client
                        ? "bg-[rgba(34,197,94,0.15)] text-[var(--color-ok)]"
                        : "bg-[rgba(255,255,255,0.06)] text-[var(--color-muted)]"
                    }`}
                  >
                    {f.visible_to_client ? "Visible" : "Hidden"}
                  </button>
                </form>
                <form action={deleteClientFile}>
                  <input type="hidden" name="client_id" value={clientId} />
                  <input type="hidden" name="file_id" value={f.id} />
                  <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]">
                    Delete
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

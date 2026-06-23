import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createNote, deleteNote } from "./actions";

export default async function CoachNotesPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
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

  const { data: notes } = await supabase
    .from("coach_note")
    .select("id, body, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Client";

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href={`/app/clients/${clientId}`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; {name}
      </Link>
      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Coach notes
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{name}</h1>
        <p className="text-[var(--color-muted)] mt-2">
          Private to you. Clients never see these.
        </p>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}

      <form action={createNote} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-8">
        <input type="hidden" name="client_id" value={clientId} />
        <textarea
          name="body"
          rows={4}
          required
          placeholder="Mentioned her dad's surgery is keeping her up. Drop volume on legs next 2 weeks. Check sleep tracker."
          className="input resize-y mb-3"
        />
        <button type="submit" className="btn btn-primary">Add note</button>
      </form>

      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
        Past notes ({notes?.length ?? 0})
      </h2>
      {(!notes || notes.length === 0) ? (
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
          No notes yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
              <div className="text-xs text-[var(--color-subtle)] mb-2">
                {new Date(n.created_at).toLocaleString()}
              </div>
              <div className="whitespace-pre-wrap text-sm">{n.body}</div>
              <form action={deleteNote} className="mt-3 pt-3 border-t border-[var(--color-line)]">
                <input type="hidden" name="client_id" value={clientId} />
                <input type="hidden" name="note_id" value={n.id} />
                <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]">
                  Delete
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

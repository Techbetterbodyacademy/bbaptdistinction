import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signTransformationPhotos } from "@/lib/storage";
import { generatePost } from "./actions";

export default async function NewPostPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id: clientId } = await params;
  const sp = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, coach_name")
    .eq("owner_id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("client_profile")
    .select(`
      id, start_weight_kg, current_weight_kg, age,
      user_profile:user_id(full_name)
    `)
    .eq("id", clientId)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Client";

  const [{ data: intake }, { data: photos }, { data: latestCheckin }, { data: sessionCount }] = await Promise.all([
    supabase.from("intake_response").select("primary_goal, why_now").eq("client_id", client.id).maybeSingle(),
    supabase.from("transformation_photo").select("id, pose, blob_url, transformation_entry:entry_id(entry_date)").eq("client_id", client.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("check_in").select("week_number, weight_kg, wins").eq("client_id", client.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("workout_session").select("id", { count: "exact", head: true }).eq("client_id", client.id)
  ]);

  const photoPaths = (photos ?? []).map((p) => p.blob_url);
  const signed = await signTransformationPhotos(supabase, photoPaths);

  const weightDelta = client.start_weight_kg && client.current_weight_kg
    ? (client.current_weight_kg - client.start_weight_kg).toFixed(1)
    : null;

  return (
    <main className="px-10 py-10 max-w-3xl">
      <Link href={`/app/clients/${clientId}/posts`} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to {name}&rsquo;s posts
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Generate transformation post
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">{name}</h1>
        <p className="text-[var(--color-muted)] mt-2">
          AI drafts a post using their intake, sessions, check-ins, and progress. You edit it on the next screen.
        </p>
      </header>

      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-5">
        <Stat label="Start weight" value={client.start_weight_kg ? `${client.start_weight_kg} kg` : "—"} />
        <Stat label="Current" value={client.current_weight_kg ? `${client.current_weight_kg} kg` : "—"} />
        <Stat label="Delta" value={weightDelta ? `${weightDelta} kg` : "—"} accent={weightDelta && Number(weightDelta) < 0 ? "good" : undefined} />
        <Stat label="Sessions" value={String((sessionCount as unknown as { count?: number })?.count ?? 0)} />
      </section>

      {intake?.primary_goal ? (
        <div className="mb-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
          <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">Primary goal (from intake)</div>
          <div className="text-sm">{intake.primary_goal}</div>
        </div>
      ) : null}

      {photos && photos.length > 0 ? (
        <div className="mb-6">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
            Pick a photo (optional)
          </h2>
          <form action={generatePost}>
            <input type="hidden" name="client_id" value={client.id} />
            <input type="hidden" name="workspace_id" value={workspace!.id} />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {photos.map((p) => {
                const url = signed[p.blob_url] ?? null;
                return (
                  <label key={p.id} className="cursor-pointer relative">
                    <input type="radio" name="source_photo_id" value={p.id} className="peer sr-only" />
                    <div className="aspect-[3/4] bg-black rounded-lg overflow-hidden border-2 border-transparent peer-checked:border-[var(--color-blue)] hover:border-[var(--color-line-strong)] transition-colors">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={p.pose ?? "photo"} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mt-1 text-center">
                      {p.pose ?? "photo"}
                    </div>
                  </label>
                );
              })}
            </div>

            <PromptOptions />

            {sp.error ? (
              <div className="text-sm text-[var(--color-danger)] mb-4">
                Could not generate. {sp.error === "key" ? "OPENAI_API_KEY not set in Vercel." : sp.error === "ai" ? "AI request failed. Check OpenAI status / quota." : "Try again."}
              </div>
            ) : null}

            <button type="submit" className="btn btn-primary w-full">
              Draft the post
            </button>
          </form>
        </div>
      ) : (
        <form action={generatePost} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
          <input type="hidden" name="client_id" value={client.id} />
          <input type="hidden" name="workspace_id" value={workspace!.id} />
          <p className="text-[var(--color-muted)] text-sm mb-5">
            No transformation photos yet. You can still generate a draft based on intake + sessions + check-ins, and add a photo later.
          </p>
          <PromptOptions />
          {sp.error ? (
            <div className="text-sm text-[var(--color-danger)] mb-4">
              Could not generate. {sp.error === "key" ? "OPENAI_API_KEY not set in Vercel." : sp.error === "ai" ? "AI request failed." : "Try again."}
            </div>
          ) : null}
          <button type="submit" className="btn btn-primary w-full">
            Draft the post
          </button>
        </form>
      )}
    </main>
  );
}

function PromptOptions() {
  return (
    <div className="space-y-4 mb-5">
      <div>
        <label className="label" htmlFor="tone">Tone</label>
        <select id="tone" name="tone" defaultValue="direct" className="input">
          <option value="direct">Direct, plainspoken (BBA default)</option>
          <option value="reflective">Reflective, story-led</option>
          <option value="proof">Proof-heavy, numbers first</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="angle">Angle (optional)</label>
        <input
          id="angle"
          name="angle"
          type="text"
          placeholder="e.g. dad of two, lost the dad bod in 16 weeks"
          className="input"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "good" }) {
  const color = accent === "good" ? "var(--color-ok)" : "var(--color-ink)";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">{label}</div>
      <div className="text-xl font-extrabold" style={{ color }}>{value}</div>
    </div>
  );
}

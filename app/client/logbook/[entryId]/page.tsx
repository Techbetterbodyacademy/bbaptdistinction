import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signTransformationPhotos } from "@/lib/storage";
import { deleteEntry } from "./actions";

export default async function LogbookEntryPage({
  params
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: clientProfile } = await supabase
    .from("client_profile")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!clientProfile) {
    notFound();
  }

  const { data: entry } = await supabase
    .from("transformation_entry")
    .select("*")
    .eq("id", entryId)
    .eq("client_id", clientProfile.id)
    .maybeSingle();

  if (!entry) {
    notFound();
  }

  const { data: photos } = await supabase
    .from("transformation_photo")
    .select("id, pose, blob_url")
    .eq("entry_id", entry.id);

  const photoPaths = (photos ?? []).map((p) => p.blob_url);
  const signed = await signTransformationPhotos(supabase, photoPaths);

  const photoByPose = new Map<string, { url: string | null; path: string }>();
  (photos ?? []).forEach((p) => {
    photoByPose.set(p.pose ?? "other", { url: signed[p.blob_url] ?? null, path: p.blob_url });
  });

  const measurementRows: Array<{ label: string; value: string | null }> = [
    { label: "Weight", value: entry.weight_kg ? `${entry.weight_kg} kg` : null },
    { label: "Body fat", value: entry.body_fat_pct ? `${entry.body_fat_pct}%` : null },
    { label: "Sleep", value: entry.sleep_hours_avg ? `${entry.sleep_hours_avg} hrs avg` : null },
    { label: "Stress", value: entry.stress_rating ? `${entry.stress_rating}/10` : null },
    { label: "Waist", value: entry.waist_cm ? `${entry.waist_cm} cm` : null },
    { label: "Hips", value: entry.hips_cm ? `${entry.hips_cm} cm` : null },
    { label: "Chest", value: entry.chest_cm ? `${entry.chest_cm} cm` : null },
    { label: "Arm", value: entry.arm_cm ? `${entry.arm_cm} cm` : null },
    { label: "Thigh", value: entry.thigh_cm ? `${entry.thigh_cm} cm` : null }
  ];

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/client/logbook" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to logbook
      </Link>

      <header className="mt-4 mb-8">
        <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
          Entry
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {new Date(entry.entry_date).toLocaleDateString()}
        </h1>
      </header>

      {photoByPose.size > 0 ? (
        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
            Photos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["front", "side", "back"].map((pose) => {
              const photo = photoByPose.get(pose);
              if (!photo) return null;
              return (
                <div key={pose} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden">
                  <div className="aspect-[3/4] bg-black flex items-center justify-center">
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt={`${pose} pose`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-[var(--color-subtle)]">Couldn&rsquo;t load</span>
                    )}
                  </div>
                  <div className="px-3 py-2 text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
                    {pose}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Numbers
        </h2>
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-5">
          {measurementRows.filter((r) => r.value).map((r) => (
            <div key={r.label}>
              <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
                {r.label}
              </div>
              <div className="text-base font-semibold">{r.value}</div>
            </div>
          ))}
          {measurementRows.every((r) => !r.value) ? (
            <div className="col-span-full text-sm text-[var(--color-muted)]">No numbers recorded.</div>
          ) : null}
        </div>
      </section>

      {entry.notes ? (
        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
            Notes
          </h2>
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 text-sm whitespace-pre-wrap">
            {entry.notes}
          </div>
        </section>
      ) : null}

      <form action={deleteEntry} className="mt-10 bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-5">
        <input type="hidden" name="entry_id" value={entry.id} />
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-[var(--color-muted)]">
            Delete this entry. Photos go with it.
          </div>
          <button type="submit" className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]">
            Delete
          </button>
        </div>
      </form>
    </main>
  );
}

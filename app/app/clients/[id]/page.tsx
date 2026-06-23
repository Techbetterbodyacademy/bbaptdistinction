import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signTransformationPhotos } from "@/lib/storage";
import { Sparkline } from "@/components/sparkline";
import { setClientStage } from "./stage-actions";
import { scheduleLifecycleEvent, markEventComplete, cancelEvent } from "./event-actions";
import { reassignCoach } from "./coach-actions";
import type { LifecycleStage } from "@/lib/jase-watches";
import { LIFECYCLE_EVENT_TYPES, type LifecycleEventType } from "@/lib/lifecycle-event";

type Tab = "activity" | "info" | "logbook";

export default async function ClientDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = sp.tab === "info" ? "info" : sp.tab === "logbook" ? "logbook" : "activity";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id")
    .eq("owner_id", user!.id)
    .single();

  const { data: client } = await supabase
    .from("client_profile")
    .select(`
      id, user_id, coach_id, status, lifecycle_stage, audience, age, height_cm, start_weight_kg, current_weight_kg, created_at,
      user_profile:user_id(full_name, avatar_url)
    `)
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!client) {
    notFound();
  }

  const { data: intake } = await supabase
    .from("intake_response")
    .select("why_now, past_attempts, current_constraints, primary_goal, realistic_timeframe, health_flags, submitted_at")
    .eq("client_id", client.id)
    .maybeSingle();

  const { data: recentSessions } = await supabase
    .from("workout_session")
    .select("id, performed_at, duration_minutes, overall_rpe, notes, workout:workout_id(name, week_number, day_number)")
    .eq("client_id", client.id)
    .order("performed_at", { ascending: false })
    .limit(10);

  const { data: recentCheckins } = await supabase
    .from("check_in")
    .select("id, submitted_at, weight_kg, wins, struggles")
    .eq("client_id", client.id)
    .order("submitted_at", { ascending: false })
    .limit(5);

  const { data: transformations } = await supabase
    .from("transformation_entry")
    .select("id, entry_date, weight_kg, body_fat_pct, waist_cm, hips_cm, chest_cm, sleep_hours_avg, stress_rating, notes")
    .eq("client_id", client.id)
    .order("entry_date", { ascending: false })
    .limit(50);

  const profile = Array.isArray(client.user_profile) ? client.user_profile[0] : client.user_profile;
  const name = profile?.full_name ?? "Unnamed client";
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  const weightDelta =
    client.start_weight_kg && client.current_weight_kg
      ? (client.current_weight_kg - client.start_weight_kg).toFixed(1)
      : null;

  return (
    <main className="px-10 py-10 max-w-5xl">
      <Link href="/app/clients" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to clients
      </Link>

      <header className="flex items-start gap-5 mt-6 mb-8">
        <div className="w-16 h-16 rounded-full bg-[rgba(0,174,239,0.15)] text-[var(--color-blue-glow)] font-extrabold text-xl flex items-center justify-center shrink-0">
          {initials || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
            Client
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-[var(--color-muted)]">
            <span className="capitalize">{client.status}</span>
            <span className="text-[var(--color-subtle)]">&middot;</span>
            <span>Joined {new Date(client.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap items-center gap-2 mb-8">
        <Link href={`/app/clients/${id}/posts`} className="btn btn-ghost text-sm">Posts</Link>
        <Link href={`/app/clients/${id}/habits`} className="btn btn-ghost text-sm">Habits</Link>
        <Link href={`/app/clients/${id}/assessments`} className="btn btn-ghost text-sm">Assessments</Link>
        <Link href={`/app/clients/${id}/results`} className="btn btn-ghost text-sm">Results</Link>
        <Link href={`/app/clients/${id}/notes`} className="btn btn-ghost text-sm">Notes</Link>
        <Link href={`/app/clients/${id}/files`} className="btn btn-ghost text-sm">Files</Link>
      </nav>

      <StageBar
        clientId={client.id}
        currentStage={(client.lifecycle_stage as LifecycleStage) ?? "onboarding"}
      />

      <CoachAssign clientId={client.id} currentCoachId={client.coach_id ?? null} />

      <InterventionPanel clientId={client.id} />

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        <MiniStat label="Status" value={client.status} />
        <MiniStat label="Start weight" value={client.start_weight_kg ? `${client.start_weight_kg} kg` : "—"} />
        <MiniStat label="Current weight" value={client.current_weight_kg ? `${client.current_weight_kg} kg` : "—"} />
        <MiniStat
          label="Delta"
          value={weightDelta ? `${weightDelta} kg` : "—"}
          accent={weightDelta && Number(weightDelta) < 0 ? "good" : undefined}
        />
      </section>

      <div className="border-b border-[var(--color-line)] flex gap-1 mb-6">
        <TabLink id={id} tab="activity" current={tab} label="Activity" />
        <TabLink id={id} tab="logbook" current={tab} label="Logbook" />
        <TabLink id={id} tab="info" current={tab} label="Info" />
      </div>

      {tab === "activity" ? (
        <ActivityTab clientId={id} sessions={recentSessions ?? []} checkins={recentCheckins ?? []} />
      ) : tab === "logbook" ? (
        <LogbookTab clientId={client.id} entries={transformations ?? []} />
      ) : (
        <InfoTab client={client} intake={intake ?? null} />
      )}
    </main>
  );
}

function TabLink({ id, tab, current, label }: { id: string; tab: Tab; current: Tab; label: string }) {
  const active = current === tab;
  return (
    <Link
      href={`/app/clients/${id}?tab=${tab}`}
      className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        active
          ? "border-[var(--color-blue)] text-[var(--color-ink)]"
          : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      }`}
    >
      {label}
    </Link>
  );
}

function MiniStat({
  label,
  value,
  accent
}: {
  label: string;
  value: string;
  accent?: "good" | "bad";
}) {
  const color = accent === "good" ? "var(--color-ok)" : "var(--color-ink)";
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
        {label}
      </div>
      <div className="text-xl font-extrabold capitalize" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function ActivityTab({
  clientId,
  sessions,
  checkins
}: {
  clientId: string;
  sessions: Array<{
    id: string;
    performed_at: string;
    duration_minutes: number | null;
    overall_rpe: number | null;
    notes: string | null;
    workout: { name?: string | null; week_number?: number; day_number?: number } | Array<{ name?: string | null; week_number?: number; day_number?: number }> | null;
  }>;
  checkins: Array<{ id: string; submitted_at: string; weight_kg: number | null; wins: string | null; struggles: string | null }>;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Recent sessions
        </h2>
        {sessions.length === 0 ? (
          <EmptyPanel text="No workouts logged yet. Their first session will show up here." />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const w = Array.isArray(s.workout) ? s.workout[0] : s.workout;
              return (
                <Link
                  key={s.id}
                  href={`/app/clients/${clientId}/sessions/${s.id}`}
                  className="block bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4 hover:border-[var(--color-blue)] transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-semibold">
                      {w?.name || (w ? `Week ${w.week_number} · Day ${w.day_number}` : "Session")}
                    </div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {new Date(s.performed_at).toLocaleString()}
                      {s.duration_minutes ? ` · ${s.duration_minutes} min` : ""}
                      {s.overall_rpe ? ` · RPE ${s.overall_rpe}` : ""}
                    </div>
                  </div>
                  {s.notes ? (
                    <div className="text-sm text-[var(--color-muted)] mt-2 line-clamp-2">{s.notes}</div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Recent check-ins
        </h2>
        {checkins.length === 0 ? (
          <EmptyPanel text="No check-ins yet." />
        ) : (
          <div className="space-y-2">
            {checkins.map((c) => (
              <div key={c.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-semibold">{new Date(c.submitted_at).toLocaleDateString()}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {c.weight_kg ? `${c.weight_kg} kg` : ""}
                  </div>
                </div>
                {c.wins ? (
                  <div className="text-sm mt-2"><span className="text-[var(--color-ok)] font-semibold">Wins:</span> {c.wins}</div>
                ) : null}
                {c.struggles ? (
                  <div className="text-sm mt-1"><span className="text-[var(--color-warn)] font-semibold">Struggles:</span> {c.struggles}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function LogbookTab({
  clientId,
  entries
}: {
  clientId: string;
  entries: Array<{
    id: string;
    entry_date: string;
    weight_kg: number | null;
    body_fat_pct: number | null;
    waist_cm: number | null;
    hips_cm: number | null;
    chest_cm: number | null;
    sleep_hours_avg: number | null;
    stress_rating: number | null;
    notes: string | null;
  }>;
}) {
  const sorted = entries.slice().reverse();
  const weightPoints = sorted.map((e) => ({ x: e.entry_date, y: e.weight_kg }));
  const waistPoints = sorted.map((e) => ({ x: e.entry_date, y: e.waist_cm }));

  const supabase = await createClient();
  const earliest = sorted[0];
  const latest = entries[0];

  const [{ data: earliestPhotos }, { data: latestPhotos }] = earliest && latest && earliest.id !== latest.id
    ? await Promise.all([
        supabase.from("transformation_photo").select("pose, blob_url").eq("entry_id", earliest.id).eq("client_id", clientId),
        supabase.from("transformation_photo").select("pose, blob_url").eq("entry_id", latest.id).eq("client_id", clientId)
      ])
    : [{ data: null }, { data: null }];

  const allPaths = [
    ...(earliestPhotos ?? []).map((p) => p.blob_url),
    ...(latestPhotos ?? []).map((p) => p.blob_url)
  ].filter(Boolean) as string[];
  const signed = allPaths.length > 0 ? await signTransformationPhotos(supabase, allPaths) : {};

  const earliestByPose = new Map<string, string | null>();
  (earliestPhotos ?? []).forEach((p) => earliestByPose.set(p.pose ?? "other", signed[p.blob_url] ?? null));
  const latestByPose = new Map<string, string | null>();
  (latestPhotos ?? []).forEach((p) => latestByPose.set(p.pose ?? "other", signed[p.blob_url] ?? null));

  if (entries.length === 0) {
    return <EmptyPanel text="No logbook entries yet. Once the client logs measurements or photos, they show up here." />;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TrendCard label="Weight" unit="kg" points={weightPoints} latest={latest?.weight_kg ?? null} earliest={earliest?.weight_kg ?? null} />
        <TrendCard label="Waist" unit="cm" points={waistPoints} latest={latest?.waist_cm ?? null} earliest={earliest?.waist_cm ?? null} accentColor="var(--color-warn)" />
      </div>

      {earliestByPose.size > 0 || latestByPose.size > 0 ? (
        <div>
          <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
            Side-by-side · {new Date(earliest!.entry_date).toLocaleDateString()} vs {new Date(latest!.entry_date).toLocaleDateString()}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["front", "side", "back"].map((pose) => (
              <PoseCompare key={pose} pose={pose} before={earliestByPose.get(pose) ?? null} after={latestByPose.get(pose) ?? null} />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          All entries
        </h2>
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-4">
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-semibold">{new Date(e.entry_date).toLocaleDateString()}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  {e.weight_kg ? `${e.weight_kg} kg` : ""}
                  {e.body_fat_pct ? ` · ${e.body_fat_pct}% BF` : ""}
                  {e.waist_cm ? ` · waist ${e.waist_cm} cm` : ""}
                </div>
              </div>
              {e.notes ? (
                <div className="text-sm text-[var(--color-muted)] mt-2 line-clamp-3">{e.notes}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TrendCard({
  label,
  unit,
  points,
  latest,
  earliest,
  accentColor = "var(--color-blue-glow)"
}: {
  label: string;
  unit: string;
  points: Array<{ x: string; y: number | null }>;
  latest: number | null;
  earliest: number | null;
  accentColor?: string;
}) {
  const delta = latest && earliest && latest !== earliest ? (latest - earliest).toFixed(1) : null;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">{label}</div>
        {delta ? (
          <div className={`text-xs font-bold ${Number(delta) < 0 ? "text-[var(--color-ok)]" : "text-[var(--color-warn)]"}`}>
            {Number(delta) > 0 ? "+" : ""}{delta} {unit}
          </div>
        ) : null}
      </div>
      <div className="text-2xl font-extrabold mb-2">{latest ? `${latest} ${unit}` : "—"}</div>
      <Sparkline points={points} width={260} height={48} color={accentColor} />
    </div>
  );
}

function PoseCompare({ pose, before, after }: { pose: string; before: string | null; after: string | null }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden">
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold px-3 py-2 border-b border-[var(--color-line)]">
        {pose}
      </div>
      <div className="grid grid-cols-2">
        <div className="aspect-[3/4] bg-black flex items-center justify-center border-r border-[var(--color-line)]">
          {before ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={before} alt={`${pose} before`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-[var(--color-subtle)]">No photo</span>
          )}
        </div>
        <div className="aspect-[3/4] bg-black flex items-center justify-center">
          {after ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={after} alt={`${pose} after`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-[var(--color-subtle)]">No photo</span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold border-t border-[var(--color-line)]">
        <div className="px-3 py-1.5 text-center border-r border-[var(--color-line)]">Before</div>
        <div className="px-3 py-1.5 text-center">Now</div>
      </div>
    </div>
  );
}

function InfoTab({
  client,
  intake
}: {
  client: { age: number | null; height_cm: number | null; audience: string | null };
  intake: {
    why_now: string | null;
    past_attempts: string | null;
    current_constraints: string | null;
    primary_goal: string | null;
    realistic_timeframe: string | null;
    health_flags: string | null;
    submitted_at: string | null;
  } | null;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Basics
        </h2>
        <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Age" value={client.age ? String(client.age) : "—"} />
          <Field label="Height" value={client.height_cm ? `${client.height_cm} cm` : "—"} />
          <Field label="Audience" value={client.audience ?? "—"} />
        </div>
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-3">
          Real Reasons intake
        </h2>
        {!intake ? (
          <EmptyPanel text="Intake form not submitted yet." />
        ) : (
          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 space-y-4">
            <IntakeField label="Why now" value={intake.why_now} />
            <IntakeField label="Primary goal" value={intake.primary_goal} />
            <IntakeField label="Past attempts" value={intake.past_attempts} />
            <IntakeField label="Current constraints" value={intake.current_constraints} />
            <IntakeField label="Realistic timeframe" value={intake.realistic_timeframe} />
            <IntakeField label="Health flags" value={intake.health_flags} />
            {intake.submitted_at ? (
              <div className="text-xs text-[var(--color-subtle)] pt-3 border-t border-[var(--color-line)]">
                Submitted {new Date(intake.submitted_at).toLocaleString()}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
        {label}
      </div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function IntakeField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
        {label}
      </div>
      <div className="text-sm text-[var(--color-ink)] whitespace-pre-wrap">
        {value || <span className="text-[var(--color-subtle)]">—</span>}
      </div>
    </div>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-6 text-sm text-[var(--color-muted)]">
      {text}
    </div>
  );
}

const STAGES: Array<{ key: LifecycleStage; label: string; tint: string }> = [
  { key: "onboarding", label: "Onboarding", tint: "rgb(107, 114, 128)" },
  { key: "kickoff", label: "Kickoff", tint: "rgb(168, 85, 247)" },
  { key: "momentum", label: "Momentum", tint: "rgb(0, 174, 239)" },
  { key: "celebration", label: "Celebration", tint: "rgb(34, 197, 94)" },
  { key: "challenge_upgrade", label: "Challenge upgrade", tint: "rgb(20, 184, 166)" },
  { key: "catchup_call", label: "Catchup call", tint: "rgb(245, 158, 11)" },
  { key: "retreat", label: "Retreat", tint: "rgb(99, 102, 241)" },
  { key: "renewed", label: "Renewed", tint: "rgb(0, 174, 239)" },
  { key: "offboarded", label: "Offboarded", tint: "rgb(239, 68, 68)" }
];

const EVENT_TYPE_LABELS: Record<LifecycleEventType, string> = {
  catchup_call: "Catchup call",
  retreat: "Retreat",
  kickoff_call: "Kickoff call",
  celebration_call: "Celebration call",
  strategy_call: "Strategy call"
};

async function InterventionPanel({ clientId }: { clientId: string }) {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("lifecycle_event")
    .select("id, event_type, scheduled_for, duration_minutes, status, notes, outcome, completed_at")
    .eq("client_id", clientId)
    .order("scheduled_for", { ascending: false })
    .limit(20);

  const upcoming = (events ?? []).filter((e) => e.status === "scheduled" && Date.parse(e.scheduled_for) >= Date.now());
  const past = (events ?? []).filter((e) => !(e.status === "scheduled" && Date.parse(e.scheduled_for) >= Date.now()));

  // Default to 1 day from now at 10am for the form
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  const defaultDt = tomorrow.toISOString().slice(0, 16);

  return (
    <section className="mb-8">
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-3">
        Intervention calls
      </div>

      {upcoming.length > 0 ? (
        <div className="space-y-2 mb-4">
          {upcoming.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-blue)] bg-[rgba(0,174,239,0.04)]"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{EVENT_TYPE_LABELS[e.event_type as LifecycleEventType]}</div>
                <div className="text-xs text-[var(--color-muted)] mt-0.5">
                  {new Date(e.scheduled_for).toLocaleString()} &middot; {e.duration_minutes} min
                </div>
                {e.notes ? <div className="text-xs text-[var(--color-muted)] mt-1">{e.notes}</div> : null}
              </div>
              <form action={markEventComplete} className="flex items-center gap-2">
                <input type="hidden" name="event_id" value={e.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <input
                  name="outcome"
                  placeholder="Outcome (optional)"
                  className="input text-xs py-1.5 px-3 w-44"
                />
                <button type="submit" className="btn btn-primary text-xs px-3 py-1.5">Mark done</button>
              </form>
              <form action={cancelEvent}>
                <input type="hidden" name="event_id" value={e.id} />
                <input type="hidden" name="client_id" value={clientId} />
                <button type="submit" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)] px-2">
                  Cancel
                </button>
              </form>
            </div>
          ))}
        </div>
      ) : null}

      <details className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl">
        <summary className="cursor-pointer p-5 font-semibold flex items-center justify-between">
          <span>Schedule an intervention</span>
          <span className="text-[var(--color-blue-glow)] text-xl leading-none">+</span>
        </summary>
        <form action={scheduleLifecycleEvent} className="p-5 pt-0 space-y-3">
          <input type="hidden" name="client_id" value={clientId} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="event_type">Type</label>
              <select id="event_type" name="event_type" defaultValue="catchup_call" className="input">
                {LIFECYCLE_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="duration_minutes">Duration (min)</label>
              <input
                id="duration_minutes"
                name="duration_minutes"
                type="number"
                min="5"
                step="5"
                defaultValue={30}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="scheduled_for">When</label>
            <input
              id="scheduled_for"
              name="scheduled_for"
              type="datetime-local"
              required
              defaultValue={defaultDt}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="event_notes">Notes (optional)</label>
            <textarea
              id="event_notes"
              name="notes"
              rows={2}
              placeholder="Why this call? What to cover?"
              className="input resize-y"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="move_stage" defaultChecked />
            <span>Also move this client to the matching lifecycle stage</span>
          </label>
          <button type="submit" className="btn btn-primary">Schedule call</button>
        </form>
      </details>

      {past.length > 0 ? (
        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Past interventions
          </div>
          <div className="space-y-1.5">
            {past.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs">{EVENT_TYPE_LABELS[e.event_type as LifecycleEventType]}</div>
                  <div className="text-[10px] text-[var(--color-subtle)] mt-0.5">
                    {new Date(e.scheduled_for).toLocaleString()}
                  </div>
                  {e.outcome ? <div className="text-xs text-[var(--color-muted)] mt-1">{e.outcome}</div> : null}
                </div>
                <span
                  className="text-[10px] uppercase tracking-[1.5px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: e.status === "completed" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                    color: e.status === "completed" ? "var(--color-ok)" : "var(--color-subtle)"
                  }}
                >
                  {e.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

async function CoachAssign({
  clientId,
  currentCoachId
}: {
  clientId: string;
  currentCoachId: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: workspace } = await supabase
    .from("workspace")
    .select("id, coach_name")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) return null;

  const { data: trainers } = await supabase
    .from("workspace_trainer")
    .select("user_id, full_name, invite_email, status")
    .eq("workspace_id", workspace.id)
    .eq("status", "accepted");

  const options: Array<{ id: string; label: string }> = [
    {
      id: user.id,
      label: `${workspace.coach_name ?? user.email ?? "Owner"} (You)`
    },
    ...((trainers ?? [])
      .filter((t) => t.user_id)
      .map((t) => ({
        id: t.user_id as string,
        label: t.full_name ?? t.invite_email ?? "Trainer"
      })))
  ];

  const onlyOneOption = options.length === 1;

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 mb-8">
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
            Assigned coach
          </div>
          <div className="text-sm text-[var(--color-muted)] mt-1">
            {onlyOneOption
              ? "Invite trainers from Team access to start distributing clients."
              : "Reassign to balance workload across your support coaches."}
          </div>
        </div>
        <Link href="/app/team/workload" className="text-xs text-[var(--color-blue-glow)] hover:underline shrink-0">
          View workload &rarr;
        </Link>
      </div>
      <form action={reassignCoach} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="client_id" value={clientId} />
        <select
          name="coach_id"
          defaultValue={currentCoachId ?? user.id}
          className="input"
          disabled={onlyOneOption}
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary text-sm" disabled={onlyOneOption}>
          Save
        </button>
      </form>
    </section>
  );
}

function StageBar({ clientId, currentStage }: { clientId: string; currentStage: LifecycleStage }) {
  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 mb-8">
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
            Lifecycle stage
          </div>
          <div className="text-sm text-[var(--color-muted)] mt-1">
            Move this client through the funnel. Drives Jase&apos;s churn / retention / renewal numbers.
          </div>
        </div>
      </div>
      <form action={setClientStage} className="flex flex-wrap gap-2">
        <input type="hidden" name="client_id" value={clientId} />
        {STAGES.map((s) => {
          const active = s.key === currentStage;
          return (
            <button
              key={s.key}
              type="submit"
              name="stage"
              value={s.key}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{
                backgroundColor: active ? s.tint : `${s.tint}10`,
                borderColor: active ? s.tint : `${s.tint}40`,
                color: active ? "#fff" : s.tint,
                fontWeight: active ? 700 : 500
              }}
            >
              {s.label}
            </button>
          );
        })}
      </form>
    </section>
  );
}

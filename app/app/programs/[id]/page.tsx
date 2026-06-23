import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProgram, deleteProgram, addWorkout, setProgramStatus } from "./actions";

const DAYS_PER_WEEK = 7;

export default async function ProgramDetailPage({
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

  const { data: program } = await supabase
    .from("program")
    .select("id, name, description, weeks, audience, status, version")
    .eq("id", id)
    .eq("workspace_id", workspace!.id)
    .maybeSingle();

  if (!program) {
    notFound();
  }

  const { data: workouts } = await supabase
    .from("workout")
    .select("id, week_number, day_number, name, notes")
    .eq("program_id", program.id)
    .order("week_number")
    .order("day_number");

  const { data: assignmentsCount } = await supabase
    .from("program_assignment")
    .select("id", { count: "exact", head: false })
    .eq("program_id", program.id);

  const workoutsBySlot = new Map<string, { id: string; name: string | null; notes: string | null }>();
  (workouts ?? []).forEach((w) => {
    workoutsBySlot.set(`${w.week_number}:${w.day_number}`, {
      id: w.id,
      name: w.name,
      notes: w.notes
    });
  });

  return (
    <main className="px-10 py-10 max-w-6xl">
      <Link href="/app/programs" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-blue)]">
        &larr; Back to programs
      </Link>

      <header className="flex items-start justify-between gap-4 mt-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Program
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{program.name}</h1>
          {program.description ? (
            <p className="text-[var(--color-muted)] mt-2 max-w-2xl">{program.description}</p>
          ) : null}
          <div className="flex items-center gap-3 mt-3 text-sm text-[var(--color-muted)]">
            <span>{program.weeks} weeks</span>
            <span className="text-[var(--color-subtle)]">&middot;</span>
            <span>{program.audience}</span>
            <span className="text-[var(--color-subtle)]">&middot;</span>
            <span>{workouts?.length ?? 0} workouts built</span>
            <span className="text-[var(--color-subtle)]">&middot;</span>
            <span>{(assignmentsCount as unknown as { length?: number })?.length ?? 0} active assignments</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/app/programs/${program.id}/assign`} className="btn btn-primary">Assign</Link>
        </div>
      </header>

      {sp.saved === "1" ? (
        <div className="mb-6 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.3)] rounded-xl p-4 text-sm">Saved.</div>
      ) : null}

      <ProgramMetadataForm program={program} />

      <StatusForm program={program} />

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
          Weekly grid
        </h2>
        <div className="space-y-3">
          {Array.from({ length: program.weeks }, (_, i) => i + 1).map((week) => (
            <WeekRow
              key={week}
              programId={program.id}
              week={week}
              workoutsBySlot={workoutsBySlot}
            />
          ))}
        </div>
      </section>

      <DeleteForm programId={program.id} />
    </main>
  );
}

function ProgramMetadataForm({
  program
}: {
  program: { id: string; name: string; description: string | null; weeks: number; audience: string };
}) {
  return (
    <form action={updateProgram} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-4">
      <input type="hidden" name="id" value={program.id} />
      <h2 className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-4">
        Details
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required defaultValue={program.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="audience">Audience</label>
          <select id="audience" name="audience" defaultValue={program.audience} className="input">
            <option value="men-40-60">Men 40-60</option>
            <option value="women-35-60">Women 35-60</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className="label" htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={program.description ?? ""}
          className="input resize-y"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="label" htmlFor="weeks">Weeks</label>
          <input id="weeks" name="weeks" type="number" min="1" max="52" defaultValue={program.weeks} className="input" />
        </div>
      </div>
      <button type="submit" className="btn btn-primary">Save details</button>
    </form>
  );
}

function StatusForm({ program }: { program: { id: string; status: string } }) {
  return (
    <form action={setProgramStatus} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 flex items-center justify-between gap-4">
      <input type="hidden" name="id" value={program.id} />
      <div>
        <div className="text-sm uppercase tracking-[1.5px] font-bold text-[var(--color-subtle)] mb-1">Status</div>
        <div className="text-base font-bold capitalize">{program.status}</div>
      </div>
      <div className="flex items-center gap-2">
        {program.status !== "published" ? (
          <button type="submit" name="status" value="published" className="btn btn-primary">
            Publish
          </button>
        ) : null}
        {program.status !== "draft" ? (
          <button type="submit" name="status" value="draft" className="btn btn-ghost">
            Move to draft
          </button>
        ) : null}
        {program.status !== "archived" ? (
          <button type="submit" name="status" value="archived" className="btn btn-ghost">
            Archive
          </button>
        ) : null}
      </div>
    </form>
  );
}

function WeekRow({
  programId,
  week,
  workoutsBySlot
}: {
  programId: string;
  week: number;
  workoutsBySlot: Map<string, { id: string; name: string | null; notes: string | null }>;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-line)] bg-[var(--color-bg-deep)]">
        <div className="font-bold">Week {week}</div>
      </div>
      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: DAYS_PER_WEEK }, (_, i) => i + 1).map((day) => {
          const slot = workoutsBySlot.get(`${week}:${day}`);
          return (
            <DayCell
              key={day}
              programId={programId}
              week={week}
              day={day}
              workout={slot}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  programId,
  week,
  day,
  workout
}: {
  programId: string;
  week: number;
  day: number;
  workout: { id: string; name: string | null; notes: string | null } | undefined;
}) {
  if (workout) {
    return (
      <Link
        href={`/app/programs/${programId}/workouts/${workout.id}`}
        className="block p-3 border-r last:border-r-0 border-[var(--color-line)] hover:bg-[rgba(0,174,239,0.06)] transition-colors min-h-[88px]"
      >
        <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-1">
          Day {day}
        </div>
        <div className="font-semibold text-sm text-[var(--color-blue-glow)] truncate">
          {workout.name || "Untitled"}
        </div>
        {workout.notes ? (
          <div className="text-xs text-[var(--color-muted)] truncate mt-1">{workout.notes}</div>
        ) : null}
      </Link>
    );
  }
  return (
    <form
      action={addWorkout}
      className="p-3 border-r last:border-r-0 border-[var(--color-line)] hover:bg-[rgba(255,255,255,0.02)] transition-colors min-h-[88px] flex flex-col justify-between"
    >
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="week_number" value={week} />
      <input type="hidden" name="day_number" value={day} />
      <div className="text-[10px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
        Day {day}
      </div>
      <button type="submit" className="text-xs text-[var(--color-blue)] hover:text-[var(--color-blue-glow)] text-left">
        + Add workout
      </button>
    </form>
  );
}

function DeleteForm({ programId }: { programId: string }) {
  return (
    <form action={deleteProgram} className="mt-10 bg-[var(--color-surface)] border border-[rgba(239,68,68,0.2)] rounded-2xl p-6">
      <input type="hidden" name="id" value={programId} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-bold mb-1">Delete this program</div>
          <div className="text-sm text-[var(--color-muted)]">
            Removes the program, all its workouts, and unassigns it from clients.
          </div>
        </div>
        <button type="submit" className="btn btn-ghost border-[rgba(239,68,68,0.4)] text-[var(--color-danger)]">
          Delete
        </button>
      </div>
    </form>
  );
}

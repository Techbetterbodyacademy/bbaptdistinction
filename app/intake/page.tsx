import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { submitIntake } from "./actions";

export default async function IntakePage({
  searchParams
}: {
  searchParams: Promise<{ invite?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profile")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "client") {
    redirect("/client");
  }

  let invite = null;
  if (params.invite) {
    const { data } = await supabase
      .from("client_invite")
      .select("id, workspace_id, coach_id, full_name, email, status, token")
      .eq("token", params.invite)
      .maybeSingle();
    invite = data;
  } else {
    const { data } = await supabase
      .from("client_invite")
      .select("id, workspace_id, coach_id, full_name, email, status, token")
      .eq("status", "pending")
      .ilike("email", user.email ?? "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    invite = data;
  }

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">No invite found</h1>
          <p className="text-[var(--color-muted)]">
            Ask your coach to resend your invite link.
          </p>
        </div>
      </main>
    );
  }

  if (invite.status !== "pending") {
    redirect("/client");
  }

  const { data: workspace } = await supabase
    .from("workspace")
    .select("name, coach_name, primary_color")
    .eq("id", invite.workspace_id)
    .maybeSingle();

  return (
    <main className="min-h-screen px-6 py-12" style={{ ["--color-blue" as string]: workspace?.primary_color ?? "#00AEEF" }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-10 text-center">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold mb-2">
            Real Reasons
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {workspace?.coach_name ? `${workspace.coach_name} wants to know the real reasons.` : "Tell us the real reasons."}
          </h1>
          <p className="text-[var(--color-muted)] mt-3">
            Be honest. The more truth you put in, the more useful your coaching will be.
          </p>
        </div>

        <form action={submitIntake} className="space-y-6 bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-7">
          <input type="hidden" name="invite_token" value={invite.token} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="age">Age</label>
              <input id="age" name="age" type="number" min="14" max="100" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="height_cm">Height (cm)</label>
              <input id="height_cm" name="height_cm" type="number" step="0.1" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="current_weight_kg">Current weight (kg)</label>
              <input id="current_weight_kg" name="current_weight_kg" type="number" step="0.1" required className="input" />
            </div>
          </div>

          <Question
            id="primary_goal"
            label="What outcome do you actually want?"
            help="Not what sounds good. What would change things for you."
            placeholder="e.g. Lose 10kg, get out of constant lower-back pain, be able to play with my kids without getting winded"
          />

          <Question
            id="why_now"
            label="Why now?"
            help="What changed recently that made you take the step today?"
            placeholder="e.g. Saw a photo from a family event, doctor flagged my bloods, hit a number I swore I wouldn't"
          />

          <Question
            id="past_attempts"
            label="What have you tried before, and where did it stop working?"
            help="Specific honesty here helps more than diet names."
            placeholder="e.g. Did keto for 6 weeks, lost 5kg, gained it back when traveling. Tried F45 for 3 months but never adjusted food"
          />

          <Question
            id="current_constraints"
            label="What's actually in the way?"
            help="Time, sleep, work schedule, family, injuries, anything that breaks a plan."
            placeholder="e.g. I travel 2 weeks a month, my sleep is broken because of a toddler, my knees don't like running"
          />

          <Question
            id="realistic_timeframe"
            label="What's a realistic timeframe for you?"
            help="Months not days."
            placeholder="e.g. 6 months to feel different, 12 months to be where I want to be"
          />

          <Question
            id="health_flags"
            label="Anything we need to know health-wise?"
            help="Conditions, medications, injuries, surgeries, anything your doctor would want us to know."
            placeholder="e.g. High blood pressure, on metformin, herniated L4-L5 from 2019"
            optional
          />

          {params.error ? (
            <div className="text-sm text-[var(--color-danger)]">
              Could not submit. Try again.
            </div>
          ) : null}

          <div className="pt-2">
            <button type="submit" className="btn btn-primary w-full">
              Submit intake
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function Question({
  id,
  label,
  help,
  placeholder,
  optional
}: {
  id: string;
  label: string;
  help: string;
  placeholder: string;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="label flex items-baseline justify-between" htmlFor={id}>
        <span>{label}</span>
        {optional ? <span className="text-[var(--color-subtle)] normal-case tracking-normal text-[10px] font-medium">Optional</span> : null}
      </label>
      <textarea
        id={id}
        name={id}
        required={!optional}
        rows={3}
        placeholder={placeholder}
        className="input resize-y"
      />
      <p className="text-[var(--color-subtle)] text-xs mt-2">{help}</p>
    </div>
  );
}

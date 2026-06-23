"use client";

import { useState } from "react";
import { updateBiometrics } from "./biometrics-actions";

type Props = {
  clientId: string;
  age: number | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  sex: "male" | "female" | "neutral" | null;
  saved?: boolean;
};

export function BiometricsForm({ clientId, age, heightCm, currentWeightKg, sex, saved }: Props) {
  const [open, setOpen] = useState<boolean>(age == null || heightCm == null || currentWeightKg == null);

  const allSet = age != null && heightCm != null && currentWeightKg != null;

  if (!open) {
    return (
      <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-5 flex items-center justify-between gap-4 mb-6">
        <div className="text-sm text-[var(--color-muted)]">
          <strong className="text-[var(--color-ink)]">Biometrics:</strong>{" "}
          {age} yr . {heightCm} cm . {currentWeightKg} kg . {sex ?? "neutral"}
        </div>
        <button type="button" onClick={() => setOpen(true)} className="btn btn-ghost text-sm">
          Edit
        </button>
      </section>
    );
  }

  return (
    <section className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">
            Biometrics
          </h2>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Needed for the Meal plan auto-calc. {allSet ? "" : "Some fields are missing."}
          </p>
          {saved ? (
            <div className="text-xs text-[var(--color-blue-glow)] mt-2 font-semibold">Saved</div>
          ) : null}
        </div>
        {allSet && (
          <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost text-sm">
            Cancel
          </button>
        )}
      </div>

      <form action={updateBiometrics} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input type="hidden" name="client_id" value={clientId} />

        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Age</span>
          <input
            type="number"
            name="age"
            min={16}
            max={99}
            defaultValue={age ?? ""}
            placeholder="e.g. 45"
            className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Sex (Mifflin)</span>
          <select
            name="sex"
            defaultValue={sex ?? "neutral"}
            className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="neutral">Prefer not to say</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Height (cm)</span>
          <input
            type="number"
            name="height_cm"
            min={120}
            max={230}
            step="0.1"
            defaultValue={heightCm ?? ""}
            placeholder="e.g. 180"
            className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[1.5px] text-[var(--color-subtle)] font-bold">Current weight (kg)</span>
          <input
            type="number"
            name="current_weight_kg"
            min={35}
            max={250}
            step="0.1"
            defaultValue={currentWeightKg ?? ""}
            placeholder="e.g. 90"
            className="mt-1 w-full bg-[var(--color-bg-deep)] border border-[var(--color-line)] rounded-lg px-3 py-2 text-sm"
          />
        </label>

        <div className="sm:col-span-2 flex items-center justify-end">
          <button type="submit" className="btn btn-primary text-sm">
            Save biometrics
          </button>
        </div>
      </form>
    </section>
  );
}

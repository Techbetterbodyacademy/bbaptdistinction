export function easeOutCubic(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3);
}

export function valueAtProgress(start: number, end: number, progress: number): number {
  const eased = easeOutCubic(progress);
  return start + (end - start) * eased;
}

export type ParsedStat = { value: number; prefix: string; suffix: string };

export function parseStatValue(raw: string): ParsedStat {
  const match = raw.match(/^([^\d-]*)([\d,]+(?:\.\d+)?)(.*)$/);
  if (!match) {
    return { value: 0, prefix: "", suffix: raw };
  }
  const [, prefix, numPart, suffix] = match;
  const value = Number(numPart.replace(/,/g, ""));
  return { value, prefix, suffix };
}

export function formatStatValue(value: number, prefix: string, suffix: string): string {
  const rounded = Math.round(value);
  const formatted = rounded >= 1000 ? rounded.toLocaleString("en-US") : String(rounded);
  return `${prefix}${formatted}${suffix}`;
}

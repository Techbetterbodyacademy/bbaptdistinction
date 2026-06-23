export function generateOtpCode(): string {
  // 6-digit zero-padded numeric code
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
}

export function isOtpExpired(issuedAt: Date, now: Date, ttlSeconds = 600): boolean {
  const ageSeconds = (now.getTime() - issuedAt.getTime()) / 1000;
  return ageSeconds > ttlSeconds;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

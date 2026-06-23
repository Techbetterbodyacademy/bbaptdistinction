export function slugifyWorkspaceName(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

type Options = {
  maxAttempts?: number;
};

export async function generateUniqueSlug(
  base: string,
  isUsed: (slug: string) => Promise<boolean>,
  opts: Options = {}
): Promise<string> {
  const maxAttempts = opts.maxAttempts ?? 8;

  let candidate = base;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const taken = await isUsed(candidate);
    if (!taken) return candidate;
    candidate = `${base}-${randomSuffix()}`;
  }

  // Guaranteed-unique fallback: UUID fragment
  return `${base}-${cryptoRandomHex8()}`;
}

function cryptoRandomHex8(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export const PACKAGE_INTERVALS = ["one_time", "monthly", "yearly"] as const;
export type PackageInterval = typeof PACKAGE_INTERVALS[number];

export type PackageInput = {
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  interval: PackageInterval;
};

export type PackageRecord = {
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: PackageInterval;
};

export type PrepareResult =
  | { ok: true; record: PackageRecord }
  | { ok: false; error: string };

export function prepareCoachingPackage(input: PackageInput): PrepareResult {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "name required" };
  if (!Number.isInteger(input.price_cents)) return { ok: false, error: "price_cents must be an integer" };
  if (input.price_cents <= 0) return { ok: false, error: "price_cents must be > 0" };
  if (!PACKAGE_INTERVALS.includes(input.interval)) return { ok: false, error: "interval invalid" };
  const description = input.description?.trim() ?? "";
  return {
    ok: true,
    record: {
      name,
      description: description.length ? description : null,
      price_cents: input.price_cents,
      currency: input.currency.toLowerCase(),
      interval: input.interval
    }
  };
}

const CURRENCY_PREFIX: Record<string, string> = {
  usd: "$",
  aud: "A$",
  gbp: "£",
  eur: "€"
};

export function formatPriceCents(cents: number, currency: string): string {
  const prefix = CURRENCY_PREFIX[currency.toLowerCase()] ?? `${currency.toUpperCase()} `;
  const dollars = (cents / 100).toFixed(2);
  return `${prefix}${dollars}`;
}

export type StripeLineItem = {
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: { name: string; description?: string };
    recurring?: { interval: "month" | "year" };
  };
  quantity: number;
};

export function stripeLineItem(input: {
  name: string;
  description?: string;
  price_cents: number;
  currency: string;
  interval: PackageInterval;
}): StripeLineItem {
  const product_data: { name: string; description?: string } = { name: input.name };
  if (input.description) product_data.description = input.description;

  const price_data: StripeLineItem["price_data"] = {
    currency: input.currency.toLowerCase(),
    unit_amount: input.price_cents,
    product_data
  };

  if (input.interval === "monthly") {
    price_data.recurring = { interval: "month" };
  } else if (input.interval === "yearly") {
    price_data.recurring = { interval: "year" };
  }

  return { price_data, quantity: 1 };
}

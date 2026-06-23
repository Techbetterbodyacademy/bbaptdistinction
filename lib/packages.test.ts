import { describe, test, expect } from "vitest";
import { prepareCoachingPackage, formatPriceCents, stripeLineItem } from "./packages";

describe("prepareCoachingPackage", () => {
  test("clean record for valid input", () => {
    const result = prepareCoachingPackage({
      name: "  3-month coaching  ",
      description: " Weekly check-ins ",
      price_cents: 49900,
      currency: "usd",
      interval: "one_time"
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.name).toBe("3-month coaching");
      expect(result.record.description).toBe("Weekly check-ins");
      expect(result.record.price_cents).toBe(49900);
      expect(result.record.currency).toBe("usd");
    }
  });

  test("rejects empty name", () => {
    const result = prepareCoachingPackage({
      name: " ",
      price_cents: 100,
      currency: "usd",
      interval: "one_time"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/name/i);
  });

  test("rejects non-integer price", () => {
    const result = prepareCoachingPackage({
      name: "x",
      price_cents: 99.5,
      currency: "usd",
      interval: "one_time"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/price/i);
  });

  test("rejects zero or negative price", () => {
    const r1 = prepareCoachingPackage({ name: "x", price_cents: 0, currency: "usd", interval: "one_time" });
    expect(r1.ok).toBe(false);
    const r2 = prepareCoachingPackage({ name: "x", price_cents: -100, currency: "usd", interval: "one_time" });
    expect(r2.ok).toBe(false);
  });

  test("rejects invalid interval", () => {
    const result = prepareCoachingPackage({
      name: "x",
      price_cents: 100,
      currency: "usd",
      interval: "yearly_quarterly" as never
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/interval/i);
  });

  test("lowercases currency", () => {
    const result = prepareCoachingPackage({
      name: "x",
      price_cents: 100,
      currency: "USD",
      interval: "one_time"
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.currency).toBe("usd");
  });
});

describe("formatPriceCents", () => {
  test("formats USD", () => {
    expect(formatPriceCents(49900, "usd")).toBe("$499.00");
  });

  test("formats whole dollars", () => {
    expect(formatPriceCents(50000, "usd")).toBe("$500.00");
  });

  test("formats odd amounts", () => {
    expect(formatPriceCents(50, "usd")).toBe("$0.50");
  });

  test("supports AUD", () => {
    expect(formatPriceCents(10000, "aud")).toBe("A$100.00");
  });
});

describe("stripeLineItem", () => {
  test("builds one-time line item", () => {
    const item = stripeLineItem({
      name: "3-month coaching",
      description: "Weekly check-ins",
      price_cents: 49900,
      currency: "usd",
      interval: "one_time"
    });
    expect(item.price_data.currency).toBe("usd");
    expect(item.price_data.unit_amount).toBe(49900);
    expect(item.price_data.product_data.name).toBe("3-month coaching");
    expect(item.price_data.product_data.description).toBe("Weekly check-ins");
    expect(item.quantity).toBe(1);
    expect("recurring" in item.price_data).toBe(false);
  });

  test("builds monthly recurring line item", () => {
    const item = stripeLineItem({
      name: "Monthly coaching",
      price_cents: 19900,
      currency: "usd",
      interval: "monthly"
    });
    expect(item.price_data.recurring).toEqual({ interval: "month" });
  });
});

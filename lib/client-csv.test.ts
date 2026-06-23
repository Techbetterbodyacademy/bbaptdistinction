import { describe, test, expect } from "vitest";
import { parseClientCsv, prepareClientRow } from "./client-csv";

describe("parseClientCsv", () => {
  test("parses a simple CSV with header row", () => {
    const csv = `full_name,email,age,height_cm,current_weight_kg,lifecycle_stage
Alice Smith,alice@example.com,42,170,75,momentum
Bob Jones,bob@example.com,55,180,90,kickoff`;
    const result = parseClientCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].full_name).toBe("Alice Smith");
      expect(result.rows[0].email).toBe("alice@example.com");
      expect(result.rows[0].age).toBe(42);
      expect(result.rows[1].full_name).toBe("Bob Jones");
    }
  });

  test("rejects when header row is missing required columns", () => {
    const csv = `name,email
Alice,alice@example.com`;
    const result = parseClientCsv(csv);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/full_name|column/i);
  });

  test("returns empty rows array when only header is present", () => {
    const csv = `full_name,email
`;
    const result = parseClientCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows).toHaveLength(0);
  });

  test("handles quoted values with commas inside", () => {
    const csv = `full_name,email
"Smith, Alice",alice@example.com`;
    const result = parseClientCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows[0].full_name).toBe("Smith, Alice");
  });

  test("trims and lowercases email", () => {
    const csv = `full_name,email
Alice,  ALICE@EXAMPLE.COM  `;
    const result = parseClientCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows[0].email).toBe("alice@example.com");
  });

  test("supports CRLF line endings", () => {
    const csv = "full_name,email\r\nAlice,alice@example.com\r\nBob,bob@example.com\r\n";
    const result = parseClientCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows).toHaveLength(2);
  });

  test("skips empty lines mid-CSV", () => {
    const csv = `full_name,email
Alice,alice@example.com

Bob,bob@example.com`;
    const result = parseClientCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.rows).toHaveLength(2);
  });

  test("missing numeric fields become null, not NaN", () => {
    const csv = `full_name,email,age,height_cm
Alice,alice@example.com,,`;
    const result = parseClientCsv(csv);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows[0].age).toBeNull();
      expect(result.rows[0].height_cm).toBeNull();
    }
  });
});

describe("prepareClientRow", () => {
  test("clean row passes through", () => {
    const r = prepareClientRow({
      full_name: "Alice Smith",
      email: "alice@example.com",
      age: 42,
      height_cm: 170,
      current_weight_kg: 75,
      lifecycle_stage: "momentum"
    });
    expect(r.ok).toBe(true);
  });

  test("rejects empty name", () => {
    const r = prepareClientRow({ full_name: "", email: "x@y.co", age: null, height_cm: null, current_weight_kg: null, lifecycle_stage: "momentum" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name/i);
  });

  test("rejects invalid email", () => {
    const r = prepareClientRow({ full_name: "x", email: "not-an-email", age: null, height_cm: null, current_weight_kg: null, lifecycle_stage: "momentum" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/email/i);
  });

  test("defaults lifecycle_stage to onboarding when blank", () => {
    const r = prepareClientRow({ full_name: "x", email: "x@y.co", age: null, height_cm: null, current_weight_kg: null, lifecycle_stage: "" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.lifecycle_stage).toBe("onboarding");
  });

  test("rejects invalid lifecycle_stage", () => {
    const r = prepareClientRow({ full_name: "x", email: "x@y.co", age: null, height_cm: null, current_weight_kg: null, lifecycle_stage: "magic" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/stage/i);
  });

  test("rejects out-of-range age", () => {
    const r = prepareClientRow({ full_name: "x", email: "x@y.co", age: 200, height_cm: null, current_weight_kg: null, lifecycle_stage: "momentum" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/age/i);
  });
});

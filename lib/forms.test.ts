import { describe, test, expect } from "vitest";
import {
  prepareFormInput,
  prepareQuestionInput,
  validateResponse,
  type FormQuestion
} from "./forms";

describe("prepareFormInput", () => {
  test("clean record for valid input", () => {
    const result = prepareFormInput({
      title: "  Intake Form  ",
      description: "  New client intake  "
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.title).toBe("Intake Form");
      expect(result.record.description).toBe("New client intake");
    }
  });

  test("rejects empty title", () => {
    const r = prepareFormInput({ title: " " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/title/i);
  });

  test("description is optional", () => {
    const r = prepareFormInput({ title: "ok" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.description).toBeNull();
  });
});

describe("prepareQuestionInput", () => {
  test("clean text question", () => {
    const r = prepareQuestionInput({
      label: "  What's your goal?  ",
      kind: "text",
      required: true,
      order_index: 0
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.label).toBe("What's your goal?");
  });

  test("clean choice question", () => {
    const r = prepareQuestionInput({
      label: "How active are you?",
      kind: "choice",
      required: true,
      order_index: 1,
      options: ["Sedentary", "Active", "Very active"]
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.record.options).toEqual(["Sedentary", "Active", "Very active"]);
  });

  test("rejects empty label", () => {
    const r = prepareQuestionInput({ label: " ", kind: "text", required: false, order_index: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/label/i);
  });

  test("rejects choice without options", () => {
    const r = prepareQuestionInput({
      label: "x",
      kind: "choice",
      required: true,
      order_index: 0,
      options: []
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/options/i);
  });

  test("rejects invalid kind", () => {
    const r = prepareQuestionInput({
      label: "x",
      kind: "magic" as never,
      required: false,
      order_index: 0
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/kind/i);
  });
});

describe("validateResponse", () => {
  const questions: FormQuestion[] = [
    { id: "q1", label: "Goal?", kind: "text", required: true, order_index: 0, options: null },
    { id: "q2", label: "Email?", kind: "email", required: true, order_index: 1, options: null },
    { id: "q3", label: "Age?", kind: "number", required: false, order_index: 2, options: null },
    {
      id: "q4",
      label: "Active level?",
      kind: "choice",
      required: true,
      order_index: 3,
      options: ["low", "med", "high"]
    }
  ];

  test("accepts all valid answers", () => {
    const r = validateResponse(questions, {
      q1: "Lose 10kg",
      q2: "alice@example.com",
      q3: "35",
      q4: "med"
    });
    expect(r.ok).toBe(true);
  });

  test("rejects missing required answer", () => {
    const r = validateResponse(questions, { q1: "", q2: "alice@example.com", q4: "med" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.q1).toMatch(/required/i);
  });

  test("allows missing optional answer", () => {
    const r = validateResponse(questions, {
      q1: "x",
      q2: "alice@example.com",
      q3: "",
      q4: "low"
    });
    expect(r.ok).toBe(true);
  });

  test("rejects invalid email", () => {
    const r = validateResponse(questions, {
      q1: "x",
      q2: "not-an-email",
      q4: "low"
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.q2).toMatch(/email/i);
  });

  test("rejects non-numeric number answer", () => {
    const r = validateResponse(questions, {
      q1: "x",
      q2: "a@b.co",
      q3: "fifty",
      q4: "low"
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.q3).toMatch(/number/i);
  });

  test("rejects choice not in options", () => {
    const r = validateResponse(questions, {
      q1: "x",
      q2: "a@b.co",
      q4: "wow"
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.q4).toMatch(/choice/i);
  });
});

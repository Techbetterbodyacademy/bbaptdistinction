import { describe, test, expect } from "vitest";
import {
  prepareTemplateInput,
  prepareTemplateItemInput,
  instantiateFromTemplate,
  type TemplateItemRow
} from "./assessment-template";

describe("prepareTemplateInput", () => {
  test("clean record", () => {
    const r = prepareTemplateInput({
      title: "  Postural Screen  ",
      kind: "postural",
      description: "  Head-to-toe alignment screen  "
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.title).toBe("Postural Screen");
      expect(r.record.kind).toBe("postural");
      expect(r.record.description).toBe("Head-to-toe alignment screen");
    }
  });

  test("rejects empty title", () => {
    const r = prepareTemplateInput({ title: " ", kind: "postural" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/title/i);
  });

  test("rejects invalid kind", () => {
    const r = prepareTemplateInput({ title: "x", kind: "magic" as never });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/kind/i);
  });
});

describe("prepareTemplateItemInput", () => {
  test("clean record", () => {
    const r = prepareTemplateItemInput({
      label: "  Forward head ratio  ",
      unit: "  cm  ",
      target_value: 0,
      order_index: 1
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.label).toBe("Forward head ratio");
      expect(r.record.unit).toBe("cm");
      expect(r.record.target_value).toBe(0);
    }
  });

  test("rejects empty label", () => {
    const r = prepareTemplateItemInput({ label: " ", unit: "cm", order_index: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/label/i);
  });

  test("unit + target_value are optional", () => {
    const r = prepareTemplateItemInput({ label: "x", order_index: 0 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.unit).toBeNull();
      expect(r.record.target_value).toBeNull();
    }
  });
});

describe("instantiateFromTemplate", () => {
  const items: TemplateItemRow[] = [
    { label: "Forward head", unit: "cm", target_value: 0, order_index: 1 },
    { label: "Shoulder protraction", unit: null, target_value: null, order_index: 2 }
  ];

  test("returns one measurement per item with template defaults", () => {
    const measurements = instantiateFromTemplate(items);
    expect(measurements.length).toBe(2);
    expect(measurements[0].label).toBe("Forward head");
    expect(measurements[0].unit).toBe("cm");
    expect(measurements[0].target_value).toBe(0);
    expect(measurements[0].order_index).toBe(1);
  });

  test("blank value/score on instantiation", () => {
    const m = instantiateFromTemplate(items)[0];
    expect(m.value).toBeNull();
    expect(m.score).toBeNull();
  });

  test("preserves order_index from template", () => {
    const measurements = instantiateFromTemplate(items);
    expect(measurements.map((m) => m.order_index)).toEqual([1, 2]);
  });

  test("empty template returns empty array", () => {
    expect(instantiateFromTemplate([])).toEqual([]);
  });
});

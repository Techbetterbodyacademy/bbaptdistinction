import { describe, test, expect } from "vitest";
import {
  prepareWorkflowInput,
  evaluateWorkflow,
  renderTemplate,
  type WorkflowDef,
  type WorkflowEvent
} from "./workflows";

describe("prepareWorkflowInput", () => {
  test("clean record for valid input", () => {
    const result = prepareWorkflowInput({
      name: "  Welcome new client  ",
      trigger: "client_added",
      action: "send_message",
      template: "  Welcome {{client_name}}  "
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.name).toBe("Welcome new client");
      expect(result.record.template).toBe("Welcome {{client_name}}");
    }
  });

  test("rejects empty name", () => {
    const result = prepareWorkflowInput({
      name: "  ",
      trigger: "client_added",
      action: "send_message",
      template: "ok"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/name/i);
  });

  test("rejects invalid trigger", () => {
    const result = prepareWorkflowInput({
      name: "x",
      trigger: "magic" as never,
      action: "send_message",
      template: "ok"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/trigger/i);
  });

  test("rejects invalid action", () => {
    const result = prepareWorkflowInput({
      name: "x",
      trigger: "client_added",
      action: "magic" as never,
      template: "ok"
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/action/i);
  });

  test("rejects empty template", () => {
    const result = prepareWorkflowInput({
      name: "x",
      trigger: "client_added",
      action: "send_message",
      template: " "
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/template/i);
  });
});

describe("evaluateWorkflow", () => {
  const def: WorkflowDef = {
    name: "Welcome",
    trigger: "client_added",
    action: "send_message",
    template: "Hi {{client_name}}, welcome to {{workspace_name}}.",
    enabled: true
  };

  test("matches when event type matches trigger and workflow enabled", () => {
    const event: WorkflowEvent = {
      type: "client_added",
      data: { client_name: "Alice", workspace_name: "BBA", client_id: "c1" }
    };
    const result = evaluateWorkflow(def, event);
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.action).toBe("send_message");
      expect(result.rendered).toBe("Hi Alice, welcome to BBA.");
    }
  });

  test("does not match when event type differs", () => {
    const event: WorkflowEvent = {
      type: "checkin_overdue",
      data: { client_name: "Alice", workspace_name: "BBA", client_id: "c1" }
    };
    expect(evaluateWorkflow(def, event).matched).toBe(false);
  });

  test("does not match when disabled", () => {
    const event: WorkflowEvent = {
      type: "client_added",
      data: { client_name: "Alice", workspace_name: "BBA", client_id: "c1" }
    };
    expect(evaluateWorkflow({ ...def, enabled: false }, event).matched).toBe(false);
  });
});

describe("renderTemplate", () => {
  test("substitutes single token", () => {
    expect(renderTemplate("Hi {{name}}", { name: "Alice" })).toBe("Hi Alice");
  });

  test("substitutes multiple tokens", () => {
    expect(renderTemplate("{{a}} and {{b}}", { a: "x", b: "y" })).toBe("x and y");
  });

  test("leaves unknown tokens as-is", () => {
    expect(renderTemplate("Hi {{name}} from {{place}}", { name: "Alice" })).toBe("Hi Alice from {{place}}");
  });

  test("handles repeated tokens", () => {
    expect(renderTemplate("{{n}}+{{n}}", { n: "1" })).toBe("1+1");
  });
});

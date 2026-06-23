const DEFAULT_MODEL = "gpt-4.1";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function generateJSON<T>(opts: {
  messages: Message[];
  model?: string;
  maxTokens?: number;
}): Promise<{ ok: true; data: T; model: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY not set" };
  }

  const model = opts.model ?? DEFAULT_MODEL;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      max_tokens: opts.maxTokens ?? 800,
      messages: opts.messages
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `${res.status}: ${errBody.slice(0, 300)}` };
  }

  const body = await res.json();
  const raw = body?.choices?.[0]?.message?.content;
  if (!raw) {
    return { ok: false, error: "no content in response" };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T, model };
  } catch (e) {
    return { ok: false, error: `JSON parse: ${String(e).slice(0, 200)}` };
  }
}

export async function generateText(opts: {
  messages: Message[];
  model?: string;
  maxTokens?: number;
}): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "OPENAI_API_KEY not set" };
  }

  const model = opts.model ?? DEFAULT_MODEL;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 600,
      messages: opts.messages
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `${res.status}: ${errBody.slice(0, 300)}` };
  }

  const body = await res.json();
  const raw = body?.choices?.[0]?.message?.content;
  if (!raw) {
    return { ok: false, error: "no content in response" };
  }

  return { ok: true, text: raw, model };
}

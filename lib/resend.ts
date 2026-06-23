const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not set" };
  }

  const fromAddress = from ?? process.env.RESEND_FROM ?? "Better Body Academy <onboarding@resend.dev>";

  const res = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: fromAddress,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, "")
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    return { ok: false, error: `${res.status}: ${errBody.slice(0, 200)}` };
  }
  const data = await res.json();
  return { ok: true, id: data?.id ?? "unknown" };
}

import { sendEmail } from "./resend";

export async function sendWelcomeEmail(opts: {
  to: string;
  name: string;
  workspaceName: string;
  loginUrl: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const firstName = opts.name.split(/\s+/)[0] || "Coach";
  const subject = `Welcome to Better Body Academy, ${firstName}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; color: #0A0A0A;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: #0A0A0A; color: #ffffff; padding: 8px 16px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
          Better Body Academy
        </div>
      </div>
      <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 16px 0;">
        Welcome, ${firstName}.
      </h1>
      <p style="font-size: 16px; line-height: 1.6; color: #404040; margin: 0 0 16px 0;">
        Your <strong>${opts.workspaceName}</strong> workspace is live. You can sign in and start adding clients, programs, and check-ins right away.
      </p>
      <p style="font-size: 16px; line-height: 1.6; color: #404040; margin: 0 0 24px 0;">
        Nothing to set up first. Just open the app.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${opts.loginUrl}" style="display: inline-block; background: #00AEEF; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 15px;">
          Open BBA Coaching →
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
      <p style="font-size: 13px; line-height: 1.6; color: #737373; margin: 0;">
        If you didn't sign up for Better Body Academy, ignore this email.
      </p>
    </div>
  `;
  return sendEmail({
    to: opts.to,
    subject,
    html
  });
}

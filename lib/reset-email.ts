import { createHash } from "node:crypto";

export function hashOtpCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function buildResetEmail(code: string): { subject: string; html: string } {
  const subject = `Reset your Better Body Academy password. Code ${code}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff; color: #0A0A0A;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #0A0A0A; color: #ffffff; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
          Better Body Academy
        </div>
      </div>
      <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px 0;">
        Reset your password
      </h1>
      <p style="font-size: 14px; line-height: 1.6; color: #404040; margin: 0 0 20px 0;">
        Enter this code on the password-reset page to choose a new password. It expires in 10 minutes.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <div style="display: inline-block; background: #f5f5f5; color: #0A0A0A; padding: 18px 28px; border-radius: 12px; font-size: 32px; font-weight: 800; letter-spacing: 8px; font-family: 'Courier New', monospace;">
          ${code}
        </div>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 28px 0;" />
      <p style="font-size: 12px; line-height: 1.6; color: #737373; margin: 0;">
        If you didn't ask to reset your password, ignore this email. Your account is unchanged.
      </p>
    </div>
  `;
  return { subject, html };
}

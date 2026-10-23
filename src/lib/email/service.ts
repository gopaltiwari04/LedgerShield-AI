import crypto from "crypto";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  provider: "resend" | "smtp" | "mock";
  messageId?: string;
  error?: string;
}

/**
 * Generates an unguessable 256-bit entropy token and its SHA-256 database hash.
 * The raw token is sent in the URL; only the hash is persisted in the database.
 */
export function generateSecureToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export class EmailService {
  private static getProvider(): "resend" | "smtp" | "mock" {
    const configured = process.env.EMAIL_PROVIDER?.toLowerCase();
    if (configured === "resend" && process.env.RESEND_API_KEY) return "resend";
    if (configured === "smtp" && process.env.SMTP_HOST) return "smtp";
    return "mock";
  }

  public static async sendEmail(options: EmailOptions): Promise<EmailDeliveryResult> {
    const provider = this.getProvider();
    const from = process.env.EMAIL_FROM || "LedgerShield AI <noreply@ledgershield.ai>";

    if (provider === "resend") {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          console.error("Resend delivery failed:", err);
          return { success: false, provider: "resend", error: err };
        }

        const data = await response.json();
        return { success: true, provider: "resend", messageId: data.id };
      } catch (err: any) {
        return { success: false, provider: "resend", error: err.message };
      }
    }

    // Safe Mock / Local Development Mode
    // Logs the transactional notification securely without leaking passwords or exposing live mailboxes
    console.log(`[EmailService:Mock] To: ${options.to} | Subject: "${options.subject}" | Provider: Mock`);
    return {
      success: true,
      provider: "mock",
      messageId: `mock-msg-${Date.now()}`,
    };
  }

  public static async sendPasswordResetEmail(
    email: string,
    rawToken: string,
    baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"
  ): Promise<EmailDeliveryResult> {
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const subject = "Reset Your LedgerShield AI Password";
    const text = `You have requested to reset your LedgerShield AI password. Click the following link or paste it into your browser to set a new password:\n\n${resetUrl}\n\nThis link is valid for 1 hour. If you did not request this, please ignore this email.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">LedgerShield AI Password Reset</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">You recently requested to reset the password for your LedgerShield AI account associated with <strong>${email}</strong>.</p>
        <p style="color: #334155; font-size: 15px;">Click the button below to choose a new password. This link will expire in <strong>1 hour</strong>.</p>
        <div style="margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">If you did not request a password reset, no action is required and your account remains secure.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">LedgerShield AI &bull; B2B Financial Leakage & Procurement Fraud Investigation Platform</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  public static async sendInvitationEmail(
    email: string,
    organizationName: string,
    role: string,
    rawToken: string,
    baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"
  ): Promise<EmailDeliveryResult> {
    const inviteUrl = `${baseUrl}/accept-invite?token=${encodeURIComponent(rawToken)}`;
    const subject = `Invitation to join ${organizationName} on LedgerShield AI`;
    const text = `You have been invited to join ${organizationName} on LedgerShield AI as ${role}.\n\nAccept your invitation: ${inviteUrl}\n\nThis invitation is valid for 7 days.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Join ${organizationName} on LedgerShield AI</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">You have been invited to join the internal controls and AP reconciliation workspace for <strong>${organizationName}</strong> with the role of <strong>${role}</strong>.</p>
        <div style="margin: 28px 0;">
          <a href="${inviteUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Accept Invitation</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">This invitation will expire in 7 days.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">LedgerShield AI &bull; Confidential Financial Operations</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  public static async sendEmailVerificationEmail(
    email: string,
    rawToken: string,
    baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"
  ): Promise<EmailDeliveryResult> {
    const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
    const subject = "Verify your email for LedgerShield AI";
    const text = `Please verify your email address by visiting:\n${verifyUrl}\n\nThis link is valid for 24 hours.`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; margin-top: 0;">Verify your email address</h2>
        <p style="color: #334155; font-size: 15px;">Please verify your email address to confirm your LedgerShield AI workspace account.</p>
        <div style="margin: 28px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Verify Email</a>
        </div>
        <p style="color: #64748b; font-size: 13px;">This verification link will expire in 24 hours.</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }
}

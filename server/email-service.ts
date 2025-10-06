import nodemailer from "nodemailer";
import { type EmailConfig } from "@shared/schema";

export function createTransporter(config: EmailConfig) {
  if (config.provider === "smtp") {
    if (!config.smtpHost || !config.smtpPort || !config.smtpUser || !config.smtpPassword) {
      throw new Error("SMTP configuration is incomplete");
    }

    return nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });
  } else if (config.provider === "gmail") {
    if (!config.gmailAccessToken || !config.gmailRefreshToken) {
      throw new Error("Gmail OAuth2 configuration is incomplete");
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: config.fromEmail,
        accessToken: config.gmailAccessToken,
        refreshToken: config.gmailRefreshToken,
        expires: config.gmailTokenExpiry ? new Date(config.gmailTokenExpiry).getTime() : undefined,
      },
    });
  } else {
    throw new Error("Unsupported email provider");
  }
}

export function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template;
  
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    rendered = rendered.replace(regex, String(value || ""));
  }
  
  return rendered;
}

export async function sendEmail(
  config: EmailConfig,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const transporter = createTransporter(config);
  
  await transporter.sendMail({
    from: `${config.fromName} <${config.fromEmail}>`,
    to,
    subject,
    html: body,
  });
}

export async function testEmailConnection(config: EmailConfig): Promise<boolean> {
  try {
    const transporter = createTransporter(config);
    await transporter.verify();
    return true;
  } catch (error) {
    return false;
  }
}

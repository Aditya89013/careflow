import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

let transporter: nodemailer.Transporter | null = null;

if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
  console.log("[CareFlow Email] Real Gmail provider SMTP configured successfully.");
} else {
  console.warn(
    "[CareFlow Email] No GMAIL_USER or GMAIL_APP_PASSWORD environment variables. Running in console simulation mode."
  );
}

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"CareFlow AI" <${GMAIL_USER}>`,
        to,
        subject,
        text,
      });
      console.log(`[CareFlow Email] Sent real email to ${to} (Subject: ${subject})`);
      return true;
    } catch (error) {
      console.error(`[CareFlow Email] Failed to send real email to ${to}:`, error);
      // fallback to console log
      console.log(`\n======================================================`);
      console.log(`[CareFlow Mail (FALLBACK)] To: ${to}\nSubject: ${subject}\n\n${text}`);
      console.log(`======================================================\n`);
      return false;
    }
  } else {
    // Console simulation mode
    console.log(`\n======================================================`);
    console.log(`[CareFlow Mail (SIMULATION)] To: ${to}\nSubject: ${subject}\n\n${text}`);
    console.log(`======================================================\n`);
    return true;
  }
}

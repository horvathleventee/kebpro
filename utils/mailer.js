async function sendNotificationEmail(payload, settings) {
  const shouldSend = Boolean(settings?.emailEnabled);

  if (!shouldSend) {
    console.log("[mail] E-mail értesítés kikapcsolva.", payload.type, payload.email);
    return false;
  }

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    console.warn("[mail] Nodemailer nincs telepítve.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const typeLabel = payload.type === "order" ? "Új megrendelés" : "Új ajánlatkérés";
    const subject = `${typeLabel} - ${process.env.COMPANY_NAME || "Kebpro"}`;

    const text = [
      `Típus: ${typeLabel}`,
      `Név: ${payload.name}`,
      `Cég: ${payload.company}`,
      `E-mail: ${payload.email}`,
      `Telefon: ${payload.phone}`,
      `Termék: ${payload.product}`,
      `Mennyiség: ${payload.quantity || "-"}`,
      `Szállítási cím: ${payload.address || "-"}`,
      `Kért szállítás: ${payload.requestedDate || "-"}`,
      "",
      "Megjegyzés:",
      payload.message || "-",
    ].join("\n");

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: settings.notificationEmail || process.env.NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
      subject,
      text,
    });

    return true;
  } catch (error) {
    console.error("[mail] E-mail küldési hiba:", error.message || error);
    return false;
  }
}

async function sendCareerNotificationEmail(payload, settings, cvFilePath) {
  const shouldSend = Boolean(settings?.careerEmailEnabled);

  if (!shouldSend) {
    console.log("[mail] Karrieres e-mail értesítés kikapcsolva.", payload.email);
    return false;
  }

  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    console.warn("[mail] Nodemailer nincs telepítve.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const subject = `Új állásjelentkezés - ${process.env.COMPANY_NAME || "Kebpro"}`;

    const text = [
      "Új állásjelentkezés érkezett.",
      "",
      `Pozíció: ${payload.positionTitle || payload.positionId || "-"}`,
      `Név: ${payload.name}`,
      `E-mail: ${payload.email}`,
      `Telefon: ${payload.phone}`,
      "",
      "Motivációs levél:",
      payload.motivation || "-",
    ].join("\n");

    const attachments = [];
    if (cvFilePath) {
      const path = require("path");
      attachments.push({
        filename: path.basename(cvFilePath),
        path: cvFilePath,
      });
    }

    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: settings.careerNotificationEmail || process.env.CAREER_NOTIFICATION_EMAIL || process.env.COMPANY_EMAIL,
      subject,
      text,
      attachments,
    });

    return true;
  } catch (error) {
    console.error("[mail] Karrieres e-mail küldési hiba:", error.message || error);
    return false;
  }
}

module.exports = { sendNotificationEmail, sendCareerNotificationEmail };

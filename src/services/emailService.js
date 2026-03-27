'use strict';

const nodemailer = require('nodemailer');
const defaults = require('../config/defaults');

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let transporter = null;
let etherealAccount = null;

// ---------------------------------------------------------------------------
// Transporter initialisation
// ---------------------------------------------------------------------------

/**
 * Lazily create (or return cached) Nodemailer transporter.
 * In dev / demo mode an Ethereal test account is auto-generated so emails
 * are captured in the Ethereal inbox rather than actually delivered.
 */
async function getTransporter() {
  if (transporter) return transporter;

  try {
    // Auto-create an Ethereal test account for dev/demo mode
    etherealAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });

    console.log('[EmailService] Ethereal test account created');
    console.log(`[EmailService]   User : ${etherealAccount.user}`);
    console.log(`[EmailService]   Pass : ${etherealAccount.pass}`);
    console.log(`[EmailService]   Web  : https://ethereal.email`);

    return transporter;
  } catch (err) {
    console.error('[EmailService] Failed to create Ethereal account:', err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// HTML layout wrapper
// ---------------------------------------------------------------------------

/**
 * Wrap plain body HTML inside a branded email layout with studio branding
 * header, main content area, booking CTA button, and unsubscribe footer.
 */
function wrapInLayout(bodyHtml, bookingUrl) {
  const studio = defaults.studio;

  const ctaButton = bookingUrl
    ? `<div style="text-align:center;margin:32px 0">
         <a href="${bookingUrl}"
            style="display:inline-block;padding:14px 32px;background-color:#4F46E5;color:#ffffff;
                   text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
           Book Your Session Now
         </a>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Studio Branding Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
                ${studio.name}
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                Your Fitness Journey, Our Priority
              </p>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding:40px;color:#333333;font-size:16px;line-height:1.6;">
              ${bodyHtml}
              ${ctaButton}
            </td>
          </tr>

          <!-- Footer with Unsubscribe -->
          <tr>
            <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-align:center;">
                ${studio.name} &middot; ${studio.address}
              </p>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-align:center;">
                ${studio.phone} &middot;
                <a href="mailto:${studio.email}" style="color:#4F46E5;text-decoration:none;">${studio.email}</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                <a href="${studio.website}/unsubscribe" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
                &middot; You received this because you are a member of ${studio.name}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Template rendering helpers
// ---------------------------------------------------------------------------

/**
 * Replace {{placeholder}} tokens in a string with values from a data object.
 */
function renderTemplate(templateStr, data) {
  return templateStr.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}

/**
 * Convert plain-text template body (with newlines) into simple HTML paragraphs.
 */
function textToHtml(text) {
  return text
    .split('\n\n')
    .map((para) => `<p style="margin:0 0 16px;">${para.replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a raw email.
 *
 * @param {string} to       - Recipient email address
 * @param {string} subject  - Email subject line
 * @param {string} htmlBody - Full HTML body content
 * @returns {Promise<{ messageId: string, previewUrl: string|null }>}
 */
async function sendEmail(to, subject, htmlBody) {
  try {
    const transport = await getTransporter();
    const studio = defaults.studio;

    const info = await transport.sendMail({
      from: `"${studio.name}" <${studio.email}>`,
      to,
      subject,
      html: htmlBody,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    console.log(`[EmailService] Email sent to ${to}`);
    console.log(`[EmailService]   Subject    : ${subject}`);
    console.log(`[EmailService]   Message ID : ${info.messageId}`);
    if (previewUrl) {
      console.log(`[EmailService]   Preview URL: ${previewUrl}`);
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  } catch (err) {
    console.error(`[EmailService] Failed to send email to ${to}:`, err.message);
    throw err;
  }
}

/**
 * Render a template with client data and send the follow-up email.
 * Wraps the rendered content in the branded HTML layout with a CTA button.
 *
 * @param {object} client     - Client record (must have .name, .email, optionally .days_since)
 * @param {object} template   - EmailTemplate record (must have .subject, .body)
 * @param {string} bookingUrl - Full booking page URL for the CTA button
 * @returns {Promise<{ messageId: string, previewUrl: string|null }>}
 */
async function sendFollowUpEmail(client, template, bookingUrl) {
  try {
    const studio = defaults.studio;

    // Build template data map
    const data = {
      name: client.name,
      email: client.email,
      days_since: String(client.days_since || ''),
      studio_name: studio.name,
      booking_button: '', // CTA button is injected by the layout wrapper
      booking_link: bookingUrl || '',
    };

    // Render subject and body with template variables
    const renderedSubject = renderTemplate(template.subject, data);
    const renderedBody = renderTemplate(template.body, data);

    // Convert plain text body to HTML paragraphs, then wrap in branded layout
    const bodyHtml = textToHtml(renderedBody);
    const fullHtml = wrapInLayout(bodyHtml, bookingUrl);

    return await sendEmail(client.email, renderedSubject, fullHtml);
  } catch (err) {
    console.error(`[EmailService] Failed to send follow-up to ${client.email}:`, err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  sendEmail,
  sendFollowUpEmail,
  getTransporter,
  renderTemplate,
  wrapInLayout,
};

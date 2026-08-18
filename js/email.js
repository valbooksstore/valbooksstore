// Sends order emails through EmailJS (client-side, no backend), using
// two templates:
//
//   1. EMAILJS_ORDER_TEMPLATE_ID — a SHARED template reused for all
//      THREE customer-facing emails, one per order status:
//        a. "Order confirmed"  — sent right after checkout
//        b. "Order shipped"       — sent when you mark an order Dispatched
//        c. "Order delivered"   — sent when you mark an order Completed
//      EmailJS can't do real if/else, so the body of each is built as
//      HTML here in code and injected via {{{body_html}}} — same shell,
//      three different-looking emails depending on which function calls it.
//
//   2. EMAILJS_ADMIN_TEMPLATE_ID — a plain, single-purpose template that
//      only ever does one job: tell YOU a new order came in. Its
//      "To Email" is a fixed address set inside the EmailJS template
//      itself, not passed from code.
//
// See email-templates/ for the HTML to paste into each.

import {
  EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID,
  EMAILJS_ORDER_TEMPLATE_ID, EMAILJS_ADMIN_TEMPLATE_ID,
} from "./config.js";

let loaded = false;

async function loadSdk() {
  if (loaded) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load EmailJS."));
    document.head.appendChild(script);
  });
  window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  loaded = true;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function buildItemsHtml(items) {
  return items.map((i) => `
    <tr>
      <td style="padding:8px 0; font-family:Arial,sans-serif; font-size:14px; color:#2B2620; border-bottom:1px solid #EFE9D8;">
        ${escapeHtml(i.title)} × ${i.qty}
      </td>
      <td align="right" style="padding:8px 0; font-family:Arial,sans-serif; font-size:14px; color:#7A1F2B; font-weight:bold; border-bottom:1px solid #EFE9D8;">
        ${money(i.price * i.qty)}
      </td>
    </tr>
  `).join("");
}

function isConfigured(id) {
  return !!id && !id.startsWith("YOUR_");
}

// ---------------------------------------------------------------------
// Template 1 (shared) — low-level sender for all customer emails
// ---------------------------------------------------------------------
async function sendCustomerNotification({ toEmail, toName, orderId, subject, typeLabel, greetingHtml, bodyHtml }) {
  if (!isConfigured(EMAILJS_PUBLIC_KEY) || !isConfigured(EMAILJS_ORDER_TEMPLATE_ID)) {
    console.warn("EmailJS isn't fully configured yet — skipping customer email. See js/config.js.");
    return;
  }
  try {
    await loadSdk();
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ORDER_TEMPLATE_ID, {
      to_email: toEmail,
      to_name: toName,
      order_id: orderId,
      email_subject: subject,
      email_type_label: typeLabel,
      greeting_html: greetingHtml,
      body_html: bodyHtml,
    });
  } catch (err) {
    console.error("Customer notification email failed to send:", err);
  }
}

// ---- Variant A: order confirmed (sent right after checkout) ----
export async function sendOrderConfirmationEmail({ toEmail, toName, orderId, items, total, address, phone }) {
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3ECD8; border-radius:4px;">
      <tr>
        <td style="padding:14px 18px; font-family:Arial,sans-serif; font-size:12px; color:#746C5A; text-transform:uppercase; letter-spacing:0.5px;">Order ID</td>
        <td align="right" style="padding:14px 18px; font-family:Arial,sans-serif; font-size:13px; color:#1B2A41; font-weight:bold;">${escapeHtml(orderId)}</td>
      </tr>
    </table>

    <p style="margin:24px 0 10px 0; font-family:Arial,sans-serif; font-size:12px; font-weight:bold; color:#1B2A41; text-transform:uppercase; letter-spacing:0.5px;">Your books</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #D9CFB8;">
      ${buildItemsHtml(items)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #1B2A41; margin-top:6px;">
      <tr>
        <td style="padding:14px 0 0 0; font-family:Arial,sans-serif; font-size:15px; font-weight:bold; color:#1B2A41;">Total</td>
        <td align="right" style="padding:14px 0 0 0; font-family:Arial,sans-serif; font-size:18px; font-weight:bold; color:#7A1F2B;">${total}</td>
      </tr>
    </table>

    <p style="margin:28px 0 10px 0; font-family:Arial,sans-serif; font-size:12px; font-weight:bold; color:#1B2A41; text-transform:uppercase; letter-spacing:0.5px;">Delivering to</p>
    <p style="margin:0 0 4px 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#2B2620;">${escapeHtml(address)}</p>
    <p style="margin:0; font-family:Arial,sans-serif; font-size:14px; color:#746C5A;">Phone: ${escapeHtml(phone)}</p>
  `;

  await sendCustomerNotification({
    toEmail, toName, orderId,
    subject: `Your ValBooksStore order ${orderId} is confirmed`,
    typeLabel: "Order Confirmed",
    greetingHtml: `Thank you, ${escapeHtml(toName)}.`,
    bodyHtml,
  });
}

// ---- Variant B: dispatched (sent when admin marks an order Dispatched) ----
export async function sendDispatchedEmail({ toEmail, toName, orderId, courier, trackingNumber }) {
  const hasTracking = !!trackingNumber;
  const bodyHtml = hasTracking ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3ECD8; border-radius:4px;">
      <tr>
        <td style="padding:14px 18px; font-family:Arial,sans-serif; font-size:12px; color:#746C5A; text-transform:uppercase; letter-spacing:0.5px;">Order ID</td>
        <td align="right" style="padding:14px 18px; font-family:Arial,sans-serif; font-size:13px; color:#1B2A41; font-weight:bold;">${escapeHtml(orderId)}</td>
      </tr>
      <tr>
        <td style="padding:0 18px 14px 18px; font-family:Arial,sans-serif; font-size:12px; color:#746C5A; text-transform:uppercase; letter-spacing:0.5px;">Courier</td>
        <td align="right" style="padding:0 18px 14px 18px; font-family:Arial,sans-serif; font-size:13px; color:#1B2A41; font-weight:bold;">${escapeHtml(courier || "your courier")}</td>
      </tr>
    </table>
    <p style="margin:20px 0 8px 0; font-family:Arial,sans-serif; font-size:12px; font-weight:bold; color:#1B2A41; text-transform:uppercase; letter-spacing:0.5px;">Tracking number</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #7A1F2B; border-radius:4px;">
      <tr><td style="padding:14px 18px; font-family:Arial,sans-serif; font-size:18px; font-weight:bold; letter-spacing:1px; color:#7A1F2B;">${escapeHtml(trackingNumber)}</td></tr>
    </table>
    <p style="margin:10px 0 0 0; font-family:Arial,sans-serif; font-size:12.5px; color:#746C5A;">Enter this number on your courier's website to follow your package.</p>
  ` : `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3ECD8; border-radius:4px;">
      <tr>
        <td style="padding:14px 18px; font-family:Arial,sans-serif; font-size:12px; color:#746C5A; text-transform:uppercase; letter-spacing:0.5px;">Order ID</td>
        <td align="right" style="padding:14px 18px; font-family:Arial,sans-serif; font-size:13px; color:#1B2A41; font-weight:bold;">${escapeHtml(orderId)}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#2B2620;">Your books have left our hands and are on the way to you. We'll send tracking details as soon as they're available.</p>
  `;

  await sendCustomerNotification({
    toEmail, toName, orderId,
    subject: `Your ValBooksStore order ${orderId} has shipped`,
    typeLabel: "Order Shipped",
    greetingHtml: `Good news, ${escapeHtml(toName)}. Your order is on its way.`,
    bodyHtml,
  });
}

// ---- Variant C: delivered (sent when admin marks an order Completed) ----
export async function sendDeliveredEmail({ toEmail, toName, orderId }) {
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3ECD8; border-radius:4px;">
      <tr>
        <td style="padding:14px 18px; font-family:Arial,sans-serif; font-size:12px; color:#746C5A; text-transform:uppercase; letter-spacing:0.5px;">Order ID</td>
        <td align="right" style="padding:14px 18px; font-family:Arial,sans-serif; font-size:13px; color:#1B2A41; font-weight:bold;">${escapeHtml(orderId)}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0 0; font-family:Arial,sans-serif; font-size:14px; line-height:1.6; color:#2B2620;">We hope you and your little reader enjoy the stories. If anything arrived damaged or missing, just reply to this email and we'll sort it out.</p>
  `;

  await sendCustomerNotification({
    toEmail, toName, orderId,
    subject: `Your ValBooksStore order ${orderId} has been delivered`,
    typeLabel: "Delivered",
    greetingHtml: `Hi ${escapeHtml(toName)}, your order has arrived!`,
    bodyHtml,
  });
}

// ---------------------------------------------------------------------
// Template 2 — simple, single-purpose admin "new order" alert
// ---------------------------------------------------------------------
export async function sendAdminNewOrderAlert({ toName, toEmail, orderId, items, total, address, phone }) {
  if (!isConfigured(EMAILJS_PUBLIC_KEY) || !isConfigured(EMAILJS_ADMIN_TEMPLATE_ID)) return;
  try {
    await loadSdk();
    await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TEMPLATE_ID, {
      order_id: orderId,
      items_html: buildItemsHtml(items),
      total,
      address,
      phone,
      customer_name: toName,
      customer_email: toEmail,
    });
  } catch (err) {
    console.error("Admin alert email failed to send:", err);
  }
}

// Generates a downloadable PDF invoice for an order, using jsPDF loaded
// lazily from a CDN — no build step, no bundling required.
//
// Visually matches the branded order-confirmation email (navy header,
// gold accents, parchment background, burgundy price highlights).
//
// Hindi text needs special handling: jsPDF's built-in fonts only cover
// Latin script, so Devanagari book titles would render as garbled boxes.
// We embed a subset of "Noto Sans Devanagari" (js/fonts/noto-sans-devanagari.js)
// for all body text so English and Hindi both render correctly. Headline
// text uses jsPDF's built-in Times (serif) to echo the email's Georgia
// headings, since headlines never contain book titles.

let loaded = false;

async function loadSdk() {
  if (loaded) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the invoice generator. Check your connection and try again."));
    document.head.appendChild(script);
  });
  loaded = true;
}

const SANS = "NotoSansDevanagari"; // body text — supports Hindi
const SERIF = "times";              // headline accents only (Latin-only, built into jsPDF)

// ---- Palette (matches the order-confirmation email) ----
const NAVY = [27, 42, 65];
const GOLD = [199, 154, 59];
const PARCHMENT = [243, 236, 216];
const CARD = [255, 253, 248];
const BURGUNDY = [122, 31, 43];
const MUTED = [116, 108, 90];
const INK = [43, 38, 32];
const LINE = [217, 207, 184];
const FOOTER_MUTED = [154, 146, 126];
const WHITE = [255, 253, 248];

async function registerFont(doc) {
  const { NOTO_SANS_DEVANAGARI_BASE64 } = await import("./fonts/noto-sans-devanagari.js");
  doc.addFileToVFS(`${SANS}.ttf`, NOTO_SANS_DEVANAGARI_BASE64);
  doc.addFont(`${SANS}.ttf`, SANS, "normal");
  doc.addFont(`${SANS}.ttf`, SANS, "bold"); // same file — this font only ships one weight
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function setColor(doc, method, rgb) {
  doc[method](rgb[0], rgb[1], rgb[2]);
}

export async function downloadInvoice(order) {
  await loadSdk();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await registerFont(doc);

  const pageW = 595;
  const cardX = 48, cardW = 499;
  const padX = 32; // inner padding, matches the email's 32px

  const orderId = order.orderId || String(order.id || "").slice(0, 8).toUpperCase();
  const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date();
  const items = order.items || [];

  // Card height is deterministic from item count — no dry run needed.
  const cardH = 70 + 74 + 62 + 44 + items.length * 24 + 66 + 96 + 70 + 20;
  const cardY = 40;

  // ---- Page background (parchment) ----
  doc.setFillColor(...PARCHMENT);
  doc.rect(0, 0, pageW, 842, "F");

  // ---- Card ----
  doc.setFillColor(...CARD);
  doc.roundedRect(cardX, cardY, cardW, cardH, 6, 6, "F");

  let y = cardY;

  // ---- Header bar (navy) ----
  doc.setFillColor(...NAVY);
  doc.rect(cardX, y, cardW, 70, "F");
  doc.setFont(SERIF, "bold");
  doc.setFontSize(19);
  setColor(doc, "setTextColor", WHITE);
  doc.text("ValBooksStore", cardX + padX, y + 42);

  doc.setFont(SANS, "bold");
  doc.setFontSize(9.5);
  setColor(doc, "setTextColor", GOLD);
  doc.text("TAX INVOICE", cardX + cardW - padX, y + 40, { align: "right" });
  y += 70;

  // ---- Intro ----
  y += 34;
  doc.setFont(SERIF, "bold");
  doc.setFontSize(15);
  setColor(doc, "setTextColor", NAVY);
  doc.text(`Thank you, ${order.name || "there"}.`, cardX + padX, y);

  y += 20;
  doc.setFont(SANS, "normal");
  doc.setFontSize(10);
  setColor(doc, "setTextColor", MUTED);
  doc.text("Here's your invoice for this order, for your records.", cardX + padX, y);
  y += 20;

  // ---- Order ID box ----
  doc.setFillColor(...PARCHMENT);
  doc.roundedRect(cardX + padX, y, cardW - padX * 2, 40, 3, 3, "F");
  doc.setFont(SANS, "normal");
  doc.setFontSize(8.5);
  setColor(doc, "setTextColor", MUTED);
  doc.text("ORDER ID", cardX + padX + 14, y + 17);
  doc.text("DATE", cardX + padX + 14, y + 31);

  doc.setFont(SANS, "bold");
  doc.setFontSize(10);
  setColor(doc, "setTextColor", NAVY);
  doc.text(orderId, cardX + cardW - padX - 14, y + 17, { align: "right" });
  doc.setFont(SANS, "normal");
  doc.text(
    orderDate.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
    cardX + cardW - padX - 14, y + 31, { align: "right" }
  );
  y += 40 + 30;

  // ---- Items ----
  doc.setFont(SANS, "bold");
  doc.setFontSize(9);
  setColor(doc, "setTextColor", NAVY);
  doc.text("YOUR BOOKS", cardX + padX, y);
  y += 12;
  doc.setDrawColor(...LINE);
  doc.line(cardX + padX, y, cardX + cardW - padX, y);
  y += 20;

  doc.setFontSize(10.5);
  items.forEach((item) => {
    doc.setFont(SANS, "normal");
    setColor(doc, "setTextColor", INK);
    doc.text(`${item.title} × ${item.qty}`, cardX + padX, y, { maxWidth: cardW - padX * 2 - 110 });
    doc.setFont(SANS, "bold");
    setColor(doc, "setTextColor", BURGUNDY);
    doc.text(money(item.price * item.qty), cardX + cardW - padX, y, { align: "right" });
    y += 24;
  });

  // ---- Total ----
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.4);
  doc.line(cardX + padX, y, cardX + cardW - padX, y);
  doc.setLineWidth(1);
  y += 24;
  doc.setFont(SANS, "bold");
  doc.setFontSize(12.5);
  setColor(doc, "setTextColor", NAVY);
  doc.text("Total", cardX + padX, y);
  doc.setFontSize(14.5);
  setColor(doc, "setTextColor", BURGUNDY);
  doc.text(money(order.total), cardX + cardW - padX, y, { align: "right" });
  y += 40;

  // ---- Delivering to ----
  doc.setFont(SANS, "bold");
  doc.setFontSize(9);
  setColor(doc, "setTextColor", NAVY);
  doc.text("DELIVERING TO", cardX + padX, y);
  y += 18;

  doc.setFont(SANS, "normal");
  doc.setFontSize(10.5);
  setColor(doc, "setTextColor", INK);
  const addressLine = [order.address, order.city, order.state, order.pincode].filter(Boolean).join(", ");
  doc.text(addressLine || "-", cardX + padX, y, { maxWidth: cardW - padX * 2 });
  y += 30;
  setColor(doc, "setTextColor", MUTED);
  doc.text(`Phone: ${order.phone || "-"}`, cardX + padX, y);
  y += 40;

  // ---- Footer ----
  doc.setDrawColor(...LINE);
  doc.line(cardX + padX, y, cardX + cardW - padX, y);
  y += 22;
  doc.setFont(SANS, "normal");
  doc.setFontSize(8.5);
  setColor(doc, "setTextColor", FOOTER_MUTED);
  doc.text("An independent comic publisher — every story in English, Hindi and embossed Braille editions.", cardX + padX, y, { maxWidth: cardW - padX * 2 });
  y += 13;
  doc.text("ValBooksStore · This is an automated invoice — no need to reply.", cardX + padX, y);

  doc.save(`ValBooksStore-Invoice-${orderId || "order"}.pdf`);
}

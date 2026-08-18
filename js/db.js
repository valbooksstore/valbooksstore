// Data-access layer. All Firestore reads/writes for books, orders and
// customer profiles live here so pages don't talk to Firestore directly.
//
// If Firebase hasn't been configured yet (see js/config.js), the shop
// falls back to sample books so the site is still fully browsable —
// look for isConfigured() checks below.

import {
  db, isConfigured, collection, doc, getDoc, getDocs, addDoc, setDoc,
  deleteDoc, query, orderBy, serverTimestamp, runTransaction,
} from "./firebase-init.js";

// ---- Demo data (used only when Firebase isn't configured yet) ----
const DEMO_BOOKS = [
  { id: "demo-1", title: "The Quiet Orchard", author: "Laxmi Narasimhan K", language: "english", price: 349, mrp: 449,
    description: "A full-colour graphic novel about three seasons in a family orchard — and the letters left behind under an old apple tree.",
    coverImageUrl: "" },
  { id: "demo-2", title: "नदी के उस पार", author: "Laxmi Narasimhan K", language: "hindi", price: 299, mrp: null,
    description: "एक ग्राफिक नॉवेल, एक छोटे से गाँव की कहानी, जहाँ नदी हर पीढ़ी की उम्मीदों को जोड़ती है।",
    coverImageUrl: "" },
  { id: "demo-3", title: "Letters in Relief", author: "Laxmi Narasimhan K", language: "braille", price: 499, mrp: 599,
    description: "A tactile edition of our best-loved graphic story, fully embossed panel-by-panel for Braille readers.",
    coverImageUrl: "" },
  { id: "demo-4", title: "Field Notes on Stillness", author: "Laxmi Narasimhan K", language: "english", price: 399, mrp: null,
    description: "A quiet, illustrated collection drawn over a decade of early mornings — on paying attention to small things.",
    coverImageUrl: "" },
  { id: "demo-5", title: "आँगन की धूप", author: "Laxmi Narasimhan K", language: "hindi", price: 259, mrp: 329,
    description: "बचपन की गलियों और आँगन की धूप में बुनी गई एक मार्मिक ग्राफिक कहानी।",
    coverImageUrl: "" },
  { id: "demo-6", title: "The Orchard, Embossed", author: "Laxmi Narasimhan K", language: "braille", price: 549, mrp: null,
    description: "Our debut graphic novel in a fully embossed Braille edition, bound and finished by hand.",
    coverImageUrl: "" },
];

export function isDemoMode() { return !isConfigured(); }

// ---------------- Languages ----------------
// Stored as their own Firestore collection (doc id = code) so new
// languages can be added from the admin panel without touching code.
const DEMO_LANGUAGES = [
  { code: "english", label: "English", isBraille: false },
  { code: "hindi", label: "Hindi", isBraille: false },
  { code: "braille", label: "Braille", isBraille: true },
];

export async function getLanguages() {
  if (!isConfigured()) return DEMO_LANGUAGES;
  const snap = await getDocs(query(collection(db, "languages"), orderBy("label")));
  if (snap.empty) return DEMO_LANGUAGES; // nothing added yet — show the starting three
  return snap.docs.map((d) => ({ code: d.id, ...d.data() }));
}

export async function addLanguage({ code, label, isBraille }) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  const cleanCode = code.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  if (!cleanCode) throw new Error("Enter a language code, e.g. \"kannada\".");
  return setDoc(doc(db, "languages", cleanCode), { label: label.trim(), isBraille: !!isBraille });
}

// Updates just the Braille flag on an existing language — used to fix up
// languages that were added before this flag existed, or to correct one
// that was set wrong.
export async function setLanguageIsBraille(code, isBraille) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  return setDoc(doc(db, "languages", code), { isBraille: !!isBraille }, { merge: true });
}

export async function deleteLanguage(code) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  return deleteDoc(doc(db, "languages", code));
}

// ---------------- Books ----------------

export async function getBooks() {
  if (!isConfigured()) return DEMO_BOOKS;
  const snap = await getDocs(query(collection(db, "books"), orderBy("createdAt", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getBook(id) {
  if (!isConfigured()) return DEMO_BOOKS.find((b) => b.id === id) || null;
  const ref = doc(db, "books", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addBook(book) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  return addDoc(collection(db, "books"), { ...book, createdAt: serverTimestamp() });
}

export async function updateBook(id, updates) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  return setDoc(doc(db, "books", id), updates, { merge: true });
}

export async function deleteBook(id) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  return deleteDoc(doc(db, "books", id));
}

// ---------------- Orders ----------------
// Guest checkout — orders aren't tied to a logged-in account. All
// customer details (name, email, phone, address) are stored directly
// on the order itself, which is what the admin dashboard reads from.

// Every order gets a short, sequential, human-readable ID (e.g. VBS-00001)
// instead of Firestore's long random doc ID. The counter lives in its own
// document (counters/orders) and is incremented atomically via a
// transaction, so two customers checking out at the same instant can
// never end up with the same number.
async function nextOrderNumber() {
  const counterRef = doc(db, "counters", "orders");
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const next = (snap.exists() ? snap.data().count : 0) + 1;
    transaction.set(counterRef, { count: next }, { merge: true });
    return next;
  });
}

export async function createOrder(order) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  const number = await nextOrderNumber();
  const orderId = `VBS-${String(number).padStart(5, "0")}`;
  const ref = await addDoc(collection(db, "orders"), {
    ...order, orderNumber: number, orderId, createdAt: serverTimestamp(),
  });
  return { id: ref.id, orderId, orderNumber: number };
}

// Admin-only: every order across every customer, newest first.
export async function getAllOrders() {
  if (!isConfigured()) return [];
  const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateOrderStatus(orderId, status) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  return setDoc(doc(db, "orders", orderId), { status }, { merge: true });
}

// Saves the courier name + tracking number on an order. Called from the
// admin dashboard once a package has been handed to a courier.
export async function updateTrackingInfo(orderId, { courier, trackingNumber }) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  return setDoc(doc(db, "orders", orderId), { courier, trackingNumber }, { merge: true });
}

// ---------------- Settings ----------------
// A small key/value store for things you want to change from the admin
// panel without editing code — right now, just the Razorpay Key ID.
// Publicly readable (checkout needs it), admin-only writable.

export async function getSettings() {
  if (!isConfigured()) return {};
  const snap = await getDoc(doc(db, "settings", "app"));
  return snap.exists() ? snap.data() : {};
}

export async function saveSettings(updates) {
  if (!isConfigured()) throw new Error("Connect Firebase first (see js/config.js).");
  return setDoc(doc(db, "settings", "app"), updates, { merge: true });
}

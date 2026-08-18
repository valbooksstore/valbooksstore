// Client-side Razorpay Checkout integration.
//
// The Key ID is now configured from the ADMIN PANEL (Settings tab), not
// hardcoded in this file — it's stored in Firestore at settings/app and
// fetched here at checkout time. This means you can switch from a test
// key to a live key any time by just updating it in the admin dashboard,
// no code changes or redeploy needed.
//
// IMPORTANT — read this before going live:
// This site has no backend server, so this uses Razorpay's simplest
// client-only integration: it opens the Checkout modal directly with an
// amount, and trusts the browser's "payment succeeded" callback.
//
// That means there is NO server-side verification of the payment
// signature. In the standard, more secure Razorpay integration, an order
// is created server-side first, and the payment is verified server-side
// after — that prevents someone from tampering with the browser to fake
// a "successful" payment without actually paying.
//
// For a small store starting out, this is a reasonable and common
// starting point — but if fraud becomes a concern, the fix is a small
// Firebase Cloud Function (still free-tier) to create the Razorpay order
// and verify its signature before an order is marked "paid". Ask if you
// want that built.

import { getSettings } from "./db.js";

let loaded = false;
let cachedKeyId = null;
let loadedConfig = false;

async function loadSdk() {
  if (loaded) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the payment window. Check your connection and try again."));
    document.head.appendChild(script);
  });
  loaded = true;
}

// Fetches the current Razorpay Key ID from Firestore (set in the admin
// Settings tab) and caches it for the rest of this page's lifetime.
// Call this once before checking isRazorpayConfigured() or opening
// checkout — e.g. at the top of checkout.html.
export async function loadRazorpayConfig() {
  try {
    const settings = await getSettings();
    cachedKeyId = settings?.razorpayKeyId || null;
  } catch (err) {
    console.error("Couldn't load Razorpay settings:", err);
    cachedKeyId = null;
  }
  loadedConfig = true;
  return cachedKeyId;
}

export function isRazorpayConfigured() {
  return !!cachedKeyId;
}

/**
 * Opens the Razorpay Checkout modal.
 * @param {object} opts
 * @param {number} opts.amount - total in rupees (converted to paise here)
 * @param {string} opts.name - customer name, prefilled
 * @param {string} opts.email - customer email, prefilled
 * @param {string} opts.phone - customer phone, prefilled
 * @param {string} opts.description - shown in the payment window
 * @returns {Promise<string>} resolves with the Razorpay payment ID on success
 */
export async function openRazorpayCheckout({ amount, name, email, phone, description }) {
  if (!loadedConfig) await loadRazorpayConfig();
  if (!isRazorpayConfigured()) {
    throw new Error("Payments aren't set up yet — add your Razorpay Key ID in the admin Settings tab.");
  }
  await loadSdk();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: cachedKeyId,
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      name: "ValBooksStore",
      description: description || "Order payment",
      prefill: { name, email, contact: phone },
      theme: { color: "#E23744" },
      handler: (response) => resolve(response.razorpay_payment_id),
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
    });
    rzp.on("payment.failed", (response) => {
      reject(new Error(response?.error?.description || "Payment failed. Please try again."));
    });
    rzp.open();
  });
}

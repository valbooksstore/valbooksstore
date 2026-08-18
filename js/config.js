/* =========================================================
   ValBooksStore — Configuration
   Fill these in with your own free-tier credentials.
   See README.md for step-by-step setup instructions.
   ========================================================= */

// ---- Firebase project config (Project settings > General > Your apps) ----
export const firebaseConfig = {
  apiKey: "AIzaSyCX8NL6uuiBl6nDqCZxn8b8ugobaF60QW0",
  authDomain: "valbooksstore-4717d.firebaseapp.com",
  projectId: "valbooksstore-4717d",
  storageBucket: "valbooksstore-4717d.firebasestorage.app",
  messagingSenderId: "865773457516",
  appId: "1:865773457516:web:297cb4f41d17ee7fe30849",
  measurementId: "G-D2HGP6FYX4",
};

// ---- imgBB (https://api.imgbb.com/) ----
export const IMGBB_API_KEY = "38f89564feb1be56942fd021328752b4";

// ---- EmailJS (https://www.emailjs.com/) ----
// Only the PUBLIC key belongs here — it's safe for browser code.
// Never put your EmailJS Private Key in this file or in the repo.
//
// Only TWO templates are used, to fit EmailJS's free-plan limit:
//   1. EMAILJS_ORDER_TEMPLATE_ID — SHARED customer template, reused for
//      all three customer emails (confirmed / shipped / delivered). The
//      HTML content is built in js/email.js and injected at send time.
//   2. EMAILJS_ADMIN_TEMPLATE_ID — simple, single-purpose: tells you
//      about new orders only. Fixed "To Email" set inside that template.
// See email-templates/ for the HTML to paste into each.
export const EMAILJS_PUBLIC_KEY = "JzanfiWv9gyKG6_l8";
export const EMAILJS_SERVICE_ID = "service_1rs8xvy";
export const EMAILJS_ORDER_TEMPLATE_ID = "template_94pltv3";
export const EMAILJS_ADMIN_TEMPLATE_ID = "template_91hnc1i";

// ---- Razorpay ----
// No key goes here anymore — it's configured from the admin dashboard's
// Settings tab instead (stored in Firestore), so you can switch from a
// test key to a live key without touching code. See js/razorpay.js.

// ---- Store admin ----
// Emails listed here get access to /admin. Add the same emails to the
// Firestore security rules (see README) so the restriction is enforced
// on the server, not just in this file.
export const ADMIN_EMAILS = [
  "valbooksstore@gmail.com",
];

export const isConfigured = () =>
  firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_");

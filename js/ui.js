import { ADMIN_EMAILS } from "./config.js";
import { updateCartBadge } from "./cart.js";
import { updateWishlistBadge } from "./wishlist.js";

export function formatPrice(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

export function formatAddress(a) {
  if (!a) return "";
  return `${a.address}, ${a.city}, ${a.state} - ${a.pincode}`;
}

// Cache of code -> {label, isBraille}, populated by loadLanguages(). Call
// that once per page (after fetching languages) before rendering anything
// that shows a language name, so new languages "just work" everywhere.
let languageCache = null;

export function setLanguageCache(languages) {
  languageCache = {};
  languages.forEach((l) => { languageCache[l.code] = l; });
}

export function langLabel(code) {
  if (languageCache && languageCache[code]) return languageCache[code].label;
  // Fallback so labels are never blank even before the cache loads.
  const fallback = { english: "English", hindi: "Hindi", braille: "Braille" };
  return fallback[code] || (code ? code.charAt(0).toUpperCase() + code.slice(1) : "");
}

// Builds the "lang-tag" badge markup shown on book covers/detail pages.
// Braille keeps its original dark badge + dot-cell icon (the dots are a
// deliberate nod to actual Braille). Every other language gets a plain
// orange badge with no dots.
//
// Which is which is decided by the language's explicit "isBraille" flag
// (set in Admin → Manage languages) — not by guessing from the name, so
// it works correctly no matter what the language is called. Falls back
// to checking the name only for languages saved before this flag existed.
export function langTagHtml(code, suffix = "") {
  const label = langLabel(code);
  const cached = languageCache && languageCache[code];
  const isBraille = cached && typeof cached.isBraille === "boolean"
    ? cached.isBraille
    : (String(code).toLowerCase().includes("braille") || label.toLowerCase().includes("braille"));
  const cls = isBraille ? "lang-tag" : "lang-tag lang-non-braille";
  const dots = isBraille
    ? `<span class="dot-cell active" data-pattern="braille"><span></span><span></span><span></span><span></span><span></span><span></span></span> `
    : "";
  return `<span class="${cls}">${dots}${label}${suffix}</span>`;
}

let toastTimer = null;
export function showToast(message) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

// isAdminEmail is still used by the /admin panel, which is unaffected
// by removing customer accounts — it's a completely separate login.
export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}

// Wires up the mobile nav toggle and cart badge on every page.
// There's no customer login anymore, so the nav no longer shows an
// account/login slot — checkout collects guest details directly instead.
export function initNav() {
  updateCartBadge();
  updateWishlistBadge();

  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.style.display === "flex";
      links.style.display = open ? "none" : "flex";
    });
  }

  // Footer logo always goes "home" — if you're already on the shop page,
  // that means scrolling to the top instead of just reloading it.
  const footerLogo = document.getElementById("footerLogo");
  if (footerLogo) {
    footerLogo.addEventListener("click", (e) => {
      const path = window.location.pathname;
      const onHome = path.endsWith("index.html") || path === "/" || path.endsWith("/");
      if (onHome) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }
}

// A simple wishlist kept in localStorage — no login needed, same approach
// as the cart. Persists on this device/browser only; there's no way to
// sync it across devices without customer accounts.

const WISHLIST_KEY = "vbs_wishlist";

function read() {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)) || []; }
  catch { return []; }
}
function write(items) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  updateWishlistBadge();
}

export function getWishlist() { return read(); }

export function isWishlisted(bookId) {
  return read().some((i) => i.id === bookId);
}

export function toggleWishlist(book) {
  const items = read();
  const exists = items.some((i) => i.id === book.id);
  const next = exists
    ? items.filter((i) => i.id !== book.id)
    : [...items, {
        id: book.id, title: book.title, price: book.price,
        language: book.language, coverImageUrl: book.coverImageUrl || "",
      }];
  write(next);
  return !exists; // true if it was just added
}

export function removeFromWishlist(bookId) {
  write(read().filter((i) => i.id !== bookId));
}

export function updateWishlistBadge() {
  const badge = document.querySelector("[data-wishlist-count]");
  if (!badge) return;
  const count = read().length;
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "flex" : "none";
}

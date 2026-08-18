// A simple cart kept in localStorage so it survives refreshes without
// needing a signed-in user. Checkout still requires login (see checkout.js).

const CART_KEY = "vbs_cart";

function read() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}
function write(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadge();
}

export function getCart() { return read(); }

export function addToCart(book, qty = 1) {
  const items = read();
  const existing = items.find((i) => i.id === book.id);
  if (existing) existing.qty += qty;
  else items.push({
    id: book.id, title: book.title, price: book.price,
    language: book.language, coverImageUrl: book.coverImageUrl || "", qty,
  });
  write(items);
}

export function updateQty(id, qty) {
  let items = read();
  if (qty <= 0) items = items.filter((i) => i.id !== id);
  else items = items.map((i) => (i.id === id ? { ...i, qty } : i));
  write(items);
}

export function removeFromCart(id) {
  write(read().filter((i) => i.id !== id));
}

export function clearCart() { write([]); }

export function cartTotal(items = read()) {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

export function cartCount(items = read()) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function updateCartBadge() {
  const badge = document.querySelector("[data-cart-count]");
  if (!badge) return;
  const count = cartCount();
  badge.textContent = String(count);
  badge.style.display = count > 0 ? "flex" : "none";
}

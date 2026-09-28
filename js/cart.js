const KEY = "bale_cart_v2";
const listeners = new Set();

export function getCart() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; } catch { return []; }
}
function save(lines) {
  try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
  listeners.forEach((fn) => fn(lines));
}
export const onCartChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const cartCount = () => getCart().reduce((s, l) => s + l.qty, 0);

export function addToCart(productId, qty = 1) {
  const lines = getCart();
  const found = lines.find((l) => l.productId === productId);
  if (found) found.qty += qty; else lines.push({ productId, qty });
  save(lines);
}
export function setQty(productId, qty) {
  save(getCart().map((l) => (l.productId === productId ? { ...l, qty: Math.max(1, qty) } : l)));
}
export function removeFromCart(productId) { save(getCart().filter((l) => l.productId !== productId)); }
export function clearCart() { save([]); }

// Keep multiple tabs in sync
window.addEventListener("storage", (e) => { if (e.key === KEY) listeners.forEach((fn) => fn(getCart())); });

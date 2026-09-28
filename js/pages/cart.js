import { mountLayout } from "../layout.js";
import { client, api, esc, naira } from "../core.js";
import { getCart, setQty, removeFromCart, onCartChange } from "../cart.js";
import { imageFor } from "../config.js";
import { checkoutSteps } from "../components.js";
import { icon } from "../icons.js";

mountLayout();
const root = document.getElementById("cart");
let unsub;

function empty() {
  root.innerHTML = `<div class="card mx-auto max-w-lg animate-fade-up p-10 text-center">
    <span class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">${icon("cart", "h-8 w-8")}</span>
    <h2 class="mt-5 text-2xl font-extrabold">Your cart is empty</h2>
    <p class="mt-2 text-ink/60">Pick the bales you want and they'll show up here.</p>
    <a href="shop.html" class="btn mt-6">Shop bales</a></div>`;
}

function render(products) {
  const lines = getCart();
  if (!lines.length) return empty();
  const rows = lines.map((l) => ({ l, p: products.find((p) => p._id === l.productId) })).filter((r) => r.p);
  const missing = lines.length - rows.length;
  const subtotal = rows.reduce((s, r) => s + r.p.price * r.l.qty, 0);
  const overStock = rows.some((r) => r.l.qty > r.p.stock);
  const count = rows.reduce((s, r) => s + r.l.qty, 0);

  root.innerHTML = checkoutSteps(1) + `<div class="grid gap-8 lg:grid-cols-[1fr_340px]">
    <div class="space-y-4">
      ${missing ? `<p class="rounded-2xl bg-brand-soft px-4 py-3 font-semibold text-brand-dark">${missing} bale(s) in your cart are no longer on sale and were left out.</p>` : ""}
      ${rows.map(({ l, p }) => `<article class="card flex animate-fade-up gap-4 p-4">
        <a href="bale.html?slug=${encodeURIComponent(p.slug)}" class="h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-sack sm:h-32 sm:w-32"><img src="${esc(imageFor(p))}" alt="" class="h-full w-full object-cover"></a>
        <div class="flex min-w-0 flex-1 flex-col">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0"><a href="bale.html?slug=${encodeURIComponent(p.slug)}" class="font-extrabold hover:text-brand">${esc(p.name)}</a>
              <p class="text-sm text-ink/60">${esc(p.weightKg)}kg · ${esc(p.origin)} · ${naira(p.price)} each</p></div>
            <button data-remove="${p._id}" class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/40 hover:bg-stop/10 hover:text-stop" aria-label="Remove ${esc(p.name)}">${icon("close", "h-4 w-4")}</button>
          </div>
          ${l.qty > p.stock ? `<p class="mt-1 text-sm font-semibold text-stop">Only ${p.stock} available. Reduce the quantity to continue.</p>` : ""}
          <div class="mt-auto flex items-center justify-between gap-3 pt-3">
            <div class="flex items-center rounded-full border border-strap">
              <button data-dec="${p._id}" class="grid h-9 w-9 place-items-center rounded-full hover:text-brand" aria-label="Decrease">${icon("minus", "h-4 w-4")}</button>
              <span class="w-8 text-center font-bold">${l.qty}</span>
              <button data-inc="${p._id}" ${l.qty >= p.stock ? "disabled" : ""} class="grid h-9 w-9 place-items-center rounded-full hover:text-brand disabled:opacity-30" aria-label="Increase">${icon("plus", "h-4 w-4")}</button>
            </div>
            <p class="text-lg font-extrabold">${naira(p.price * l.qty)}</p>
          </div>
        </div>
      </article>`).join("")}
      <a href="shop.html" class="inline-flex items-center gap-2 font-semibold text-ink/60 hover:text-brand">${icon("arrowL", "h-4 w-4")} Keep shopping</a>
    </div>
    <aside class="card h-fit space-y-4 p-6 lg:sticky lg:top-28">
      <p class="text-lg font-extrabold">Order summary</p>
      <div class="flex justify-between text-ink/70"><span>Bales</span><span>${count}</span></div>
      <div class="flex justify-between text-ink/70"><span>Subtotal</span><span class="font-bold text-ink">${naira(subtotal)}</span></div>
      <p class="rounded-xl bg-wrap p-3 text-sm text-ink/60">Delivery fee is added at checkout based on your state. Pickup is free.</p>
      ${overStock ? `<button class="btn w-full" disabled>Continue to checkout</button>` : `<a href="checkout.html" class="btn w-full">Continue to checkout ${icon("arrow", "h-5 w-5")}</a>`}
      <p class="flex items-center justify-center gap-2 text-xs text-ink/50">${icon("shield", "h-4 w-4")} Secure payment with Paystack</p>
    </aside>
  </div>`;
}

function subscribe() {
  unsub?.();
  const lines = getCart();
  if (!lines.length) return empty();
  unsub = client.onUpdate(api.products.byIds, { ids: lines.map((l) => l.productId) }, render, () => render([]));
}

root.addEventListener("click", (e) => {
  const t = e.target.closest("[data-remove],[data-inc],[data-dec]");
  if (!t) return;
  const line = (id) => getCart().find((l) => l.productId === id);
  if (t.dataset.remove) removeFromCart(t.dataset.remove);
  if (t.dataset.inc) setQty(t.dataset.inc, (line(t.dataset.inc)?.qty ?? 0) + 1);
  if (t.dataset.dec) {
    const q = line(t.dataset.dec)?.qty ?? 1;
    q <= 1 ? removeFromCart(t.dataset.dec) : setQty(t.dataset.dec, q - 1);
  }
});
onCartChange(subscribe);
subscribe();

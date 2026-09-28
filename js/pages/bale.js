import { mountLayout } from "../layout.js";
import { client, api, esc, naira, waLink, params, getSettings } from "../core.js";
import { gradeBadge, availabilityBadge, productCard, wireAddButtons, discount } from "../components.js";
import { GRADES, SITE, imageFor } from "../config.js";
import { addToCart, getCart, onCartChange } from "../cart.js";
import { icon } from "../icons.js";
import { toast, reveal } from "../ui.js";

mountLayout();
const root = document.getElementById("bale");
const slug = params().get("slug");
const settings = await getSettings();
let current, all = [], shown = 0, showVideo = false, qty = 1;

function notFound() {
  root.className = "mx-auto mt-10 max-w-xl rounded-2xl bg-white p-10 text-center";
  root.innerHTML = `<h1 class="text-3xl font-extrabold">This bale isn't available</h1>
    <p class="mt-2 text-ink/60">It may have sold out and been removed.</p>
    <a href="shop.html" class="btn mt-6">See other bales</a>`;
}

const media = (b) => (b.images.length ? b.images : [imageFor(b)]);

function gallery(b) {
  const imgs = media(b);
  return `<div class="lg:sticky lg:top-24">
    <div class="relative aspect-square overflow-hidden rounded-[1.75rem] bg-sack">
      ${imgs.map((src, i) => `<img src="${esc(src)}" alt="${esc(b.name)}, photo ${i + 1}" class="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${!showVideo && i === shown ? "opacity-100" : "opacity-0"}">`).join("")}
      ${showVideo && b.video ? `<video src="${esc(b.video)}" controls autoplay playsinline class="absolute inset-0 h-full w-full bg-ink object-contain"></video>` : ""}
      <div class="absolute left-4 top-4 flex gap-2">
        ${discount(b) ? `<span class="rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">-${discount(b)}%</span>` : ""}
        ${b.isNewArrival && b.stock > 0 ? `<span class="rounded-full bg-white px-3 py-1 text-sm font-semibold">New</span>` : ""}
      </div>
      ${imgs.length > 1 && !showVideo ? `
        <div class="absolute bottom-4 right-4 flex gap-2">
          <button data-step="-1" class="grid h-11 w-11 place-items-center rounded-full bg-white shadow hover:bg-ink hover:text-white" aria-label="Previous photo">${icon("arrowL", "h-4 w-4")}</button>
          <button data-step="1" class="grid h-11 w-11 place-items-center rounded-full bg-white shadow hover:bg-ink hover:text-white" aria-label="Next photo">${icon("arrowR", "h-4 w-4")}</button>
        </div>` : ""}
    </div>
    ${imgs.length > 1 || b.video ? `<div class="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
      ${imgs.map((src, i) => `<button data-photo="${i}" aria-label="Show photo ${i + 1}" class="h-20 w-16 shrink-0 overflow-hidden rounded-xl ring-2 transition ${!showVideo && i === shown ? "ring-ink" : "ring-transparent opacity-60 hover:opacity-100"}"><img src="${esc(src)}" alt="" class="h-full w-full object-cover"></button>`).join("")}
      ${b.video ? `<button data-video class="flex h-20 shrink-0 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white ring-2 ${showVideo ? "ring-brand" : "ring-transparent"}">${icon("video", "h-4 w-4")} Opening video</button>` : ""}
    </div>` : ""}
  </div>`;
}

function buyBox(b) {
  if (b.stock <= 0) return `<p class="rounded-2xl bg-sack p-4 text-sm font-medium">Sold out. Message us on WhatsApp to ask when it's back.</p>`;
  const inCart = getCart().find((l) => l.productId === b._id)?.qty ?? 0;
  const max = Math.max(0, b.stock - inCart);
  qty = Math.min(qty, Math.max(1, max));
  if (max === 0) return `<a href="cart.html" class="btn w-full">All available bales are in your cart · View cart</a>`;
  return `<div class="flex gap-3">
    <div class="flex items-center rounded-full border border-strap bg-white">
      <button data-qty="-1" class="grid h-14 w-12 place-items-center hover:text-brand" aria-label="Decrease">${icon("minus", "h-4 w-4")}</button>
      <span class="w-6 text-center font-semibold" aria-live="polite">${qty}</span>
      <button data-qty="1" class="grid h-14 w-12 place-items-center hover:text-brand" aria-label="Increase">${icon("plus", "h-4 w-4")}</button>
    </div>
    <button id="add" class="btn flex-1 !py-4 text-base">Add to cart · ${naira(b.price * qty)}</button>
  </div>`;
}

function render(b) {
  const g = GRADES[b.grade];
  const off = discount(b);
  root.innerHTML = `
    <div id="gallery">${gallery(b)}</div>
    <div>
      <p class="kicker">${esc(b.category)} · ${g.label}</p>
      <h1 class="display mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">${esc(b.name)}</h1>
      <div class="mt-5 flex flex-wrap items-baseline gap-3">
        <p class="display text-2xl font-bold">${naira(b.price)}</p>
        ${off ? `<span class="price-old">${naira(b.oldPrice)}</span><span class="badge-off">Save ${off}%</span>` : ""}
      </div>
      <div class="mt-3">${availabilityBadge(b.stock)}</div>
      <p class="mt-6 whitespace-pre-line leading-relaxed text-ink/70">${esc(b.description || g.note)}</p>
      <div id="buy" class="mt-8">${buyBox(b)}</div>
      <a href="${waLink(settings.whatsapp, `Hello, I'm interested in ${b.name} (${b.weightKg}kg). Can I see an opening video?`)}" target="_blank" rel="noopener" class="btn-ghost mt-3 w-full">${icon("whatsapp", "h-5 w-5 text-go")} Ask for an opening video</a>
      <dl class="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-strap bg-strap text-sm">
        ${[["Grade", g.label], ["Weight", `${b.weightKg}kg`], ["Origin", b.origin], ["Pieces", b.pieceCount ? `About ${b.pieceCount}` : "Ask us"]].map(([k, v]) => `<div class="bg-white p-4"><dt class="text-ink/50">${k}</dt><dd class="mt-0.5 font-semibold">${esc(v)}</dd></div>`).join("")}
      </dl>
      <div class="mt-6 divide-y divide-strap border-y border-strap">
        ${[["Grade explained", `${g.label}: ${g.condition}. Rejects: ${g.rejects}. Best for ${g.bestFor.toLowerCase()}.`],
           ["Delivery & pickup", `Free pickup at ${settings.pickupAddress}. Delivery to every state; the fee for your state shows at checkout. Lagos 1–2 days, other states 2–5 days.`],
           ["Payment", "Bank transfer or card through Paystack, confirmed automatically. Or cash / POS when you collect at the warehouse. All sales are final: no refunds, so ask for an opening video before you pay."]]
          .map(([t, d], i) => `<details class="group py-4" ${i === 0 ? "open" : ""}><summary class="flex cursor-pointer list-none items-center justify-between font-semibold">${t}<span class="transition group-open:rotate-45">${icon("plus", "h-4 w-4")}</span></summary><p class="mt-3 text-sm leading-relaxed text-ink/65">${esc(d)}</p></details>`).join("")}
      </div>
    </div>`;
  document.getElementById("crumb").innerHTML = `<a href="index.html" class="hover:text-ink">Home</a> / <a href="shop.html" class="hover:text-ink">Shop</a> / <a href="shop.html?category=${encodeURIComponent(b.category)}" class="hover:text-ink">${esc(b.category)}</a> / <span class="text-ink">${esc(b.name)}</span>`;
  document.title = `${b.name} (${b.weightKg}kg, ${g.label}) | ${SITE.name}`;
  document.querySelector('meta[name="description"]').content = b.description.slice(0, 155) || document.title;
}

function renderRelated() {
  if (!current) return;
  const rel = all.filter((p) => p._id !== current._id && p.stock > 0)
    .sort((a, b) => (b.category === current.category) - (a.category === current.category)).slice(0, 10);
  document.getElementById("related").classList.toggle("hidden", !rel.length);
  document.getElementById("related-list").innerHTML = rel.map((b) => `<div class="w-56 shrink-0 snap-start sm:w-64">${productCard(b)}</div>`).join("");
  reveal(document.getElementById("related"));
}

if (!slug) notFound();
else {
  client.onUpdate(api.products.bySlug, { slug }, (b) => {
    if (!b) return notFound();
    current = b;
    shown = Math.min(shown, media(b).length - 1);
    render(b);
    renderRelated();
  });
  client.onUpdate(api.products.list, {}, (list) => { all = list; renderRelated(); });
  wireAddButtons(document.getElementById("related-list"), (id) => all.find((p) => p._id === id));

  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-photo],[data-video],[data-step],[data-qty],#add");
    if (!t || !current) return;
    if (t.id === "add") {
      addToCart(current._id, qty);
      toast(`${esc(current.name)} × ${qty} added`, { action: { label: "View cart", href: "cart.html" } });
      qty = 1;
      document.getElementById("buy").innerHTML = buyBox(current);
      return;
    }
    if (t.dataset.qty) {
      const inCart = getCart().find((l) => l.productId === current._id)?.qty ?? 0;
      qty = Math.max(1, Math.min(current.stock - inCart, qty + Number(t.dataset.qty)));
      document.getElementById("buy").innerHTML = buyBox(current);
      return;
    }
    const n = media(current).length;
    if (t.dataset.photo) { shown = Number(t.dataset.photo); showVideo = false; }
    else if (t.dataset.step) shown = (shown + Number(t.dataset.step) + n) % n;
    else if (t.hasAttribute("data-video")) showVideo = true;
    document.getElementById("gallery").innerHTML = gallery(current);
  });
  onCartChange(() => current && (document.getElementById("buy").innerHTML = buyBox(current)));
}

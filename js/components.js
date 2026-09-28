import { esc, naira } from "./core.js";
import { GRADES, STATUS_LABEL, imageFor } from "./config.js";
import { icon } from "./icons.js";
import { addToCart, getCart } from "./cart.js";
import { toast } from "./ui.js";

const GRADE_STYLE = {
  cream: "border-amber-300 text-amber-800",
  A: "border-emerald-300 text-emerald-800",
  B: "border-slate-300 text-slate-700",
};

export const gradeBadge = (grade, cls = "") =>
  `<span class="inline-flex items-center rounded border bg-white/95 px-1.5 py-0.5 text-[10px] font-bold ${GRADE_STYLE[grade] ?? GRADE_STYLE.A} ${cls}">${GRADES[grade]?.label ?? grade}</span>`;

// Availability shown to customers comes only from the stock number the admin sets.
let LOW_AT = 3;
export const setLowStockAt = (n) => { if (Number.isFinite(n) && n >= 0) LOW_AT = n; };
export const availability = (stock) => (stock <= 0 ? "sold" : stock <= LOW_AT ? "few" : "ok");

export function availabilityBadge(stock, cls = "") {
  const a = availability(stock);
  const map = {
    ok: ["bg-go/10 text-go", "Available"],
    few: ["bg-brand-soft text-brand-dark", "Few left"],
    sold: ["bg-ink/10 text-ink/70", "Sold out"],
  };
  return `<span class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold ${map[a][0]} ${cls}"><span class="h-1.5 w-1.5 rounded-full bg-current"></span>${map[a][1]}</span>`;
}
export const stockBar = (stock) => availabilityBadge(stock);

export const discount = (b) => (b.oldPrice && b.oldPrice > b.price ? Math.round((1 - b.price / b.oldPrice) * 100) : 0);

/** Product card: big photo, clean text, price on the right. */
export function productCard(b, { deal = false } = {}) {
  const href = `bale.html?slug=${encodeURIComponent(b.slug)}`;
  const soldOut = b.stock <= 0;
  const off = discount(b);
  const few = availability(b.stock) === "few";
  const dark = deal;
  return `<article class="group relative flex flex-col">
    <div class="relative aspect-[4/5] overflow-hidden rounded-2xl ${dark ? "bg-white/10" : "bg-sack"}">
      <a href="${href}" class="block h-full" tabindex="-1" aria-hidden="true">
        <img src="${esc(imageFor(b))}" alt="" loading="lazy" class="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04] ${soldOut ? "opacity-60 grayscale" : ""}"></a>
      <div class="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
        ${off ? `<span class="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">-${off}%</span>` : ""}
        ${soldOut ? `<span class="rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">Sold out</span>` : b.isNewArrival ? `<span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink">New</span>` : ""}
      </div>
      <span class="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink backdrop-blur">${GRADES[b.grade]?.label ?? ""}</span>
      <div class="absolute bottom-3 right-3 flex gap-2">
        <button data-quick="${b._id}" class="hidden h-10 w-10 translate-y-2 place-items-center rounded-full bg-white text-ink opacity-0 shadow-md transition duration-300 hover:bg-ink hover:text-white group-hover:translate-y-0 group-hover:opacity-100 sm:grid" aria-label="Quick view ${esc(b.name)}">${icon("search", "h-4 w-4")}</button>
        ${soldOut ? "" : `<button data-add="${b._id}" class="grid h-10 w-10 place-items-center rounded-full bg-ink text-white shadow-md transition duration-300 hover:bg-brand sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:focus:opacity-100" aria-label="Add ${esc(b.name)} to cart">${icon("plus", "h-5 w-5")}</button>`}
      </div>
    </div>
    <div class="mt-3 flex flex-col gap-1">
      <div class="min-w-0">
        <h3 class="truncate text-sm font-medium ${dark ? "text-white" : ""}"><a href="${href}" class="hover:underline">${esc(b.name)}</a></h3>
        <p class="mt-0.5 text-xs ${dark ? "text-white/55" : "text-ink/50"}">${esc(b.weightKg)}kg · ${esc(b.origin)}</p>
      </div>
      <div class="flex items-baseline gap-2">
        <p class="text-[15px] font-bold ${dark ? "text-white" : ""}">${naira(b.price)}</p>
        ${off ? `<p class="text-xs ${dark ? "text-white/45" : "text-ink/40"} line-through">${naira(b.oldPrice)}</p>` : ""}
      </div>
    </div>
    ${few && !soldOut ? `<p class="mt-1 flex items-center gap-1.5 text-xs font-medium text-brand"><span class="h-1.5 w-1.5 rounded-full bg-brand"></span>Few left</p>` : ""}
  </article>`;
}
export const gridCard = productCard;
export const wideCard = productCard;

export function categoryTile(name, count, image) {
  return `<a href="shop.html?category=${encodeURIComponent(name)}" class="zoom-img reveal group relative block aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-xl bg-sack sm:w-auto">
    <img src="${esc(image)}" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover">
    <div class="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent"></div>
    <div class="absolute inset-x-0 bottom-0 p-4 text-white">
      <p class="font-bold">${esc(name)}</p>
      <p class="text-xs text-white/75">${count} in stock</p>
    </div>
  </a>`;
}

export function cardSkeletons(n = 4) {
  return Array.from({ length: n }, () => `<div><div class="skeleton aspect-[4/5]"></div><div class="mt-3 space-y-2"><div class="skeleton h-4 w-3/4"></div><div class="skeleton h-3 w-1/2"></div></div></div>`).join("");
}

/** Delegated "Add to cart" for any [data-add] button inside root. */
export function wireAddButtons(root, findProduct) {
  root.addEventListener("click", (e) => {
    const qv = e.target.closest("[data-quick]");
    if (qv) { e.preventDefault(); const p = findProduct(qv.dataset.quick); if (p) quickView(p); return; }
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    e.preventDefault();
    const p = findProduct(btn.dataset.add);
    if (!p) return;
    const inCart = getCart().find((l) => l.productId === p._id)?.qty ?? 0;
    if (inCart >= p.stock) return toast("You already have all available bales of this in your cart");
    addToCart(p._id, 1);
    toast(`${esc(p.name)} added`, { action: { label: "View cart", href: "cart.html" } });
  });
}

export function statusTrail(status, fulfilment) {
  if (status === "cancelled")
    return `<p class="rounded-2xl bg-stop/10 px-4 py-3 font-semibold text-stop">This order was cancelled.</p>`;
  const steps = fulfilment === "delivery"
    ? ["awaiting_payment", "confirmed", "packed", "dispatched", "completed"]
    : ["awaiting_payment", "confirmed", "packed", "ready_for_pickup", "completed"];
  const at = steps.indexOf(status);
  return `<ol class="grid grid-cols-5 gap-2" aria-label="Order progress">${steps.map((s, i) => `
    <li class="text-xs sm:text-sm">
      <div class="h-2 rounded-full ${i <= at ? "bg-brand" : "bg-sack"}"></div>
      <p class="mt-2 ${i === at ? "font-bold text-ink" : i < at ? "text-ink/70" : "text-ink/40"}">
        ${s === "completed" ? (fulfilment === "delivery" ? "Delivered" : "Collected") : STATUS_LABEL[s]}
      </p>
    </li>`).join("")}</ol>`;
}

/* ─── Quick view modal ─── */
let qvState = null;
function qvRender() {
  const { p, shown, qty } = qvState;
  const imgs = p.images?.length ? p.images : [imageFor(p)];
  const inCart = getCart().find((l) => l.productId === p._id)?.qty ?? 0;
  const max = Math.max(0, p.stock - inCart);
  const g = GRADES[p.grade];
  return `<div class="grid md:grid-cols-2">
    <div class="bg-sack p-3">
      <div class="relative aspect-square overflow-hidden rounded-lg">
        <img src="${esc(imgs[shown])}" alt="${esc(p.name)}" class="h-full w-full object-cover">
      </div>
      ${imgs.length > 1 ? `<div class="mt-2 flex gap-2">${imgs.map((src, i) => `<button data-qv-photo="${i}" class="h-16 w-16 overflow-hidden rounded-md border-2 ${i === shown ? "border-brand" : "border-transparent opacity-70"}"><img src="${esc(src)}" alt="" class="h-full w-full object-cover"></button>`).join("")}</div>` : ""}
    </div>
    <div class="flex flex-col p-6 sm:p-8">
      <div class="flex items-start justify-between gap-4">
        <div><p class="text-sm font-semibold text-ink/55">${esc(p.category)}</p><h2 class="mt-1 text-2xl font-extrabold leading-tight">${esc(p.name)}</h2></div>
        <button data-qv-close class="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-sack" aria-label="Close">${icon("close")}</button>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2"><p class="text-3xl font-extrabold">${naira(p.price)}</p>
        ${discount(p) ? `<span class="price-old">${naira(p.oldPrice)}</span><span class="badge-off">-${discount(p)}%</span>` : ""}</div>
      <dl class="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-sack py-4 text-sm">
        <div><dt class="text-ink/50">Grade</dt><dd class="font-bold">${g.label}</dd></div>
        <div><dt class="text-ink/50">Weight</dt><dd class="font-bold">${esc(p.weightKg)}kg</dd></div>
        <div><dt class="text-ink/50">Origin</dt><dd class="font-bold">${esc(p.origin)}</dd></div>
        <div><dt class="text-ink/50">Pieces</dt><dd class="font-bold">${p.pieceCount ? "~" + esc(p.pieceCount) : "Ask us"}</dd></div>
      </dl>
      <p class="mt-4 text-sm leading-relaxed text-ink/70">${esc(p.description || g.note)}</p>
      <div class="mt-4">${stockBar(p.stock)}</div>
      <div class="mt-auto pt-6">
        ${p.stock <= 0 ? `<p class="rounded-lg bg-sack p-3 text-sm font-semibold">Sold out. Message us to ask when it's back.</p>`
          : max === 0 ? `<a href="cart.html" class="btn w-full">All stock is in your cart. View cart</a>`
          : `<div class="flex gap-3">
              <div class="flex items-center rounded-lg border border-strap">
                <button data-qv-qty="-1" class="grid h-12 w-11 place-items-center hover:text-brand" aria-label="Decrease">${icon("minus", "h-4 w-4")}</button>
                <span class="w-7 text-center font-bold">${qty}</span>
                <button data-qv-qty="1" class="grid h-12 w-11 place-items-center hover:text-brand" aria-label="Increase">${icon("plus", "h-4 w-4")}</button>
              </div>
              <button data-qv-add class="btn flex-1">${icon("cart", "h-4 w-4")} Add to cart</button>
            </div>`}
        <a href="bale.html?slug=${encodeURIComponent(p.slug)}" class="mt-3 block text-center text-sm font-bold text-ink/70 underline hover:text-brand">See full details</a>
      </div>
    </div>
  </div>`;
}

export function quickView(p) {
  let modal = document.getElementById("quick-view");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "quick-view";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `<div class="modal-panel"></div>`;
    document.body.append(modal);
    const close = () => { modal.classList.remove("open"); document.body.style.overflow = ""; qvState = null; };
    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest("[data-qv-close]")) return close();
      if (!qvState) return;
      const t = e.target.closest("[data-qv-photo],[data-qv-qty],[data-qv-add]");
      if (!t) return;
      if (t.dataset.qvPhoto) qvState.shown = Number(t.dataset.qvPhoto);
      if (t.dataset.qvQty) {
        const inCart = getCart().find((l) => l.productId === qvState.p._id)?.qty ?? 0;
        qvState.qty = Math.max(1, Math.min(qvState.p.stock - inCart, qvState.qty + Number(t.dataset.qvQty)));
      }
      if (t.hasAttribute("data-qv-add")) {
        addToCart(qvState.p._id, qvState.qty);
        toast(`${esc(qvState.p.name)} × ${qvState.qty} added`, { action: { label: "View cart", href: "cart.html" } });
        return close();
      }
      modal.firstElementChild.innerHTML = qvRender();
    });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) close(); });
  }
  qvState = { p, shown: 0, qty: 1 };
  modal.firstElementChild.innerHTML = qvRender();
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  modal.querySelector("[data-qv-close]").focus();
}

/* ─── Grade comparison table ─── */
export function gradeTable(products = []) {
  const from = (g) => { const ps = products.filter((p) => p.grade === g && p.stock > 0).map((p) => p.price); return ps.length ? naira(Math.min(...ps)) : "—"; };
  const rows = [["Condition", "condition"], ["Rejects per bale", "rejects"], ["Best for", "bestFor"]];
  const keys = Object.keys(GRADES);
  return `<div class="card overflow-x-auto">
    <table class="w-full min-w-[640px] text-left">
      <thead><tr class="border-b border-sack">
        <th class="w-44 p-5 text-sm font-semibold text-ink/50"></th>
        ${keys.map((g) => `<th class="p-5 align-bottom"><p class="text-lg font-extrabold">${GRADES[g].label}</p><p class="mt-0.5 text-sm font-semibold text-ink/50">From ${from(g)}</p></th>`).join("")}
      </tr></thead>
      <tbody class="divide-y divide-sack text-sm">
        ${rows.map(([label, k]) => `<tr><th class="p-5 font-semibold text-ink/60">${label}</th>${keys.map((g) => `<td class="p-5">${GRADES[g][k]}</td>`).join("")}</tr>`).join("")}
        <tr><th class="p-5"></th>${keys.map((g) => `<td class="p-5"><a href="shop.html?grade=${g}" class="link-more">Shop ${GRADES[g].label} ${icon("arrow", "h-4 w-4")}</a></td>`).join("")}</tr>
      </tbody>
    </table>
  </div>`;
}

/** Checkout progress: 1 Cart → 2 Details → 3 Payment → 4 Done */
export function checkoutSteps(active) {
  const steps = ["Cart", "Details", "Payment", "Done"];
  return `<ol class="mx-auto mb-8 flex max-w-xl items-center" aria-label="Checkout progress">${steps.map((s, i) => {
    const n = i + 1, done = n < active, on = n === active;
    return `<li class="flex flex-1 items-center ${i === steps.length - 1 ? "flex-none" : ""}">
      <span class="flex items-center gap-2">
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-go text-white" : on ? "bg-brand text-white" : "bg-white text-ink/40 ring-1 ring-strap"}">${done ? icon("check", "h-4 w-4") : n}</span>
        <span class="hidden text-sm font-bold sm:inline ${on ? "text-ink" : "text-ink/50"}">${s}</span></span>
      ${i < steps.length - 1 ? `<span class="mx-2 h-0.5 flex-1 rounded ${done ? "bg-go" : "bg-strap"}"></span>` : ""}
    </li>`; }).join("")}</ol>`;
}

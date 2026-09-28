import { mountLayout } from "../layout.js";
import { client, api, esc, naira, params } from "../core.js";
import { productCard, cardSkeletons, wireAddButtons, discount } from "../components.js";
import { GRADES } from "../config.js";
import { icon } from "../icons.js";
import { reveal } from "../ui.js";

mountLayout();
const sp = params();
const state = {
  q: sp.get("q") ?? "",
  category: sp.get("category") ?? "",
  grades: new Set(sp.get("grade") ? sp.get("grade").split(",") : []),
  weight: sp.get("weight") ?? "",
  instock: sp.get("instock") === "1",
  deals: sp.get("deals") === "1",
  min: sp.get("min") ?? "",
  max: sp.get("max") ?? "",
  sort: sp.get("sort") ?? "new",
};

let all = [];
const results = document.getElementById("results");
const filters = document.getElementById("filters");
const $sort = document.getElementById("sort");
$sort.value = state.sort;
results.innerHTML = `<div class="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3">${cardSkeletons(6)}</div>`;
wireAddButtons(results, (id) => all.find((p) => p._id === id));

function syncUrl() {
  const q = new URLSearchParams();
  if (state.q) q.set("q", state.q);
  if (state.category) q.set("category", state.category);
  if (state.grades.size) q.set("grade", [...state.grades].join(","));
  if (state.weight) q.set("weight", state.weight);
  if (state.instock) q.set("instock", "1");
  if (state.deals) q.set("deals", "1");
  if (state.min) q.set("min", state.min);
  if (state.max) q.set("max", state.max);
  if (state.sort !== "new") q.set("sort", state.sort);
  history.replaceState(null, "", q.toString() ? `shop.html?${q}` : "shop.html");
}

const box = (title, body) => `<div class="border-b border-strap py-5 first:pt-0 last:border-0"><p class="mb-3 text-sm font-semibold">${title}</p>${body}</div>`;
function renderFilters() {
  const counts = {};
  for (const b of all) counts[b.category] = (counts[b.category] ?? 0) + 1;
  const weights = [...new Set(all.map((b) => b.weightKg))].sort((a, b) => a - b);
  const check = (attrs, on, label) => `<label class="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-ink/75"><input type="checkbox" ${attrs} ${on ? "checked" : ""} class="h-4 w-4 accent-[#141414]"> ${label}</label>`;
  filters.innerHTML = `
    <div class="mb-3 flex items-center justify-between lg:hidden"><p class="text-lg font-extrabold">Filters</p>
      <button data-close-filters class="grid h-9 w-9 place-items-center rounded-md hover:bg-sack" aria-label="Close filters">${icon("close")}</button></div>
    <div class="lg:sticky lg:top-28">
      ${box("Category", `<div class="space-y-0.5">
        <button data-cat="" class="flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm ${!state.category ? "bg-ink font-medium text-white" : "text-ink/70 hover:bg-sack"}">All bales <span class="opacity-50">${all.length}</span></button>
        ${Object.keys(counts).sort().map((c) => `<button data-cat="${esc(c)}" class="flex w-full justify-between rounded-lg px-3 py-2 text-left text-sm ${state.category === c ? "bg-ink font-medium text-white" : "text-ink/70 hover:bg-sack"}">${esc(c)} <span class="opacity-50">${counts[c]}</span></button>`).join("")}</div>`)}
      ${box("Price (₦)", `<form data-price class="flex items-center gap-2">
        <input name="min" type="number" min="0" value="${esc(state.min)}" placeholder="Min" class="w-full rounded-lg border border-strap bg-white px-3 py-2 text-sm">
        <input name="max" type="number" min="0" value="${esc(state.max)}" placeholder="Max" class="w-full rounded-lg border border-strap bg-white px-3 py-2 text-sm">
        <button class="rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white">Go</button></form>`)}
      ${box("Grade", Object.entries(GRADES).map(([g, v]) => check(`data-grade="${g}"`, state.grades.has(g), v.label)).join(""))}
      ${box("Weight", `<div class="flex flex-wrap gap-1.5">${weights.map((w) => `<button data-weight="${state.weight === String(w) ? "" : w}" class="${state.weight === String(w) ? "chip-on" : "chip"} !px-3 !py-1.5">${w}kg</button>`).join("")}</div>`)}
      ${box("Show only", check("data-deals", state.deals, "Deals (discounted)") + check("data-instock", state.instock, "In stock"))}
    </div>`;
}

function render() {
  let list = all;
  const q = state.q.trim().toLowerCase();
  if (q) list = list.filter((b) => `${b.name} ${b.category} ${b.origin} ${GRADES[b.grade].label} ${b.description}`.toLowerCase().includes(q));
  if (state.category) list = list.filter((b) => b.category === state.category);
  if (state.grades.size) list = list.filter((b) => state.grades.has(b.grade));
  if (state.weight) list = list.filter((b) => b.weightKg === Number(state.weight));
  if (state.instock) list = list.filter((b) => b.stock > 0);
  if (state.deals) list = list.filter((b) => discount(b) > 0);
  if (state.min) list = list.filter((b) => b.price >= Number(state.min));
  if (state.max) list = list.filter((b) => b.price <= Number(state.max));
  const sorters = {
    new: (a, b) => (b.stock > 0) - (a.stock > 0) || b.createdAt - a.createdAt,
    "price-asc": (a, b) => a.price - b.price,
    "price-desc": (a, b) => b.price - a.price,
    discount: (a, b) => discount(b) - discount(a),
  };
  list = [...list].sort(sorters[state.sort] ?? sorters.new);

  const title = state.q ? `Results for “${state.q}”` : state.deals ? "Deals" : state.category || "All bales";
  document.getElementById("shop-title").textContent = title;
  document.getElementById("crumbs").innerHTML = `<a href="index.html" class="hover:text-ink">Home</a> <span class="mx-1">/</span> <a href="shop.html" class="hover:text-ink">Shop</a>${title !== "All bales" ? ` <span class="mx-1">/</span> <span class="text-ink">${esc(title)}</span>` : ""}`;
  document.getElementById("count").textContent = `${list.length} bale${list.length === 1 ? "" : "s"} found`;

  const chips = [];
  if (state.q) chips.push(["q", `“${state.q}”`]);
  if (state.category) chips.push(["category", state.category]);
  for (const g of state.grades) chips.push([`grade:${g}`, GRADES[g].label]);
  if (state.weight) chips.push(["weight", `${state.weight}kg`]);
  if (state.min || state.max) chips.push(["price", `${state.min ? naira(state.min) : "₦0"} – ${state.max ? naira(state.max) : "any"}`]);
  if (state.deals) chips.push(["deals", "Deals"]);
  if (state.instock) chips.push(["instock", "In stock"]);
  document.getElementById("active-filters").innerHTML = chips.map(([k, l]) => `<button data-clear="${esc(k)}" class="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-soft">${esc(l)} ${icon("close", "h-3 w-3")}</button>`).join("")
    + (chips.length > 1 ? `<button data-reset class="px-2 text-xs font-semibold underline">Clear all</button>` : "");

  results.innerHTML = list.length
    ? `<div class="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3">${list.map((b) => productCard(b)).join("")}</div>`
    : `<div class="rounded-2xl bg-white p-12 text-center">
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sack text-ink/40">${icon("search", "h-7 w-7")}</span>
        <p class="mt-4 text-lg font-extrabold">No bales match these filters</p>
        <p class="mt-1 text-sm text-ink/60">Try removing a filter, or message us on WhatsApp and we'll tell you what's coming in.</p>
        <button data-reset class="btn mt-6">Clear filters</button></div>`;
  reveal(results);
  syncUrl();
}

const update = () => { renderFilters(); render(); };
const scrim = document.querySelector("[data-filter-scrim]");
const setDrawer = (open) => { filters.classList.toggle("open", open); scrim.classList.toggle("open", open); };
document.getElementById("open-filters").onclick = () => setDrawer(true);
scrim.onclick = () => setDrawer(false);

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-cat],[data-weight],[data-reset],[data-close-filters],[data-clear]");
  if (!t) return;
  if (t.hasAttribute("data-close-filters")) return setDrawer(false);
  if (t.hasAttribute("data-cat")) { state.category = t.dataset.cat; setDrawer(false); }
  if (t.hasAttribute("data-weight")) state.weight = t.dataset.weight;
  if (t.hasAttribute("data-reset")) { Object.assign(state, { q: "", category: "", weight: "", instock: false, deals: false, min: "", max: "" }); state.grades.clear(); }
  if (t.dataset.clear) {
    const k = t.dataset.clear;
    if (k.startsWith("grade:")) state.grades.delete(k.slice(6));
    else if (k === "price") { state.min = ""; state.max = ""; }
    else state[k] = typeof state[k] === "boolean" ? false : "";
  }
  update();
});
filters.addEventListener("change", (e) => {
  if (e.target.dataset.grade) e.target.checked ? state.grades.add(e.target.dataset.grade) : state.grades.delete(e.target.dataset.grade);
  if (e.target.hasAttribute("data-instock")) state.instock = e.target.checked;
  if (e.target.hasAttribute("data-deals")) state.deals = e.target.checked;
  if (e.target.dataset.grade || e.target.hasAttribute("data-instock") || e.target.hasAttribute("data-deals")) update();
});
filters.addEventListener("submit", (e) => {
  if (!e.target.matches("[data-price]")) return;
  e.preventDefault();
  state.min = e.target.min.value; state.max = e.target.max.value; setDrawer(false); update();
});
$sort.addEventListener("change", () => { state.sort = $sort.value; render(); });

client.onUpdate(api.products.list, {}, (bales) => { all = bales; update(); });

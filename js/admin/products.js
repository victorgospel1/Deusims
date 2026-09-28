// Inventory manager: everything customers see about stock comes from here.
import { client, api, esc, naira, date, errMsg } from "../core.js";
import { GRADES } from "../config.js";
import { requireAdmin, handleAuthError, ADMIN } from "./common.js";
import { imageFor } from "../config.js";
import { icon } from "../icons.js";
import { toast } from "../ui.js";

const token = await requireAdmin();
const root = document.getElementById("products");
const settings = await client.query(api.settings.get, {});
const LOW = settings.lowStockAt ?? 3;
let all = [], filter = "all", q = "", openLog = null, logRows = [];

const status = (p) => (p.archived ? "hidden" : p.stock <= 0 ? "sold" : p.stock <= LOW ? "few" : "ok");
const STATUS = {
  ok: ["bg-go/10 text-go", "Available"],
  few: ["bg-brand-soft text-brand-dark", "Few left"],
  sold: ["bg-ink/10 text-ink/70", "Sold out"],
  hidden: ["bg-sack text-ink/50", "Hidden"],
};

function stats() {
  const c = { all: all.length, ok: 0, few: 0, sold: 0, hidden: 0 };
  for (const p of all) c[status(p)]++;
  const units = all.filter((p) => !p.archived).reduce((s, p) => s + p.stock, 0);
  const value = all.filter((p) => !p.archived).reduce((s, p) => s + p.stock * p.price, 0);
  return `<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div class="card p-4"><p class="text-sm text-ink/55">Bales in stock</p><p class="text-2xl font-extrabold">${units}</p></div>
    <div class="card p-4"><p class="text-sm text-ink/55">Stock value</p><p class="text-2xl font-extrabold">${naira(value)}</p></div>
    <div class="card p-4"><p class="text-sm text-ink/55">Few left</p><p class="text-2xl font-extrabold text-brand-dark">${c.few}</p></div>
    <div class="card p-4"><p class="text-sm text-ink/55">Sold out</p><p class="text-2xl font-extrabold">${c.sold}</p></div>
  </div>
  <div class="mt-5 flex flex-wrap items-center gap-2">
    ${[["all", "All"], ["ok", "Available"], ["few", "Few left"], ["sold", "Sold out"], ["hidden", "Hidden"]].map(([k, l]) =>
      `<button data-filter="${k}" class="${filter === k ? "chip-on" : "chip"}">${l} <span class="opacity-60">${c[k]}</span></button>`).join("")}
    <label class="relative ml-auto w-full sm:w-64"><span class="sr-only">Search bales</span>
      <input id="inv-search" value="${esc(q)}" placeholder="Search bales…" class="field py-2 pl-10">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">${icon("search", "h-4 w-4")}</span></label>
  </div>`;
}

function row(p) {
  const st = status(p);
  return `<div class="card p-4" data-row="${p._id}">
    <div class="flex flex-wrap items-center gap-4">
      <img src="${esc(imageFor(p))}" alt="" class="h-16 w-14 shrink-0 rounded-lg object-cover">
      <div class="min-w-48 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <a href="${ADMIN()}product.html?id=${p._id}" class="font-bold hover:text-brand">${esc(p.name)}</a>
          <span class="rounded-md px-2 py-0.5 text-xs font-bold ${STATUS[st][0]}">${STATUS[st][1]}</span>
        </div>
        <p class="text-sm text-ink/55">${esc(p.category)} · ${GRADES[p.grade].label} · ${esc(p.weightKg)}kg · ${naira(p.price)}</p>
      </div>
      <div class="flex items-center gap-1 rounded-lg border border-strap bg-white" title="Bales in stock">
        <button data-delta="-1" data-id="${p._id}" ${p.stock <= 0 ? "disabled" : ""} class="grid h-10 w-10 place-items-center hover:text-brand disabled:opacity-30" aria-label="One less">${icon("minus", "h-4 w-4")}</button>
        <span class="w-10 text-center text-lg font-extrabold">${p.stock}</span>
        <button data-delta="1" data-id="${p._id}" class="grid h-10 w-10 place-items-center hover:text-brand" aria-label="One more">${icon("plus", "h-4 w-4")}</button>
      </div>
      <form data-restock="${p._id}" class="flex items-center gap-1">
        <input name="qty" type="number" min="1" placeholder="Qty" class="field w-20 py-2" aria-label="Restock quantity">
        <button class="btn px-3 py-2 text-sm">Restock</button>
      </form>
      <div class="flex items-center gap-1">
        ${p.stock > 0 ? `<button data-soldout="${p._id}" class="rounded-lg px-3 py-2 text-sm font-semibold text-stop hover:bg-stop/10">Mark sold out</button>` : ""}
        <button data-hide="${p._id}" data-archived="${p.archived}" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink/60 hover:bg-sack">${p.archived ? "Show" : "Hide"}</button>
        <button data-log="${p._id}" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink/60 hover:bg-sack">History</button>
        <a href="${ADMIN()}product.html?id=${p._id}" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink/60 hover:bg-sack">Edit</a>
        <button data-delete="${p._id}" data-name="${esc(p.name)}" class="rounded-lg px-3 py-2 text-sm font-semibold text-ink/40 hover:bg-stop/10 hover:text-stop" aria-label="Delete ${esc(p.name)}">Delete</button>
      </div>
    </div>
    ${openLog === p._id ? `<div class="mt-4 border-t border-sack pt-3">
      ${logRows.length ? `<table class="w-full text-sm"><tbody class="divide-y divide-sack">${logRows.map((l) => `<tr>
        <td class="py-2 text-ink/55">${date(l.at)}</td><td class="py-2">${esc(l.reason)}</td>
        <td class="py-2 text-right font-bold ${l.change > 0 ? "text-go" : "text-stop"}">${l.change > 0 ? "+" : ""}${l.change}</td>
        <td class="py-2 text-right text-ink/55">→ ${l.stockAfter}</td></tr>`).join("")}</tbody></table>`
        : `<p class="text-sm text-ink/55">No stock changes recorded yet.</p>`}
    </div>` : ""}
  </div>`;
}

function render() {
  const term = q.trim().toLowerCase();
  const list = all.filter((p) => (filter === "all" || status(p) === filter) && (!term || `${p.name} ${p.category}`.toLowerCase().includes(term)));
  const focused = document.activeElement?.id === "inv-search";
  root.innerHTML = stats() + `<div class="mt-5 space-y-3">${list.length ? list.map(row).join("")
    : `<div class="card p-10 text-center"><p class="font-bold">${all.length ? "No bales match" : "No bales yet"}</p><p class="mt-1 text-sm text-ink/55">${all.length ? "Try another filter." : "Add your first bale to open the shop."}</p>${all.length ? "" : `<a href="${ADMIN()}product.html" class="btn mt-4">Add a bale</a>`}</div>`}</div>`;
  if (focused) { const el = document.getElementById("inv-search"); el.focus(); el.setSelectionRange(q.length, q.length); }
}

async function act(fn, done) {
  try { await fn(); if (done) toast(done); } catch (e) { handleAuthError(e); toast(esc(errMsg(e))); }
}
async function refreshLog() {
  if (!openLog) return;
  logRows = await client.query(api.products.stockLog, { token, id: openLog }).catch(() => []);
  render();
}

root.addEventListener("click", async (e) => {
  const t = e.target.closest("[data-filter],[data-delta],[data-soldout],[data-hide],[data-log],[data-delete]");
  if (!t) return;
  if (t.dataset.filter) { filter = t.dataset.filter; return render(); }
  if (t.dataset.delete) {
    if (!confirm(`Delete "${t.dataset.name}" for good? This removes it from the website. Past orders keep their records.`)) return;
    return act(() => client.mutation(api.products.remove, { token, id: t.dataset.delete }), "Bale deleted");
  }
  if (t.dataset.delta) return act(() => client.mutation(api.products.adjustStock, { token, id: t.dataset.id, delta: Number(t.dataset.delta), reason: Number(t.dataset.delta) > 0 ? "Added 1" : "Removed 1" }));
  if (t.dataset.soldout) return act(() => client.mutation(api.products.setStock, { token, id: t.dataset.soldout, stock: 0, reason: "Marked sold out" }), "Marked sold out. It now shows as sold out on the website.");
  if (t.dataset.hide) return act(() => client.mutation(api.products.setArchived, { token, id: t.dataset.hide, archived: t.dataset.archived !== "true" }), t.dataset.archived === "true" ? "Showing on the website" : "Hidden from the website");
  if (t.dataset.log) { openLog = openLog === t.dataset.log ? null : t.dataset.log; logRows = []; render(); refreshLog(); }
});
root.addEventListener("submit", (e) => {
  const f = e.target.closest("[data-restock]");
  if (!f) return;
  e.preventDefault();
  const qty = Math.floor(Number(f.qty.value));
  if (!qty || qty < 1) return toast("Enter how many bales came in");
  act(() => client.mutation(api.products.adjustStock, { token, id: f.dataset.restock, delta: qty, reason: `Restocked +${qty}` }), `Restocked ${qty}. The website is updated.`);
});
root.addEventListener("input", (e) => { if (e.target.id === "inv-search") { q = e.target.value; render(); } });

// Live: changes from orders or another device show up instantly
client.onUpdate(api.products.adminList, { token }, (list) => { all = list; render(); refreshLog(); }, handleAuthError);

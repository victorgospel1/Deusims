// Admin dashboard: info boxes + charts. Live — updates as orders come in.
import { client, api, esc, naira, date } from "../core.js";
import { STATUS_LABEL, CHANNEL_LABEL, SITE } from "../config.js";
import { requireAdmin, handleAuthError, ADMIN } from "./common.js";
import { icon } from "../icons.js";

const token = await requireAdmin();
const root = document.getElementById("overview");
const C = { brand: "#f26b1d", ink: "#0f1b2d", go: "#15803d", soft: "#fde3d0", grid: "#eceef1", muted: "#8a94a3" };
const PALETTE = ["#f26b1d", "#0f1b2d", "#15803d", "#f5a623", "#5d6f86", "#b3261e", "#9aa1a8"];
const charts = {};
const short = (n) => n >= 1e6 ? `₦${(n / 1e6).toFixed(1)}m` : n >= 1e3 ? `₦${Math.round(n / 1e3)}k` : `₦${n}`;

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

function box(label, value, sub, ic, tone = "") {
  return `<div class="card flex min-w-0 items-start justify-between gap-2 p-4 sm:p-5">
    <div class="min-w-0"><p class="text-xs font-semibold text-ink/55 sm:text-sm">${label}</p><p class="mt-1 break-words text-lg font-extrabold leading-tight sm:text-2xl ${tone}">${value}</p>${sub ? `<p class="mt-1 text-xs text-ink/50">${sub}</p>` : ""}</div>
    <span class="hidden h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand sm:grid">${icon(ic, "h-5 w-5")}</span>
  </div>`;
}
const empty = (id, msg) => {
  const c = document.getElementById(id);
  let e = c.parentElement.querySelector("[data-empty]");
  if (!e) { e = document.createElement("div"); e.dataset.empty = ""; e.className = "absolute inset-0 grid place-items-center text-center text-sm text-ink/45"; c.parentElement.append(e); }
  e.textContent = msg || ""; e.style.display = msg ? "" : "none"; c.style.opacity = msg ? "0.15" : "1";
};

function layout() {
  root.innerHTML = `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div><p class="text-sm font-semibold text-ink/55">${new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h2 class="text-3xl font-extrabold">${greeting()}</h2></div>
      <div class="flex flex-wrap gap-2">
        <a href="${ADMIN("products.html")}" class="btn-ghost">Inventory</a>
        <a href="${ADMIN("orders.html")}" class="btn-ghost">Orders</a>
      </div>
    </div>
    <div id="boxes" class="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4"></div>
    <div class="mt-6 grid gap-4 lg:grid-cols-3">
      <section class="card p-5 lg:col-span-2">
        <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="font-extrabold">Sales, last 30 days</h2>
          <div class="flex gap-1" role="tablist"><button data-series="revenue" class="chip-on py-1 text-xs">Revenue</button><button data-series="orders" class="chip py-1 text-xs">Orders</button></div></div>
        <div class="relative mt-4 h-72"><canvas id="c-sales" aria-label="Sales chart"></canvas></div>
      </section>
      <section class="card p-5"><h2 class="font-extrabold">Orders by status</h2><div class="relative mt-4 h-72"><canvas id="c-status" aria-label="Orders by status"></canvas></div></section>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <section class="card p-5 lg:col-span-2"><h2 class="font-extrabold">Revenue by category</h2><div class="relative mt-4 h-64"><canvas id="c-cats" aria-label="Revenue by category"></canvas></div></section>
      <section class="card p-5"><h2 class="font-extrabold">How customers paid</h2><div class="relative mt-4 h-64"><canvas id="c-pay" aria-label="Payment methods"></canvas></div></section>
    </div>
    <div class="mt-4 grid gap-4 lg:grid-cols-3">
      <section class="card overflow-hidden lg:col-span-2">
        <div class="flex items-center justify-between p-5 pb-3"><h2 class="font-extrabold">Recent orders</h2><a href="${ADMIN("orders.html")}" class="link-more">All orders ${icon("arrow", "h-4 w-4")}</a></div>
        <div id="recent" class="overflow-x-auto"></div>
      </section>
      <div class="space-y-4">
        <section class="card p-5"><div class="flex items-center justify-between"><h2 class="font-extrabold">Needs restocking</h2><a href="${ADMIN("products.html")}" class="link-more">Inventory</a></div><div id="low" class="mt-3"></div></section>
        <section class="card p-5"><h2 class="font-extrabold">Best sellers</h2><div id="top" class="mt-3"></div></section>
      </div>
    </div>`;
}

const pill = (status, paid) => {
  const tone = status === "cancelled" ? "bg-ink/10 text-ink/60" : status === "awaiting_payment" ? "bg-brand-soft text-brand-dark" : status === "completed" ? "bg-go/10 text-go" : "bg-sky-100 text-sky-800";
  return `<span class="rounded-md px-2 py-0.5 text-xs font-bold ${tone}">${STATUS_LABEL[status]}</span>`;
};

let series = "revenue", last;
function chart(id, config) {
  if (!window.Chart) return;
  if (charts[id]) { charts[id].data = config.data; charts[id].options = config.options; charts[id].update("none"); return; }
  charts[id] = new window.Chart(document.getElementById(id), config);
}
const baseOpts = (extra = {}) => ({
  responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
  plugins: { legend: { display: false }, tooltip: { backgroundColor: C.ink, padding: 10, cornerRadius: 8 } },
  ...extra,
});

function render(s) {
  last = s;
  document.getElementById("boxes").innerHTML = [
    box("Sales today", naira(s.today.revenue), `${s.today.orders} order${s.today.orders === 1 ? "" : "s"} today`, "card"),
    box("Sales this month", naira(s.month.revenue), `${s.month.orders} orders`, "layers"),
    box("Waiting for payment", s.awaitingPayment, "Online orders not yet paid", "clock", s.awaitingPayment ? "text-brand-dark" : ""),
    box("To pack or send", s.toFulfil, "Paid, not yet dispatched", "truck", s.toFulfil ? "text-brand-dark" : ""),
    box("Bales in stock", s.inventory.bales, `${s.inventory.products} bale types`, "box"),
    box("Stock value", naira(s.inventory.value), "At current prices", "scale"),
    box("Few left", s.inventory.few, "Restock soon", "filter", s.inventory.few ? "text-brand-dark" : ""),
    box("Sold out", s.inventory.soldOut, "Showing as sold out", "close", s.inventory.soldOut ? "text-stop" : ""),
  ].join("");

  const labels = s.daily.map((d) => new Date(d.day + "T12:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" }));
  const isRev = series === "revenue";
  chart("c-sales", {
    type: isRev ? "line" : "bar",
    data: { labels, datasets: [{
      data: s.daily.map((d) => (isRev ? d.revenue : d.orders)),
      borderColor: C.brand, backgroundColor: isRev ? "rgba(242,107,29,0.12)" : C.brand,
      fill: isRev, tension: 0.3, cubicInterpolationMode: "monotone", pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5, borderRadius: 4,
    }] },
    options: baseOpts({
      interaction: { mode: "index", intersect: false },
      scales: {
        x: { grid: { display: false }, ticks: { color: C.muted, maxTicksLimit: 8 } },
        y: { beginAtZero: true, grid: { color: C.grid }, ticks: { color: C.muted, precision: 0, callback: (v) => (isRev ? short(v) : v) } },
      },
      plugins: { ...baseOpts().plugins, tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (c) => (isRev ? naira(c.parsed.y) : `${c.parsed.y} orders`) } } },
    }),
  });

  const hasSales = s.daily.some((d) => d.orders > 0);
  empty("c-sales", hasSales ? "" : "No orders in the last 30 days yet");
  const st = Object.entries(s.statusCounts).filter(([, n]) => n > 0);
  empty("c-status", st.length ? "" : "No orders yet");
  empty("c-cats", s.categories.length ? "" : "Sales by category appear after your first paid order");
  empty("c-pay", Object.keys(s.channels).length ? "" : "No payments yet");
  chart("c-status", {
    type: "doughnut",
    data: { labels: st.map(([k]) => STATUS_LABEL[k]), datasets: [{ data: st.map(([, n]) => n), backgroundColor: PALETTE, borderWidth: 0 }] },
    options: baseOpts({ cutout: "65%", plugins: { ...baseOpts().plugins, legend: { display: true, position: "bottom", labels: { boxWidth: 10, color: C.ink, padding: 12 } } } }),
  });

  chart("c-cats", {
    type: "bar",
    data: { labels: s.categories.map(([c]) => c), datasets: [{ data: s.categories.map(([, v]) => v), backgroundColor: C.ink, hoverBackgroundColor: C.brand, borderRadius: 6 }] },
    options: baseOpts({
      indexAxis: "y",
      scales: { x: { grid: { color: C.grid }, ticks: { color: C.muted, callback: (v) => short(v) } }, y: { grid: { display: false }, ticks: { color: C.ink } } },
      plugins: { ...baseOpts().plugins, tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (c) => naira(c.parsed.x) } } },
    }),
  });

  const ch = Object.entries(s.channels);
  chart("c-pay", {
    type: "doughnut",
    data: { labels: ch.map(([k]) => (k === "on_site" ? "At warehouse" : CHANNEL_LABEL[k] ?? "Online")), datasets: [{ data: ch.map(([, v]) => v), backgroundColor: [C.brand, C.ink, C.go, "#f5a623"], borderWidth: 0 }] },
    options: baseOpts({ cutout: "65%", plugins: { ...baseOpts().plugins, legend: { display: true, position: "bottom", labels: { boxWidth: 10, color: C.ink, padding: 12 } },
      tooltip: { ...baseOpts().plugins.tooltip, callbacks: { label: (c) => `${c.label}: ${naira(c.parsed)}` } } } }),
  });

  document.getElementById("recent").innerHTML = s.recent.length ? `<table class="w-full min-w-[560px] text-left text-sm">
    <thead class="border-y border-sack bg-wrap text-ink/55"><tr><th class="px-5 py-2.5 font-semibold">Order</th><th class="px-5 py-2.5 font-semibold">Customer</th><th class="px-5 py-2.5 font-semibold">Total</th><th class="px-5 py-2.5 font-semibold">Status</th><th class="px-5 py-2.5 font-semibold">Placed</th></tr></thead>
    <tbody class="divide-y divide-sack">${s.recent.map((o) => `<tr class="hover:bg-wrap">
      <td class="px-5 py-3"><a href="${ADMIN("order.html")}?code=${esc(o.code)}" class="font-bold text-brand hover:underline">${esc(o.code)}</a></td>
      <td class="px-5 py-3">${esc(o.customerName)}</td><td class="px-5 py-3 font-semibold">${naira(o.total)}</td>
      <td class="px-5 py-3">${pill(o.status)}</td><td class="px-5 py-3 text-ink/55">${date(o.createdAt)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="px-5 pb-5 text-sm text-ink/55">No orders yet. They'll appear here as soon as customers check out.</p>`;

  document.getElementById("low").innerHTML = s.lowStock.length
    ? `<ul class="divide-y divide-sack">${s.lowStock.map((p) => `<li class="flex items-center justify-between py-2.5 text-sm"><span class="font-semibold">${esc(p.name)}</span>
        <span class="rounded-md px-2 py-0.5 text-xs font-bold ${p.stock === 0 ? "bg-stop/10 text-stop" : "bg-brand-soft text-brand-dark"}">${p.stock === 0 ? "Sold out" : `${p.stock} left`}</span></li>`).join("")}</ul>`
    : `<p class="text-sm text-ink/55">Everything is well stocked.</p>`;

  const max = Math.max(1, ...s.topSellers.map(([, n]) => n));
  document.getElementById("top").innerHTML = s.topSellers.length
    ? s.topSellers.map(([n, q]) => `<div class="py-1.5"><div class="flex justify-between text-sm"><span class="truncate font-semibold">${esc(n)}</span><span class="text-ink/55">${q} sold</span></div>
        <div class="mt-1 h-1.5 rounded-full bg-sack"><div class="h-full rounded-full bg-brand" style="width:${(q / max) * 100}%"></div></div></div>`).join("")
    : `<p class="text-sm text-ink/55">No sales yet.</p>`;
}

layout();
root.addEventListener("click", (e) => {
  const b = e.target.closest("[data-series]");
  if (!b || !last) return;
  series = b.dataset.series;
  root.querySelectorAll("[data-series]").forEach((x) => (x.className = `${x.dataset.series === series ? "chip-on" : "chip"} py-1 text-xs`));
  charts["c-sales"]?.destroy(); delete charts["c-sales"];
  render(last);
});

client.onUpdate(api.orders.stats, { token }, render, handleAuthError);

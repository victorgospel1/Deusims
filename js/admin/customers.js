// Customers: everyone who has ordered, grouped by phone number.
import { client, api, esc, naira, date, waLink } from "../core.js";
import { requireAdmin, handleAuthError, ADMIN } from "./common.js";
import { icon } from "../icons.js";

const token = await requireAdmin();
const root = document.getElementById("customers-root");
let all = [], q = "";

function render() {
  const t = q.trim().toLowerCase();
  const rows = all.filter((c) => !t || `${c.name} ${c.phone} ${c.email ?? ""} ${c.state ?? ""}`.toLowerCase().includes(t));
  const spent = all.reduce((s, c) => s + c.spent, 0);
  const repeat = all.filter((c) => c.orders > 1).length;
  const focused = document.activeElement?.id === "cq";
  root.innerHTML = `
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <div class="card p-5"><p class="text-sm text-ink/55">Customers</p><p class="text-2xl font-extrabold">${all.length}</p></div>
      <div class="card p-5"><p class="text-sm text-ink/55">Repeat customers</p><p class="text-2xl font-extrabold">${repeat}</p></div>
      <div class="card col-span-2 p-5 lg:col-span-1"><p class="text-sm text-ink/55">Total paid by customers</p><p class="text-2xl font-extrabold">${naira(spent)}</p></div>
    </div>
    <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
      <label class="relative w-full sm:w-80"><span class="sr-only">Search customers</span>
        <input id="cq" value="${esc(q)}" placeholder="Search name, phone, email or state…" class="field py-2 pl-10">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">${icon("search", "h-4 w-4")}</span></label>
      <p class="text-sm text-ink/55">${rows.length} shown</p>
    </div>
    <div class="card mt-4 overflow-x-auto">
      ${rows.length ? `<table class="w-full min-w-[760px] text-left text-sm">
        <thead class="bg-wrap text-ink/55"><tr><th class="px-5 py-3 font-semibold">Customer</th><th class="px-5 py-3 font-semibold">Contact</th><th class="px-5 py-3 font-semibold">Orders</th><th class="px-5 py-3 font-semibold">Total paid</th><th class="px-5 py-3 font-semibold">Last order</th><th class="px-5 py-3"></th></tr></thead>
        <tbody class="divide-y divide-sack">${rows.map((c) => `<tr class="hover:bg-wrap">
          <td class="px-5 py-3"><div class="flex items-center gap-3"><span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand-dark">${esc(c.name.trim()[0] ?? "?").toUpperCase()}</span>
            <div><p class="font-semibold">${esc(c.name)}</p>${c.state ? `<p class="text-xs text-ink/50">${esc(c.state)}</p>` : ""}</div></div></td>
          <td class="px-5 py-3"><a href="tel:${esc(c.phone)}" class="hover:text-brand">${esc(c.phone)}</a>${c.email ? `<br><a href="mailto:${esc(c.email)}" class="text-ink/55 hover:text-brand">${esc(c.email)}</a>` : ""}</td>
          <td class="px-5 py-3 font-bold">${c.orders}${c.orders > 1 ? ` <span class="ml-1 rounded bg-go/10 px-1.5 py-0.5 text-[11px] text-go">Repeat</span>` : ""}</td>
          <td class="px-5 py-3 font-bold">${naira(c.spent)}</td>
          <td class="px-5 py-3"><a href="${ADMIN("order.html")}?code=${esc(c.lastCode)}" class="font-semibold text-brand hover:underline">${esc(c.lastCode)}</a><br><span class="text-xs text-ink/50">${date(c.lastOrder)}</span></td>
          <td class="px-5 py-3 text-right"><a href="${waLink(c.phone.replace(/\D/g, "").replace(/^0/, "234"), `Hello ${c.name}, `)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 rounded-lg bg-go px-3 py-2 text-xs font-bold text-white hover:brightness-110">${icon("whatsapp", "h-4 w-4")} WhatsApp</a></td>
        </tr>`).join("")}</tbody></table>`
      : `<div class="p-10 text-center"><p class="font-bold">${all.length ? "No customers match" : "No customers yet"}</p><p class="mt-1 text-sm text-ink/55">${all.length ? "Try another search." : "Everyone who places an order shows up here with their contact details."}</p></div>`}
    </div>`;
  if (focused) { const i = document.getElementById("cq"); i.focus(); i.setSelectionRange(q.length, q.length); }
}
root.addEventListener("input", (e) => { if (e.target.id === "cq") { q = e.target.value; render(); } });
client.onUpdate(api.orders.customers, { token }, (list) => { all = list; render(); }, handleAuthError);

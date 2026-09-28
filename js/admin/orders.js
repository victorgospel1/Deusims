// Orders: search, filter, change status right from the list, export to CSV (opens in Excel).
import { client, api, esc, naira, date, params, errMsg } from "../core.js";
import { STATUS_LABEL, PAYMENT_LABEL, CHANNEL_LABEL } from "../config.js";
import { requireAdmin, handleAuthError, ADMIN } from "./common.js";
import { icon } from "../icons.js";
import { toast } from "../ui.js";

const token = await requireAdmin();
const root = document.getElementById("orders");
const filterBar = document.getElementById("status-filter");
const st = { status: params().get("status") ?? "", pay: "", q: "" };
let all = [];

const tone = (s) => s === "cancelled" ? "bg-ink/10 text-ink/60" : s === "awaiting_payment" ? "bg-brand-soft text-brand-dark" : s === "completed" ? "bg-go/10 text-go" : "bg-sky-100 text-sky-800";
const statusesFor = (o) => Object.keys(STATUS_LABEL).filter((s) => (o.fulfilment === "pickup" ? s !== "dispatched" : s !== "ready_for_pickup"));

function list() {
  const q = st.q.trim().toLowerCase();
  return all.filter((o) =>
    (!st.status || o.status === st.status) &&
    (!st.pay || (st.pay === "paid" ? o.paymentStatus === "paid" : o.paymentStatus !== "paid")) &&
    (!q || `${o.code} ${o.customerName} ${o.phone} ${o.email ?? ""}`.toLowerCase().includes(q)));
}

function renderFilters() {
  const count = (s) => all.filter((o) => o.status === s).length;
  filterBar.innerHTML = `
    <div class="flex flex-wrap items-center gap-2">
      <button data-status="" class="${!st.status ? "chip-on" : "chip"}">All <span class="opacity-60">${all.length}</span></button>
      ${Object.entries(STATUS_LABEL).map(([k, v]) => `<button data-status="${k}" class="${st.status === k ? "chip-on" : "chip"}">${v} <span class="opacity-60">${count(k)}</span></button>`).join("")}
    </div>
    <div class="mt-3 flex flex-wrap items-center gap-2">
      <label class="relative w-full sm:w-72"><span class="sr-only">Search orders</span>
        <input id="oq" value="${esc(st.q)}" placeholder="Search code, name or phone…" class="field py-2 pl-10">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">${icon("search", "h-4 w-4")}</span></label>
      <select id="opay" class="field w-auto py-2" aria-label="Payment">
        <option value="">Any payment</option><option value="paid" ${st.pay === "paid" ? "selected" : ""}>Paid</option><option value="unpaid" ${st.pay === "unpaid" ? "selected" : ""}>Not paid</option>
      </select>
      <button id="export" class="btn-ghost ml-auto py-2 text-sm">Export to Excel (CSV)</button>
    </div>`;
}

function render() {
  const rows = list();
  const total = rows.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0);
  root.innerHTML = rows.length ? `
    <div class="flex items-center justify-between border-b border-sack px-5 py-3 text-sm text-ink/60"><span>${rows.length} order${rows.length === 1 ? "" : "s"}</span><span>Paid total: <strong class="text-ink">${naira(total)}</strong></span></div>
    <table class="w-full min-w-[900px] text-left text-sm">
      <thead class="bg-wrap text-ink/55"><tr>
        <th class="px-5 py-3 font-semibold">Order</th><th class="px-5 py-3 font-semibold">Customer</th><th class="px-5 py-3 font-semibold">Items</th>
        <th class="px-5 py-3 font-semibold">Total</th><th class="px-5 py-3 font-semibold">Payment</th><th class="px-5 py-3 font-semibold">Status</th><th class="px-5 py-3 font-semibold">Placed</th>
      </tr></thead>
      <tbody class="divide-y divide-sack">
        ${rows.map((o) => `<tr class="hover:bg-wrap">
          <td class="px-5 py-3"><a href="${ADMIN("order.html")}?code=${esc(o.code)}" class="font-extrabold text-brand hover:underline">${esc(o.code)}</a><br><span class="text-xs text-ink/50">${o.fulfilment === "pickup" ? "Pickup" : `Delivery · ${esc(o.state ?? "")}`}</span></td>
          <td class="px-5 py-3"><span class="font-semibold">${esc(o.customerName)}</span><br><a href="tel:${esc(o.phone)}" class="text-ink/55 hover:text-brand">${esc(o.phone)}</a></td>
          <td class="max-w-56 px-5 py-3 text-ink/70">${o.items.map((i) => `${i.qty} × ${esc(i.name)}`).join("<br>")}</td>
          <td class="px-5 py-3 font-bold">${naira(o.total)}</td>
          <td class="px-5 py-3"><span class="font-semibold ${o.paymentStatus === "paid" ? "text-go" : "text-brand-dark"}">${o.paymentStatus === "paid" ? "Paid" : "Not paid"}</span><br>
            <span class="text-xs text-ink/50">${o.paymentMethod === "on_site" ? "At warehouse" : o.payChannel ? esc(CHANNEL_LABEL[o.payChannel] ?? o.payChannel) : "Online"}</span></td>
          <td class="px-5 py-3"><select data-set-status="${esc(o.code)}" class="rounded-lg border-0 px-2 py-1.5 text-xs font-bold ${tone(o.status)}" aria-label="Status for ${esc(o.code)}">
            ${statusesFor(o).map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></td>
          <td class="whitespace-nowrap px-5 py-3 text-ink/55">${date(o.createdAt)}</td>
        </tr>`).join("")}
      </tbody>
    </table>` : `<div class="p-10 text-center"><p class="font-bold">${all.length ? "No orders match" : "No orders yet"}</p><p class="mt-1 text-sm text-ink/55">${all.length ? "Try a different filter or search." : "Orders appear here the moment a customer checks out."}</p></div>`;
}

function exportCsv() {
  const rows = list();
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [["Order", "Date", "Customer", "Phone", "Email", "Items", "Subtotal", "Delivery", "Total", "Payment", "Paid", "Status", "Fulfilment", "State", "Address"].map(cell).join(",")];
  for (const o of rows) lines.push([o.code, new Date(o.createdAt).toLocaleString("en-NG"), o.customerName, o.phone, o.email, o.items.map((i) => `${i.qty} x ${i.name}`).join("; "),
    o.subtotal, o.deliveryFee, o.total, o.paymentMethod === "on_site" ? "At warehouse" : CHANNEL_LABEL[o.payChannel] ?? "Online", o.paymentStatus === "paid" ? "Yes" : "No",
    STATUS_LABEL[o.status], o.fulfilment, o.state, o.address].map(cell).join(","));
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `orders-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a); a.click(); a.remove();
  toast(`Exported ${rows.length} orders`);
}

filterBar.addEventListener("click", (e) => {
  const b = e.target.closest("[data-status]");
  if (b) { st.status = b.dataset.status; renderFilters(); render(); }
  if (e.target.closest("#export")) exportCsv();
});
filterBar.addEventListener("input", (e) => { if (e.target.id === "oq") { st.q = e.target.value; render(); } });
filterBar.addEventListener("change", (e) => { if (e.target.id === "opay") { st.pay = e.target.value; render(); } });
root.addEventListener("change", async (e) => {
  const sel = e.target.closest("[data-set-status]");
  if (!sel) return;
  const status = sel.value;
  if (status === "cancelled" && !confirm("Cancel this order? Its bales go back into stock.")) { render(); return; }
  try { await client.mutation(api.orders.adminUpdate, { token, code: sel.dataset.setStatus, status }); toast(`Order ${esc(sel.dataset.setStatus)}: ${STATUS_LABEL[status]}`); }
  catch (err) { handleAuthError(err); toast(esc(errMsg(err))); }
});

client.onUpdate(api.orders.adminList, { token }, (orders) => {
  all = orders;
  const focus = document.activeElement?.id === "oq";
  renderFilters(); render();
  if (focus) { const i = document.getElementById("oq"); i.focus(); i.setSelectionRange(st.q.length, st.q.length); }
}, handleAuthError);

import { client, api, esc, naira, date, waLink, params, errMsg } from "../core.js";
import { STATUS_LABEL, PAYMENT_LABEL, CHANNEL_LABEL, SITE } from "../config.js";
import { requireAdmin, handleAuthError, ADMIN } from "./common.js";

const token = await requireAdmin();
const code = params().get("code") ?? "";
const root = document.getElementById("order");

let current;
function render(o) {
  current = o;
  if (!o) { root.innerHTML = `<p class="text-lg font-semibold">Order not found.</p><a href="${ADMIN()}orders.html" class="btn mt-4">Back to orders</a>`; return; }
  const statuses = Object.keys(STATUS_LABEL).filter((s) => (o.fulfilment === "pickup" ? s !== "dispatched" : s !== "ready_for_pickup"));
  const waNumber = o.phone.replace(/\D/g, "").replace(/^0/, "234");
  root.innerHTML = `<div class="grid gap-8 md:grid-cols-[1fr_20rem]">
    <div class="space-y-8">
      <div><p class="text-ink/60">Order</p><h1 class="stamp text-5xl">${esc(o.code)}</h1><p class="text-ink/60">Placed ${date(o.createdAt)}</p></div>
      <section class="card p-5">
        <h2 class="font-bold">Customer</h2>
        <p class="mt-2">${esc(o.customerName)}</p>
        <p><a href="tel:${esc(o.phone)}" class="underline">${esc(o.phone)}</a>${o.email ? `, ${esc(o.email)}` : ""}</p>
        <p class="mt-2">${o.fulfilment === "pickup" ? "Pickup at warehouse" : `Deliver to ${esc(o.address)}, ${esc(o.state)}`}</p>
        ${o.note ? `<p class="mt-2 rounded bg-wrap p-3 text-sm">Note: ${esc(o.note)}</p>` : ""}
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="${waLink(waNumber, `Hello ${o.customerName}, about your order ${o.code}: `)}" target="_blank" rel="noopener" class="btn-ghost py-2 text-sm">Message on WhatsApp</a>
          <button id="print" class="btn-ghost py-2 text-sm">Print receipt</button>
        </div>
      </section>
      <section class="card p-5">
        <h2 class="font-bold">Items</h2>
        <ul class="mt-2 divide-y divide-ink/10">${o.items.map((i) => `<li class="flex justify-between py-2"><span>${i.qty} × ${esc(i.name)}</span><span>${naira(i.price * i.qty)}</span></li>`).join("")}</ul>
        <div class="mt-2 flex justify-between text-sm"><span>Delivery</span><span>${naira(o.deliveryFee)}</span></div>
        <div class="flex justify-between text-lg font-bold"><span>Total</span><span>${naira(o.total)}</span></div>
      </section>
      ${o.proofUrl ? `<section class="card p-5">
        <h2 class="font-bold">Transfer receipt</h2>
        <p class="text-sm text-ink/60">Check your bank app for ${naira(o.total)} with narration ${esc(o.code)} before marking as paid.</p>
        ${/^data:image|\.(png|jpe?g|webp|gif)(\?|$)/i.test(o.proofUrl) || o.proofUrl.includes("convex.cloud")
          ? `<a href="${esc(o.proofUrl)}" target="_blank" rel="noopener"><img src="${esc(o.proofUrl)}" alt="Transfer receipt" class="mt-3 max-h-96 rounded-lg border border-sack" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'Receipt is a PDF — open it with the link below.'}))"></a>` : ""}
        <a href="${esc(o.proofUrl)}" target="_blank" rel="noopener" class="mt-3 inline-block font-semibold underline">Open receipt in a new tab</a>
      </section>` : ""}
    </div>
    <aside class="card h-fit space-y-5 p-5">
      <div>
        <p class="text-sm text-ink/60">Payment</p>
        <p class="font-semibold">${PAYMENT_LABEL[o.paymentMethod]}${o.payChannel ? ` · ${CHANNEL_LABEL[o.payChannel] ?? esc(o.payChannel)}` : ""}</p>
        <p class="font-bold ${o.paymentStatus === "paid" ? "text-go" : "text-stop"}">${o.paymentStatus === "paid" ? "Paid" : "Not paid"}</p>
        ${o.paystackRef ? `<p class="text-xs text-ink/50">Ref: ${esc(o.paystackRef)}</p>` : ""}
      </div>
      ${o.paymentStatus !== "paid" && o.status !== "cancelled" && o.paymentMethod !== "paystack" ? `<button id="mark-paid" class="btn-marker w-full">Mark as paid (cash/POS received)</button>` : ""}
      ${o.paymentStatus !== "paid" && o.paymentMethod === "paystack" && o.status !== "cancelled" ? `<p class="rounded-lg bg-wrap p-3 text-sm text-ink/65">Waiting for the customer to finish paying online. This updates automatically. Unpaid online orders are cancelled after 30 minutes and the bales go back on sale.</p>` : ""}
      <div class="space-y-3 border-t border-ink/10 pt-5">
        <label class="block text-sm text-ink/60" for="status">Order status</label>
        <select id="status" class="field">${statuses.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select>
        <button id="update-status" class="btn w-full">Update status</button>
        <p class="text-xs text-ink/50">Cancelling puts the bales back in stock.</p>
        <p id="msg" class="hidden text-sm" role="status"></p>
      </div>
    </aside>
  </div>`;
}

async function update(args, confirmText) {
  if (confirmText && !confirm(confirmText)) return;
  const msg = document.getElementById("msg");
  try {
    await client.mutation(api.orders.adminUpdate, { token, code, ...args });
    msg.className = "text-sm text-go"; msg.textContent = "Saved.";
  } catch (e) {
    handleAuthError(e);
    msg.className = "text-sm text-stop"; msg.textContent = errMsg(e);
  }
}

function printReceipt(o) {
  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) return alert("Allow pop-ups to print receipts.");
  const row = (l, r, b = false) => `<tr><td style="padding:4px 0;${b ? "font-weight:700" : ""}">${l}</td><td style="padding:4px 0;text-align:right;${b ? "font-weight:700" : ""}">${r}</td></tr>`;
  w.document.write(`<!doctype html><title>Receipt ${esc(o.code)}</title><body style="font-family:system-ui,sans-serif;padding:24px;color:#0f1b2d">
    <h2 style="margin:0">${esc(SITE.name)}</h2><p style="margin:4px 0 16px;color:#555">${esc(SITE.phone)}</p>
    <p style="margin:0">Order <strong>${esc(o.code)}</strong><br>${new Date(o.createdAt).toLocaleString("en-NG")}</p>
    <p>${esc(o.customerName)}<br>${esc(o.phone)}${o.fulfilment === "delivery" ? `<br>${esc(o.address ?? "")}, ${esc(o.state ?? "")}` : "<br>Pickup at warehouse"}</p>
    <table style="width:100%;border-top:1px dashed #999;border-bottom:1px dashed #999;margin:12px 0;border-collapse:collapse">
      ${o.items.map((i) => row(`${i.qty} × ${esc(i.name)}`, naira(i.price * i.qty))).join("")}
      ${row("Delivery", naira(o.deliveryFee))}${row("Total", naira(o.total), true)}
    </table>
    <p>Payment: ${o.paymentStatus === "paid" ? "PAID" : "NOT PAID"}${o.payChannel ? ` (${esc(CHANNEL_LABEL[o.payChannel] ?? o.payChannel)})` : o.paymentMethod === "on_site" ? " (at warehouse)" : ""}</p>
    <p style="color:#555">Thank you for your order!</p><script>window.print()<\/script></body>`);
  w.document.close();
}

root.addEventListener("click", (e) => {
  if (e.target.id === "print" && current) return printReceipt(current);
  if (e.target.id === "mark-paid") update({ markPaid: true }, "Mark this order as paid? Only do this after you've received the cash or POS payment.");
  if (e.target.id === "update-status") {
    const status = document.getElementById("status").value;
    update({ status }, status === "cancelled" ? "Cancel this order? The bales go back into stock." : null);
  }
});

client.onUpdate(api.orders.adminGet, { token, code }, render, handleAuthError);

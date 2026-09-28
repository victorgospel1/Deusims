import { mountLayout } from "../layout.js";
import { client, api, esc, naira, date, waLink, params, getSettings, errMsg } from "../core.js";
import { statusTrail, checkoutSteps } from "../components.js";
import { CHANNEL_LABEL } from "../config.js";
import { startPayment } from "../pay.js";
import { icon } from "../icons.js";

mountLayout();
const root = document.getElementById("order");
const sp = params();
const code = (sp.get("code") ?? "").trim().toUpperCase();
const phone = sp.get("phone") ?? "";
if (!code || !phone) location.replace(`track.html${code ? `?code=${code}` : ""}`);

const settings = await getSettings();

// Returning from Paystack's hosted page (fallback flow): verify on the server
const reference = sp.get("reference") ?? sp.get("trxref");
if (reference) {
  root.innerHTML = `<p class="text-ink/60">Confirming your payment…</p>`;
  await client.action(api.paystack.verify, { reference }).catch(() => false);
  history.replaceState(null, "", `order.html?code=${code}&phone=${encodeURIComponent(phone)}`);
}

let current, payError = "", paying = false;

function paymentSection(o) {
  if (o.status === "cancelled") return "";
  if (o.paymentStatus === "paid") {
    return `<div class="flex items-center gap-4 rounded-xl bg-go/10 p-5">
      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-go text-white">${icon("check", "h-6 w-6")}</span>
      <div><p class="font-extrabold text-go">Payment received</p>
      <p class="text-sm text-ink/65">${naira(o.total)}${o.payChannel ? ` by ${esc(CHANNEL_LABEL[o.payChannel] ?? o.payChannel)}` : ""}. We're preparing your order.</p></div></div>`;
  }
  if (o.paymentMethod === "on_site") {
    return `<div class="rounded-xl bg-brand-soft p-5"><p class="font-extrabold">Pay ${naira(o.total)} at the warehouse</p>
      <p class="mt-1 text-sm text-ink/70">Cash or POS when you collect at <strong>${esc(settings.pickupAddress)}</strong>. Bring your order code.</p></div>`;
  }
  // Online order not yet paid
  return `<div class="rounded-xl border-2 border-brand/30 bg-brand-soft p-5">
      <p class="text-sm font-semibold text-brand-dark">Payment not completed</p>
      <p class="mt-1 text-3xl font-extrabold">${naira(o.total)}</p>
      <p class="mt-1 text-sm text-ink/65">Your bales are held for 30 minutes from when you ordered. Finish paying to secure them.</p>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        <button data-pay="bank_transfer" class="btn" ${paying ? "disabled" : ""}>Pay by bank transfer</button>
        <button data-pay="card" class="btn-ghost" ${paying ? "disabled" : ""}>Pay with card / USSD</button>
      </div>
      ${payError ? `<p class="mt-3 text-sm font-semibold text-stop" role="alert">${esc(payError)}</p>` : ""}
    </div>`;
}

function render(o) {
  if (!o) {
    root.innerHTML = `<h1 class="text-3xl font-bold">Order not found</h1>
      <p class="mt-2 text-ink/60">Check the order code and use the phone number you ordered with.</p>
      <a href="track.html" class="btn mt-6">Try again</a>`;
    return;
  }
  current = o;
  const step = o.paymentStatus === "paid" || o.paymentMethod === "on_site" || o.status === "cancelled" ? 5 : 3;
  root.innerHTML = `${checkoutSteps(step)}
    <p class="text-sm font-semibold text-ink/55">Order code</p>
    <h1 class="stamp text-5xl">${esc(o.code)}</h1>
    <p class="mt-2 text-ink/70">Keep this code. You'll need it with your phone number to track this order.</p>
    <div class="mt-8">${statusTrail(o.status, o.fulfilment)}</div>
    <section class="mt-8">${paymentSection(o)}</section>
    <section class="mt-10">
      <h2 class="text-xl font-extrabold">Summary</h2>
      <ul class="mt-3 divide-y divide-sack border-y border-sack">
        ${o.items.map((i) => `<li class="flex justify-between py-3"><span>${i.qty} × ${esc(i.name)}</span><span class="font-semibold">${naira(i.price * i.qty)}</span></li>`).join("")}
      </ul>
      <div class="mt-3 space-y-1">
        <div class="flex justify-between"><span>Delivery</span><span>${o.fulfilment === "pickup" ? "Pickup (free)" : naira(o.deliveryFee)}</span></div>
        <div class="flex justify-between text-lg font-extrabold"><span>Total</span><span>${naira(o.total)}</span></div>
        <p class="text-sm text-ink/55">Placed ${date(o.createdAt)}${o.fulfilment === "delivery" ? `. Delivering to ${esc(o.state ?? "")}` : ""}.</p>
      </div>
    </section>
    <a href="${waLink(settings.whatsapp, `Hello, I'm asking about order ${o.code}.`)}" target="_blank" rel="noopener" class="btn-ghost mt-8">Ask about this order on WhatsApp</a>`;
}

// Live: updates the moment payment is confirmed or the shop changes the status
if (code && phone) client.onUpdate(api.orders.track, { code, phone }, render);

root.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-pay]");
  if (!btn || !current || paying) return;
  paying = true; payError = ""; render(current);
  try {
    const result = await startPayment({ code, phone, total: current.total, channel: btn.dataset.pay });
    if (result === "cancelled") payError = "Payment window closed before the payment finished.";
  } catch (err) {
    payError = errMsg(err, "Couldn't start payment. Try again.");
  }
  paying = false; render(current);
});

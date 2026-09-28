import { mountLayout } from "../layout.js";
import { client, api, esc, naira, errMsg, clean } from "../core.js";
import { NIGERIAN_STATES } from "../config.js";
import { startPayment } from "../pay.js";
import { checkoutSteps } from "../components.js";
import { imageFor } from "../config.js";
import { icon } from "../icons.js";
import { getCart, clearCart } from "../cart.js";

mountLayout();
const root = document.getElementById("checkout");
const lines = getCart();

const form = { fulfilment: "pickup", state: "Lagos", method: "bank_transfer" }; // bank_transfer | card | on_site
let products = [];
let settings;
let busy = false;
let agreed = false;

function radio(on, disabled = false) {
  return `flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${on ? "border-brand bg-brand-soft" : "border-sack hover:border-strap"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`;
}

function totals() {
  const subtotal = lines.reduce((s, l) => s + (products.find((p) => p._id === l.productId)?.price ?? 0) * l.qty, 0);
  const deliveryFee = form.fulfilment === "delivery"
    ? settings.deliveryFees.find((d) => d.state === form.state)?.fee ?? settings.defaultDeliveryFee
    : 0;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

function paymentOptions() {
  if (form.fulfilment !== "pickup" && form.method === "on_site") form.method = "bank_transfer";
  const opts = [
    ["bank_transfer", "Bank transfer", "Recommended", "A secure window shows you an account number. Send the money from your bank app and it's confirmed automatically. No receipt needed."],
    ["card", "Card or USSD", "", "Pay with your debit card or USSD code in the secure Paystack window."],
    ["on_site", "Pay at the warehouse", "", form.fulfilment === "pickup" ? "Cash or POS when you collect your bales." : "Only available when you pick up from the warehouse."],
  ];
  return opts.map(([m, title, tag, desc]) => {
    const disabled = m === "on_site" && form.fulfilment !== "pickup";
    return `<label class="${radio(form.method === m, disabled)}">
      <input type="radio" name="method" value="${m}" ${form.method === m ? "checked" : ""} ${disabled ? "disabled" : ""} class="mt-1 accent-[#f26b1d]">
      <span class="flex-1"><span class="flex items-center gap-2 font-bold">${title}${tag ? `<span class="rounded bg-go/10 px-1.5 py-0.5 text-[11px] font-bold text-go">${tag}</span>` : ""}</span>
      <span class="mt-0.5 block text-sm text-ink/60">${desc}</span></span>
    </label>`;
  }).join("") + `<p class="flex items-center gap-2 pt-1 text-xs text-ink/50">${icon("shield", "h-4 w-4")} Online payments are processed by Paystack. We never see your card or bank details.</p>`;
}

function summary() {
  const t = totals();
  return `<p class="text-lg font-bold">Order summary</p>
    ${lines.map((l) => {
      const p = products.find((x) => x._id === l.productId);
      return p ? `<div class="flex items-center gap-3 text-sm">
        <span class="relative shrink-0"><img src="${esc(imageFor(p))}" alt="" class="h-12 w-12 rounded-lg object-cover"><span class="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">${l.qty}</span></span>
        <span class="min-w-0 flex-1"><span class="block truncate font-semibold">${esc(p.name)}</span><span class="text-xs text-ink/50">${esc(p.weightKg)}kg · ${esc(p.origin)}</span></span>
        <span class="font-semibold">${naira(p.price * l.qty)}</span></div>` : "";
    }).join("")}
    <div class="space-y-1 border-t border-ink/10 pt-3 text-sm">
      <div class="flex justify-between"><span>Subtotal</span><span>${naira(t.subtotal)}</span></div>
      <div class="flex justify-between"><span>Delivery</span><span>${form.fulfilment === "pickup" ? "Free" : naira(t.deliveryFee)}</span></div>
    </div>
    <div class="flex justify-between border-t border-ink/10 pt-3 text-lg font-bold"><span>Total</span><span>${naira(t.total)}</span></div>
    <p id="error" class="hidden rounded bg-stop/10 px-3 py-2 text-sm text-stop" role="alert"></p>
    <label class="flex cursor-pointer items-start gap-2 rounded-xl bg-wrap p-3 text-xs text-ink/70">
      <input type="checkbox" name="agree" required ${agreed ? "checked" : ""} class="mt-0.5 h-4 w-4 shrink-0 accent-[#141414]">
      <span>I understand <strong>all sales are final</strong> and there are no refunds. <a href="returns.html" target="_blank" class="underline">Refund policy</a></span>
    </label>
    <button type="submit" class="btn w-full py-3.5 text-base" ${busy ? "disabled" : ""}>
      ${busy ? "Please wait…" : form.method === "on_site" ? "Place order" : `Pay ${naira(t.total)}`}
    </button>`;
}

function renderForm() {
  root.innerHTML = `<div class="mx-auto max-w-6xl px-4 pt-10">${checkoutSteps(2)}</div><form id="co" class="mx-auto grid max-w-6xl gap-8 px-4 pb-10 md:grid-cols-[1fr_22rem]">
    <div class="space-y-6">
      <fieldset class="card space-y-3 p-6">
        <legend class="float-left mb-3 w-full text-xl font-extrabold">Your details</legend>
        <label class="block"><span class="mb-1.5 block text-sm font-semibold">Full name</span><input name="name" required placeholder="e.g. Chika Obi" class="field" autocomplete="name"></label>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block"><span class="mb-1.5 block text-sm font-semibold">Phone number</span><input name="phone" required type="tel" placeholder="0801 234 5678" class="field" autocomplete="tel"><span class="mt-1 block text-xs text-ink/50">WhatsApp number preferred</span></label>
          <label class="block"><span class="mb-1.5 block text-sm font-semibold">Email</span><input name="email" type="email" class="field" autocomplete="email"></label>
        </div>
      </fieldset>
      <fieldset class="card space-y-3 p-6">
        <legend class="float-left mb-3 w-full text-xl font-extrabold">Pickup or delivery</legend>
        <label class="${radio(true)}" data-f="pickup">
          <input type="radio" name="fulfilment" value="pickup" checked class="mt-1 accent-[#f26b1d]">
          <span><span class="font-semibold">Pick up from the warehouse</span><br><span class="text-sm text-ink/60">${esc(settings.pickupAddress)}. Free.</span></span>
        </label>
        <label class="${radio(false)}" data-f="delivery">
          <input type="radio" name="fulfilment" value="delivery" class="mt-1 accent-[#f26b1d]">
          <span><span class="font-semibold">Deliver to me</span><br><span class="text-sm text-ink/60">Fee depends on your state.</span></span>
        </label>
        <div id="delivery-fields" class="hidden space-y-3 pt-2">
          <span class="block text-sm font-semibold">State</span>
          <select name="state" class="field" aria-label="State">${NIGERIAN_STATES.map((s) => `<option ${s === form.state ? "selected" : ""}>${s}</option>`).join("")}</select>
          <span class="block text-sm font-semibold">Delivery address</span>
          <textarea name="address" rows="3" placeholder="House number, street, area, and a nearby landmark" class="field"></textarea>
        </div>
      </fieldset>
      <fieldset class="card space-y-3 p-6">
        <legend class="float-left mb-3 w-full text-xl font-extrabold">Payment</legend>
        <div id="payment" class="space-y-3">${paymentOptions()}</div>
      </fieldset>
      <div class="card p-6"><textarea name="note" rows="2" placeholder="Anything we should know? (optional)" class="field"></textarea></div>
    </div>
    <aside id="summary" class="card h-fit space-y-3 p-6 md:sticky md:top-28">${summary()}</aside>
  </form>`;
  syncEmail();

  const f = document.getElementById("co");
  f.addEventListener("change", (e) => {
    if (e.target.name === "fulfilment") {
      form.fulfilment = e.target.value;
      document.getElementById("delivery-fields").classList.toggle("hidden", form.fulfilment !== "delivery");
      f.address.required = form.fulfilment === "delivery";
      f.querySelectorAll("[data-f]").forEach((l) => (l.className = radio(l.dataset.f === form.fulfilment)));
      document.getElementById("payment").innerHTML = paymentOptions();
    }
    if (e.target.name === "state") form.state = e.target.value;
    if (e.target.name === "agree") agreed = e.target.checked;
    if (e.target.name === "method") {
      form.method = e.target.value;
      document.getElementById("payment").innerHTML = paymentOptions();
    }
    syncEmail();
    // Only redraw the summary when totals/button can change. Redrawing on every
    // text field "change" would replace the Pay button mid-click and swallow it.
    if (["fulfilment", "state", "method"].includes(e.target.name)) {
      document.getElementById("summary").innerHTML = summary();
    }
  });
  f.addEventListener("submit", submit);
}

function syncEmail() {
  const email = document.querySelector('#co [name="email"]');
  email.required = form.method !== "on_site";
  email.placeholder = form.method !== "on_site" ? "Email (for your payment receipt)" : "Email (optional)";
}

function showError(msg) {
  const el = document.getElementById("error");
  el.textContent = msg;
  el.classList.remove("hidden");
}

async function submit(e) {
  e.preventDefault();
  if (busy) return;
  const f = e.currentTarget;
  busy = true;
  document.getElementById("summary").innerHTML = summary();
  const phone = f.phone.value.trim();
  const online = form.method !== "on_site";
  try {
    // Convex re-prices everything, checks stock and holds it for 30 minutes
    const order = await client.mutation(api.orders.create, clean({
      customerName: f.name.value,
      phone,
      email: f.email.value.trim() || undefined,
      items: lines,
      fulfilment: form.fulfilment,
      state: form.fulfilment === "delivery" ? form.state : undefined,
      address: form.fulfilment === "delivery" ? f.address.value : undefined,
      note: f.note.value.trim() || undefined,
      paymentMethod: online ? "paystack" : "on_site",
    }));
    clearCart();
    const orderUrl = `order.html?code=${order.code}&phone=${encodeURIComponent(phone)}`;
    if (online) {
      // Opens the Paystack window right here (transfer account card or card form)
      await startPayment({ code: order.code, phone, total: order.total, channel: form.method }).catch(() => "cancelled");
    }
    location.href = orderUrl;
  } catch (err) {
    busy = false;
    document.getElementById("summary").innerHTML = summary();
    showError(errMsg(err, "Checkout failed. Try again."));
  }
}

if (!lines.length) {
  root.innerHTML = `<div class="mx-auto max-w-2xl px-4 py-20"><h1 class="text-3xl font-bold">Nothing to check out</h1><a href="shop.html" class="btn mt-6">Shop bales</a></div>`;
} else {
  settings = await client.query(api.settings.get, {});
  products = await client.query(api.products.byIds, { ids: lines.map((l) => l.productId) }).catch(() => []);
  renderForm();
}

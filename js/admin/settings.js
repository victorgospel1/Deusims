import { client, api, esc, errMsg } from "../core.js";
import { NIGERIAN_STATES } from "../config.js";
import { requireAdmin, handleAuthError } from "./common.js";

const token = await requireAdmin();
const root = document.getElementById("settings-root");
const s = await client.query(api.settings.get, {});
const label = "mb-1 block text-sm font-medium text-ink/70";

const feeRow = (r = { state: "Ogun", fee: 0 }) => `<div class="flex gap-2" data-row>
  <select name="feeState" class="field" aria-label="State">${NIGERIAN_STATES.map((st) => `<option ${st === r.state ? "selected" : ""}>${st}</option>`).join("")}</select>
  <input name="feeAmount" type="number" min="0" value="${esc(r.fee)}" class="field w-36" aria-label="Fee in naira">
  <button type="button" data-remove class="px-2 text-sm underline">Remove</button>
</div>`;

root.innerHTML = `<form id="settings" class="max-w-2xl space-y-10">
  <p id="saved" class="hidden rounded-md px-4 py-3 font-semibold" role="status"></p>
  <div class="card p-5 text-sm">
    <p class="font-bold">Where do online payments go?</p>
    <p class="mt-1 text-ink/65">Bank transfers and card payments are collected by Paystack and paid into the bank account set in your Paystack dashboard (Settings → Payouts). Orders are marked paid automatically.</p>
  </div>
  <fieldset class="space-y-4">
    <legend class="mb-2 text-xl font-bold">Stock</legend>
    <div><label class="${label}" for="lowStockAt">Show "Few left" on the website when a bale has this many or fewer</label><input id="lowStockAt" name="lowStockAt" type="number" min="0" value="${esc(s.lowStockAt ?? 3)}" required class="field w-32"></div>
  </fieldset>
  <fieldset class="space-y-4">
    <legend class="mb-2 text-xl font-bold">Contact and pickup</legend>
    <div><label class="${label}" for="whatsapp">WhatsApp number (with country code, e.g. 2348012345678)</label><input id="whatsapp" name="whatsapp" value="${esc(s.whatsapp)}" required class="field"></div>
    <div><label class="${label}" for="pickupAddress">Warehouse address</label><textarea id="pickupAddress" name="pickupAddress" required rows="2" class="field">${esc(s.pickupAddress)}</textarea></div>
  </fieldset>
  <fieldset class="space-y-4">
    <legend class="mb-2 text-xl font-bold">Delivery fees</legend>
    <div><label class="${label}" for="defaultDeliveryFee">Fee for states not listed below (₦)</label><input id="defaultDeliveryFee" name="defaultDeliveryFee" type="number" min="0" value="${esc(s.defaultDeliveryFee)}" required class="field"></div>
    <div id="fees" class="space-y-2">${(s.deliveryFees.length ? s.deliveryFees : [{ state: "Lagos", fee: 0 }]).map(feeRow).join("")}</div>
    <button type="button" id="add-fee" class="btn-ghost py-2 text-sm">Add a state</button>
  </fieldset>
  <button class="btn">Save settings</button>
</form>`;

const form = document.getElementById("settings");
document.getElementById("add-fee").onclick = () => document.getElementById("fees").insertAdjacentHTML("beforeend", feeRow());
form.addEventListener("click", (e) => { if (e.target.dataset.remove !== undefined) e.target.closest("[data-row]").remove(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(form);
  const states = f.getAll("feeState");
  const fees = f.getAll("feeAmount").map(Number);
  const saved = document.getElementById("saved");
  const btn = form.querySelector("button.btn");
  btn.disabled = true;
  try {
    await client.mutation(api.settings.save, {
      token,
      lowStockAt: Math.max(0, Math.floor(Number(f.get("lowStockAt")) || 0)),
      whatsapp: f.get("whatsapp").replace(/\D/g, ""),
      pickupAddress: f.get("pickupAddress").trim(),
      defaultDeliveryFee: Number(f.get("defaultDeliveryFee")) || 0,
      deliveryFees: states.map((state, i) => ({ state, fee: fees[i] })).filter((d) => Number.isFinite(d.fee) && d.fee >= 0),
    });
    saved.className = "rounded-md bg-go/10 px-4 py-3 font-semibold text-go";
    saved.textContent = "Settings saved.";
  } catch (err) {
    handleAuthError(err);
    saved.className = "rounded-md bg-stop/10 px-4 py-3 font-semibold text-stop";
    saved.textContent = errMsg(err, "Couldn't save settings.");
  }
  btn.disabled = false;
  scrollTo({ top: 0, behavior: "smooth" });
});


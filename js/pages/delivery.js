import { mountLayout } from "../layout.js";
import { esc, naira } from "../core.js";
import { NIGERIAN_STATES } from "../config.js";

const s = await mountLayout();
document.getElementById("pickup").textContent = s.pickupAddress;
const listed = new Map(s.deliveryFees.map((d) => [d.state, d.fee]));
document.getElementById("fees").innerHTML = `<div class="max-h-[520px] overflow-y-auto rounded-xl border border-strap">
  <table class="w-full text-sm"><tbody class="divide-y divide-strap">
    ${NIGERIAN_STATES.map((st) => `<tr class="${listed.has(st) ? "bg-brand-soft/50" : ""}"><td class="px-4 py-2.5">${esc(st)}</td><td class="px-4 py-2.5 text-right font-semibold">${naira(listed.get(st) ?? s.defaultDeliveryFee)}</td></tr>`).join("")}
  </tbody></table></div>`;

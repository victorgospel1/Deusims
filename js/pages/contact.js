import { mountLayout } from "../layout.js";
import { esc, waLink } from "../core.js";
import { SITE } from "../config.js";
import { icon } from "../icons.js";

const s = await mountLayout();
const row = (ic, label, value) => `<div class="flex gap-4"><span class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">${icon(ic, "h-6 w-6")}</span>
  <div><dt class="text-sm font-semibold text-ink/50">${label}</dt><dd class="font-bold">${value}</dd></div></div>`;
document.getElementById("contact-details").innerHTML =
  row("pin", "Warehouse", esc(s.pickupAddress)) +
  row("clock", "Opening hours", esc(SITE.hours)) +
  row("phone", "Phone", `<a href="tel:${esc(SITE.phone.replace(/\s/g, ""))}" class="hover:text-brand">${esc(SITE.phone)}</a>`) +
  row("mail", "Email", `<a href="mailto:${esc(SITE.email)}" class="hover:text-brand">${esc(SITE.email)}</a>`);
document.getElementById("contact-wa").href = waLink(s.whatsapp, "Hello, I'd like to visit the warehouse.");
document.getElementById("contact-wa").innerHTML = `${icon("whatsapp")} Message us on WhatsApp`;
document.getElementById("map").src = `https://www.google.com/maps?q=${encodeURIComponent(s.pickupAddress)}&output=embed`;

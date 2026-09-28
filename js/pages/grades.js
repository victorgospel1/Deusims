import { mountLayout } from "../layout.js";
import { client, api, naira } from "../core.js";
import { GRADES } from "../config.js";
import { icon } from "../icons.js";

await mountLayout();
client.onUpdate(api.products.list, {}, (bales) => {
  const inStock = bales.filter((b) => b.stock > 0);
  document.getElementById("grade-cards").innerHTML = Object.entries(GRADES).map(([g, v], i) => {
    const list = inStock.filter((b) => b.grade === g);
    return `<div class="flex flex-col rounded-[1.5rem] p-6 ${i === 0 ? "bg-ink text-white" : "border border-strap bg-white"}">
      <p class="display text-2xl font-extrabold">${v.label}</p>
      <p class="mt-1 text-sm ${i === 0 ? "text-white/60" : "text-ink/55"}">${list.length ? `${list.length} in stock · from ${naira(Math.min(...list.map((b) => b.price)))}` : "None in stock right now"}</p>
      <p class="mt-4 text-sm leading-relaxed ${i === 0 ? "text-white/80" : "text-ink/70"}">${v.note}</p>
      <dl class="mt-5 space-y-3 text-sm">${[["Condition", v.condition], ["Rejects per bale", v.rejects], ["Best for", v.bestFor]].map(([k, val]) => `<div><dt class="${i === 0 ? "text-white/50" : "text-ink/45"}">${k}</dt><dd class="font-medium">${val}</dd></div>`).join("")}</dl>
      <a href="shop.html?grade=${g}" class="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold ${i === 0 ? "text-brand" : "text-ink"} hover:underline">Shop ${v.label} ${icon("arrow", "h-4 w-4")}</a>
    </div>`;
  }).join("");
});

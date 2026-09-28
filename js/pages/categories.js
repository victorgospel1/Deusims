import { mountLayout } from "../layout.js";
import { client, api, esc, naira } from "../core.js";
import { CATEGORY_IMAGES, FALLBACK_IMAGE } from "../config.js";
import { icon } from "../icons.js";

await mountLayout();
const grid = document.getElementById("cat-grid");
grid.innerHTML = Array.from({ length: 8 }, () => `<div class="skeleton aspect-[4/5]"></div>`).join("");
client.onUpdate(api.products.list, {}, (bales) => {
  const by = {};
  for (const b of bales) (by[b.category] ??= []).push(b);
  const cats = Object.keys(by).sort();
  grid.innerHTML = cats.length ? cats.map((c) => {
    const list = by[c], inStock = list.filter((b) => b.stock > 0);
    const from = inStock.length ? naira(Math.min(...inStock.map((b) => b.price))) : null;
    const img = CATEGORY_IMAGES[c] ?? list[0]?.images?.[0] ?? FALLBACK_IMAGE;
    return `<a href="shop.html?category=${encodeURIComponent(c)}" class="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-sack">
      <img src="${esc(img)}" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105">
      <div class="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent"></div>
      <div class="absolute inset-x-0 bottom-0 p-4 text-white">
        <p class="display text-lg font-bold">${esc(c)}</p>
        <p class="text-xs text-white/75">${inStock.length ? `${inStock.length} in stock · from ${from}` : "Sold out right now"}</p>
      </div>
      <span class="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white text-ink transition group-hover:bg-brand group-hover:text-white">${icon("arrowR", "h-4 w-4")}</span>
    </a>`;
  }).join("") : `<p class="col-span-full rounded-2xl bg-white p-10 text-center text-ink/55">No bales listed yet.</p>`;
});

import { mountLayout } from "../layout.js";
import { client, api, esc, naira, waLink } from "../core.js";
import { productCard, cardSkeletons, wireAddButtons, discount } from "../components.js";
import { GRADES, CONTENT, CATEGORY_IMAGES, FALLBACK_IMAGE, PHOTOS, imageFor } from "../config.js";
import { icon } from "../icons.js";
import { slideshow, reveal } from "../ui.js";

const settings = await mountLayout();
document.querySelectorAll("[data-i]").forEach((el) => (el.innerHTML = icon(el.dataset.i, "h-4 w-4")));
document.querySelectorAll("[data-photo]").forEach((el) => (el.src = PHOTOS[el.dataset.photo]));

const wa = waLink(settings.whatsapp, "Hello, I'd like to ask about your bales.");
const hero = document.getElementById("hero");
const SLIDES = CONTENT.heroSlides;

// Hero: text left; photo collage right (slide photo + two real bales with prices)
function renderHero(stats, picks) {
  const slides = SLIDES.map((s, i) => {
    const pair = picks.length ? [picks[(i * 2) % picks.length], picks[(i * 2 + 1) % picks.length]] : [];
    return `
    <div class="slide stack grid gap-6 md:grid-cols-[1fr_1.1fr] md:items-center lg:gap-10" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${SLIDES.length}">
      <div class="slide-copy order-2 md:order-1">
        ${s.tag ? `<p class="kicker">${esc(s.tag)}</p>` : ""}
        <h1 class="display mt-3 text-[2rem] font-extrabold leading-[1.05] sm:text-[2.4rem] lg:text-[3rem]">${esc(s.title)}</h1>
        ${s.text ? `<p class="mt-4 max-w-md text-[15px] text-ink/65 sm:text-base">${esc(s.text)}</p>` : ""}
        <div class="mt-6 flex flex-wrap gap-3">
          ${s.ctaLabel ? `<a href="${esc(s.ctaHref || "shop.html")}" class="btn">${esc(s.ctaLabel)} ${icon("arrow", "h-4 w-4")}</a>` : ""}
          <a href="${wa}" target="_blank" rel="noopener" class="btn-ghost">${icon("whatsapp", "h-4 w-4 text-go")} WhatsApp us</a>
        </div>
        <dl class="mt-8 hidden max-w-sm grid-cols-3 gap-4 border-t border-strap pt-5 lg:grid">
          ${stats.map(([n, l]) => `<div><dt class="display text-2xl font-extrabold">${n}</dt><dd class="mt-0.5 text-xs text-ink/55">${l}</dd></div>`).join("")}
        </dl>
      </div>
      <div class="order-1 grid aspect-[16/10] max-h-[400px] w-full grid-cols-[1.5fr_1fr] gap-3 md:order-2">
        <div class="relative min-h-0 overflow-hidden rounded-[1.5rem] bg-sack ${pair.length ? "" : "col-span-2"}">
          <img src="${esc(s.imageUrl)}" alt="" class="absolute inset-0 h-full w-full object-cover" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
          <div class="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent"></div>
          <span class="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-sm">${icon("shield", "h-3.5 w-3.5 text-go")} Graded &amp; weighed</span>
        </div>
        ${pair.length ? `<div class="grid min-h-0 grid-rows-2 gap-3">${pair.map((b) => `
          <a href="bale.html?slug=${encodeURIComponent(b.slug)}" class="group relative min-h-0 overflow-hidden rounded-[1.25rem] bg-sack">
            <img src="${esc(imageFor(b))}" alt="${esc(b.name)}" class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy">
            <span class="absolute inset-x-2 bottom-2 rounded-xl bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur">
              <span class="block truncate text-[11px] font-medium sm:text-xs">${esc(b.name)}</span>
              <span class="flex items-baseline gap-1.5"><span class="text-xs font-bold sm:text-sm">${naira(b.price)}</span>${discount(b) ? `<span class="text-[10px] font-bold text-brand">-${discount(b)}%</span>` : ""}</span>
            </span>
          </a>`).join("")}</div>` : ""}
      </div>
    </div>`; }).join("");
  const controls = SLIDES.length > 1 ? `
    <div class="mt-5 flex items-center gap-2">
      <button data-prev class="grid h-9 w-9 place-items-center rounded-full border border-ink/15 bg-white hover:border-ink" aria-label="Previous slide">${icon("arrowL", "h-4 w-4")}</button>
      <button data-next class="grid h-9 w-9 place-items-center rounded-full border border-ink/15 bg-white hover:border-ink" aria-label="Next slide">${icon("arrowR", "h-4 w-4")}</button>
      <div class="ml-2 flex gap-1.5">${SLIDES.map((_, i) => `<button data-dot="${i}" class="dot-bar !w-8 !bg-ink/15" aria-label="Go to slide ${i + 1}"><span></span></button>`).join("")}</div>
    </div>` : "";
  hero.innerHTML = `<div class="grid">${slides}</div>${controls}`;
  slideshow(hero, { interval: 6000 });
}

// ─── Trust ───
document.getElementById("trust").innerHTML = [
  ["shield", "Graded & weighed", "Cream, A and B, labelled upfront"],
  ["video", "Opening videos", "See inside before you pay"],
  ["truck", "Nationwide delivery", "Or free pickup in Lagos"],
  ["card", "Secure payment", "Transfer, card, or cash at pickup"],
].map(([ic, t, d]) => `<div class="flex items-start gap-3"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">${icon(ic, "h-5 w-5")}</span>
  <div><p class="font-semibold">${t}</p><p class="text-sm text-ink/55">${d}</p></div></div>`).join("");

// ─── Products ───
const arrivals = document.getElementById("arrivals");
arrivals.innerHTML = cardSkeletons(12);
let products = [], tab = "all", heroDone = false;
wireAddButtons(document.querySelector("main"), (id) => products.find((p) => p._id === id));

const tabs = document.getElementById("tabs");
function renderTabs() {
  tabs.innerHTML = [["all", "All"], ...Object.entries(GRADES).map(([g, v]) => [g, v.label])].map(([k, l]) =>
    `<button role="tab" aria-selected="${tab === k}" data-tab="${k}" class="${tab === k ? "chip-on" : "chip"}">${l}</button>`).join("");
}
tabs.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) { tab = b.dataset.tab; renderTabs(); renderArrivals(); } });
function renderArrivals() {
  const inStock = products.filter((b) => b.stock > 0 && (tab === "all" || b.grade === tab));
  const list = [...inStock.filter((b) => b.isNewArrival), ...inStock.filter((b) => !b.isNewArrival)].slice(0, 12);
  arrivals.innerHTML = list.length ? list.map((b) => productCard(b)).join("")
    : `<p class="col-span-full rounded-2xl bg-white p-10 text-center text-ink/55">Nothing in this grade right now. Message us on WhatsApp for what's arriving.</p>`;
}
renderTabs();

let timer;
function countdown() {
  const el = document.getElementById("deals-timer");
  clearInterval(timer);
  const end = CONTENT.deals?.endsAt;
  if (!end || end < Date.now()) { el.innerHTML = ""; return; }
  const cell = (n, l) => `<div class="w-14 rounded-xl bg-white/10 py-1.5 text-center"><p class="display text-xl font-extrabold">${String(n).padStart(2, "0")}</p><p class="text-[10px] uppercase tracking-wider text-white/50">${l}</p></div>`;
  const tick = () => {
    const t = Math.max(0, end - Date.now());
    el.innerHTML = cell(Math.floor(t / 864e5), "days") + cell(Math.floor(t / 36e5) % 24, "hrs") + cell(Math.floor(t / 6e4) % 60, "min") + cell(Math.floor(t / 1e3) % 60, "sec");
    if (!t) clearInterval(timer);
  };
  tick(); timer = setInterval(tick, 1000);
}

client.onUpdate(api.products.list, {}, (bales) => {
  products = bales;
  const inStock = bales.filter((b) => b.stock > 0);
  const counts = {}, sample = {};
  for (const b of inStock) { counts[b.category] = (counts[b.category] ?? 0) + 1; sample[b.category] ??= b; }
  const cats = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  if (!heroDone) {
    const picks = [...inStock].sort((a, b) => discount(b) - discount(a) || b.isNewArrival - a.isNewArrival).slice(0, 6);
    renderHero([[inStock.length, "bale types in stock"], ["36", "states we deliver to"], ["3", "ways to pay"]], picks);
    heroDone = true;
  }

  // Ticker
  const words = cats.length ? cats : ["Okrika bales", "Graded", "Nationwide delivery"];
  const line = words.map((c) => `<span>${esc(c)}</span><span class="text-brand">✦</span>`).join("");
  document.getElementById("marquee").innerHTML = line + line + line + line;

  // Bento categories
  const img = (c) => CATEGORY_IMAGES[c] ?? sample[c]?.images?.[0] ?? FALLBACK_IMAGE;
  document.getElementById("bento").innerHTML = cats.slice(0, 5).map((c, i) => `
    <a href="shop.html?category=${encodeURIComponent(c)}" class="group relative overflow-hidden rounded-2xl bg-sack ${i === 0 ? "col-span-2 row-span-2" : ""}">
      <img src="${esc(img(c))}" alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105">
      <div class="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent"></div>
      <div class="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white sm:p-4">
        <div><p class="display ${i === 0 ? "text-2xl" : "text-base sm:text-lg"} font-bold">${esc(c)}</p><p class="text-xs text-white/75">${counts[c]} in stock</p></div>
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-ink transition group-hover:bg-brand group-hover:text-white">${icon("arrowR", "h-4 w-4")}</span>
      </div>
    </a>`).join("");

  renderArrivals();

  // Deals
  const deals = inStock.filter((b) => discount(b) > 0).sort((a, b) => discount(b) - discount(a));
  document.getElementById("deals").classList.toggle("hidden", !deals.length);
  if (deals.length) {
    document.getElementById("deals-title").textContent = CONTENT.deals?.title || "Deals";
    document.getElementById("deals-list").innerHTML = deals.map((b) => `<div class="w-44 shrink-0 snap-start sm:w-52">${productCard(b, { deal: true })}</div>`).join("");
    countdown();
  }

  // More rows from live stock (hidden when empty)
  const row = (kicker, title, link, list) => list.length ? `
    <section class="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
      <div class="flex items-end justify-between gap-4"><div><p class="kicker">${kicker}</p><h2 class="section-title mt-1">${title}</h2></div><a href="${link}" class="link-more">See all</a></div>
      <div class="no-scrollbar -mx-4 mt-6 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">${list.map((b) => `<div class="w-44 shrink-0 snap-start sm:w-52">${productCard(b)}</div>`).join("")}</div>
    </section>` : "";
  document.getElementById("product-rows").innerHTML =
    row("Top quality", "Cream grade picks", "shop.html?grade=cream", inStock.filter((b) => b.grade === "cream")) +
    row("Budget friendly", "Under ₦200,000", "shop.html?max=200000", inStock.filter((b) => b.price < 200000).sort((a, b) => a.price - b.price)) +
    row("Market favourites", "Grade A bales", "shop.html?grade=A", inStock.filter((b) => b.grade === "A"));

  // Grades
  const from = (g) => { const ps = inStock.filter((p) => p.grade === g).map((p) => p.price); return ps.length ? naira(Math.min(...ps)) : "—"; };
  document.getElementById("grades").innerHTML = Object.entries(GRADES).map(([g, v], i) => `
    <a href="shop.html?grade=${g}" class="group flex flex-col rounded-[1.5rem] p-6 transition ${i === 0 ? "bg-ink text-white" : "border border-strap bg-white hover:border-ink"}">
      <div class="flex items-start justify-between"><p class="display text-2xl font-extrabold">${v.label}</p>
        <span class="grid h-10 w-10 place-items-center rounded-full ${i === 0 ? "bg-white/10" : "bg-sack"} transition group-hover:bg-brand group-hover:text-white">${icon("arrowR", "h-4 w-4")}</span></div>
      <p class="mt-2 text-sm ${i === 0 ? "text-white/60" : "text-ink/55"}">From ${from(g)}</p>
      <dl class="mt-6 space-y-3 text-sm">
        ${[["Condition", v.condition], ["Rejects", v.rejects], ["Best for", v.bestFor]].map(([k, val]) => `<div><dt class="${i === 0 ? "text-white/50" : "text-ink/45"}">${k}</dt><dd class="mt-0.5 font-medium">${val}</dd></div>`).join("")}
      </dl>
    </a>`).join("");
  reveal();
});

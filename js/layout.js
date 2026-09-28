import { SITE, PHOTOS, CONTENT, imageFor } from "./config.js";
import { mountAssistant } from "./assistant.js";
import { client, api, esc, naira, waLink, getSettings } from "./core.js";
import { cartCount, onCartChange, addToCart } from "./cart.js";
import { icon, logoMark } from "./icons.js";
import { reveal, bump, toast } from "./ui.js";
import { setLowStockAt } from "./components.js";

const HELP = [
  ["track.html", "Track your order", "truck"],
  ["delivery.html", "Delivery & pickup", "pin"],
  ["returns.html", "Refund policy", "shield"],
  ["faq.html", "FAQ", "star"],
  ["contact.html", "Contact us", "phone"],
];
const NAV = [["shop.html", "Shop all"], ["shop.html?deals=1", "Deals"], ["wholesale.html", "Wholesale"], ["about.html", "About"]];

const here = () => { const p = (location.pathname.split("/").pop() || "index").replace(/\.html$/, ""); return `${p || "index"}.html`; };

const wordmark = (cls = "") => `<a href="index.html" class="flex min-w-0 items-center gap-2 sm:gap-2.5 ${cls}">${logoMark("h-8 w-8 shrink-0 sm:h-9 sm:w-9")}
  <span class="display truncate text-lg font-extrabold leading-none sm:text-[22px]">${esc(SITE.name)}</span></a>`;

function header() {
  const count = cartCount();
  const tel = esc(SITE.phone.replace(/\s/g, ""));
  const page = here();
  const deals = location.search.includes("deals=1");
  const link = (h, l, on, extra = "") => `<a href="${h}" class="rounded-full px-3.5 py-2 text-[15px] font-medium transition ${on ? "bg-ink text-white" : "text-ink/75 hover:bg-sack hover:text-ink"} ${extra}">${l}</a>`;
  const dd = (label, on, body, width = "w-64") => `<div class="group relative" data-dd>
      <button class="flex items-center gap-1 rounded-full px-3.5 py-2 text-[15px] font-medium transition ${on ? "bg-ink text-white" : "text-ink/75 hover:bg-sack hover:text-ink"}" aria-haspopup="true" aria-expanded="false">${label}
        <svg class="h-3.5 w-3.5 transition group-hover:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="invisible absolute left-1/2 top-full z-40 -translate-x-1/2 pt-3 opacity-0 transition duration-200 group-hover:visible group-hover:opacity-100 group-[.open]:visible group-[.open]:opacity-100">
        <div class="${width} overflow-hidden rounded-2xl border border-strap bg-white p-2 shadow-[0_24px_60px_-20px_rgb(20_20_20/0.35)]">${body}</div>
      </div>
    </div>`;
  const shopMenu = `<div class="grid grid-cols-[1fr_1fr_1.1fr] gap-2 p-3">
      <div><p class="kicker px-3 pb-2 !text-ink/45">Categories</p><div data-nav-cats class="grid"></div>
        <a href="categories.html" class="mt-1 block rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft">All categories →</a></div>
      <div><p class="kicker px-3 pb-2 !text-ink/45">By grade</p>
        ${[["cream", "Cream", "Near-new, top quality"], ["A", "Grade A", "Clean, light wear"], ["B", "Grade B", "Best value per piece"]].map(([g, l, d]) => `<a href="shop.html?grade=${g}" class="block rounded-lg px-3 py-2 hover:bg-sack"><span class="block text-sm font-semibold">${l}</span><span class="block text-xs text-ink/50">${d}</span></a>`).join("")}
        <a href="grades.html" class="mt-1 block rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft">Grade guide →</a>
        <a href="shop.html?instock=1" class="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-sack">In stock now</a></div>
      <a data-nav-promo href="shop.html?sort=price-asc" class="group/p relative block min-h-56 overflow-hidden rounded-xl bg-ink text-white">
        <div class="absolute inset-0 grid place-items-center text-sm text-white/40">Loading…</div></a>
    </div>`;
  const helpMenu = HELP.map(([h, l, ic]) => `<a href="${h}" class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-sack"><span class="grid h-8 w-8 place-items-center rounded-full bg-sack text-ink/70">${icon(ic, "h-4 w-4")}</span>${l}</a>`).join("")
    + `<a data-wa target="_blank" rel="noopener" class="mt-1 flex items-center gap-3 rounded-xl bg-go/10 px-3 py-2.5 text-sm font-semibold text-go hover:bg-go/15"><span class="grid h-8 w-8 place-items-center rounded-full bg-go text-white">${icon("whatsapp", "h-4 w-4")}</span>Chat on WhatsApp</a>`;

  return `
  <div id="site-nav" class="sticky top-0 z-30 border-b border-transparent bg-wrap/90 backdrop-blur-md transition">
    <div class="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-4 sm:px-6">
      <button data-open-menu class="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-sack lg:hidden" aria-label="Open menu">${icon("menu")}</button>
      ${wordmark()}
      <nav class="ml-6 hidden items-center gap-0.5 lg:flex" aria-label="Main">
        ${dd("Shop", page === "shop.html" && !deals, shopMenu, "w-[640px]")}
        ${link("shop.html?deals=1", "Deals", deals, deals ? "" : "!text-brand")}
        ${link("wholesale.html", "Wholesale", page === "wholesale.html")}
        ${dd("Help", HELP.some(([h]) => h === page), helpMenu)}
        ${link("about.html", "About", page === "about.html")}
      </nav>
      <div class="ml-auto flex shrink-0 items-center gap-1">
        <form action="shop.html" role="search" class="relative hidden xl:block">
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40">${icon("search", "h-4 w-4")}</span>
          <input name="q" placeholder="Search bales" aria-label="Search bales" class="h-10 w-52 rounded-full border border-strap bg-white pl-10 pr-4 text-sm outline-none transition focus:w-64 focus:border-ink">
        </form>
        <button data-open-search class="grid h-10 w-10 place-items-center rounded-full hover:bg-sack xl:hidden" aria-label="Search bales">${icon("search")}</button>
        <a data-wa target="_blank" rel="noopener" class="hidden h-10 w-10 place-items-center rounded-full text-go hover:bg-sack sm:grid" aria-label="WhatsApp">${icon("whatsapp")}</a>
        <a href="cart.html" class="ml-1 flex items-center gap-1.5 rounded-full bg-ink py-2 pl-3 pr-3.5 text-sm font-semibold text-white transition hover:bg-ink-soft" aria-label="Cart">
          ${icon("cart", "h-5 w-5")}<span data-cart-count class="${count ? "" : "opacity-60"}">${count}</span></a>
      </div>
    </div>
    <div data-search class="hidden border-t border-strap bg-wrap">
      <form action="shop.html" role="search" class="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <span class="text-ink/40">${icon("search")}</span>
        <input name="q" autocomplete="off" placeholder="Search jeans, ladies tops, Cream grade…" aria-label="Search bales" class="w-full bg-transparent py-2 text-base outline-none placeholder:text-ink/35">
        <button class="btn px-5 py-2 text-sm">Search</button>
        <button type="button" data-close-search class="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-sack" aria-label="Close search">${icon("close")}</button>
      </form>
    </div>
  </div>

  <div class="scrim" data-scrim></div>
  <aside class="drawer-left flex flex-col !bg-wrap" data-menu aria-label="Menu">
    <div class="flex items-center justify-between p-5">${wordmark()}
      <button data-close class="grid h-10 w-10 place-items-center rounded-full hover:bg-sack" aria-label="Close menu">${icon("close")}</button></div>
    <nav class="flex flex-col px-3">
      ${[["index.html", "Home"], ...NAV, ["categories.html", "Categories"], ["grades.html", "Grade guide"]].map(([h, l]) => `<a href="${h}" class="display rounded-xl px-3 py-2.5 text-xl font-bold ${l === "Deals" ? "text-brand" : ""} hover:bg-sack">${l}</a>`).join("")}
    </nav>
    <p class="kicker px-6 pb-1 pt-5 !text-ink/45">Help</p>
    <nav class="flex flex-col px-3">${HELP.map(([h, l]) => `<a href="${h}" class="rounded-lg px-3 py-2 text-[15px] text-ink/75 hover:bg-sack">${l}</a>`).join("")}</nav>
    <p class="kicker px-6 pb-1 pt-5 !text-ink/45">Categories</p>
    <nav data-menu-cats class="flex flex-col px-3 pb-4"></nav>
    <div class="mt-auto space-y-2 p-5">
      <a data-wa target="_blank" rel="noopener" class="btn w-full !bg-go">${icon("whatsapp")} Chat on WhatsApp</a>
      <a href="tel:${tel}" class="btn-ghost w-full">${icon("phone")} ${esc(SITE.phone)}</a>
    </div>
  </aside>`;
}

function footer(s) {
  const tel = esc(SITE.phone.replace(/\s/g, ""));
  const col = (title, links) => `<div><p class="text-sm font-semibold text-white">${title}</p><ul class="mt-4 space-y-3 text-sm text-white/60">${links}</ul></div>`;
  return `<footer class="mt-20 bg-ink text-white">
    <div class="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
      <div class="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
        <div>
          <p class="display text-3xl font-extrabold leading-[1.05] sm:text-4xl">Good bales.<br><span class="text-brand">Straight answers.</span></p>
          <p class="mt-5 max-w-sm text-white/60">${esc(SITE.tagline)}</p>
          <a data-wa target="_blank" rel="noopener" class="btn mt-7">${icon("whatsapp")} Get new arrivals on WhatsApp</a>
        </div>
        <div class="grid grid-cols-2 gap-8 sm:grid-cols-3">
          ${col("Shop", `<li><a href="shop.html" class="hover:text-white">All bales</a></li><li><a href="categories.html" class="hover:text-white">Categories</a></li><li><a href="shop.html?deals=1" class="hover:text-white">Deals</a></li><li><a href="grades.html" class="hover:text-white">Grade guide</a></li><li><a href="wholesale.html" class="hover:text-white">Wholesale</a></li>`)}
          ${col("Help", `<li><a href="track.html" class="hover:text-white">Track your order</a></li><li><a href="delivery.html" class="hover:text-white">Delivery &amp; pickup</a></li><li><a href="returns.html" class="hover:text-white">Refund policy</a></li><li><a href="faq.html" class="hover:text-white">FAQ</a></li><li><a href="contact.html" class="hover:text-white">Contact</a></li>`)}
          ${col("Warehouse", `<li>${esc(s.pickupAddress)}</li><li>${esc(SITE.hours)}</li><li><a href="tel:${tel}" class="hover:text-white">${esc(SITE.phone)}</a></li>`)}
        </div>
      </div>
      <div class="mt-14 flex flex-col gap-4 border-t border-white/10 py-6 pb-24 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between lg:pb-6">
        <p>© ${new Date().getFullYear()} ${esc(SITE.name)} · <a href="about.html" class="hover:text-white">About</a> · <a href="privacy.html" class="hover:text-white">Privacy</a> · <a href="terms.html" class="hover:text-white">Terms</a></p>
        <div class="flex flex-wrap items-center gap-2">${["Bank transfer", "Visa", "Mastercard", "Verve", "USSD", "Cash / POS"].map((m) => `<span class="rounded-full border border-white/15 px-2.5 py-1 text-white/70">${m}</span>`).join("")}
          ${[["instagram", "Instagram"], ["facebook", "Facebook"], ["tiktok", "TikTok"]].filter(([k]) => CONTENT.socials?.[k]).map(([k, l]) => `<a href="${esc(CONTENT.socials[k])}" target="_blank" rel="noopener" class="rounded-full bg-white/10 px-2.5 py-1 text-white hover:bg-brand">${l}</a>`).join("")}</div>
      </div>
    </div>
  </footer>`;
}

function wireHeader() {
  const nav = document.getElementById("site-nav");
  const onScroll = () => nav.classList.toggle("!border-strap", scrollY > 10);
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const menu = document.querySelector("[data-menu]"), scrim = document.querySelector("[data-scrim]");
  const setMenu = (open) => { menu.classList.toggle("open", open); scrim.classList.toggle("open", open); document.body.style.overflow = open ? "hidden" : ""; };
  document.querySelector("[data-open-menu]").onclick = () => setMenu(true);
  menu.querySelector("[data-close]").onclick = () => setMenu(false);
  scrim.onclick = () => setMenu(false);

  const search = document.querySelector("[data-search]");
  const setSearch = (open) => { search.classList.toggle("hidden", !open); if (open) search.querySelector("input").focus(); };
  document.querySelector("[data-open-search]").onclick = () => setSearch(search.classList.contains("hidden"));
  search.querySelector("[data-close-search]").onclick = () => setSearch(false);
  addEventListener("keydown", (e) => { if (e.key === "Escape") { setMenu(false); setSearch(false); } });

  // Dropdowns: hover on desktop, tap/keyboard everywhere
  document.querySelectorAll("[data-dd]").forEach((dd) => {
    const btn = dd.querySelector("button");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !dd.classList.contains("open");
      document.querySelectorAll("[data-dd].open").forEach((o) => { o.classList.remove("open"); o.querySelector("button").setAttribute("aria-expanded", "false"); });
      dd.classList.toggle("open", open); btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("[data-dd]")) document.querySelectorAll("[data-dd].open").forEach((o) => o.classList.remove("open")); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll("[data-dd].open").forEach((o) => o.classList.remove("open")); });

  onCartChange(() => {
    const el = document.querySelector("[data-cart-count]");
    const n = cartCount();
    el.textContent = n; el.classList.toggle("opacity-60", !n); bump(el);
  });
}

/** Call once per storefront page. */
export async function mountLayout() {
  const s = await getSettings(); // business details + content from Admin → Website
  setLowStockAt(s.lowStockAt ?? 3);
  document.getElementById("site-header").innerHTML = header();
  wireHeader();
  const wa = waLink(s.whatsapp, "Hello, I'd like to ask about your bales.");
  document.getElementById("site-footer").innerHTML = footer(s);
  document.querySelectorAll("[data-wa]").forEach((a) => (a.href = wa));

  const float = document.createElement("a");
  float.href = wa; float.target = "_blank"; float.rel = "noopener";
  float.setAttribute("aria-label", "Chat on WhatsApp");
  float.className = "fixed bottom-5 right-5 z-40 hidden h-14 w-14 place-items-center rounded-full bg-go text-white shadow-lift transition hover:scale-110 lg:grid";
  float.innerHTML = icon("whatsapp", "h-7 w-7");
  document.body.append(float);
  mountBottomNav(wa);
  mountAssistant();
  fillCategoryBar();
  reveal();
  return s;
}

/** Mobile bottom navigation (replaces floating buttons on small screens). */
function mountBottomNav(wa) {
  const items = [
    ["index.html", "Home", "grid"], ["shop.html", "Shop", "box"],
  ];
  const nav = document.createElement("nav");
  nav.setAttribute("aria-label", "Quick links");
  nav.className = "fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-strap bg-wrap/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden";
  const cell = "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium";
  nav.innerHTML = items.map(([h, l, ic]) => `<a href="${h}" class="${cell} ${here() === h ? "text-brand" : "text-ink/60"}">${icon(ic, "h-5 w-5")}${l}</a>`).join("") + `
    <a href="cart.html" class="${cell} ${here() === "cart.html" ? "text-brand" : "text-ink/60"}"><span class="relative">${icon("cart", "h-5 w-5")}
      <span data-cart-count-m class="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white ${cartCount() ? "" : "hidden"}">${cartCount()}</span></span>Cart</a>
    <button data-open-assistant class="${cell} text-ink/60">${icon("star", "h-5 w-5")}Ask AI</button>
    <a href="${wa}" target="_blank" rel="noopener" class="${cell} text-go">${icon("whatsapp", "h-5 w-5")}WhatsApp</a>`;
  document.body.append(nav);
  document.body.classList.add("pb-16", "lg:pb-0");
  onCartChange(() => {
    const el = nav.querySelector("[data-cart-count-m]"), n = cartCount();
    el.textContent = n; el.classList.toggle("hidden", !n); bump(el);
  });
}

/** Desktop category links under the main navigation. */
async function fillCategoryBar() {
  try {
    const bales = await client.query(api.products.list, {});
    const inStock = bales.filter((b) => b.stock > 0);
    const cats = [...new Set(bales.map((b) => b.category))].sort();
    const menuCats = document.querySelector("[data-menu-cats]");
    if (menuCats) menuCats.innerHTML = cats.map((c) => `<a href="shop.html?category=${encodeURIComponent(c)}" class="rounded-lg px-3 py-2 text-[15px] text-ink/70 hover:bg-sack hover:text-ink">${esc(c)}</a>`).join("");
    const navCats = document.querySelector("[data-nav-cats]");
    if (navCats) navCats.innerHTML = cats.slice(0, 8).map((c) => `<a href="shop.html?category=${encodeURIComponent(c)}" class="rounded-lg px-3 py-1.5 text-sm hover:bg-sack">${esc(c)}</a>`).join("");
    const cheapest = [...inStock].sort((a, b) => a.price - b.price)[0];
    const promo = document.querySelector("[data-nav-promo]");
    if (promo && cheapest) {
      promo.href = `bale.html?slug=${encodeURIComponent(cheapest.slug)}`;
      promo.innerHTML = `<img src="${esc(imageFor(cheapest))}" alt="" class="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover/p:scale-105">
        <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent"></div>
        <div class="absolute inset-x-0 bottom-0 p-4"><p class="kicker">Cheapest bale</p><p class="mt-1 truncate font-semibold">${esc(cheapest.name)}</p><p class="display text-2xl font-bold">${naira(cheapest.price)}</p></div>`;
    } else promo?.remove();
    maybeShowPromo(cheapest);
  } catch {}
}

/** Popup card for the cheapest bale in stock (once per visit, not on checkout pages). */
function maybeShowPromo(b) {
  if (!b || ["cart.html", "checkout.html", "order.html", "track.html"].includes(here())) return;
  try { if (sessionStorage.getItem("promo_seen")) return; } catch {}
  setTimeout(() => {
    try { sessionStorage.setItem("promo_seen", "1"); } catch {}
    const off = b.oldPrice > b.price ? Math.round((1 - b.price / b.oldPrice) * 100) : 0;
    const wrap = document.createElement("div");
    wrap.className = "fixed inset-0 z-[65] flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center";
    wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-modal", "true"); wrap.setAttribute("aria-label", "Cheapest bale today");
    wrap.innerHTML = `<div class="grid w-full max-w-2xl animate-fade-up overflow-hidden rounded-[1.75rem] bg-white shadow-2xl sm:grid-cols-[1fr_1.1fr]">
      <div class="relative h-48 bg-sack sm:h-auto"><img src="${esc(imageFor(b))}" alt="${esc(b.name)}" class="absolute inset-0 h-full w-full object-cover">
        ${off ? `<span class="absolute left-3 top-3 rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">-${off}%</span>` : ""}</div>
      <div class="relative p-6 sm:p-8">
        <button data-promo-close class="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full hover:bg-sack" aria-label="Close">${icon("close", "h-4 w-4")}</button>
        <p class="kicker">Today's cheapest bale</p>
        <p class="display mt-2 text-2xl font-extrabold leading-tight">${esc(b.name)}</p>
        <p class="mt-1 text-sm text-ink/55">${esc(b.weightKg)}kg · ${esc(b.origin)} · ${esc(b.category)}</p>
        <p class="mt-4 flex items-baseline gap-2"><span class="display text-3xl font-bold">${naira(b.price)}</span>${off ? `<span class="price-old">${naira(b.oldPrice)}</span>` : ""}</p>
        <div class="mt-6 flex flex-wrap gap-2">
          <button data-promo-add class="btn">${icon("cart", "h-4 w-4")} Add to cart</button>
          <a href="bale.html?slug=${encodeURIComponent(b.slug)}" class="btn-ghost">View bale</a>
        </div>
        <button data-promo-close class="mt-4 text-sm text-ink/50 underline hover:text-ink">No thanks</button>
      </div></div>`;
    const close = () => { wrap.remove(); document.body.style.overflow = ""; };
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-promo-close]")) return close();
      if (e.target.closest("[data-promo-add]")) { addToCart(b._id, 1); close(); toast(`${esc(b.name)} added`, { action: { label: "View cart", href: "cart.html" } }); }
    });
    addEventListener("keydown", (e) => { if (e.key === "Escape") close(); }, { once: true });
    document.body.append(wrap); document.body.style.overflow = "hidden";
  }, 5000);
}

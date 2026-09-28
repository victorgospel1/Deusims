import { client, api, getSettings } from "../core.js";
import { SITE } from "../config.js";
import { logoMark, icon } from "../icons.js";

const KEY = "bale_admin_token";
export const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t) => localStorage.setItem(KEY, t);
const clearToken = () => localStorage.removeItem(KEY);

// Absolute URLs built from this file's location: work on any host, with or without ".html" in the address
export const ADMIN = (page = "") => new URL(`../../admin/${page}`, import.meta.url).href;
const toLogin = () => { clearToken(); location.replace(ADMIN("login.html")); };

/** Call at the top of every admin page. Returns the session token or redirects to login. */
export async function requireAdmin() {
  const token = getToken();
  if (!token) return toLogin(), new Promise(() => {});
  const ok = await client.query(api.auth.check, { token }).catch(() => false);
  if (!ok) return toLogin(), new Promise(() => {});
  await getSettings().catch(() => {}); // business name for the sidebar
  mountAdminHeader(token);
  return token;
}

/** Any "Unauthorized" error from Convex sends the admin back to login. */
export function handleAuthError(err) {
  if (String(err?.message ?? err).includes("Unauthorized")) toLogin();
  else console.error(err);
}

const NAV = [
  ["index.html", "Dashboard", "grid"],
  ["orders.html", "Orders", "cart"],
  ["products.html", "Inventory", "box"],
  ["customers.html", "Customers", "star"],
  ["website.html", "Website", "globe"],
  ["settings.html", "Settings", "filter"],
];

const here = () => (location.pathname.split("/").filter(Boolean).pop() ?? "index").replace(".html", "").replace(/^admin$/, "index");

/** Dashboard shell: dark sidebar + top bar. Page content stays in <main>. */
function mountAdminHeader(token) {
  const el = document.getElementById("admin-header");
  if (!el) return;
  const title = document.title.split("|")[0].trim();
  document.body.classList.add("lg:pl-64");

  const side = document.createElement("aside");
  side.id = "admin-side";
  side.className = "fixed inset-y-0 left-0 z-50 flex w-64 -translate-x-full flex-col bg-ink text-white transition-transform duration-300 lg:translate-x-0";
  side.innerHTML = `
    <a href="${ADMIN("index.html")}" class="flex items-center gap-3 px-5 py-5">${logoMark("h-9 w-9 shrink-0")}
      <span class="min-w-0"><span class="block truncate font-extrabold">${SITE.name}</span><span class="block text-xs text-white/45">Admin</span></span></a>
    <nav class="flex-1 space-y-1 px-3 py-2" aria-label="Admin">
      ${NAV.map(([h, l, ic]) => { const on = here() === h.replace(".html", "");
        return `<a href="${ADMIN(h)}" class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${on ? "bg-brand text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}">
          ${icon(ic, "h-5 w-5")}<span class="flex-1">${l}</span>${h === "orders.html" ? `<span data-order-badge class="hidden rounded-md bg-white px-1.5 text-xs font-bold text-ink"></span>` : ""}</a>`; }).join("")}
    </nav>
    <div class="space-y-1 border-t border-white/10 p-3">
      <a href="${new URL("../../index.html", import.meta.url).href}" target="_blank" class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">${icon("arrow", "h-5 w-5")} View website</a>
      <button id="logout" class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white">${icon("close", "h-5 w-5")} Sign out</button>
    </div>`;
  const scrim = document.createElement("div");
  scrim.className = "scrim lg:hidden";
  document.body.append(side, scrim);

  el.innerHTML = `<header class="sticky top-0 z-30 border-b border-ink/10 bg-white/95 backdrop-blur">
    <div class="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <div class="flex items-center gap-3">
        <button id="side-open" class="grid h-10 w-10 place-items-center rounded-lg hover:bg-sack lg:hidden" aria-label="Open menu">${icon("menu")}</button>
        <h1 class="text-lg font-extrabold sm:text-xl">${title}</h1>
      </div>
      <div class="flex items-center gap-2">
        <a href="${ADMIN("product.html")}" class="btn hidden px-4 py-2 text-sm sm:inline-flex">${icon("plus", "h-4 w-4")} Add bale</a>
        <span class="grid h-10 w-10 place-items-center rounded-full bg-brand-soft font-extrabold text-brand-dark" title="Signed in as admin">A</span>
      </div>
    </div>
  </header>`;

  const setSide = (open) => { side.classList.toggle("-translate-x-full", !open); scrim.classList.toggle("open", open); };
  document.getElementById("side-open").onclick = () => setSide(true);
  scrim.onclick = () => setSide(false);
  document.getElementById("logout").onclick = async () => {
    await client.mutation(api.auth.logout, { token }).catch(() => {});
    toLogin();
  };
  // Live badge: orders that need action (waiting for payment + to pack/send)
  client.onUpdate(api.orders.stats, { token }, (st) => {
    const n = st.toFulfil;
    const b = document.querySelector("[data-order-badge]");
    if (b) { b.textContent = n; b.classList.toggle("hidden", !n); }
  }, () => {});
}

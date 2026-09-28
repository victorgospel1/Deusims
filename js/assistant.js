// Side AI shopping assistant — a panel that slides in from the right.
import { client, api, esc } from "./core.js";
import { icon } from "./icons.js";
import { SITE } from "./config.js";

const KEY = "bale_assistant_v1";
const SUGGESTIONS = ["Which bale is best for a new shop?", "What's your cheapest bale?", "How much is delivery to Abuja?", "Difference between Cream and Grade A?"];
let messages = [];
try { messages = JSON.parse(sessionStorage.getItem(KEY)) ?? []; } catch {}
const persist = () => { try { sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-20))); } catch {} };

/** Safe mini-markdown: escape everything, then allow **bold**, bullets and links to our own pages or WhatsApp. */
function format(text) {
  let h = esc(text);
  h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const ok = /^(bale|shop|cart|faq|contact|track)\.html/.test(url) || /^https:\/\/wa\.me\//.test(url);
    return ok ? `<a href="${url}" class="font-semibold text-brand underline">${label}</a>` : label;
  });
  return h.replace(/\n/g, "<br>");
}

const bubble = (m) => m.role === "user"
  ? `<div class="flex justify-end"><div class="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-sm text-white">${esc(m.content)}</div></div>`
  : `<div class="flex gap-2"><span class="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-white">${icon("star", "h-3.5 w-3.5")}</span>
      <div class="max-w-[85%] rounded-2xl rounded-bl-md bg-wrap px-4 py-2.5 text-sm leading-relaxed">${format(m.content)}</div></div>`;

export function mountAssistant() {
  const tab = document.createElement("button");
  tab.className = "fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 items-center gap-2 rounded-l-xl bg-ink px-2.5 py-4 text-sm font-bold text-white shadow-lift transition hover:bg-brand sm:flex [writing-mode:vertical-rl]";
  tab.innerHTML = `<span class="rotate-180">${icon("star", "h-4 w-4 rotate-90")}</span><span class="rotate-180">Ask our assistant</span>`;
  tab.setAttribute("aria-label", "Open shopping assistant");

  const fab = document.createElement("button");
  fab.className = "hidden";
  fab.innerHTML = icon("star", "h-6 w-6");
  fab.setAttribute("aria-label", "Open shopping assistant");

  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const panel = document.createElement("aside");
  panel.className = "drawer flex max-w-md flex-col";
  panel.setAttribute("aria-label", "Shopping assistant");
  panel.innerHTML = `
    <div class="flex items-center justify-between border-b border-sack px-5 py-4">
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-full bg-brand text-white">${icon("star", "h-5 w-5")}</span>
        <div><p class="font-extrabold">Shopping assistant</p><p class="text-xs text-ink/50">AI · answers from our live stock</p></div>
      </div>
      <div class="flex gap-1">
        <button data-clear class="rounded-lg px-2 py-1 text-xs font-semibold text-ink/50 hover:bg-sack" title="Start over">Clear</button>
        <button data-close class="grid h-9 w-9 place-items-center rounded-lg hover:bg-sack" aria-label="Close assistant">${icon("close")}</button>
      </div>
    </div>
    <div data-log class="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite"></div>
    <form data-form class="border-t border-sack p-4">
      <div class="flex gap-2">
        <input name="q" maxlength="500" autocomplete="off" placeholder="Ask about bales, grades, delivery…" class="field">
        <button class="btn shrink-0 px-4" aria-label="Send">${icon("arrow", "h-5 w-5")}</button>
      </div>
      <p class="mt-2 text-center text-[11px] text-ink/40">The assistant can make mistakes. Confirm big orders with us on WhatsApp.</p>
    </form>`;
  document.body.append(tab, fab, scrim, panel);

  const log = panel.querySelector("[data-log]");
  const form = panel.querySelector("[data-form]");
  let busy = false;

  const render = (thinking = false) => {
    log.innerHTML = (messages.length ? "" : `
      <div class="rounded-xl bg-brand-soft p-4 text-sm"><p class="font-bold">Hi! I can help you choose bales at ${esc(SITE.name)}.</p><p class="mt-1 text-ink/70">Ask about stock, grades, prices, delivery or payment.</p></div>
      <div class="flex flex-wrap gap-2">${SUGGESTIONS.map((s) => `<button data-suggest class="rounded-lg border border-strap bg-white px-3 py-2 text-left text-sm font-semibold hover:border-ink">${esc(s)}</button>`).join("")}</div>`)
      + messages.map(bubble).join("")
      + (thinking ? `<div class="flex gap-2"><span class="grid h-7 w-7 place-items-center rounded-full bg-brand text-white">${icon("star", "h-3.5 w-3.5")}</span><div class="flex gap-1 rounded-2xl bg-wrap px-4 py-3">${[0, 1, 2].map((i) => `<span class="h-2 w-2 animate-bounce rounded-full bg-ink/40" style="animation-delay:${i * 120}ms"></span>`).join("")}</div></div>` : "");
    log.scrollTop = log.scrollHeight;
  };

  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true;
    messages.push({ role: "user", content: text });
    render(true);
    try {
      const res = await client.action(api.assistant.chat, { messages: messages.slice(-10) });
      messages.push({ role: "assistant", content: res.reply || "Sorry, I couldn't answer that. Please message us on WhatsApp." });
    } catch {
      messages.push({ role: "assistant", content: "I can't connect right now. Please message us on WhatsApp and we'll help you directly." });
    }
    persist(); busy = false; render();
  }

  const open = (v) => {
    panel.classList.toggle("open", v); scrim.classList.toggle("open", v);
    document.body.style.overflow = v ? "hidden" : "";
    if (v) { render(); setTimeout(() => form.q.focus(), 300); }
  };
  tab.onclick = fab.onclick = () => open(true);
  scrim.onclick = () => open(false);
  panel.querySelector("[data-close]").onclick = () => open(false);
  panel.querySelector("[data-clear]").onclick = () => { messages = []; persist(); render(); };
  addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) open(false); });
  form.onsubmit = (e) => { e.preventDefault(); const q = form.q.value; form.q.value = ""; ask(q); };
  log.addEventListener("click", (e) => { const s = e.target.closest("[data-suggest]"); if (s) ask(s.textContent); });
  document.addEventListener("click", (e) => { if (e.target.closest("[data-open-assistant]")) { e.preventDefault(); open(true); } });
}

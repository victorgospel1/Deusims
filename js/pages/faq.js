import { mountLayout } from "../layout.js";
import { esc } from "../core.js";
import { CONTENT } from "../config.js";
import { reveal } from "../ui.js";

await mountLayout();
document.getElementById("faq").innerHTML = CONTENT.faq.map(({ q, a }) => `
  <details class="card reveal group p-5 open:shadow-lift">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">${esc(q)}<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-xl text-brand transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary>
    <p class="mt-3 whitespace-pre-line leading-relaxed text-ink/70">${esc(a)}</p>
  </details>`).join("");
reveal();

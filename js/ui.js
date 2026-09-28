import { icon } from "./icons.js";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fade-up elements with .reveal as they scroll into view. Safe to call repeatedly. */
let observer;
export function reveal(root = document) {
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); observer.unobserve(e.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  root.querySelectorAll(".reveal:not(.in)").forEach((el, i) => {
    if (reduced) return el.classList.add("in");
    el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
    observer.observe(el);
  });
}

/** Small toast in the bottom-left. */
export function toast(message, { action } = {}) {
  let wrap = document.getElementById("toasts");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "toasts";
    wrap.className = "fixed bottom-5 left-5 right-5 z-[60] flex flex-col items-start gap-2 sm:right-auto";
    wrap.setAttribute("aria-live", "polite");
    document.body.append(wrap);
  }
  const el = document.createElement("div");
  el.className = "flex animate-toast items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-lift";
  el.innerHTML = `<span class="grid h-7 w-7 place-items-center rounded-full bg-brand">${icon("check", "h-4 w-4")}</span>
    <span>${message}</span>${action ? `<a href="${action.href}" class="ml-2 rounded-full bg-white/10 px-3 py-1 hover:bg-white/20">${action.label}</a>` : ""}`;
  wrap.append(el);
  setTimeout(() => { el.style.transition = "opacity .4s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 400); }, 3200);
}

/** Crossfade slideshow with autoplay, arrows, progress dots, swipe and pause-on-hover. */
export function slideshow(root, { interval = 6000 } = {}) {
  const slides = [...root.querySelectorAll(".slide")];
  const dots = [...root.querySelectorAll("[data-dot]")];
  if (slides.length < 2) { slides[0]?.classList.add("active"); return; }
  root.style.setProperty("--slide-ms", `${interval}ms`);
  let i = 0, timer = null, paused = false;

  const go = (n) => {
    slides[i].classList.remove("active"); slides[i].setAttribute("aria-hidden", "true");
    dots[i]?.classList.remove("active"); dots[i]?.removeAttribute("aria-current");
    i = (n + slides.length) % slides.length;
    slides[i].classList.add("active"); slides[i].removeAttribute("aria-hidden");
    const d = dots[i];
    if (d) { d.classList.remove("active"); void d.offsetWidth; d.classList.add("active"); d.setAttribute("aria-current", "true"); }
    schedule();
  };
  const schedule = () => { clearTimeout(timer); if (!paused && !reduced) timer = setTimeout(() => go(i + 1), interval); };

  root.querySelector("[data-prev]")?.addEventListener("click", () => go(i - 1));
  root.querySelector("[data-next]")?.addEventListener("click", () => go(i + 1));
  dots.forEach((d, n) => d.addEventListener("click", () => go(n)));
  root.addEventListener("mouseenter", () => { paused = true; root.classList.add("paused"); clearTimeout(timer); });
  root.addEventListener("mouseleave", () => { paused = false; root.classList.remove("paused"); schedule(); });
  root.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(i - 1); if (e.key === "ArrowRight") go(i + 1); });

  let x0 = null;
  root.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  root.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) go(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? clearTimeout(timer) : schedule()));

  slides.forEach((s, n) => n && s.setAttribute("aria-hidden", "true"));
  slides[0].classList.add("active");
  dots[0]?.classList.add("active");
  schedule();
  return { go };
}

/** Bump animation (cart badge). */
export function bump(el) {
  if (!el) return;
  el.classList.remove("animate-bump"); void el.offsetWidth; el.classList.add("animate-bump");
}

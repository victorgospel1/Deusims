// Website editor: change what customers see without touching code. Saved in Convex; the site updates live.
import { client, api, esc, getSettings, uploadTo, errMsg } from "../core.js";
import { SITE, CONTENT } from "../config.js";
import { requireAdmin, handleAuthError } from "./common.js";
import { icon } from "../icons.js";
import { toast } from "../ui.js";

const token = await requireAdmin();
const root = document.getElementById("website-root");
await getSettings();

const state = {
  business: { name: SITE.name, tagline: SITE.tagline, phone: SITE.phone, email: SITE.email, hours: SITE.hours, city: SITE.city },
  announcement: CONTENT.announcement,
  slides: CONTENT.heroSlides.map((s) => ({ ...s })),
  about: { ...CONTENT.about },
  faq: CONTENT.faq.map((f) => ({ ...f })),
  socials: { instagram: "", facebook: "", tiktok: "", ...CONTENT.socials },
  deals: { title: CONTENT.deals?.title ?? "Deals of the week", endsAt: CONTENT.deals?.endsAt ?? null },
};
const toLocalInput = (ms) => (ms ? new Date(ms - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : "");
const LINKS = [["shop.html", "Shop (all bales)"], ["shop.html?instock=1", "Shop: in stock only"], ["shop.html?grade=cream", "Shop: Cream grade"], ["faq.html", "FAQ"], ["about.html", "About"], ["contact.html", "Contact"]];

const label = "mb-1 block text-sm font-semibold text-ink/70";
const section = (id, title, sub, body) => `<section class="card p-5 sm:p-6" id="sec-${id}">
  <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-lg font-extrabold">${title}</h2><p class="text-sm text-ink/55">${sub}</p></div>
  <button data-save="${id}" class="btn px-4 py-2 text-sm">Save</button></div>
  <div class="mt-5">${body}</div></section>`;
const input = (name, value, ph = "", type = "text") => `<input data-f="${name}" type="${type}" value="${esc(value ?? "")}" placeholder="${esc(ph)}" class="field">`;

function slideCard(s, i) {
  return `<div class="rounded-xl border border-sack p-4" data-slide="${i}">
    <div class="grid gap-4 md:grid-cols-[220px_1fr]">
      <div>
        <div class="relative aspect-[16/10] overflow-hidden rounded-lg bg-sack">${s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="" class="h-full w-full object-cover">` : ""}
          ${s.uploading ? `<div class="absolute inset-0 grid place-items-center bg-white/70 text-sm font-bold">Uploading…</div>` : ""}</div>
        <label class="btn-ghost mt-2 w-full cursor-pointer py-2 text-sm">Change photo<input type="file" accept="image/*" data-slide-img="${i}" class="sr-only"></label>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div><label class="${label}">Small line above title</label><input data-s="tag" data-i="${i}" value="${esc(s.tag)}" class="field"></div>
        <div><label class="${label}">Button text</label><input data-s="ctaLabel" data-i="${i}" value="${esc(s.ctaLabel)}" class="field"></div>
        <div class="sm:col-span-2"><label class="${label}">Title</label><input data-s="title" data-i="${i}" value="${esc(s.title)}" class="field"></div>
        <div class="sm:col-span-2"><label class="${label}">Text</label><textarea data-s="text" data-i="${i}" rows="2" class="field">${esc(s.text)}</textarea></div>
        <div class="sm:col-span-2"><label class="${label}">Button goes to</label><select data-s="ctaHref" data-i="${i}" class="field">
          ${LINKS.map(([v, l]) => `<option value="${v}" ${s.ctaHref === v ? "selected" : ""}>${l}</option>`).join("")}
          ${LINKS.some(([v]) => v === s.ctaHref) ? "" : `<option value="${esc(s.ctaHref)}" selected>${esc(s.ctaHref)}</option>`}</select></div>
      </div>
    </div>
    <div class="mt-3 flex flex-wrap justify-end gap-2 text-sm">
      <button data-move="-1" data-i="${i}" ${i === 0 ? "disabled" : ""} class="rounded-lg px-3 py-1.5 font-semibold hover:bg-sack disabled:opacity-30">Move up</button>
      <button data-move="1" data-i="${i}" ${i === state.slides.length - 1 ? "disabled" : ""} class="rounded-lg px-3 py-1.5 font-semibold hover:bg-sack disabled:opacity-30">Move down</button>
      <button data-del-slide="${i}" ${state.slides.length <= 1 ? "disabled" : ""} class="rounded-lg px-3 py-1.5 font-semibold text-stop hover:bg-stop/10 disabled:opacity-30">Delete slide</button>
    </div>
  </div>`;
}

function render() {
  root.innerHTML = `<div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-soft p-4 text-sm">
      <p>Changes go live on the website as soon as you press <strong>Save</strong> on a section.</p>
      <a href="${new URL("../../index.html", import.meta.url).href}" target="_blank" class="btn-dark px-4 py-2 text-sm">Open website</a>
    </div>
    ${section("business", "Business details", "Shown in the header, footer, contact page and receipts.", `<div class="grid gap-4 sm:grid-cols-2">
      <div><label class="${label}">Business name</label>${input("business.name", state.business.name)}</div>
      <div><label class="${label}">City</label>${input("business.city", state.business.city)}</div>
      <div class="sm:col-span-2"><label class="${label}">Short description (footer)</label>${input("business.tagline", state.business.tagline)}</div>
      <div><label class="${label}">Phone</label>${input("business.phone", state.business.phone, "+234 …", "tel")}</div>
      <div><label class="${label}">Email</label>${input("business.email", state.business.email, "", "email")}</div>
      <div class="sm:col-span-2"><label class="${label}">Opening hours</label>${input("business.hours", state.business.hours, "Mon – Sat, 8am – 6pm")}</div>
    </div>`)}
    ${section("deals", "Deals section", "Bales with an original price (set in Inventory → Edit) appear in the Deals row on the home page. Set a title and an optional end time for the countdown.", `<div class="grid gap-4 sm:grid-cols-2">
      <div><label class="${label}">Title</label>${input("deals.title", state.deals.title, "Deals of the week")}</div>
      <div><label class="${label}">Countdown ends (optional)</label><input data-deals-end type="datetime-local" value="${toLocalInput(state.deals.endsAt)}" class="field"></div>
    </div>`)}
    ${section("slides", "Homepage slideshow", "The big photos at the top of the home page. Use wide photos of your bales or warehouse.", `
      <div class="space-y-4">${state.slides.map(slideCard).join("")}</div>
      <button data-add-slide ${state.slides.length >= 8 ? "disabled" : ""} class="btn-ghost mt-4 py-2 text-sm">${icon("plus", "h-4 w-4")} Add a slide</button>`)}
    ${section("about", "About page", "Your story, shown on the About page.", `<div class="grid gap-4 md:grid-cols-[220px_1fr]">
      <div><div class="relative aspect-[4/3] overflow-hidden rounded-lg bg-sack">${state.about.imageUrl ? `<img src="${esc(state.about.imageUrl)}" alt="" class="h-full w-full object-cover">` : ""}
        ${state.about.uploading ? `<div class="absolute inset-0 grid place-items-center bg-white/70 text-sm font-bold">Uploading…</div>` : ""}</div>
        <label class="btn-ghost mt-2 w-full cursor-pointer py-2 text-sm">Change photo<input type="file" accept="image/*" data-about-img class="sr-only"></label></div>
      <div class="space-y-4"><div><label class="${label}">Heading</label>${input("about.title", state.about.title)}</div>
        <div><label class="${label}">Text (leave an empty line between paragraphs)</label><textarea data-f="about.body" rows="8" class="field">${esc(state.about.body)}</textarea></div></div>
    </div>`)}
    ${section("faq", "FAQ", "Questions and answers on the FAQ page.", `<div class="space-y-3">${state.faq.map((f, i) => `<div class="rounded-xl border border-sack p-4">
        <div class="flex gap-2"><input data-q="${i}" value="${esc(f.q)}" placeholder="Question" class="field font-semibold">
        <button data-del-faq="${i}" class="shrink-0 rounded-lg px-3 text-sm font-semibold text-stop hover:bg-stop/10">Remove</button></div>
        <textarea data-a="${i}" rows="2" placeholder="Answer" class="field mt-2">${esc(f.a)}</textarea></div>`).join("")}</div>
      <button data-add-faq class="btn-ghost mt-4 py-2 text-sm">${icon("plus", "h-4 w-4")} Add a question</button>`)}
    ${section("socials", "Social media", "Links shown in the footer. Leave empty to hide.", `<div class="grid gap-4 sm:grid-cols-3">
      <div><label class="${label}">Instagram link</label>${input("socials.instagram", state.socials.instagram, "https://instagram.com/…", "url")}</div>
      <div><label class="${label}">Facebook link</label>${input("socials.facebook", state.socials.facebook, "https://facebook.com/…", "url")}</div>
      <div><label class="${label}">TikTok link</label>${input("socials.tiktok", state.socials.tiktok, "https://tiktok.com/@…", "url")}</div>
    </div>`)}
  </div>`;
}

// Keep state in sync with what's typed
root.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.f) { const [a, b] = t.dataset.f.split("."); if (b) state[a][b] = t.value; else state[a] = t.value; }
  if (t.dataset.s) state.slides[Number(t.dataset.i)][t.dataset.s] = t.value;
  if (t.dataset.q !== undefined) state.faq[Number(t.dataset.q)].q = t.value;
  if (t.dataset.a !== undefined) state.faq[Number(t.dataset.a)].a = t.value;
});
root.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.dataset.s) state.slides[Number(t.dataset.i)][t.dataset.s] = t.value;
  if (t.hasAttribute("data-deals-end")) state.deals.endsAt = t.value ? new Date(t.value).getTime() : null;
  const file = t.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) return toast("Use a photo under 8MB");
  const target = t.hasAttribute("data-about-img") ? state.about : state.slides[Number(t.dataset.slideImg)];
  target.uploading = true; target.imageUrl = URL.createObjectURL(file); render();
  try {
    const url = await client.mutation(api.settings.generateUploadUrl, { token });
    target.imageId = await uploadTo(url, file);
    toast("Photo uploaded. Press Save to publish it.");
  } catch (err) { handleAuthError(err); toast(esc(errMsg(err, "Upload failed"))); }
  target.uploading = false; render();
});

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && k !== "uploading"));
const payload = {
  business: () => ({ business: state.business }),
  announcement: () => ({ announcement: state.announcement.trim() }),
  slides: () => ({ heroSlides: state.slides.map((s) => clean({
    imageId: s.imageId, imageUrl: s.imageId ? undefined : s.imageUrl, tag: s.tag ?? "", title: s.title ?? "", text: s.text ?? "", ctaLabel: s.ctaLabel ?? "", ctaHref: s.ctaHref || "shop.html",
  })) }),
  about: () => ({ about: clean({ title: state.about.title, body: state.about.body, imageId: state.about.imageId, imageUrl: state.about.imageId ? undefined : state.about.imageUrl }) }),
  faq: () => ({ faq: state.faq.filter((f) => f.q.trim() && f.a.trim()) }),
  socials: () => ({ socials: state.socials }),
  deals: () => ({ deals: state.deals.endsAt ? { title: state.deals.title || "Deals", endsAt: state.deals.endsAt } : { title: state.deals.title || "Deals" } }),
};

root.addEventListener("click", async (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.save) {
    if (t.dataset.save === "slides" && state.slides.some((s) => !s.title.trim() || !s.imageUrl)) return toast("Every slide needs a photo and a title");
    if (state.slides.some((s) => s.uploading) || state.about.uploading) return toast("Wait for the photo to finish uploading");
    t.disabled = true; t.textContent = "Saving…";
    try { await client.mutation(api.settings.updateContent, { token, ...payload[t.dataset.save]() }); toast("Saved. The website is updated."); }
    catch (err) { handleAuthError(err); toast(esc(errMsg(err, "Couldn't save"))); }
    t.disabled = false; t.textContent = "Save";
    return;
  }
  if (t.hasAttribute("data-add-slide")) state.slides.push({ imageUrl: "", tag: "", title: "", text: "", ctaLabel: "Shop bales", ctaHref: "shop.html" });
  else if (t.dataset.delSlide) state.slides.splice(Number(t.dataset.delSlide), 1);
  else if (t.dataset.move) { const i = Number(t.dataset.i), j = i + Number(t.dataset.move); [state.slides[i], state.slides[j]] = [state.slides[j], state.slides[i]]; }
  else if (t.hasAttribute("data-add-faq")) state.faq.push({ q: "", a: "" });
  else if (t.dataset.delFaq) state.faq.splice(Number(t.dataset.delFaq), 1);
  else return;
  render();
});

render();

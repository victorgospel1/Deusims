import { client, api, esc, params, uploadTo, errMsg } from "../core.js";
import { GRADES } from "../config.js";
import { requireAdmin, handleAuthError, ADMIN } from "./common.js";
import { icon } from "../icons.js";

const token = await requireAdmin();
const root = document.getElementById("form-root");
const id = params().get("id");

// ⚠️ Adjust these suggestion lists to what your dad actually stocks
const CATEGORIES = ["Ladies' tops", "Men's shirts", "Jeans", "Trousers", "Gowns", "Children's wear", "Jackets", "Bedsheets", "Shoes", "Bags", "Mixed"];
const ORIGINS = ["UK", "USA", "Canada", "Korea", "Germany", "Belgium", "China"];

let p = null;
if (id) {
  p = await client.query(api.products.adminGet, { token, id }).catch((e) => { handleAuthError(e); return null; });
  if (!p) {
    root.innerHTML = `<p class="text-lg font-semibold">Bale not found.</p><a href="${ADMIN()}products.html" class="btn mt-4">Back to bales</a>`;
    throw new Error("not found");
  }
}

let images = p ? p.imageIds.map((sid, i) => ({ id: sid, url: p.images[i] })).filter((m) => m.url) : [];
let video = p?.videoId && p.video ? { id: p.videoId, url: p.video } : null;
let uploading = false;

const label = "mb-1.5 block text-sm font-semibold text-ink/70";
const v = (x) => esc(x ?? "");

const card = (title, sub, body) => `<section class="card p-5 sm:p-6"><h3 class="font-extrabold">${title}</h3>${sub ? `<p class="text-sm text-ink/55">${sub}</p>` : ""}<div class="mt-4">${body}</div></section>`;
root.innerHTML = `<form id="pf">
  <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div><a href="${ADMIN()}products.html" class="text-sm font-semibold text-ink/55 hover:text-brand">← Inventory</a>
      <h2 class="text-2xl font-extrabold">${p ? esc(p.name) : "Add a bale"}</h2></div>
    ${p ? `<button type="button" id="delete" class="rounded-lg px-3 py-2 text-sm font-semibold text-stop hover:bg-stop/10">Delete bale</button>` : ""}
  </div>
  <div class="grid gap-5 lg:grid-cols-[1fr_360px]">
    <div class="space-y-5">
      ${card("Bale details", "What customers see on the shop and bale page.", `<div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2"><label class="${label}" for="name">Bale name</label><input id="name" name="name" required value="${v(p?.name)}" placeholder="e.g. Ladies' chiffon tops" class="field"></div>
        <div><label class="${label}" for="category">Category</label><input id="category" name="category" list="cats" required value="${v(p?.category)}" placeholder="Pick or type a new one" class="field">
          <datalist id="cats">${CATEGORIES.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
        <div><label class="${label}" for="grade">Grade</label><select id="grade" name="grade" class="field">
          ${Object.entries(GRADES).map(([g, x]) => `<option value="${g}" ${(p?.grade ?? "A") === g ? "selected" : ""}>${x.label}</option>`).join("")}</select></div>
        <div><label class="${label}" for="weightKg">Weight (kg)</label><input id="weightKg" name="weightKg" type="number" min="1" step="0.5" required value="${v(p?.weightKg ?? 45)}" class="field"></div>
        <div><label class="${label}" for="origin">Origin</label><input id="origin" name="origin" list="origins" required value="${v(p?.origin ?? "UK")}" class="field">
          <datalist id="origins">${ORIGINS.map((o) => `<option value="${o}">`).join("")}</datalist></div>
        <div class="sm:col-span-2"><label class="${label}" for="pieceCount">Approx. pieces (optional)</label><input id="pieceCount" name="pieceCount" value="${v(p?.pieceCount)}" placeholder="e.g. 220–260" class="field"></div>
        <div class="sm:col-span-2"><label class="${label}" for="description">Description</label><textarea id="description" name="description" rows="5" placeholder="What's inside, sizes, condition, colours…" class="field">${v(p?.description)}</textarea></div>
      </div>`)}
      ${card("Photos", "The photo marked Main is the one shown on the shop. Tap “Make main” on your best photo. Up to 10MB each.", `<div id="images" class="grid grid-cols-3 gap-3 sm:grid-cols-4"></div>`)}
      ${card("Opening video", "Optional. A short video of the bale being opened builds trust.", `<div id="video"></div>`)}
    </div>
    <div class="space-y-5">
      ${card("Price and stock", "", `<div class="space-y-4">
        <div><label class="${label}" for="price">Selling price per bale (₦)</label><input id="price" name="price" type="number" min="0" required value="${v(p?.price)}" class="field text-lg font-bold"></div>
        <div><label class="${label}" for="oldPrice">Original price (₦), optional</label><input id="oldPrice" name="oldPrice" type="number" min="0" value="${v(p?.oldPrice)}" placeholder="Leave empty if not on sale" class="field">
          <p class="mt-1 text-xs text-ink/50">Put a higher "was" price to show a discount badge and list this bale under Deals.</p></div>
        <div><label class="${label}" for="stock">Bales in stock</label><input id="stock" name="stock" type="number" min="0" required value="${v(p?.stock ?? 1)}" class="field"></div>
        <label class="flex cursor-pointer items-center justify-between rounded-lg bg-wrap p-3 text-sm font-semibold">Show "New" badge<input type="checkbox" name="isNewArrival" ${(p?.isNewArrival ?? true) ? "checked" : ""} class="h-5 w-5 accent-[#f26b1d]"></label>
      </div>`)}
      <div class="card sticky top-24 space-y-3 p-5">
        <p id="error" class="hidden rounded-lg bg-stop/10 px-3 py-2 text-sm font-semibold text-stop" role="alert"></p>
        <button id="save" class="btn w-full py-3.5">${p ? "Save changes" : "Add bale to shop"}</button>
        <a href="${ADMIN()}products.html" class="btn-ghost w-full">Cancel</a>
        ${p ? `<a href="${new URL(`../../bale.html?slug=${encodeURIComponent(p.slug)}`, import.meta.url).href}" target="_blank" class="block text-center text-sm font-semibold text-ink/55 hover:text-brand">View on website</a>` : ""}
      </div>
    </div>
  </div>
</form>`;

const $err = document.getElementById("error");
const showError = (m) => { $err.textContent = m; $err.classList.toggle("hidden", !m); };

function renderMedia() {
  document.getElementById("images").innerHTML = images.map((m, i) => `
    <div class="group relative aspect-[4/5] overflow-hidden rounded-lg bg-sack ${i === 0 ? "ring-2 ring-brand" : ""}">
      <img src="${esc(m.url)}" alt="" class="h-full w-full object-cover">
      ${i === 0 ? `<span class="absolute left-2 top-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">Main</span>` : ""}
      <div class="absolute inset-x-0 bottom-0 flex gap-1 bg-gradient-to-t from-ink/80 to-transparent p-2 pt-6">
        ${i !== 0 ? `<button type="button" data-first="${i}" class="flex-1 rounded bg-white/90 py-1 text-[11px] font-bold text-ink hover:bg-white">Make main</button>` : ""}
        <button type="button" data-drop="${i}" class="flex-1 rounded bg-white/90 py-1 text-[11px] font-bold text-stop hover:bg-white">Remove</button>
      </div>
    </div>`).join("") + `
    <label class="grid aspect-[4/5] cursor-pointer place-items-center rounded-lg border-2 border-dashed border-strap text-center text-sm font-semibold text-ink/55 transition hover:border-brand hover:text-brand">
      <span>${uploading ? "Uploading…" : `${icon("plus", "mx-auto h-6 w-6")}Add photos`}</span>
      <input id="img-input" type="file" accept="image/*" multiple class="sr-only" ${uploading ? "disabled" : ""}>
    </label>`;
  document.getElementById("video").innerHTML = video
    ? `<div class="flex flex-wrap items-end gap-3"><video src="${esc(video.url)}" class="h-44 rounded-lg bg-ink" controls></video><button type="button" id="drop-video" class="rounded-lg px-3 py-2 text-sm font-semibold text-stop hover:bg-stop/10">Remove video</button></div>`
    : `<label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-strap p-6 text-sm font-semibold text-ink/55 transition hover:border-brand hover:text-brand">
        ${icon("video", "h-5 w-5")} ${uploading ? "Uploading…" : "Upload a video (up to 100MB)"}
        <input id="video-input" type="file" accept="video/*" class="sr-only" ${uploading ? "disabled" : ""}></label>`;
  document.getElementById("save").disabled = uploading;
}
renderMedia();

async function upload(file) {
  const url = await client.mutation(api.products.generateUploadUrl, { token });
  return uploadTo(url, file);
}

const form = document.getElementById("pf");
form.addEventListener("click", (e) => {
  const t = e.target;
  if (t.dataset.first) { const i = Number(t.dataset.first); images = [images[i], ...images.filter((_, j) => j !== i)]; renderMedia(); }
  if (t.dataset.drop) { images = images.filter((_, j) => j !== Number(t.dataset.drop)); renderMedia(); }
  if (t.id === "drop-video") { video = null; renderMedia(); }
});

form.addEventListener("change", async (e) => {
  if (e.target.id === "img-input" && e.target.files.length) {
    const files = [...e.target.files];
    uploading = true; showError(""); renderMedia();
    try {
      for (const f of files) {
        if (f.size > 10 * 1024 * 1024) throw new Error(`${f.name} is over 10MB`);
        images.push({ id: await upload(f), url: URL.createObjectURL(f) });
        renderMedia();
      }
    } catch (err) { handleAuthError(err); showError(err.message || "Upload failed"); }
    uploading = false; renderMedia();
  }
  if (e.target.id === "video-input" && e.target.files[0]) {
    const f = e.target.files[0];
    if (f.size > 100 * 1024 * 1024) return showError("Video must be under 100MB");
    uploading = true; showError(""); renderMedia();
    try { video = { id: await upload(f), url: URL.createObjectURL(f) }; }
    catch (err) { handleAuthError(err); showError("Video upload failed"); }
    uploading = false; renderMedia();
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (uploading) return;
  const f = new FormData(form);
  const btn = document.getElementById("save");
  btn.disabled = true; btn.textContent = "Saving…"; showError("");
  const args = {
    token,
    name: f.get("name").trim(),
    category: f.get("category").trim(),
    grade: f.get("grade"),
    weightKg: Number(f.get("weightKg")),
    origin: f.get("origin").trim(),
    price: Number(f.get("price")),
    stock: Number(f.get("stock")),
    description: f.get("description") ?? "",
    imageIds: images.map((m) => m.id),
    isNewArrival: f.get("isNewArrival") === "on",
  };
  const oldPrice = Number(f.get("oldPrice"));
  if (oldPrice > args.price) args.oldPrice = oldPrice;
  const pieces = f.get("pieceCount").trim();
  if (pieces) args.pieceCount = pieces;
  if (video) args.videoId = video.id;
  if (p) args.id = p._id;
  try {
    await client.mutation(api.products.save, args);
    location.href = ADMIN("products.html");
  } catch (err) {
    handleAuthError(err);
    showError(errMsg(err, "Couldn't save bale"));
    btn.disabled = false; btn.textContent = p ? "Save changes" : "Add bale";
  }
});

document.getElementById("delete")?.addEventListener("click", async () => {
  if (!confirm(`Delete "${p.name}" for good? This removes it from the website.`)) return;
  try { await client.mutation(api.products.remove, { token, id: p._id }); location.href = ADMIN("products.html"); }
  catch (err) { handleAuthError(err); showError(errMsg(err, "Couldn't delete")); }
});

import { CONVEX_URL, applySettings } from "./config.js";

// The site talks to your Convex database. Until js/config.js has your real
// Convex URL, a setup screen explains what to do (run setup.bat).
export const CONFIGURED = /^https:\/\/[a-z0-9-]+\.convex\.cloud\/?$/.test(CONVEX_URL) || /^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(CONVEX_URL);
if (!CONFIGURED) {
  window.__appReady = true;
  document.body.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px;background:#faf7f2;font-family:system-ui,sans-serif;color:#141414">
    <div style="max-width:560px;background:#fff;border:1px solid #e6e0d6;border-radius:20px;padding:28px">
      <p style="margin:0;color:#ff5a1f;font-weight:700;font-size:12px;letter-spacing:.15em;text-transform:uppercase">One-time setup</p>
      <h1 style="margin:8px 0 12px;font-size:26px">Connect your database</h1>
      <p style="margin:0 0 12px;line-height:1.6;color:#555">The shop needs its Convex database before it can show bales and take orders.</p>
      <ol style="line-height:1.8;padding-left:20px;margin:0">
        <li>Close this page and the server window.</li>
        <li>Double-click <b>setup.bat</b> in the site folder (Mac: <b>setup.command</b>) and follow the questions.</li>
        <li>When it finishes, double-click <b>start.bat</b> and open the site again.</li>
      </ol>
      <p style="margin:16px 0 0;font-size:13px;color:#888">Full guide: SETUP.md in the site folder.</p>
    </div></div>`;
  throw new Error("Convex URL not set in js/config.js");
}

// \`convex\` is the global from the CDN browser bundle loaded before this module.
export const client = new window.convex.ConvexClient(CONVEX_URL);
export const api = window.convex.anyApi;
window.__appReady = true; // tells the page watchdog the code loaded

export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const naira = (n) => "₦" + Math.round(n).toLocaleString("en-NG");
export const date = (ms) => new Date(ms).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
export const waLink = (number, text) => `https://wa.me/${String(number).replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
export const params = () => new URLSearchParams(location.search);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Clean up a Convex error for display. */
export const errMsg = (e, fallback = "Something went wrong. Try again.") => {
  const m = e?.data ?? e?.message ?? "";
  const clean = String(m).replace(/^.*Uncaught Error: /s, "").split("\n")[0].replace(/\s+at .*$/, "").trim();
  return clean || fallback;
};

let settingsPromise;
export const getSettings = () =>
  (settingsPromise ??= client.query(api.settings.get, {}).then((s) => { applySettings(s); return s; }));

/** Upload a file to a Convex upload URL, returns the storageId. */
export async function uploadTo(url, file) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
  if (!res.ok) throw new Error("Upload failed");
  return (await res.json()).storageId;
}

/** Drop undefined fields before sending args to Convex. */
export const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

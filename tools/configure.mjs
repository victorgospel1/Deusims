// Connects the website to your Convex database by writing its URL into js/config.js.
// Usage:  node tools/configure.mjs              (reads .env.local written by `npx convex dev`)
//         node tools/configure.mjs https://your-name-123.convex.cloud   (set it by hand)
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const env = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
const val = (name) => (env.match(new RegExp(`^\\s*${name}\\s*=\\s*["']?([^"'\\s#]+)`, "m"))?.[1] ?? "").trim();

let url = process.argv[2] || val("CONVEX_URL") || val("VITE_CONVEX_URL") || val("NEXT_PUBLIC_CONVEX_URL");
const deployment = val("CONVEX_DEPLOYMENT"); // e.g. dev:happy-cat-123  |  local:local-victor-bale
if (!url && /^(dev|prod):/.test(deployment)) url = `https://${deployment.split(":")[1]}.convex.cloud`;
url = url.replace(/\/$/, "");

const ok = /^https:\/\/[a-z0-9-]+\.convex\.cloud$/.test(url) || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url);
if (!ok) {
  console.error("\n✖ Couldn't work out your Convex URL.");
  console.error("  Found in .env.local:", env.trim() ? "\n" + env.trim().split("\n").map((l) => "    " + l).join("\n") : "(file missing or empty)");
  console.error("\n  Fix: run `npx convex dev` (leave it running), then run this again.");
  console.error("  Or pass it directly: node tools/configure.mjs https://YOUR-NAME.convex.cloud");
  console.error("  (Find it in the Convex dashboard → Settings → URL & Deploy Key.)\n");
  process.exit(1);
}
const cfg = readFileSync("js/config.js", "utf8").replace(/export const CONVEX_URL = ".*?";[^\n]*/, `export const CONVEX_URL = "${url}"; // set by setup`);
writeFileSync("js/config.js", cfg);
console.log(`\n✔ Site connected to ${url}`);
if (url.includes("convex.cloud")) {
  console.log(`\n  Paystack webhook URL (Paystack Dashboard → Settings → API Keys & Webhooks):`);
  console.log(`  ${url.replace(".convex.cloud", ".convex.site")}/paystack/webhook\n`);
} else {
  console.log("\n  This is a LOCAL database on your computer: keep `npx convex dev` running while you use the site.");
  console.log("  Customers can't reach it. Before going live, run `npx convex deploy` and connect the cloud URL.\n");
}

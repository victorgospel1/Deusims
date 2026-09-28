import { mountLayout } from "../layout.js";
import { waLink } from "../core.js";

const s = await mountLayout();
document.getElementById("bulk").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const msg = `Hello, I'd like a bulk quote.\nName: ${f.get("name")}\nLocation: ${f.get("location")}\nNumber of bales: ${f.get("qty")}\nWhat I need: ${f.get("what")}`;
  window.open(waLink(s.whatsapp, msg), "_blank", "noopener");
});

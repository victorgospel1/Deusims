import { mountLayout } from "../layout.js";
import { esc } from "../core.js";
import { CONTENT } from "../config.js";
import { reveal } from "../ui.js";

await mountLayout();
const a = CONTENT.about;
document.getElementById("about-img").src = a.imageUrl;
document.getElementById("about-title").textContent = a.title;
document.getElementById("about-body").innerHTML = a.body.split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join("");
reveal();

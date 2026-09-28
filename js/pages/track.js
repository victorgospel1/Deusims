import { mountLayout } from "../layout.js";
import { params } from "../core.js";

mountLayout();
const form = document.getElementById("track-form");
const code = params().get("code");
if (code) form.code.value = code;
form.addEventListener("submit", () => { form.code.value = form.code.value.trim().toUpperCase(); });

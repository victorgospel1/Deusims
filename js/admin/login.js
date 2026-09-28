import { client, api } from "../core.js";
import { getToken, setToken, ADMIN } from "./common.js";
import { logoMark } from "../icons.js";
document.getElementById("logo").innerHTML = logoMark("h-12 w-12");

// Already signed in? Go straight to the dashboard.
const existing = getToken();
if (existing && (await client.query(api.auth.check, { token: existing }).catch(() => false))) location.replace(ADMIN("index.html"));

const form = document.getElementById("login");
const error = document.getElementById("login-error");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button");
  btn.disabled = true; btn.textContent = "Signing in…"; error.classList.add("hidden");
  const res = await client.mutation(api.auth.login, { password: form.password.value }).catch(() => ({ ok: false, error: "Couldn't reach the server. Check your connection." }));
  if (res.ok) { setToken(res.token); location.replace(ADMIN("index.html")); return; }
  error.textContent = res.error; error.classList.remove("hidden");
  btn.disabled = false; btn.textContent = "Sign in";
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** Password is set with: npx convex env set ADMIN_PASSWORD "..." */
export const login = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const now = Date.now();
    const t = await ctx.db.query("loginThrottle").withIndex("by_key", (q) => q.eq("key", "admin")).unique();
    if (t && t.blockedUntil > now) {
      return { ok: false as const, error: "Too many wrong attempts. Wait a minute and try again." };
    }

    const real = process.env.ADMIN_PASSWORD ?? "";
    if (!real) {
      return { ok: false as const, error: 'No admin password set yet. In your project folder run: npx convex env set ADMIN_PASSWORD "your-password"' };
    }
    if (!safeEqual(password, real)) {
      const fresh = !t || now - t.windowStart > 60_000;
      const failures = fresh ? 1 : t!.failures + 1;
      const patch = {
        failures,
        windowStart: fresh ? now : t!.windowStart,
        blockedUntil: failures >= 5 ? now + 60_000 : 0,
      };
      if (t) await ctx.db.patch(t._id, patch);
      else await ctx.db.insert("loginThrottle", { key: "admin", ...patch });
      return { ok: false as const, error: "Wrong password." };
    }

    if (t) await ctx.db.patch(t._id, { failures: 0, blockedUntil: 0 });
    const token = randomToken();
    await ctx.db.insert("adminSessions", { token, expiresAt: now + SESSION_MS });
    return { ok: true as const, token };
  },
});

export const check = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    return !!s && s.expiresAt > Date.now();
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("adminSessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (s) await ctx.db.delete(s._id);
  },
});

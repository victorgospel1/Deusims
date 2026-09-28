import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin, DEFAULT_SETTINGS } from "./lib";

const slide = v.object({
  imageId: v.optional(v.id("_storage")), imageUrl: v.optional(v.string()),
  tag: v.string(), title: v.string(), text: v.string(), ctaLabel: v.string(), ctaHref: v.string(),
});

/** Public: everything the website needs (shop settings + editable content). Image IDs become URLs. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const s = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).unique();
    const base = s ?? DEFAULT_SETTINGS;
    const url = async (id?: string) => (id ? await ctx.storage.getUrl(id as never) : null);
    const heroSlides = s?.heroSlides
      ? await Promise.all(s.heroSlides.map(async (h) => ({ ...h, imageUrl: (await url(h.imageId)) ?? h.imageUrl })))
      : undefined;
    const about = s?.about ? { ...s.about, imageUrl: (await url(s.about.imageId)) ?? s.about.imageUrl } : undefined;
    // Legacy bank fields are never sent to the public site
    const { bankName, accountName, accountNumber, ...rest } = base as typeof base & { bankName?: string; accountName?: string; accountNumber?: string };
    void bankName; void accountName; void accountNumber;
    // Only include content sections that exist (Convex can't return undefined fields)
    return { ...rest, ...(heroSlides ? { heroSlides } : {}), ...(about ? { about } : {}) };
  },
});

/** Shop settings page (delivery, stock threshold, WhatsApp, pickup). */
export const save = mutation({
  args: {
    token: v.string(),
    lowStockAt: v.number(),
    whatsapp: v.string(),
    pickupAddress: v.string(),
    defaultDeliveryFee: v.number(),
    deliveryFees: v.array(v.object({ state: v.string(), fee: v.number() })),
  },
  handler: async (ctx, { token, ...data }) => {
    await assertAdmin(ctx, token);
    const s = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).unique();
    if (s) await ctx.db.patch(s._id, data);
    else await ctx.db.insert("settings", { ...DEFAULT_SETTINGS, ...data, key: "main" });
  },
});

/** Website editor: update any content section. Only the fields passed are changed. */
export const updateContent = mutation({
  args: {
    token: v.string(),
    business: v.optional(v.object({ name: v.string(), tagline: v.string(), phone: v.string(), email: v.string(), hours: v.string(), city: v.string() })),
    announcement: v.optional(v.string()),
    heroSlides: v.optional(v.array(slide)),
    about: v.optional(v.object({ title: v.string(), body: v.string(), imageId: v.optional(v.id("_storage")), imageUrl: v.optional(v.string()) })),
    faq: v.optional(v.array(v.object({ q: v.string(), a: v.string() }))),
    deals: v.optional(v.object({ title: v.string(), endsAt: v.optional(v.number()) })),
    socials: v.optional(v.object({ instagram: v.optional(v.string()), facebook: v.optional(v.string()), tiktok: v.optional(v.string()) })),
  },
  handler: async (ctx, { token, ...patch }) => {
    await assertAdmin(ctx, token);
    if (patch.heroSlides && patch.heroSlides.length > 8) throw new Error("Use 8 slides or fewer");
    const s = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).unique();
    if (s) {
      // Delete uploaded images that are no longer used
      const keep = new Set<string>([
        ...(patch.heroSlides ?? s.heroSlides ?? []).map((h) => h.imageId).filter(Boolean) as string[],
        ...[(patch.about ?? s.about)?.imageId].filter(Boolean) as string[],
      ]);
      const old = [...(s.heroSlides ?? []).map((h) => h.imageId), s.about?.imageId].filter(Boolean) as string[];
      for (const id of old) if (!keep.has(id)) await ctx.storage.delete(id as never).catch(() => {});
      await ctx.db.patch(s._id, patch);
    } else {
      await ctx.db.insert("settings", { ...DEFAULT_SETTINGS, ...patch, key: "main" });
    }
  },
});

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertAdmin(ctx, token);
    return ctx.storage.generateUploadUrl();
  },
});

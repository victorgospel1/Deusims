import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { assertAdmin, withUrls, logStock } from "./lib";
import { grade } from "./schema";

export const list = query({
  args: {
    category: v.optional(v.string()),
    grade: v.optional(v.string()),
    newOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("products")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .order("desc")
      .collect();
    if (args.category) items = items.filter((p) => p.category === args.category);
    if (args.grade) items = items.filter((p) => p.grade === args.grade);
    if (args.newOnly) items = items.filter((p) => p.isNewArrival);
    return Promise.all(items.map((p) => withUrls(ctx, p)));
  },
});

export const categories = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("products")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
    return [...new Set(items.map((p) => p.category))].sort();
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!p || p.archived) return null;
    return withUrls(ctx, p);
  },
});

export const byIds = query({
  args: { ids: v.array(v.id("products")) },
  handler: async (ctx, { ids }) => {
    const docs = await Promise.all(ids.map((id) => ctx.db.get(id)));
    return Promise.all(
      docs.filter((p) => p && !p.archived).map((p) => withUrls(ctx, p!)),
    );
  },
});

/* ───────── Admin ───────── */

export const adminList = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertAdmin(ctx, token);
    const items = await ctx.db.query("products").order("desc").collect();
    return Promise.all(items.map((p) => withUrls(ctx, p)));
  },
});

export const adminGet = query({
  args: { token: v.string(), id: v.id("products") },
  handler: async (ctx, { token, id }) => {
    await assertAdmin(ctx, token);
    const p = await ctx.db.get(id);
    return p ? withUrls(ctx, p) : null;
  },
});

const productFields = {
  name: v.string(),
  category: v.string(),
  grade,
  weightKg: v.number(),
  pieceCount: v.optional(v.string()),
  origin: v.string(),
  price: v.number(),
  oldPrice: v.optional(v.number()),
  stock: v.number(),
  description: v.string(),
  imageIds: v.array(v.id("_storage")),
  videoId: v.optional(v.id("_storage")),
  isNewArrival: v.boolean(),
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const save = mutation({
  args: { token: v.string(), id: v.optional(v.id("products")), ...productFields },
  handler: async (ctx, { token, id, ...data }) => {
    await assertAdmin(ctx, token);
    if (data.price < 0 || data.stock < 0) throw new Error("Price and stock can't be negative");
    if (data.oldPrice !== undefined && data.oldPrice <= data.price) data.oldPrice = undefined; // only a real discount shows

    if (id) {
      const existing = await ctx.db.get(id);
      if (!existing) throw new Error("Bale not found");
      // Clean up files that were removed
      const kept = new Set<string>(data.imageIds);
      for (const old of existing.imageIds) if (!kept.has(old)) await ctx.storage.delete(old);
      if (existing.videoId && existing.videoId !== data.videoId) await ctx.storage.delete(existing.videoId);
      await ctx.db.patch(id, data);
      await logStock(ctx, id, data.stock - existing.stock, data.stock, "Edited");
      return id;
    }

    let slug = slugify(`${data.name}-${data.weightKg}kg`);
    while (await ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()) {
      slug = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const newId = await ctx.db.insert("products", { ...data, slug, archived: false, createdAt: Date.now() });
    await logStock(ctx, newId, data.stock, data.stock, "Added");
    return newId;
  },
});

export const setArchived = mutation({
  args: { token: v.string(), id: v.id("products"), archived: v.boolean() },
  handler: async (ctx, { token, id, archived }) => {
    await assertAdmin(ctx, token);
    await ctx.db.patch(id, { archived });
  },
});

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertAdmin(ctx, token);
    return ctx.storage.generateUploadUrl();
  },
});

/** Delete a bale for good (past orders keep their own copy of the name and price). */
export const remove = mutation({
  args: { token: v.string(), id: v.id("products") },
  handler: async (ctx, { token, id }) => {
    await assertAdmin(ctx, token);
    const p = await ctx.db.get(id);
    if (!p) return;
    for (const f of p.imageIds) await ctx.storage.delete(f).catch(() => {});
    if (p.videoId) await ctx.storage.delete(p.videoId).catch(() => {});
    for (const l of await ctx.db.query("stockLog").withIndex("by_product", (q) => q.eq("productId", id)).collect())
      await ctx.db.delete(l._id);
    await ctx.db.delete(id);
  },
});

/** Quick stock controls from the admin inventory page. */
export const adjustStock = mutation({
  args: { token: v.string(), id: v.id("products"), delta: v.number(), reason: v.optional(v.string()) },
  handler: async (ctx, { token, id, delta, reason }) => {
    await assertAdmin(ctx, token);
    const p = await ctx.db.get(id);
    if (!p) throw new Error("Bale not found");
    if (!Number.isInteger(delta)) throw new Error("Use whole numbers");
    const stock = Math.max(0, p.stock + delta);
    await ctx.db.patch(id, { stock });
    await logStock(ctx, id, stock - p.stock, stock, reason ?? (delta > 0 ? "Restocked" : "Removed"));
    return stock;
  },
});

export const setStock = mutation({
  args: { token: v.string(), id: v.id("products"), stock: v.number(), reason: v.optional(v.string()) },
  handler: async (ctx, { token, id, stock, reason }) => {
    await assertAdmin(ctx, token);
    const p = await ctx.db.get(id);
    if (!p) throw new Error("Bale not found");
    if (!Number.isInteger(stock) || stock < 0) throw new Error("Stock must be 0 or more");
    await ctx.db.patch(id, { stock });
    await logStock(ctx, id, stock - p.stock, stock, reason ?? (stock === 0 ? "Marked sold out" : "Stock set"));
    return stock;
  },
});

export const stockLog = query({
  args: { token: v.string(), id: v.id("products") },
  handler: async (ctx, { token, id }) => {
    await assertAdmin(ctx, token);
    return ctx.db.query("stockLog").withIndex("by_product", (q) => q.eq("productId", id)).order("desc").take(20);
  },
});

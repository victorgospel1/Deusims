import { query, mutation, internalQuery, internalMutation, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { assertAdmin, DEFAULT_SETTINGS, logStock } from "./lib";
import { orderStatus, paymentMethod } from "./schema";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode() {
  let c = "";
  for (let i = 0; i < 6; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

const normPhone = (p: string) => p.replace(/\D/g, "").replace(/^234/, "0");

async function restoreStock(ctx: MutationCtx, order: Doc<"orders">) {
  if (order.stockRestored) return;
  for (const item of order.items) {
    const p = await ctx.db.get(item.productId);
    if (p) {
      await ctx.db.patch(p._id, { stock: p.stock + item.qty });
      await logStock(ctx, p._id, item.qty, p.stock + item.qty, `Order ${order.code} cancelled`);
    }
  }
  await ctx.db.patch(order._id, { stockRestored: true });
}

/** Public: totals and stock are always computed here, never trusted from the browser. */
export const create = mutation({
  args: {
    customerName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    items: v.array(v.object({ productId: v.id("products"), qty: v.number() })),
    fulfilment: v.union(v.literal("delivery"), v.literal("pickup")),
    state: v.optional(v.string()),
    address: v.optional(v.string()),
    note: v.optional(v.string()),
    paymentMethod,
  },
  handler: async (ctx, args) => {
    if (!args.customerName.trim()) throw new Error("Enter your name");
    if (normPhone(args.phone).length < 10) throw new Error("Enter a valid phone number");
    if (args.items.length === 0) throw new Error("Your cart is empty");
    if (args.fulfilment === "delivery" && (!args.state || !args.address?.trim()))
      throw new Error("Enter your state and delivery address");
    if (args.paymentMethod === "on_site" && args.fulfilment !== "pickup")
      throw new Error("Pay on site is only available for warehouse pickup");
    if (args.paymentMethod === "transfer")
      throw new Error("Please pay by transfer through the secure payment window");
    if (args.paymentMethod === "paystack" && !args.email)
      throw new Error("Enter an email address to pay with Paystack");

    const items = [];
    const reserved: { id: Id<"products">; qty: number; after: number }[] = [];
    let subtotal = 0;
    for (const { productId, qty } of args.items) {
      if (!Number.isInteger(qty) || qty < 1) throw new Error("Invalid quantity");
      const p = await ctx.db.get(productId);
      if (!p || p.archived) throw new Error("A bale in your cart is no longer available");
      if (p.stock < qty) throw new Error(`Only ${p.stock} left of ${p.name}`);
      await ctx.db.patch(p._id, { stock: p.stock - qty }); // reserve
      reserved.push({ id: p._id, qty, after: p.stock - qty });
      items.push({ productId, name: `${p.name} (${p.weightKg}kg)`, price: p.price, qty });
      subtotal += p.price * qty;
    }

    let deliveryFee = 0;
    if (args.fulfilment === "delivery") {
      const s =
        (await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).unique()) ??
        DEFAULT_SETTINGS;
      deliveryFee = s.deliveryFees.find((d) => d.state === args.state)?.fee ?? s.defaultDeliveryFee;
    }

    let code = makeCode();
    while (await ctx.db.query("orders").withIndex("by_code", (q) => q.eq("code", code)).unique())
      code = makeCode();

    for (const r of reserved) await logStock(ctx, r.id, -r.qty, r.after, `Order ${code}`);

    await ctx.db.insert("orders", {
      code,
      customerName: args.customerName.trim(),
      phone: args.phone.trim(),
      email: args.email?.trim() || undefined,
      items,
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee,
      fulfilment: args.fulfilment,
      state: args.fulfilment === "delivery" ? args.state : undefined,
      address: args.fulfilment === "delivery" ? args.address?.trim() : undefined,
      note: args.note?.trim() || undefined,
      paymentMethod: args.paymentMethod,
      paymentStatus: "pending",
      // Pay-on-site orders are confirmed straight away; payment is collected at pickup
      status: args.paymentMethod === "on_site" ? "confirmed" : "awaiting_payment",
      createdAt: Date.now(),
    });
    return { code, total: subtotal + deliveryFee };
  },
});

/** Public: customer must know both the order code and the phone number. */
export const track = query({
  args: { code: v.string(), phone: v.string() },
  handler: async (ctx, { code, phone }) => {
    const o = await ctx.db
      .query("orders")
      .withIndex("by_code", (q) => q.eq("code", code.trim().toUpperCase()))
      .unique();
    if (!o || normPhone(o.phone) !== normPhone(phone)) return null;
    return {
      code: o.code,
      customerName: o.customerName,
      items: o.items,
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      total: o.total,
      fulfilment: o.fulfilment,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      status: o.status,
      hasProof: !!o.transferProofId,
      payChannel: o.payChannel,
      state: o.state,
      createdAt: o.createdAt,
    };
  },
});

export const generateProofUploadUrl = mutation({
  args: { code: v.string(), phone: v.string() },
  handler: async (ctx, { code, phone }) => {
    const o = await ctx.db.query("orders").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!o || normPhone(o.phone) !== normPhone(phone) || o.paymentMethod !== "transfer")
      throw new Error("Order not found");
    return ctx.storage.generateUploadUrl();
  },
});

export const attachProof = mutation({
  args: { code: v.string(), phone: v.string(), storageId: v.id("_storage") },
  handler: async (ctx, { code, phone, storageId }) => {
    const o = await ctx.db.query("orders").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!o || normPhone(o.phone) !== normPhone(phone)) throw new Error("Order not found");
    if (o.transferProofId) await ctx.storage.delete(o.transferProofId);
    await ctx.db.patch(o._id, { transferProofId: storageId });
  },
});

/* ───────── Internal (Paystack actions) ───────── */

export const getForPayment = internalQuery({
  args: { code: v.string(), phone: v.string() },
  handler: async (ctx, { code, phone }) => {
    const o = await ctx.db.query("orders").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!o || normPhone(o.phone) !== normPhone(phone)) return null;
    return o;
  },
});

/** Called by the Paystack webhook and the callback verification. Idempotent. */
export const markPaystackPaid = internalMutation({
  args: { code: v.string(), reference: v.string(), amountKobo: v.number(), channel: v.optional(v.string()) },
  handler: async (ctx, { code, reference, amountKobo, channel }) => {
    const o = await ctx.db.query("orders").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!o) throw new Error("Order not found");
    if (o.paymentStatus === "paid") return "already_paid";
    if (amountKobo < o.total * 100) throw new Error("Amount paid is less than order total");
    if (o.status === "cancelled") {
      // Paid after auto-cancel: re-reserve stock where possible and flag for admin
      for (const item of o.items) {
        const p = await ctx.db.get(item.productId);
        if (p) {
          const after = Math.max(0, p.stock - item.qty);
          await ctx.db.patch(p._id, { stock: after });
          await logStock(ctx, p._id, after - p.stock, after, `Order ${o.code} paid after expiry`);
        }
      }
    }
    await ctx.db.patch(o._id, {
      paymentStatus: "paid",
      status: "confirmed",
      paystackRef: reference,
      payChannel: channel,
      stockRestored: false,
    });
    return "paid";
  },
});

export const adminList = query({
  args: { token: v.string(), status: v.optional(orderStatus) },
  handler: async (ctx, { token, status }) => {
    await assertAdmin(ctx, token);
    if (status)
      return ctx.db.query("orders").withIndex("by_status", (q) => q.eq("status", status)).order("desc").collect();
    return ctx.db.query("orders").withIndex("by_created").order("desc").take(300);
  },
});

/** Customers, built from orders (grouped by phone number). */
export const customers = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertAdmin(ctx, token);
    const orders = await ctx.db.query("orders").withIndex("by_created").order("desc").take(3000);
    const map = new Map<string, { name: string; phone: string; email?: string; orders: number; spent: number; lastOrder: number; lastCode: string; state?: string }>();
    for (const o of orders) {
      const key = normPhone(o.phone);
      const c = map.get(key);
      if (!c) map.set(key, { name: o.customerName, phone: o.phone, email: o.email, orders: 1, spent: o.paymentStatus === "paid" ? o.total : 0, lastOrder: o.createdAt, lastCode: o.code, state: o.state });
      else { c.orders++; if (o.paymentStatus === "paid") c.spent += o.total; if (!c.email && o.email) c.email = o.email; }
    }
    return [...map.values()].sort((a, b) => b.lastOrder - a.lastOrder);
  },
});

export const adminGet = query({
  args: { token: v.string(), code: v.string() },
  handler: async (ctx, { token, code }) => {
    await assertAdmin(ctx, token);
    const o = await ctx.db.query("orders").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!o) return null;
    const proofUrl = o.transferProofId ? await ctx.storage.getUrl(o.transferProofId) : null;
    return { ...o, proofUrl };
  },
});

export const adminUpdate = mutation({
  args: {
    token: v.string(),
    code: v.string(),
    status: v.optional(orderStatus),
    markPaid: v.optional(v.boolean()),
  },
  handler: async (ctx, { token, code, status, markPaid }) => {
    await assertAdmin(ctx, token);
    const o = await ctx.db.query("orders").withIndex("by_code", (q) => q.eq("code", code)).unique();
    if (!o) throw new Error("Order not found");
    const patch: Partial<Doc<"orders">> = {};
    if (markPaid) {
      patch.paymentStatus = "paid";
      if (o.status === "awaiting_payment") patch.status = "confirmed";
    }
    if (status) patch.status = status;
    await ctx.db.patch(o._id, patch);
    if (status === "cancelled") await restoreStock(ctx, o);
  },
});

// Dashboard numbers. Days are counted in Lagos time (UTC+1).
const LAGOS_OFFSET = 60 * 60 * 1000;
const dayKey = (ms: number) => new Date(ms + LAGOS_OFFSET).toISOString().slice(0, 10);

export const stats = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await assertAdmin(ctx, token);
    const now = Date.now();
    const lagosNow = new Date(now + LAGOS_OFFSET);
    const monthStart = Date.UTC(lagosNow.getUTCFullYear(), lagosNow.getUTCMonth(), 1) - LAGOS_OFFSET;
    const since = Math.min(monthStart, now - 29 * 864e5 - LAGOS_OFFSET);
    const orders = await ctx.db.query("orders").withIndex("by_created", (q) => q.gte("createdAt", since)).collect();
    const products = await ctx.db.query("products").collect();
    const settings = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).unique();
    return computeStats(orders, products, settings?.lowStockAt ?? 3, now);
  },
});

type OrderDoc = Doc<"orders">;
type ProductDoc = Doc<"products">;
function computeStats(orders: OrderDoc[], products: ProductDoc[], lowAt: number, now: number) {
  const today = dayKey(now);
  const month = today.slice(0, 7);
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const live = orders.filter((o) => o.status !== "cancelled");
  const sum = (list: OrderDoc[]) => list.reduce((s, o) => s + o.total, 0);

  const daily: { day: string; revenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) daily.push({ day: dayKey(now - i * 864e5), revenue: 0, orders: 0 });
  const byDay = new Map(daily.map((d) => [d.day, d]));
  for (const o of live) { const d = byDay.get(dayKey(o.createdAt)); if (d) d.orders++; }
  for (const o of paid) { const d = byDay.get(dayKey(o.createdAt)); if (d) d.revenue += o.total; }

  const statusCounts: Record<string, number> = {};
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  const channels: Record<string, number> = {};
  for (const o of paid) {
    const k = o.paymentMethod === "on_site" ? "on_site" : o.payChannel ?? "online";
    channels[k] = (channels[k] ?? 0) + o.total;
  }

  const catOf = new Map(products.map((p) => [p._id as string, p.category]));
  const categories: Record<string, number> = {};
  const sellers: Record<string, number> = {};
  for (const o of paid) for (const i of o.items) {
    const c = catOf.get(i.productId) ?? "Other";
    categories[c] = (categories[c] ?? 0) + i.price * i.qty;
    sellers[i.name] = (sellers[i.name] ?? 0) + i.qty;
  }

  const active = products.filter((p) => !p.archived);
  return {
    today: { revenue: sum(paid.filter((o) => dayKey(o.createdAt) === today)), orders: live.filter((o) => dayKey(o.createdAt) === today).length },
    month: { revenue: sum(paid.filter((o) => dayKey(o.createdAt).startsWith(month))), orders: live.filter((o) => dayKey(o.createdAt).startsWith(month)).length },
    awaitingPayment: orders.filter((o) => o.status === "awaiting_payment").length,
    toFulfil: orders.filter((o) => ["confirmed", "packed"].includes(o.status)).length,
    daily,
    statusCounts,
    channels,
    categories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 6),
    topSellers: Object.entries(sellers).sort((a, b) => b[1] - a[1]).slice(0, 5),
    inventory: {
      bales: active.reduce((s, p) => s + p.stock, 0),
      value: active.reduce((s, p) => s + p.stock * p.price, 0),
      soldOut: active.filter((p) => p.stock <= 0).length,
      few: active.filter((p) => p.stock > 0 && p.stock <= lowAt).length,
      products: active.length,
    },
    lowStock: active.filter((p) => p.stock <= lowAt).sort((a, b) => a.stock - b.stock).slice(0, 8)
      .map((p) => ({ id: p._id, name: p.name, stock: p.stock })),
    recent: [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).map((o) => ({
      code: o.code, customerName: o.customerName, total: o.total, status: o.status,
      paymentStatus: o.paymentStatus, createdAt: o.createdAt,
    })),
  };
}

/** Cron: release stock from online orders left unpaid for 30 minutes. */
export const expireUnpaid = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 60 * 1000; // unpaid online orders hold stock for 30 minutes
    const stale = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "awaiting_payment"))
      .collect();
    for (const o of stale) {
      if (o.paymentMethod === "paystack" && o.createdAt < cutoff) {
        await ctx.db.patch(o._id, { status: "cancelled" });
        await restoreStock(ctx, o);
      }
    }
  },
});

export const clearSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const s of await ctx.db.query("adminSessions").collect())
      if (s.expiresAt < Date.now()) await ctx.db.delete(s._id);
  },
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const grade = v.union(v.literal("cream"), v.literal("A"), v.literal("B"));
export const paymentMethod = v.union(
  v.literal("paystack"),
  v.literal("transfer"),
  v.literal("on_site"),
);
export const orderStatus = v.union(
  v.literal("awaiting_payment"),
  v.literal("confirmed"),
  v.literal("packed"),
  v.literal("dispatched"),
  v.literal("ready_for_pickup"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export default defineSchema({
  products: defineTable({
    name: v.string(),
    slug: v.string(),
    category: v.string(),
    grade,
    weightKg: v.number(),
    pieceCount: v.optional(v.string()), // e.g. "220–260"
    origin: v.string(), // UK, USA, Canada, Korea...
    price: v.number(), // whole naira (what the customer pays)
    oldPrice: v.optional(v.number()), // "was" price: shows a discount badge when higher than price
    stock: v.number(),
    description: v.string(),
    imageIds: v.array(v.id("_storage")),
    videoId: v.optional(v.id("_storage")),
    isNewArrival: v.boolean(),
    archived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_archived", ["archived"]),

  orders: defineTable({
    code: v.string(),
    customerName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        name: v.string(),
        price: v.number(),
        qty: v.number(),
      }),
    ),
    subtotal: v.number(),
    deliveryFee: v.number(),
    total: v.number(),
    fulfilment: v.union(v.literal("delivery"), v.literal("pickup")),
    state: v.optional(v.string()),
    address: v.optional(v.string()),
    note: v.optional(v.string()),
    paymentMethod,
    paymentStatus: v.union(v.literal("pending"), v.literal("paid")),
    status: orderStatus,
    transferProofId: v.optional(v.id("_storage")),
    paystackRef: v.optional(v.string()),
    payChannel: v.optional(v.string()), // bank_transfer, card, ussd… (from Paystack)
    stockRestored: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_created", ["createdAt"])
    .index("by_status", ["status"]),

  adminSessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  loginThrottle: defineTable({
    key: v.literal("admin"),
    failures: v.number(),
    windowStart: v.number(),
    blockedUntil: v.number(),
  }).index("by_key", ["key"]),

  assistantUsage: defineTable({
    minute: v.number(),
    count: v.number(),
  }).index("by_minute", ["minute"]),

  stockLog: defineTable({
    productId: v.id("products"),
    change: v.number(),
    stockAfter: v.number(),
    reason: v.string(), // "Restocked", "Marked sold out", "Order K7PX2M", …
    at: v.number(),
  }).index("by_product", ["productId", "at"]),

  settings: defineTable({
    key: v.literal("main"),
    // Legacy manual-transfer fields (no longer shown to customers)
    bankName: v.optional(v.string()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    lowStockAt: v.optional(v.number()), // show "Few left" at or below this many
    // ─── Website content (edited in Admin → Website) ───
    business: v.optional(v.object({
      name: v.string(), tagline: v.string(), phone: v.string(), email: v.string(), hours: v.string(), city: v.string(),
    })),
    announcement: v.optional(v.string()),
    heroSlides: v.optional(v.array(v.object({
      imageId: v.optional(v.id("_storage")), imageUrl: v.optional(v.string()),
      tag: v.string(), title: v.string(), text: v.string(), ctaLabel: v.string(), ctaHref: v.string(),
    }))),
    about: v.optional(v.object({
      title: v.string(), body: v.string(), imageId: v.optional(v.id("_storage")), imageUrl: v.optional(v.string()),
    })),
    faq: v.optional(v.array(v.object({ q: v.string(), a: v.string() }))),
    deals: v.optional(v.object({ title: v.string(), endsAt: v.optional(v.number()) })),
    socials: v.optional(v.object({
      instagram: v.optional(v.string()), facebook: v.optional(v.string()), tiktok: v.optional(v.string()),
    })),
    whatsapp: v.string(),
    pickupAddress: v.string(),
    defaultDeliveryFee: v.number(),
    deliveryFees: v.array(v.object({ state: v.string(), fee: v.number() })),
  }).index("by_key", ["key"]),
});

import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { DEFAULT_SETTINGS } from "./lib";

// Convex env var: ANTHROPIC_API_KEY  (npx convex env set ANTHROPIC_API_KEY sk-ant-...)
// ⚠️ Keep these in sync with js/config.js
const SHOP_NAME = "Okrika Bales Depot";
const MODEL = "claude-haiku-4-5-20251001";

const FAQ = `
Grades: Cream = first selection, near-new, under 5% rejects, best for boutiques. Grade A = clean with light wear, 5–10% rejects, best for market stalls. Grade B = wearable with visible use, 10–20% rejects, cheapest per piece.
Opening videos: customers can ask on WhatsApp for an opening video or photos before paying.
Payment: pay online through the secure Paystack window, either by bank transfer (it shows a one-time account number and confirms automatically, no receipt needed) or by card/USSD; or cash/POS at the warehouse for pickup orders.
Delivery: to every state. Lagos usually 1–2 days, other states 2–5 days. Fee depends on state and is shown at checkout.
Tracking: with order code + phone number on the Track order page (track.html).
Refunds: NONE. All sales are final, no refunds once paid. If the shop sends the wrong category/grade it is exchanged (report within 24h on WhatsApp with an opening video). Recommend asking for an opening video before paying.
Bulk: traders buying many bales should message on WhatsApp for pricing.`;

export const context = internalQuery({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_archived", (q) => q.eq("archived", false))
      .collect();
    const settings =
      (await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "main")).unique()) ?? DEFAULT_SETTINGS;
    return {
      products: products.map((p) => ({
        name: p.name, category: p.category, grade: p.grade, weightKg: p.weightKg, origin: p.origin,
        price: p.price, available: p.stock > 0, pieces: p.pieceCount ?? null, slug: p.slug, newArrival: p.isNewArrival,
      })),
      pickupAddress: settings.pickupAddress,
      whatsapp: settings.whatsapp,
      deliveryFees: settings.deliveryFees,
      defaultDeliveryFee: settings.defaultDeliveryFee,
    };
  },
});

/** Global cap on AI calls per minute so a bot can't run up the API bill. */
const MAX_PER_MINUTE = 40;
export const allow = internalMutation({
  args: {},
  handler: async (ctx) => {
    const minute = Math.floor(Date.now() / 60000);
    const row = await ctx.db.query("assistantUsage").withIndex("by_minute", (q) => q.eq("minute", minute)).unique();
    if (row && row.count >= MAX_PER_MINUTE) return false;
    if (row) await ctx.db.patch(row._id, { count: row.count + 1 });
    else {
      await ctx.db.insert("assistantUsage", { minute, count: 1 });
      // tidy old rows
      for (const old of await ctx.db.query("assistantUsage").withIndex("by_minute", (q) => q.lt("minute", minute - 5)).take(20))
        await ctx.db.delete(old._id);
    }
    return true;
  },
});

export const chat = action({
  args: {
    messages: v.array(v.object({ role: v.union(v.literal("user"), v.literal("assistant")), content: v.string() })),
  },
  handler: async (ctx, { messages }): Promise<{ reply: string }> => {
    // Keep requests small and cheap
    const recent = messages.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    if (!recent.length || recent[recent.length - 1].role !== "user") return { reply: "" };
    if (recent[recent.length - 1].content.length > 500) return { reply: "Please keep your question under 500 characters." };
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { reply: "The assistant isn't set up yet. Please message us on WhatsApp." };

    if (!(await ctx.runMutation(internal.assistant.allow, {})))
      return { reply: "I'm getting a lot of questions right now. Please try again in a minute or message us on WhatsApp." };

    const c = await ctx.runQuery(internal.assistant.context, {});
    const system = `You are the shopping assistant for ${SHOP_NAME}, a Nigerian business selling okrika (second-hand clothing) bales from a warehouse at ${c.pickupAddress}.
Answer only questions about this shop, its bales, grades, prices, delivery, payment and orders. Politely decline anything else.
Be brief and friendly (2–5 short sentences or a short bulleted list with "• "). Use Nigerian Naira with the ₦ sign and commas.
Only use the stock and prices below. Say whether a bale is available or sold out; never state exact quantities. Never invent bales, prices, discounts or stock. If something isn't listed, say so and suggest WhatsApp.
When you mention a bale, link it as [Bale name](bale.html?slug=THE_SLUG). Link the full shop as [shop](shop.html).
For bulk deals, negotiation, or anything you're unsure about, tell them to message us on WhatsApp.
Never ask for card details, passwords or bank PINs.

CURRENT STOCK (JSON): ${JSON.stringify(c.products)}
DELIVERY FEES (₦ per order): ${JSON.stringify(c.deliveryFees)}; any other state: ₦${c.defaultDeliveryFee}. Pickup is free.
SHOP FACTS: ${FAQ}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: recent }),
    });
    if (!res.ok) {
      console.error("Assistant error", res.status, await res.text());
      return { reply: "I can't answer right now. Please message us on WhatsApp." };
    }
    const data = await res.json();
    const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("\n");
    return { reply: text.trim() };
  },
});

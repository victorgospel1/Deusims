"use node";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createHmac, timingSafeEqual } from "node:crypto";

// Convex env vars: PAYSTACK_SECRET_KEY, SITE_URL (e.g. https://yourdomain.com)
const PS = "https://api.paystack.co";
const headers = () => ({
  Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
  "Content-Type": "application/json",
});

/** Public: start (or retry) a Paystack payment. Needs the order code + phone. */
export const initialize = action({
  args: {
    code: v.string(),
    phone: v.string(),
    // "bank_transfer" opens Paystack straight on the transfer account card
    channel: v.optional(v.union(v.literal("bank_transfer"), v.literal("card"))),
  },
  handler: async (ctx, { code, phone, channel }): Promise<{ url: string; accessCode: string; reference: string } | { error: string }> => {
    const order = await ctx.runQuery(internal.orders.getForPayment, { code, phone });
    if (!order) return { error: "Order not found" };
    if (order.paymentStatus === "paid") return { error: "This order is already paid" };
    if (order.status === "cancelled") return { error: "This order was cancelled" };
    if (order.paymentMethod !== "paystack" || !order.email) return { error: "This order isn't set up for online payment" };

    const site = (process.env.SITE_URL ?? "").replace(/\/$/, "");
    const res = await fetch(`${PS}/transaction/initialize`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        email: order.email,
        amount: order.total * 100, // kobo
        currency: "NGN",
        reference: `${order.code}-${Date.now()}`,
        callback_url: `${site}/order.html?code=${order.code}&phone=${encodeURIComponent(order.phone)}`,
        channels: channel === "card" ? ["card", "ussd", "bank"] : ["bank_transfer"],
        metadata: { orderCode: order.code },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.status) return { error: "Paystack is unavailable right now. Try again shortly." };
    return {
      url: data.data.authorization_url as string,
      accessCode: data.data.access_code as string,
      reference: data.data.reference as string,
    };
  },
});

async function verifyReference(ctx: { runMutation: any }, reference: string) {
  const res = await fetch(`${PS}/transaction/verify/${encodeURIComponent(reference)}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok || data.data?.status !== "success" || data.data?.currency !== "NGN") return false;
  const code = data.data.metadata?.orderCode as string | undefined;
  if (!code) return false;
  await ctx.runMutation(internal.orders.markPaystackPaid, {
    code, reference, amountKobo: data.data.amount, channel: data.data.channel,
  });
  return true;
}

/** Public: called by order.html when Paystack redirects back. Verifies with Paystack's API. */
export const verify = action({
  args: { reference: v.string() },
  handler: async (ctx, { reference }) => {
    try { return await verifyReference(ctx, reference); } catch { return false; }
  },
});

/** Internal: called by the HTTP webhook route after reading the raw body. */
export const handleWebhook = internalAction({
  args: { raw: v.string(), signature: v.string() },
  handler: async (ctx, { raw, signature }) => {
    const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY ?? "").update(raw).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const event = JSON.parse(raw);
    if (event.event === "charge.success" && event.data?.reference) {
      await verifyReference(ctx, event.data.reference);
    }
    return true;
  },
});

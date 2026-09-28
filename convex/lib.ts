import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/** Every admin query/mutation passes the session token issued by auth:login. */
export async function assertAdmin(ctx: QueryCtx, token: string) {
  const s = await ctx.db
    .query("adminSessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!s || s.expiresAt < Date.now()) throw new Error("Unauthorized");
}

export async function withUrls(ctx: QueryCtx, p: Doc<"products">) {
  const images = await Promise.all(
    p.imageIds.map((id: Id<"_storage">) => ctx.storage.getUrl(id)),
  );
  const video = p.videoId ? await ctx.storage.getUrl(p.videoId) : null;
  return { ...p, images: images.filter((u): u is string => !!u), video };
}

export const DEFAULT_SETTINGS = {
  key: "main" as const,
  lowStockAt: 3,
  whatsapp: "2348000000000",
  pickupAddress: "Warehouse address",
  defaultDeliveryFee: 10000,
  deliveryFees: [{ state: "Lagos", fee: 5000 }],
};

/** Record every stock movement so the admin can see why a number changed. */
export async function logStock(
  ctx: MutationCtx,
  productId: Id<"products">,
  change: number,
  stockAfter: number,
  reason: string,
) {
  if (change === 0) return;
  await ctx.db.insert("stockLog", { productId, change, stockAfter, reason, at: Date.now() });
}

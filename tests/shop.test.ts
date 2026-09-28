/// <reference types="vite/client" />
// Tests the real backend functions (run: npx vitest run)
import { convexTest } from "convex-test";
import { expect, test, vi } from "vitest";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";

const modules = import.meta.glob(["../convex/*.ts", "../convex/_generated/*.js"]);
process.env.ADMIN_PASSWORD = "secret123";

async function setup() {
  const t = convexTest(schema, modules);
  const bad = await t.mutation(api.auth.login, { password: "nope" });
  expect(bad.ok).toBe(false);
  const res = await t.mutation(api.auth.login, { password: "secret123" });
  expect(res.ok).toBe(true);
  const token = (res as { token: string }).token;
  expect(await t.query(api.auth.check, { token })).toBe(true);
  return { t, token };
}

async function addBale(t: any, token: string, extra: Record<string, unknown> = {}) {
  return t.mutation(api.products.save, {
    token, name: "Men's jeans", category: "Jeans", grade: "A", weightKg: 55, origin: "USA",
    price: 300000, stock: 5, description: "Straight fits", imageIds: [], isNewArrival: true, ...extra,
  });
}

test("admin auth guards admin functions", async () => {
  const { t } = await setup();
  await expect(t.query(api.orders.stats, { token: "wrong" })).rejects.toThrow(/Unauthorized/);
});

test("products: create, discount, list, stock controls, delete", async () => {
  const { t, token } = await setup();
  const id = await addBale(t, token, { oldPrice: 350000 });
  await addBale(t, token, { name: "Ladies tops", category: "Ladies' tops", grade: "cream", price: 250000, oldPrice: 200000 });
  const list = await t.query(api.products.list, {});
  expect(list).toHaveLength(2);
  expect(list.find((p: any) => p.name === "Men's jeans").oldPrice).toBe(350000);
  expect(list.find((p: any) => p.name === "Ladies tops").oldPrice).toBeUndefined(); // not a real discount → dropped
  expect(await t.query(api.products.categories, {})).toEqual(["Jeans", "Ladies' tops"]);
  const bySlug = await t.query(api.products.bySlug, { slug: list[0].slug });
  expect(bySlug?._id).toBeDefined();

  expect(await t.mutation(api.products.adjustStock, { token, id, delta: 3, reason: "Restocked +3" })).toBe(8);
  expect(await t.mutation(api.products.setStock, { token, id, stock: 0, reason: "Marked sold out" })).toBe(0);
  const log = await t.query(api.products.stockLog, { token, id });
  expect(log.map((l: any) => l.reason)).toEqual(["Marked sold out", "Restocked +3", "Added"]);

  await t.mutation(api.products.setArchived, { token, id, archived: true });
  expect(await t.query(api.products.list, {})).toHaveLength(1);
  await t.mutation(api.products.remove, { token, id });
  expect(await t.query(api.products.adminGet, { token, id })).toBeNull();
});

test("checkout: prices recomputed, stock held, rules enforced", async () => {
  const { t, token } = await setup();
  await t.mutation(api.settings.save, { token, lowStockAt: 3, whatsapp: "2348000000000", pickupAddress: "12 Market Rd", defaultDeliveryFee: 10000, deliveryFees: [{ state: "Ogun", fee: 7000 }] });
  const id = await addBale(t, token);
  const base = { customerName: "Chika", phone: "08012340001", items: [{ productId: id, qty: 2 }], fulfilment: "pickup" as const };

  await expect(t.mutation(api.orders.create, { ...base, paymentMethod: "transfer" })).rejects.toThrow(/secure payment window/);
  await expect(t.mutation(api.orders.create, { ...base, fulfilment: "delivery", state: "Ogun", address: "2 Rd", paymentMethod: "on_site" })).rejects.toThrow(/pickup/);
  await expect(t.mutation(api.orders.create, { ...base, paymentMethod: "paystack" })).rejects.toThrow(/email/);
  await expect(t.mutation(api.orders.create, { ...base, items: [{ productId: id, qty: 9 }], paymentMethod: "on_site" })).rejects.toThrow(/Only 5 left/);

  const online = await t.mutation(api.orders.create, { ...base, email: "c@x.com", fulfilment: "delivery", state: "Ogun", address: "2 Rd", paymentMethod: "paystack" });
  expect(online.total).toBe(600000 + 7000);
  expect((await t.query(api.products.adminGet, { token, id }))!.stock).toBe(3);

  const tracked = await t.query(api.orders.track, { code: online.code, phone: "+234 801 234 0001" });
  expect(tracked?.status).toBe("awaiting_payment");
  expect(await t.query(api.orders.track, { code: online.code, phone: "08000000000" })).toBeNull();

  // Underpayment is rejected; full payment confirms the order
  await expect(t.mutation(internal.orders.markPaystackPaid, { code: online.code, reference: "r1", amountKobo: 100 })).rejects.toThrow(/less than/);
  await t.mutation(internal.orders.markPaystackPaid, { code: online.code, reference: "r1", amountKobo: 607000 * 100, channel: "bank_transfer" });
  const paid = await t.query(api.orders.track, { code: online.code, phone: "08012340001" });
  expect(paid?.paymentStatus).toBe("paid");
  expect(paid?.payChannel).toBe("bank_transfer");

  // Pay at warehouse, then admin cancels → stock restored
  const cash = await t.mutation(api.orders.create, { ...base, items: [{ productId: id, qty: 1 }], paymentMethod: "on_site" });
  expect((await t.query(api.products.adminGet, { token, id }))!.stock).toBe(2);
  await t.mutation(api.orders.adminUpdate, { token, code: cash.code, status: "cancelled" });
  expect((await t.query(api.products.adminGet, { token, id }))!.stock).toBe(3);

  const stats = await t.query(api.orders.stats, { token });
  expect(stats.today.revenue).toBe(607000);
  expect(stats.daily).toHaveLength(30);
  const customers = await t.query(api.orders.customers, { token });
  expect(customers).toHaveLength(1);
  expect(customers[0].orders).toBe(2);
});

test("unpaid online orders expire after 30 minutes and release stock", async () => {
  vi.useFakeTimers();
  const { t, token } = await setup();
  const id = await addBale(t, token);
  const o = await t.mutation(api.orders.create, { customerName: "A", phone: "08011112222", email: "a@b.com", items: [{ productId: id, qty: 4 }], fulfilment: "pickup", paymentMethod: "paystack" });
  expect((await t.query(api.products.adminGet, { token, id }))!.stock).toBe(1);
  vi.advanceTimersByTime(31 * 60 * 1000);
  await t.mutation(internal.orders.expireUnpaid, {});
  expect((await t.query(api.orders.track, { code: o.code, phone: "08011112222" }))?.status).toBe("cancelled");
  expect((await t.query(api.products.adminGet, { token, id }))!.stock).toBe(5);
  vi.useRealTimers();
});

test("website content: save and read back", async () => {
  const { t, token } = await setup();
  await t.mutation(api.settings.updateContent, {
    token,
    business: { name: "Papa Bales", tagline: "Good bales", phone: "+234 1", email: "a@b.com", hours: "Mon–Sat", city: "Lagos" },
    heroSlides: [{ imageUrl: "https://images.unsplash.com/photo-1", tag: "New", title: "Hello", text: "Text", ctaLabel: "Shop", ctaHref: "shop.html" }],
    about: { title: "Our story", body: "Since 2005" },
    faq: [{ q: "Q?", a: "A." }],
    deals: { title: "Deals of the week", endsAt: Date.now() + 864e5 },
    socials: { instagram: "https://instagram.com/x" },
  });
  const s = await t.query(api.settings.get, {});
  expect(s.business?.name).toBe("Papa Bales");
  expect(s.heroSlides?.[0].title).toBe("Hello");
  expect(s.faq?.[0].q).toBe("Q?");
  expect((s as any).accountNumber).toBeUndefined();
  const fresh = convexTest(schema, modules);
  const d = await fresh.query(api.settings.get, {}); // no settings saved yet → defaults
  expect(d.defaultDeliveryFee).toBeGreaterThan(0);
});

test("AI assistant without a key points customers to WhatsApp", async () => {
  const { t } = await setup();
  delete process.env.ANTHROPIC_API_KEY;
  const r = await t.action(api.assistant.chat, { messages: [{ role: "user", content: "Hi" }] });
  expect(r.reply).toMatch(/WhatsApp/);
});

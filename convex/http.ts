import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Paystack Dashboard → Settings → API Keys & Webhooks → Webhook URL:
//   https://YOUR-DEPLOYMENT.convex.site/paystack/webhook
http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const raw = await req.text();
    const signature = req.headers.get("x-paystack-signature") ?? "";
    const ok = await ctx.runAction(internal.paystack.handleWebhook, { raw, signature });
    return new Response(null, { status: ok ? 200 : 401 });
  }),
});

export default http;

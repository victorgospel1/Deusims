# Going live — step by step

The site has no demo data. Everything (bales, orders, customers, website text) lives in **your own Convex database**, and payments go through **your dad's Paystack account** into his Nigerian bank account.

## What you need first (all free to sign up)

1. **Node.js** (LTS) from nodejs.org
2. A **Convex** account: convex.dev (sign up with GitHub or Google)
3. A **Paystack** business account: paystack.com, with your dad's bank account added under **Settings → Payouts**. Test keys work straight away; live keys need Paystack to verify the business.
4. Optional: an **Anthropic API key** (console.anthropic.com) for the AI shopping assistant.

## 1. Run the setup (one time)

Double-click **`setup.bat`** (Windows) or **`setup.command`** (Mac). It will:

- install the tools
- open your browser to log in to Convex and create the database
- connect the website to it (writes your Convex URL into `js/config.js`)
- ask you for the **admin password**, your **Paystack secret key**, your website address and (optionally) the AI key
- print your **Paystack webhook URL** — copy it

## 2. Paystack webhook

Paystack Dashboard → **Settings → API Keys & Webhooks** → paste the webhook URL that setup printed (it looks like `https://your-name-123.convex.site/paystack/webhook`). This confirms payments even if the customer closes the page.

## 3. Start the shop and add bales

Double-click **`start.bat`** (Mac: `start.command`), then open **http://localhost:3000/admin/** and sign in with the password you chose.

1. **Settings:** WhatsApp number, warehouse address, delivery fees per state.
2. **Website:** business name, phone, email, hours, slideshow photos, About text, FAQ.
3. **Inventory → Add bale:** photos, grade, weight, price, stock. They appear on the shop instantly.

Place a test order with Paystack **test** key and card `4084 0840 8408 4081` (any future expiry, CVV 408) to see the full flow.

## 4. Put it online

1. Run `npx convex deploy` — creates your **production** database. Set the same values there:
   ```
   npx convex env set --prod ADMIN_PASSWORD "..."
   npx convex env set --prod PAYSTACK_SECRET_KEY "sk_live_..."
   npx convex env set --prod SITE_URL "https://your-domain.com"
   ```
2. Put the **production** Convex URL (shown by `npx convex deploy`, ends in `.convex.cloud`) into `js/config.js`.
3. Upload the folder (everything except `node_modules`, `convex`, `src`, `tests`, `tools`) to your host — Netlify, Vercel, Cloudflare Pages or cPanel `public_html`.
4. Update the Paystack webhook to the **production** `.convex.site/paystack/webhook` URL and switch to your **live** secret key.

## Changing the code later

- Backend changes (`convex/` folder): `npx convex dev --once` (development) or `npx convex deploy` (production).
- Style changes: `npm run css`.
- Backend tests: `npm test`.

# Okrika Bales Store (HTML version)

**To go live, follow [SETUP.md](SETUP.md)** — run `setup.bat`, then `start.bat`.

Plain HTML + vanilla JS (ES modules) + Tailwind v4 (compiled) + Convex + Paystack.
No framework and no JS build step. Convex loads from the CDN browser bundle.

## How it's secured without a server

Everything secret runs inside Convex; the browser never sees a key.

- **Prices, stock and delivery fees** are recomputed in `orders:create`, never trusted from the browser.
- **Admin login.** `auth:login` checks `ADMIN_PASSWORD` (a Convex env var), throttles wrong attempts, and issues a 7-day session token. Every admin query and mutation checks that token.
- **Payments.** At checkout the customer picks **Bank transfer** (default), **Card / USSD**, or **Pay at the warehouse** (pickup only). Bank transfer opens Paystack's window on the page showing a one-time account number; when the money lands, Paystack confirms it automatically and the order flips to **Paid**. No receipts, no manual checking. The money settles into the bank account set in your Paystack dashboard (Settings → Payouts). Every payment is re-verified with Paystack's API on the server, plus a signed webhook as backup. Unpaid online orders are cancelled after 30 minutes and their bales go back on sale.
- **Stock is admin-controlled.** Admin → Inventory has −/+ buttons, Restock, Mark sold out, Hide/Show, and a History of every stock change (restocks, orders, cancellations). Changes appear on the website instantly. Paid orders reduce stock automatically. Customers only see Available / Few left / Sold out (the "Few left" level is set in Admin → Settings).
- **Customer data.** All customer and database text is HTML-escaped before rendering (`esc()` in `js/core.js`). Order lookup needs both the code and the phone number.

## Design

Orange (`#f26b1d`) + deep navy (`#0f1b2d`), Plus Jakarta Sans. Tokens live in `src/input.css`.

- **Navbar:** info bar, sticky header that gains a shadow on scroll, search overlay, WhatsApp, cart badge that bumps when you add, slide-in mobile menu.
- **Hero slideshow:** crossfade with slow zoom, animated text, progress dots, arrows, swipe, pause on hover, keyboard arrows. Edit slides in `HERO_SLIDES` in `js/config.js`.
- **Inventory:** wide cards (photo, grade, weight, origin, pieces, stock bar, price, add to cart). Shop page has sidebar filters, search, sort and list/grid view.
- **Bale page:** photo slider with thumbnails, opening video, quantity stepper, spec tiles, related bales.
- **Motion:** scroll reveals, card lift and image zoom on hover, toasts. All motion switches off for users who ask their device for reduced motion.
- **Photos:** stock Unsplash photos stand in until you have real warehouse photos (see `HERO_SLIDES` and `CATEGORY_IMAGES` in `js/config.js`). Bales without an uploaded photo use their category photo.

## Shopping assistant (side AI)

The "Ask our assistant" tab on the right opens a chat panel. It answers from your **live stock, prices and delivery fees** using Claude (`convex/assistant.ts`, model `claude-haiku-4-5-20251001`), links bales it recommends, and sends anything it can't handle to WhatsApp. It's capped at 40 questions a minute across the whole site so a bot can't run up your bill. Without an `ANTHROPIC_API_KEY` it politely points people to WhatsApp.


## Admin login

- The password is whatever you set with `npx convex env set ADMIN_PASSWORD "..."`. If it isn't set, the login page tells you the exact command to run.

### What's in the admin (`/admin/`)

- **Dashboard:** sales today and this month, orders waiting for payment, orders to pack or send, bales in stock, stock value, few left, sold out, a 30-day sales chart, orders by status, revenue by category, how customers paid, recent orders, what needs restocking, best sellers. Only real orders are counted.
- **Orders:** search by code, name or phone; filter by status and payment; change status straight from the list; export to Excel (CSV). Each order has a printable receipt, a WhatsApp button, and "Mark as paid" for cash/POS pickups.
- **Inventory:** −/+ stock, Restock, Mark sold out, Hide/Show, Edit, Delete, and a history of every stock change.
- **Customers:** everyone who has ordered, with order count, total paid, last order and a WhatsApp button.
- **Website:** edit the business name and contacts, the announcement bar, the homepage slideshow (upload photos, change text and buttons, reorder), the About page, the FAQ and social links. Press Save and the site updates immediately.
- **Settings:** WhatsApp number, warehouse address, delivery fee per state, and the "Few left" level.

## Running it locally

Use `npx serve .` (or `npm run serve`). The included `serve.json` stops `serve` from rewriting `page.html?x=y` addresses (which would drop the `?slug=` / `?code=` part and break bale and order pages). VS Code Live Server also works.

## Pages

Home, Shop, Bale, Categories, Grade guide, Deals (Shop with deals filter), Wholesale (bulk quote → WhatsApp), Cart, Checkout, Order, Track order, Delivery & pickup (live fee table from Admin → Settings), Returns & issues, FAQ, About, Contact, Privacy, Terms, and a friendly 404. ⚠️ Review the Returns, Privacy and Terms text with your dad before going live.

## Setup

```bash
npm install

npx convex dev          # log in and create the deployment. Leave it running.
                        # Copy the deployment URL into js/config.js → CONVEX_URL

# Convex env vars (dashboard or CLI):
npx convex env set ADMIN_PASSWORD "your-dad's-password"
npx convex env set PAYSTACK_SECRET_KEY "sk_test_xxx"
npx convex env set SITE_URL "http://localhost:3000"      # the real domain in production
npx convex env set ANTHROPIC_API_KEY "sk-ant-xxx"        # for the AI shopping assistant (console.anthropic.com)

npm run css             # compile Tailwind → css/styles.css (use css:watch while editing)
npm run serve           # http://localhost:5173, admin at /admin/login.html
```

> ES modules don't work from `file://`. Always open the site through a server (`npm run serve`, VS Code Live Server, etc.).

After first login, go to **Admin → Settings** and enter the real bank details, WhatsApp number, warehouse address and delivery fees. Then add bales.

## Paystack webhook

Paystack Dashboard → Settings → API Keys & Webhooks → Webhook URL:

```
https://YOUR-DEPLOYMENT.convex.site/paystack/webhook
```

Note the domain is `.convex.site`, not `.convex.cloud`.

## Deploy

1. `npx convex deploy` pushes the backend to production. Set the same three env vars on the **production** deployment, with `SITE_URL` set to the live domain.
2. Put the production Convex URL in `js/config.js`.
3. `npm run css`
4. Upload the site folder (everything except `node_modules`, `convex`, `src`) to any static host: Netlify, Vercel, Cloudflare Pages, or cPanel `public_html`. It must be served from the domain root because links are absolute (`/shop.html`).
5. Point the Paystack webhook at the production `.convex.site` URL.

## ⚠️ Placeholders to replace

| Where | What |
|---|---|
| `js/config.js` | `CONVEX_URL`, business name, city, phone, email, hours, grade descriptions |
| `index.html` and the other page `<title>`s | Business name — find and replace "Okrika Bales Depot" |
| `about.html` | Your dad's real story |
| `faq.html` | Delivery times, bulk pricing answer |
| `js/admin/product.js` | Category and origin suggestion lists |
| Convex env vars | `ADMIN_PASSWORD`, `PAYSTACK_SECRET_KEY`, `SITE_URL` |
| Admin → Settings | Bank account, WhatsApp, warehouse address, delivery fees |

## Structure

```
*.html               shop pages (index, shop, bale, cart, checkout, order, track, about, contact, faq, 404)
admin/*.html         login, overview (index), orders, order, products, product, settings
css/styles.css       compiled Tailwind (generated — don't edit)
src/input.css        Tailwind source + design tokens
js/config.js         site settings and placeholders
js/core.js           Convex client, escaping, formatting helpers
js/cart.js           cart in localStorage
js/layout.js         shared header, footer, WhatsApp button
js/components.js     bale card, grade stamp, order progress
js/pages/*.js        one script per shop page
js/admin/*.js        one script per admin page
convex/              schema, auth, products, orders, settings, paystack, http (webhook), crons
```

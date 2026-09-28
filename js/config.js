// ⚠️ PLACEHOLDERS — replace before going live
   export const CONVEX_URL = "https://calm-monitor-320.convex.cloud"; // ⚠️ filled in automatically by setup.bat

export const SITE = {
  name: "Okrika Bales Depot", // ⚠️ business name
  tagline: "Sorted second-hand clothing bales, straight from the warehouse.",
  city: "Lagos", // ⚠️
  phone: "+234 800 000 0000", // ⚠️
  email: "orders@example.com", // ⚠️
  hours: "Mon – Sat, 8am – 6pm", // ⚠️
};

export const GRADES = {
  cream: {
    label: "Cream", note: "First selection. Near-new pieces, very few rejects.",
    condition: "Near-new, bright colours, labels often intact", rejects: "Very few (under 5%)", bestFor: "Boutiques and premium resale",
  },
  A: {
    label: "Grade A", note: "Good condition, light wear, few rejects.",
    condition: "Clean, light signs of wear", rejects: "Few (5–10%)", bestFor: "Market stalls and everyday resale",
  },
  B: {
    label: "Grade B", note: "Wearable with visible use. Lowest cost per piece.",
    condition: "Wearable, visible use or fading", rejects: "Some (10–20%)", bestFor: "Budget buyers and high volume",
  },
};

export const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta",
  "Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi",
  "Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara",
];

export const STATUS_LABEL = {
  awaiting_payment: "Awaiting payment",
  confirmed: "Confirmed",
  packed: "Packed",
  dispatched: "On the way",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PAYMENT_LABEL = {
  paystack: "Paid online (Paystack)",
  transfer: "Bank transfer (old)",
  on_site: "Pay at the warehouse",
};
export const CHANNEL_LABEL = { bank_transfer: "Bank transfer", card: "Card", ussd: "USSD", bank: "Bank account" };

// ─── Photos ───────────────────────────────────────────────────────
// ⚠️ Stock photos from Unsplash (free for commercial use) until you have
// your dad's own warehouse photos. Replace the URLs with your own images
// (e.g. put files in /img and use "img/hero-1.jpg").
const u = (id, w = 1800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
export const PHOTOS = {
  warehouse: u("1606053929013-311c13f97b5f"),
  market: u("1517137619222-3d3b1948e27d"),
  denimPile: u("1604072374690-0e7d7bddd54e"),
  rack: u("1540221652346-e5dd6b50f3e7"),
  mixed: u("1484502249930-e1da807099a5"),
  store: u("1521335629791-ce4aec67dd15"),
  folded: u("1567113463300-102a7eb3cb26"),
};

// ─── Default website content ─────────────────────────────────────
// Used until your dad edits it in Admin → Website (saved in Convex).
export const DEFAULT_CONTENT = {
  announcement: "Delivery to all 36 states + FCT",
  heroSlides: [
    { imageUrl: PHOTOS.warehouse, tag: "New bales every week", title: "Quality okrika bales, graded before you buy",
      text: "Cream, Grade A and Grade B bales from the UK, USA, Canada and Korea. See the grade, weight and origin of every bale.",
      ctaLabel: "Shop bales", ctaHref: "shop.html" },
    { imageUrl: PHOTOS.market, tag: "For traders and shop owners", title: "Restock your shop without the gamble",
      text: "Ask for an opening video before you pay. We show you what's inside and stand by every bale we sell.",
      ctaLabel: "See what's in stock", ctaHref: "shop.html?instock=1" },
    { imageUrl: PHOTOS.denimPile, tag: "Nationwide delivery", title: "Pickup in Lagos or delivery to your state",
      text: "Pay by bank transfer or card, or cash and POS at the warehouse. Track your order with your order code.",
      ctaLabel: "How ordering works", ctaHref: "faq.html" },
  ],
  about: {
    title: "We've been opening bales for traders for years",
    body: "We supply second-hand clothing bales to shop owners, market traders and individual buyers across Nigeria. Every bale we sell is imported, graded and stored at our warehouse.\n\nBuying bales shouldn't be a gamble. We tell you the grade, weight and origin upfront, show you inside a bale when you ask, and stand by what we sell.",
    imageUrl: PHOTOS.rack,
  },
  faq: [
    { q: "What do the grades mean?", a: "Cream is the first selection: near-new pieces with very few rejects. Grade A is good condition with light wear. Grade B is wearable with visible use and has the lowest cost per piece." },
    { q: "Can I see inside a bale before I pay?", a: "Yes. Message us on WhatsApp from the bale's page and we'll send an opening video or photos." },
    { q: "How do I pay?", a: "Choose Bank transfer at checkout and a secure Paystack window shows you an account number. Send the exact amount from your bank app and it confirms automatically, no receipt needed. You can also pay by card or USSD, or by cash or POS when you collect at the warehouse." },
    { q: "How long does delivery take?", a: "Lagos orders usually arrive in 1–2 days. Other states take 2–5 days depending on the route. We'll message you when your bale is on the way." },
    { q: "How much is delivery?", a: "It depends on your state. You'll see the exact fee at checkout before you pay." },
    { q: "Can I get a refund?", a: "No. All sales are final and we don't give refunds once a bale is paid for. Ask for an opening video on WhatsApp before you pay so you know exactly what you're getting. If we send the wrong category or grade, we'll exchange it." },
    { q: "Do you sell in bulk to traders?", a: "Yes. For large orders message us on WhatsApp and we'll talk about pricing." },
  ],
  socials: { instagram: "", facebook: "", tiktok: "" },
  deals: { title: "Deals of the week", endsAt: null }, // shows bales with an "original price" set in admin
};

/** Live content: defaults, overwritten by what's saved in Admin → Website. */
export const CONTENT = structuredClone(DEFAULT_CONTENT);
export function applySettings(s) {
  if (!s) return;
  if (s.business) Object.assign(SITE, s.business);
  if (typeof s.announcement === "string") CONTENT.announcement = s.announcement;
  if (s.heroSlides?.length) CONTENT.heroSlides = s.heroSlides.filter((h) => h.imageUrl);
  if (s.about) CONTENT.about = { ...DEFAULT_CONTENT.about, ...s.about, imageUrl: s.about.imageUrl || DEFAULT_CONTENT.about.imageUrl };
  if (s.faq?.length) CONTENT.faq = s.faq;
  if (s.socials) CONTENT.socials = { ...CONTENT.socials, ...s.socials };
  if (s.deals) CONTENT.deals = { ...CONTENT.deals, ...s.deals };
}
export const HERO_SLIDES = CONTENT.heroSlides; // legacy name

// Category photos (used for category tiles and bales without photos)
export const CATEGORY_IMAGES = {
  "Ladies' tops": u("1470309864661-68328b2cd0a5", 900),
  "Men's shirts": u("1709916314093-5bbc88f6ee8c", 900),
  "Jeans": u("1604176354204-9268737828e4", 900),
  "Children's wear": u("1520006403909-838d6b92c22e", 900),
  "Bedsheets": u("1596433904500-97b901c5d274", 900),
  "Jackets": u("1453486030486-0a5ffcd82cd9", 900),
  "Shoes": u("1664095885197-fdff6611560c", 900),
  "Sweaters": u("1517677208171-0bc6725a3e60", 900),
  "T-shirts": u("1548768041-2fceab4c0b85", 900),
  "Gowns": u("1582719188393-bb71ca45dbb9", 900),
  "Mixed": u("1542060748-10c28b62716f", 900),
};
export const FALLBACK_IMAGE = u("1542060748-10c28b62716f", 900);
export const imageFor = (bale) => bale.images?.[0] ?? CATEGORY_IMAGES[bale.category] ?? FALLBACK_IMAGE;

// "Inside the warehouse" gallery on the home page ⚠️ replace with real photos
export const GALLERY = [PHOTOS.warehouse, PHOTOS.rack, PHOTOS.folded, PHOTOS.mixed, PHOTOS.store, u("1555480320-b9fa01a86dd8", 900)];

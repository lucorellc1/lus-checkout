// Vercel serverless function: POST /api/checkout
// Body: { items: [{ tier: "g4_6", qty: 5 }, ...] }
// Returns: { url } — the Stripe Checkout page to send the customer to.
const Stripe = require("stripe");
const { validateCart } = require("../lib/tiers");
const { findPromo } = require("../lib/promo");

const SHOP_NAME = process.env.SHOP_NAME || "Forged Legends";
const COLLECT_SHIPPING = process.env.COLLECT_SHIPPING !== "false"; // on unless set to "false"

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: "Payments aren't set up yet (missing Stripe key)." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const check = validateCart(body && body.items);
  if (!check.ok) return res.status(400).json({ error: check.error });

  const origin =
    process.env.SITE_URL ||
    `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const params = {
      mode: "payment",
      line_items: check.lines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: "usd",
          unit_amount: l.unitCents,
          product_data: {
            name: `${SHOP_NAME} — ${l.label}`,
            description: "2 personalized metal engraved cards per person",
          },
        },
      })),
      // Lets you match each payment to the customer you talked to on Snapchat.
      custom_fields: [
        {
          key: "snapchat",
          label: { type: "custom", custom: "Snapchat username" },
          type: "text",
        },
      ],
      phone_number_collection: { enabled: false },
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    };
    // Discount code: applied if the customer entered one on the site;
    // otherwise Stripe's checkout page shows its own "Add promotion code" box.
    const rawCode = body && typeof body.promo === "string" ? body.promo.trim() : "";
    if (rawCode) {
      const promo = await findPromo(stripe, rawCode);
      if (!promo) return res.status(400).json({ error: "That discount code isn't valid anymore." });
      params.discounts = [{ promotion_code: promo.id }];
    } else {
      params.allow_promotion_codes = true;
    }
    if (COLLECT_SHIPPING) {
      params.shipping_address_collection = { allowed_countries: ["US"] };
    }
    const session = await stripe.checkout.sessions.create(params);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err && err.message);
    return res.status(500).json({ error: "Couldn't start checkout. Please try again." });
  }
};

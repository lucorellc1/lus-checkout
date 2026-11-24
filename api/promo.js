// Vercel serverless function: POST /api/promo  { code: "LUREZ5" }
// Returns { code, percentOff, amountOffCents } if the code is active, or 404 if not.
const Stripe = require("stripe");
const { findPromo } = require("../lib/promo");

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
  try {
    const promo = await findPromo(Stripe(process.env.STRIPE_SECRET_KEY), body && body.code);
    if (!promo) return res.status(404).json({ error: "That code isn't valid." });
    return res.status(200).json({
      code: promo.code,
      percentOff: promo.percentOff,
      amountOffCents: promo.amountOffCents,
    });
  } catch (err) {
    console.error("Stripe error:", err && err.message);
    return res.status(500).json({ error: "Couldn't check that code. Please try again." });
  }
};

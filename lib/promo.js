// Looks up a discount code that you created in your Stripe dashboard
// (Products → Coupons → create coupon → add a promotion code, e.g. LUREZ5).
// Codes live in Stripe, so you can pause them or set an end date there — no code changes needed.
async function findPromo(stripe, rawCode) {
  const code = String(rawCode || "").trim();
  if (!code || code.length > 40) return null;

  const list = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
  const pc = list && list.data && list.data[0];
  if (!pc) return null;
  if (pc.expires_at && pc.expires_at * 1000 < Date.now()) return null;

  // Stripe's API shape differs a little between versions; handle both.
  let coupon = pc.coupon || (pc.promotion && pc.promotion.coupon);
  if (typeof coupon === "string") coupon = await stripe.coupons.retrieve(coupon);
  if (!coupon || coupon.valid === false) return null;

  return {
    id: pc.id,
    code: pc.code,
    percentOff: coupon.percent_off || null,
    amountOffCents: coupon.amount_off || null,
  };
}

module.exports = { findPromo };

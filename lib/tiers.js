// The real prices. The server only charges what is in this file,
// so nobody can change a price in their browser and pay less.
// Each option is one flat price, in US cents. Anyone can choose any option.
const TIERS = {
  solo:   { label: "Solo Order",      unitCents: 12000 },
  g2_3:   { label: "Group of 2–3",    unitCents: 9500 },
  g4_6:   { label: "Group of 4–6",    unitCents: 9000 },
  g7_9:   { label: "Group of 7–9",    unitCents: 8500 },
  g10_19: { label: "Group of 10–19",  unitCents: 8000 },
  g20:    { label: "Group of 20+",    unitCents: 7500 },
};

const MAX_LINES = 10;
const MAX_QTY = 50; // per option, per checkout

// Checks a cart sent by the browser. Returns { ok, lines } or { ok:false, error }.
function validateCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (items.length > MAX_LINES) {
    return { ok: false, error: "Too many items in the cart." };
  }
  const lines = [];
  for (const item of items) {
    const tier = item && TIERS[item.tier];
    if (!tier) return { ok: false, error: "Unknown price option." };
    const qty = item.qty === undefined ? 1 : Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return { ok: false, error: `Quantity must be between 1 and ${MAX_QTY}.` };
    }
    lines.push({ tierId: item.tier, ...tier, qty });
  }
  return { ok: true, lines };
}

module.exports = { TIERS, MAX_QTY, validateCart };

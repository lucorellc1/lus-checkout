const assert = require("assert");
const path = require("path");
const { validateCart } = require("../lib/tiers");

// --- flat-price rules: any option, any person ---
assert.equal(validateCart([]).ok, false);
assert.equal(validateCart([{ tier: "solo" }]).lines[0].unitCents, 12000);
assert.equal(validateCart([{ tier: "g20", qty: 1 }]).lines[0].unitCents, 7500);   // anyone can pick 20+
assert.equal(validateCart([{ tier: "g2_3", qty: 1 }]).lines[0].unitCents, 9500);
assert.equal(validateCart([{ tier: "g4_6", qty: 2 }]).ok, true);
assert.equal(validateCart([{ tier: "g4_6", qty: 0 }]).ok, false);
assert.equal(validateCart([{ tier: "g4_6", qty: 51 }]).ok, false);
assert.equal(validateCart([{ tier: "g7_9", qty: 1.5 }]).ok, false);
assert.equal(validateCart([{ tier: "fake", qty: 1 }]).ok, false);
// A tampered price from the browser is ignored — server uses its own table.
assert.equal(validateCart([{ tier: "solo", qty: 1, price: 1 }]).lines[0].unitCents, 12000);

// --- checkout handler with a fake Stripe ---
let captured;
const stripePath = require.resolve("stripe", { paths: [path.join(__dirname, "..")] });
require.cache[stripePath] = {
  id: stripePath, filename: stripePath, loaded: true,
  exports: () => ({
    checkout: { sessions: { create: async (p) => { captured = p; return { url: "https://checkout.stripe.com/test" }; } } },
    // Pretend Stripe has one active code: LUREZ5 = 5% off (Stripe matches codes case-insensitively).
    promotionCodes: { list: async ({ code }) => ({
      data: code.toUpperCase() === "LUREZ5"
        ? [{ id: "promo_123", code: "LUREZ5", active: true, expires_at: null, coupon: { percent_off: 5, valid: true } }]
        : [] }) },
    coupons: { retrieve: async () => null },
  }),
};
process.env.STRIPE_SECRET_KEY = "sk_test_x";
const handler = require("../api/checkout");

function call(body) {
  return new Promise((resolve) => {
    const res = { code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.code = c; return this; }, json(d) { resolve({ code: this.code, data: d }); } };
    handler({ method: "POST", body, headers: { host: "shop.example", "x-forwarded-proto": "https" } }, res);
  });
}

(async () => {
  const ok = await call({ items: [{ tier: "g4_6", qty: 1 }] });
  assert.equal(ok.code, 200);
  assert.equal(ok.data.url, "https://checkout.stripe.com/test");
  assert.equal(captured.line_items[0].price_data.unit_amount, 9000);
  assert.equal(captured.line_items[0].quantity, 1);
  assert.equal(captured.success_url.startsWith("https://shop.example/success.html"), true);

  assert.equal(captured.allow_promotion_codes, true); // no code typed → Stripe page offers a code box
  assert.equal(captured.discounts, undefined);

  const bad = await call({ items: [{ tier: "nope", qty: 1 }] });
  assert.equal(bad.code, 400);

  // Discount code LUREZ5
  const withCode = await call({ items: [{ tier: "solo", qty: 1 }], promo: "lurez5" });
  assert.equal(withCode.code, 200);
  assert.deepEqual(captured.discounts, [{ promotion_code: "promo_123" }]);
  assert.equal(captured.allow_promotion_codes, undefined); // Stripe forbids both at once
  const badCode = await call({ items: [{ tier: "solo", qty: 1 }], promo: "FREESTUFF" });
  assert.equal(badCode.code, 400);

  // /api/promo lookup used by the site's "Apply" button
  const promoHandler = require("../api/promo");
  const lookup = (code) => new Promise((resolve) => {
    const res = { code: 200, setHeader() {}, status(c) { this.code = c; return this; },
      json(d) { resolve({ code: this.code, data: d }); } };
    promoHandler({ method: "POST", body: { code } }, res);
  });
  const good = await lookup("LUREZ5");
  assert.equal(good.code, 200);
  assert.equal(good.data.percentOff, 5);
  assert.equal((await lookup("NOPE")).code, 404);
  console.log("Discount code checks passed: LUREZ5 = 5% off.");
  console.log("All checks passed.");
})();

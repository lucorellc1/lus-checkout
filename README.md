# Forged Legends: checkout site setup guide

This is the checkout-only site. Your info site (home, gallery, policies) is the separate `lus-site` project.

A one-page shop where customers pick a price tier, add it to a cart, and pay through Stripe.
Card details are entered on Stripe's own secure page and never touch this site.

## Prices (flat, one card each)

| Option | Price |
|---|---|
| Solo Order | $120 |
| Group of 2–3 | $95 |
| Group of 4–6 | $90 |
| Group of 7–9 | $85 |
| Group of 10–19 | $80 |
| Group of 20+ | $75 |

Anyone can choose any option, so each person in a group can pay for their own card separately.
You tell them on Snapchat which option to pick. Tapping "Add to cart" again adds another card at that price (up to 50).

**To change a price:** edit it in **both** `lib/tiers.js` (what's actually charged, in cents) and the
`TIERS` list near the bottom of `public/index.html` (and the Pricing section of the info site) (what's shown).

## What's in here

- `public/index.html`: the order page (change `SHOP_NAME` at the top of the script; once your info site is online, paste its address into `MAIN_SITE_URL` so the footer links to your policies)
- `public/success.html`: the "Payment received" page
- `api/checkout.js`: creates the Stripe checkout; also asks the customer for their **Snapchat username** so you can match payments to people
- `lib/tiers.js`: the real prices
- `test/`: run `npm test` to check the price rules

## Put it online (about 15 minutes, free)

1. **Stripe:** sign up at stripe.com. Stay in **Test mode** for now. Go to Developers → API keys and copy the **Secret key** (`sk_test_…`).
2. **GitHub:** create a free account, make a new repository, and upload this folder (leave out `node_modules`).
3. **Vercel:** sign up at vercel.com with GitHub → **Add New → Project** → pick the repository → Deploy.
4. In Vercel, open **Settings → Environment Variables** and add:
   - `STRIPE_SECRET_KEY` = your `sk_test_…` key
   - `SHOP_NAME` = Forged Legends
   - `COLLECT_SHIPPING` = `false` if you hand cards over in person (leave it out to collect a US mailing address)
   Then **redeploy** (Deployments → ⋯ → Redeploy).
5. **Test it:** open your site, add an option, check out with card `4242 4242 4242 4242`, any future date, and any CVC. The payment shows up in Stripe's test dashboard.
6. **Go live:** finish Stripe's account activation (business details and bank account), switch the dashboard to live mode, copy the live key (`sk_live_…`), replace `STRIPE_SECRET_KEY` in Vercel, and redeploy.
7. Put the site link in your Snapchat profile and send it to customers.

## Discount codes (e.g. LUREZ5 for the Christmas sale)

The site has a "Discount code" box in the cart. Codes are created in Stripe, not in the code, so you can
start, pause or end a sale from the dashboard:

1. In Stripe, go to **Product catalog → Coupons → + New**.
2. Choose **Percentage discount**, enter **5**, and set **Duration** to *Once*. Name it something like "Christmas 5%".
3. Under **Customer-facing codes**, add the code **LUREZ5**. If you want the sale to end on its own,
   set an **expiration date** (for example Dec 26), and optionally a limit on how many times it can be used.
4. Save. The code works on the site right away.

Customers can type codes in any capitals (lurez5 works too). To end the sale early, open the promotion code in
Stripe and switch it to **inactive**. **Test mode and live mode are separate,** so create the code in both.

**Tip:** In Stripe → Settings → Customer emails, turn on **successful payment receipts** so buyers get a receipt automatically.
Keep your secret key private. Only put it in Vercel's settings, never in the code or a message.

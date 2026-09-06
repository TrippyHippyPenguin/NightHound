# NightHound storefront notes

Public store settings, product variants, shipping rules, promotions, feature flags, and contact details live in `config.js`. Unknown product facts remain `null` and are omitted from the storefront.

Display-currency conversions are client-side estimates only. The dated USD conversion table in `config.js` is derived from European Central Bank reference rates and must be refreshed manually; USD remains the authoritative store currency.

## Information still needed

- Direct support email
- Collar battery runtime and charging time
- Exact USB connector type
- Water-resistance rating
- Product weight
- Delivery estimates and fulfillment time
- Fulfillment origin, carrier, tracking, and international availability
- Pendant-color fulfillment rules
- Leash-attachment/load rating
- Official social profiles
- Real customer reviews and demonstration video

## Future checkout integration

Checkout and Stripe are intentionally disabled through `checkoutEnabled` and `stripeEnabled`. The static site must never contain a Stripe secret key.

Before enabling checkout, create a server-side or serverless checkout-session endpoint. That trusted endpoint must:

1. Accept only stable product IDs, variant IDs, and quantities from the browser.
2. Look up product and shipping prices on the server; never trust a client-submitted price.
3. Validate supported colors, sizes, quantities, and availability.
4. Calculate free promotional pendant quantities from eligible collar quantities.
5. Calculate shipping from authoritative store rules.
6. Apply only server-configured, active coupons or bundle discounts.
7. Create and return a Stripe Checkout Session using a secret stored outside this repository.
8. Confirm paid orders through signed Stripe webhooks before fulfillment.

After that endpoint exists, add its URL to `checkoutSessionEndpoint`, verify all policies and contact details, and enable the two checkout flags only after end-to-end testing.

## Local quality checks

Install development dependencies with `npm install`, install the Chromium test browser with `npx playwright install chromium`, then run `npm run check`. The suite validates HTML, key storefront interactions, all variants, cart math, persistence, disabled checkout, page loading, source references, metadata, and horizontal overflow at the target responsive widths.

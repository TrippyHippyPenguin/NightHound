/* NightHound's single source of truth for public storefront data. */
(function () {
  'use strict';

  const baseUrl = 'https://trippyhippypenguin.github.io/NightHound/';

  window.NIGHTHOUND = Object.freeze({
    site: Object.freeze({
      name: 'NightHound',
      baseUrl,
      supportEmail: null,
      supportIssueWindowDays: 7,
      socialLinks: Object.freeze({})
    }),
    store: Object.freeze({
      currency: 'USD',
      locale: 'en-US',
      displayCurrencies: Object.freeze([
        Object.freeze({ code: 'USD', label: 'US Dollar', locale: 'en-US', usdRate: 1 }),
        Object.freeze({ code: 'CAD', label: 'Canadian Dollar', locale: 'en-CA', usdRate: 1.379969 }),
        Object.freeze({ code: 'EUR', label: 'Euro', locale: 'en-IE', usdRate: 0.860437 }),
        Object.freeze({ code: 'GBP', label: 'British Pound', locale: 'en-GB', usdRate: 0.739098 }),
        Object.freeze({ code: 'AUD', label: 'Australian Dollar', locale: 'en-AU', usdRate: 1.388229 })
      ]),
      exchangeRateDate: '2026-09-04',
      exchangeRateSource: 'European Central Bank reference rates',
      checkoutEnabled: false,
      stripeEnabled: false,
      checkoutSessionEndpoint: null,
      standardShipping: 1.99,
      freeShippingThreshold: 30,
      couponsEnabled: false,
      activeCoupons: Object.freeze([])
    }),
    promotions: Object.freeze({
      freePendantEnabled: true,
      freePendantQuantityPerCollar: 1,
      pendantColorSelectable: false,
      pendantName: 'Rechargeable LED Pendant',
      pendantImage: 'assets/led-pendants.webp',
      announcement: 'FREE RECHARGEABLE LED PENDANT WITH EVERY COLLAR • FREE SHIPPING $30+'
    }),
    reviews: Object.freeze({
      enabled: false,
      items: Object.freeze([])
    }),
    media: Object.freeze({
      demonstrationVideoUrl: null
    }),
    catalog: Object.freeze({
      futureProductSlugs: Object.freeze([
        'night-walk-kit',
        'reflective-leash',
        'led-leash',
        'nighttime-harness'
      ])
    }),
    products: Object.freeze([
      Object.freeze({
        id: 'nh-glow-collar',
        slug: 'glow-collar',
        name: 'NightHound Glow Collar',
        price: 16.99,
        description: 'Rechargeable illumination for evening and early-morning dog walks.',
        colors: Object.freeze([
          Object.freeze({ name: 'Blue', slug: 'blue', hex: '#188dff', productImage: 'assets/collar-blue-v2.webp', lifestyleImage: 'assets/dog-collar-blue-v2.webp', lifestyleAlt: 'Dog wearing a blue illuminated collar on an evening walk' }),
          Object.freeze({ name: 'Green', slug: 'green', hex: '#18c66a', productImage: 'assets/collar-green.webp', lifestyleImage: 'assets/dog-collar-green.webp', lifestyleAlt: 'Dog wearing a green illuminated collar on an evening walk' }),
          Object.freeze({ name: 'Red', slug: 'red', hex: '#fa3d4f', productImage: 'assets/collar-red.webp', lifestyleImage: 'assets/dog-collar-red.webp', lifestyleAlt: 'Dog wearing a red illuminated collar on an evening walk' }),
          Object.freeze({ name: 'Pink', slug: 'pink', hex: '#f04db6', productImage: 'assets/collar-pink.webp', lifestyleImage: 'assets/dog-collar-pink.webp', lifestyleAlt: 'Dog wearing a pink illuminated collar on an evening walk' }),
          Object.freeze({ name: 'Orange', slug: 'orange', hex: '#ff7a22', productImage: 'assets/collar-orange.webp', lifestyleImage: 'assets/dog-collar-orange.webp', lifestyleAlt: 'Dog wearing an orange illuminated collar on an evening walk' }),
          Object.freeze({ name: 'Yellow', slug: 'yellow', hex: '#f2d900', productImage: 'assets/collar-yellow.webp', lifestyleImage: 'assets/dog-collar-yellow.webp', lifestyleAlt: 'Dog wearing a yellow illuminated collar on an evening walk' })
        ]),
        sizes: Object.freeze([
          Object.freeze({ name: 'XS', minCm: 28, maxCm: 38, label: '28–38 cm' }),
          Object.freeze({ name: 'S', minCm: 34, maxCm: 41, label: '34–41 cm' }),
          Object.freeze({ name: 'M', minCm: 37, maxCm: 46, label: '37–46 cm' }),
          Object.freeze({ name: 'L', minCm: 41, maxCm: 52, label: '41–52 cm' }),
          Object.freeze({ name: 'XL', minCm: 42, maxCm: 56, label: '42–56 cm' }),
          Object.freeze({ name: 'XXL', minCm: 43, maxCm: 62, label: '43–62 cm' })
        ]),
        material: 'Nylon',
        chargingConnector: 'USB',
        chargingTime: null,
        runtime: null,
        lightModes: null,
        waterResistance: null,
        weight: null,
        leashAttachmentRated: null,
        sku: null,
        closure: 'Quick-release buckle',
        battery: 'Rechargeable battery included',
        includedItems: Object.freeze([
          'NightHound Glow Collar',
          'Rechargeable LED pendant'
        ]),
        careInstructions: null
      })
    ])
  });
})();

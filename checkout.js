const RETAIL_PRICE = 18.99;
const SHIPPING_THRESHOLD = 40;
const STANDARD_SHIPPING = 4.99;
const PROMO_CODE = 'NIGHTHOUND10';
const BASIN_ENDPOINT = 'https://usebasin.com/f/567a8bd2fb06';
const PENDING_ORDER_KEY = 'nighthound-pending-order-number';
const CURRENCIES = {
  USD: { rate: 1, symbol: '$' },
  CAD: { rate: 1.389, symbol: 'C$' },
  EUR: { rate: 0.862, symbol: '€' },
  GBP: { rate: 0.739, symbol: '£' },
  AUD: { rate: 1.396, symbol: 'A$' },
  NZD: { rate: 1.690, symbol: 'NZ$' }
};
const DEALS = {
  1: { name: '2-Collar Bundle', targetQuantity: 2, price: 34.99, percent: 8, kicker: '2-collar bundle' },
  2: { name: '3-Collar Bundle', targetQuantity: 3, price: 47.99, percent: 16, kicker: '3-collar bundle' },
  3: { name: '4-Collar Bundle', targetQuantity: 4, price: 59.99, percent: 21, kicker: '4-collar bundle' }
};

let cart = [];
try { cart = JSON.parse(localStorage.getItem('nighthound-cart') || '[]'); } catch { cart = []; }
cart = cart.map(item => ({ ...item, price: RETAIL_PRICE }));

const qualifyingDeal = DEALS[cart.length] || null;
const state = { upsell: false, extraColor: 'Blue', promoApplied: false };
let activeCurrency = 'USD';
try {
  const savedCurrency = localStorage.getItem('nighthound-currency');
  if (savedCurrency && CURRENCIES[savedCurrency]) activeCurrency = savedCurrency;
} catch { /* Checkout defaults to USD when storage is unavailable. */ }

function money(value) {
  const currency = CURRENCIES[activeCurrency];
  return `${currency.symbol}${(value * currency.rate).toFixed(2)} ${activeCurrency}`;
}

function createOrderNumber() {
  const date = new Date();
  const datePart = [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('');
  const randomBytes = new Uint8Array(5);
  crypto.getRandomValues(randomBytes);
  const randomPart = Array.from(randomBytes, byte => byte.toString(36).padStart(2, '0')).join('').toUpperCase();
  return `NH-${datePart}-${randomPart}`;
}

function pendingOrderNumber() {
  try {
    const existing = sessionStorage.getItem(PENDING_ORDER_KEY);
    if (existing) return existing;
    const created = createOrderNumber();
    sessionStorage.setItem(PENDING_ORDER_KEY, created);
    return created;
  } catch {
    return createOrderNumber();
  }
}

function currentOrder() {
  const originalItems = cart.map(item => ({ ...item, price: Number(item.price) }));
  const retail = originalItems.reduce((sum, item) => sum + item.price, 0) + (state.upsell ? RETAIL_PRICE : 0);
  const items = [...originalItems];
  if (state.upsell && qualifyingDeal) items.push({ name: `${state.extraColor} Glow Collar`, color: state.extraColor, price: RETAIL_PRICE, upsell: true });

  const dealDiscount = state.upsell && qualifyingDeal ? retail - qualifyingDeal.price : 0;
  const afterDeal = retail - dealDiscount;
  const promoDiscount = state.promoApplied ? afterDeal * 0.10 : 0;
  const subtotal = afterDeal - promoDiscount;
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : (items.length ? STANDARD_SHIPPING : 0);
  return {
    deal: state.upsell ? qualifyingDeal?.name : null,
    promoCode: state.promoApplied ? PROMO_CODE : null,
    items,
    retail,
    dealDiscount,
    promoDiscount,
    subtotal,
    shipping,
    total: subtotal + shipping
  };
}

function setupUpsell() {
  const offer = document.querySelector('#checkout-upsell');
  const empty = document.querySelector('#checkout-upsell-empty');
  if (!qualifyingDeal) {
    offer.hidden = true;
    empty.hidden = false;
    if (cart.length >= 4) {
      empty.querySelector('b').textContent = 'Best available pack reached';
      empty.querySelector('p').textContent = 'Your cart already has four or more collars, so you have reached the highest listed bundle tier.';
      empty.querySelector('a').hidden = true;
    }
    return;
  }

  offer.hidden = false;
  empty.hidden = true;
  const retail = qualifyingDeal.targetQuantity * RETAIL_PRICE;
  const savings = retail - qualifyingDeal.price;
  document.querySelector('#upsell-kicker').textContent = qualifyingDeal.kicker;
  document.querySelector('#upsell-title').textContent = `Upgrade to ${qualifyingDeal.targetQuantity} collars — save ${qualifyingDeal.percent}%`;
  document.querySelector('#upsell-savings').textContent = `Save ${money(savings)} on ${qualifyingDeal.targetQuantity} collars`;
  document.querySelector('#upsell-retail').textContent = money(retail).replace(' USD', '');
  document.querySelector('#upsell-price').textContent = money(qualifyingDeal.price).replace(' USD', '');
}

const dealAlert = document.querySelector('#deal-alert');
let dealAlertReturnFocus = null;

function closeDealAlert() {
  if (!dealAlert || dealAlert.hidden) return;
  dealAlert.hidden = true;
  dealAlert.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  dealAlertReturnFocus?.focus();
}

function setupDealAlert() {
  if (!dealAlert || !qualifyingDeal) return;
  const alertKey = `nighthound-deal-alert-${cart.length}`;
  try { if (sessionStorage.getItem(alertKey)) return; } catch { /* Show the alert when storage is unavailable. */ }

  const regularBundlePrice = qualifyingDeal.targetQuantity * RETAIL_PRICE;
  const currentCartPrice = cart.length * RETAIL_PRICE;
  const retailSavings = regularBundlePrice - qualifyingDeal.price;
  const stepUp = qualifyingDeal.price - currentCartPrice;
  document.querySelector('#deal-alert-title').textContent = `Your cart unlocks the ${qualifyingDeal.targetQuantity}-collar bundle.`;
  document.querySelector('#deal-alert-copy').textContent = `Add one collar and pay ${money(qualifyingDeal.price)} total—only ${money(stepUp)} more than your current cart.`;
  document.querySelector('#deal-alert-total').textContent = money(qualifyingDeal.price).replace(' USD', '');
  document.querySelector('#deal-alert-savings').textContent = money(retailSavings).replace(' USD', '');
  document.querySelector('#deal-alert-step-up').textContent = money(stepUp).replace(' USD', '');

  dealAlertReturnFocus = document.activeElement;
  dealAlert.hidden = false;
  dealAlert.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  try { sessionStorage.setItem(alertKey, 'shown'); } catch { /* The modal still works without persistence. */ }
  window.setTimeout(() => document.querySelector('#deal-alert-view')?.focus(), 0);
}

document.querySelector('#deal-alert-close')?.addEventListener('click', closeDealAlert);
document.querySelector('#deal-alert-dismiss')?.addEventListener('click', closeDealAlert);
dealAlert?.addEventListener('click', event => { if (event.target === dealAlert) closeDealAlert(); });
document.querySelector('#deal-alert-view')?.addEventListener('click', () => {
  closeDealAlert();
  document.querySelector('.checkout-deals')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.setTimeout(() => document.querySelector('#checkout-upsell-input')?.focus(), 450);
});
document.addEventListener('keydown', event => {
  if (dealAlert?.hidden) return;
  if (event.key === 'Escape') {
    closeDealAlert();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...dealAlert.querySelectorAll('button:not([disabled])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

function renderSummary() {
  const order = currentOrder();
  const items = document.querySelector('#checkout-items');
  const empty = document.querySelector('#checkout-empty');
  items.hidden = order.items.length === 0;
  empty.hidden = order.items.length !== 0;
  items.innerHTML = order.items.map(item => `<div class="checkout-line"><div class="checkout-line-image"><img src="assets/collar-${item.color.toLowerCase()}.png" alt=""></div><div><b>${item.color} Glow Collar${item.upsell ? ' <em>Bundle item</em>' : ''}</b><span>Adjustable · ${item.color}</span></div><strong>${money(Number(item.price))}</strong></div>`).join('');

  const savings = order.dealDiscount + order.promoDiscount;
  document.querySelector('#checkout-subtotal').textContent = money(order.retail);
  document.querySelector('#checkout-savings').textContent = savings > 0 ? `−${money(savings)}` : '—';
  document.querySelector('#checkout-shipping').textContent = order.shipping === 0 && order.items.length ? 'FREE' : money(order.shipping);
  document.querySelector('#checkout-total').textContent = money(order.total);
  document.querySelector('#checkout-max-savings').textContent = `Save up to ${money((4 * RETAIL_PRICE) - DEALS[3].price)}`;
  document.querySelector('#checkout-announcement-threshold').textContent = money(SHIPPING_THRESHOLD);

  const remaining = Math.max(0, SHIPPING_THRESHOLD - order.subtotal);
  const progress = Math.min(100, order.subtotal / SHIPPING_THRESHOLD * 100);
  document.querySelector('#checkout-shipping-progress').style.width = `${progress}%`;
  document.querySelector('#checkout-shipping-message').textContent = !order.items.length ? 'Add collars to start' : remaining === 0 ? 'Free shipping unlocked' : `Add ${money(remaining)} for free shipping`;
  document.querySelector('#checkout-shipping-label').textContent = remaining === 0 && order.items.length ? 'FREE' : `${money(SHIPPING_THRESHOLD).replace(` ${activeCurrency}`, '')} goal`;
}

document.querySelector('#checkout-upsell-input').addEventListener('change', event => {
  state.upsell = event.target.checked;
  event.target.closest('.checkout-deal-card').classList.toggle('selected', state.upsell);
  document.querySelector('#checkout-color-choices').hidden = !state.upsell;
  if (state.upsell && state.promoApplied) {
    state.promoApplied = false;
    document.querySelector('#promo-code').value = '';
    document.querySelector('#promo-message').textContent = 'Pack deals and promo codes cannot be combined. The pack deal is applied.';
  }
  renderSummary();
});

document.querySelector('#upsell-color').addEventListener('change', event => {
  state.extraColor = event.target.value;
  renderSummary();
});

document.querySelector('#apply-promo').addEventListener('click', () => {
  const input = document.querySelector('#promo-code');
  const message = document.querySelector('#promo-message');
  const code = input.value.trim().toUpperCase();
  if (code !== PROMO_CODE) {
    state.promoApplied = false;
    message.textContent = code ? 'That promo code is not valid.' : `Enter ${PROMO_CODE} to receive 10% off.`;
  } else if (state.upsell) {
    state.promoApplied = false;
    message.textContent = 'NIGHTHOUND10 cannot be combined with a pack deal.';
  } else if (!cart.length) {
    state.promoApplied = false;
    message.textContent = 'Add a collar before applying this promo code.';
  } else {
    state.promoApplied = true;
    input.value = PROMO_CODE;
    message.textContent = 'NIGHTHOUND10 applied — 10% off your collar subtotal.';
  }
  renderSummary();
});

document.querySelector('#promo-code').addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.querySelector('#apply-promo').click();
  }
});

document.querySelector('#checkout-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const order = currentOrder();
  if (!order.items.length) {
    document.querySelector('#checkout-status').textContent = 'Add at least one collar before continuing.';
    document.querySelector('.checkout-deals').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const details = Object.fromEntries(new FormData(form).entries());
  const orderNumber = pendingOrderNumber();
  const discount = order.dealDiscount + order.promoDiscount;
  const payload = {
    order_number: orderNumber,
    order_status: 'Order request - payment not collected',
    email: details.email,
    first_name: details.firstName,
    last_name: details.lastName,
    street_address: details.address,
    city: details.city,
    state: details.state,
    postal_code: details.postalCode,
    country: details.country,
    item_count: order.items.length,
    items: order.items.map((item, index) => `${index + 1}. ${item.name} (${item.color}) - ${money(Number(item.price))}${item.upsell ? ' [bundle item]' : ''}`).join('\n'),
    deal: order.deal || 'None',
    promo_code: order.promoCode || 'None',
    retail_total: money(order.retail),
    discount: money(discount),
    subtotal: money(order.subtotal),
    shipping: order.shipping === 0 ? 'FREE' : money(order.shipping),
    order_total: money(order.total),
    currency: activeCurrency,
    created_at: new Date().toISOString(),
    source_page: window.location.href
  };
  const button = form.querySelector('[type="submit"]');
  const status = document.querySelector('#checkout-status');
  button.disabled = true;
  button.textContent = 'Sending Order…';
  status.textContent = `Sending order ${orderNumber}…`;

  try {
    sessionStorage.setItem('nighthound-checkout-payload', JSON.stringify(payload));
    const response = await fetch(BASIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Basin returned ${response.status}`);

    localStorage.removeItem('nighthound-cart');
    sessionStorage.removeItem(PENDING_ORDER_KEY);
    sessionStorage.setItem('nighthound-last-order-number', orderNumber);
    button.textContent = 'Order Request Sent';
    status.textContent = `Thank you! Your order number is ${orderNumber}. We sent your request to NightHound and will contact you at ${details.email}. No payment was collected.`;
    form.querySelectorAll('input, select, button').forEach(control => { control.disabled = true; });
  } catch (error) {
    console.error('NightHound order submission failed:', error);
    button.disabled = false;
    button.textContent = 'Try Sending Again';
    status.textContent = `We could not send order ${orderNumber}. Check your connection and try again; your order number will stay the same.`;
  }
});

setupUpsell();
renderSummary();
setupDealAlert();

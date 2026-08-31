const RETAIL_PRICE = 18.99;
const SHIPPING_THRESHOLD = 40;
const STANDARD_SHIPPING = 4.99;
const PROMO_CODE = 'NIGHTHOUND10';
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

function money(value) { return `$${value.toFixed(2)} USD`; }

function currentOrder() {
  const originalItems = cart.map(item => ({ ...item, price: Number(item.price) }));
  const retail = originalItems.reduce((sum, item) => sum + item.price, 0) + (state.upsell ? RETAIL_PRICE : 0);
  const items = [...originalItems];
  if (state.upsell && qualifyingDeal) items.push({ name: `${state.extraColor} Glow Collar`, color: state.extraColor, price: RETAIL_PRICE, upsell: true });

  const dealDiscount = state.upsell && qualifyingDeal ? retail - qualifyingDeal.price : 0;
  const afterDeal = retail - dealDiscount;
  const promoDiscount = state.promoApplied ? afterDeal * 0.10 : 0;
  const subtotal = afterDeal - promoDiscount;
  return {
    deal: state.upsell ? qualifyingDeal?.name : null,
    promoCode: state.promoApplied ? PROMO_CODE : null,
    items,
    retail,
    dealDiscount,
    promoDiscount,
    subtotal
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
  const shipping = order.subtotal >= SHIPPING_THRESHOLD ? 0 : (order.items.length ? STANDARD_SHIPPING : 0);
  document.querySelector('#checkout-subtotal').textContent = money(order.retail);
  document.querySelector('#checkout-savings').textContent = savings > 0 ? `−${money(savings)}` : '—';
  document.querySelector('#checkout-shipping').textContent = shipping === 0 && order.items.length ? 'FREE' : money(shipping);
  document.querySelector('#checkout-total').textContent = money(order.subtotal + shipping);

  const remaining = Math.max(0, SHIPPING_THRESHOLD - order.subtotal);
  const progress = Math.min(100, order.subtotal / SHIPPING_THRESHOLD * 100);
  document.querySelector('#checkout-shipping-progress').style.width = `${progress}%`;
  document.querySelector('#checkout-shipping-message').textContent = !order.items.length ? 'Add collars to start' : remaining === 0 ? 'Free shipping unlocked' : `Add ${money(remaining)} for free shipping`;
  document.querySelector('#checkout-shipping-label').textContent = remaining === 0 && order.items.length ? 'FREE' : '$40 goal';
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

document.querySelector('#checkout-form').addEventListener('submit', event => {
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
  const payload = { customer: details, deal: order.deal, promoCode: order.promoCode, items: order.items, retail: order.retail, discount: order.dealDiscount + order.promoDiscount, subtotal: order.subtotal, createdAt: new Date().toISOString() };
  sessionStorage.setItem('nighthound-checkout-payload', JSON.stringify(payload));
  document.querySelector('#checkout-status').textContent = 'Order details are ready. Connect the inbox and payment APIs to send and complete this order.';
});

setupUpsell();
renderSummary();
setupDealAlert();

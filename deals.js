const CAD_RATE = 1.38;
const RETAIL_PRICE = 19.99;
const SHIPPING_THRESHOLD = 35;
const COLORS = ['Red', 'Green', 'Yellow', 'Blue', 'Orange'];

const DEALS = {
  popular: { name: 'Buy 2, Save $5', quantity: 2, price: 34.99 },
  best: { name: 'Buy 3, Save $12', quantity: 3, price: 47.99 },
  family: { name: 'Family Pack: 4 Collars', quantity: 4, price: 59.99 },
  'third-half': { name: '3rd Collar 50% Off', quantity: 3, price: 49.98 },
  bogo: { name: 'BOGO 40% Off', quantity: 2, price: 31.98 }
};

const state = {
  deal: 'popular',
  currency: 'USD',
  colors: ['Blue', 'Green', 'Orange', 'Red', 'Yellow'],
  secondAddon: false,
  mysteryAddon: false,
  themeManual: false
};

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeToggle = document.querySelector('.deal-theme-toggle');

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(!isDark));
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
}

setTheme(systemTheme.matches ? 'dark' : 'light');
themeToggle.addEventListener('click', () => {
  state.themeManual = true;
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
systemTheme.addEventListener('change', event => {
  if (!state.themeManual) setTheme(event.matches ? 'dark' : 'light');
});

function formatPrice(usd) {
  const value = state.currency === 'CAD' ? usd * CAD_RATE : usd;
  return `${state.currency === 'CAD' ? 'C$' : '$'}${value.toFixed(2)} ${state.currency}`;
}

function currentQuantity() {
  return DEALS[state.deal].quantity + (state.secondAddon ? 1 : 0);
}

function renderColorSlots() {
  const slotCount = currentQuantity();
  const container = document.querySelector('#color-slots');
  container.innerHTML = Array.from({ length: slotCount }, (_, index) => {
    const selected = state.colors[index] || COLORS[index % COLORS.length];
    state.colors[index] = selected;
    const isExtra = state.secondAddon && index === slotCount - 1;
    return `<div class="color-slot">
      <div class="color-slot-title"><span>Collar ${index + 1}</span>${isExtra ? '<small>$12.99 add-on</small>' : ''}</div>
      <div class="slot-colors" role="radiogroup" aria-label="Color for collar ${index + 1}">
        ${COLORS.map(color => `<button class="slot-color ${color.toLowerCase()} ${selected === color ? 'selected' : ''}" type="button" data-slot="${index}" data-color="${color}" role="radio" aria-checked="${selected === color}"><i></i>${color}</button>`).join('')}
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.slot-color').forEach(button => button.addEventListener('click', () => {
    state.colors[Number(button.dataset.slot)] = button.dataset.color;
    renderColorSlots();
    renderSummary();
  }));
}

function calculateDeal() {
  const deal = DEALS[state.deal];
  let total = deal.price;
  let retail = deal.quantity * RETAIL_PRICE;
  if (state.secondAddon) {
    total += 12.99;
    retail += RETAIL_PRICE;
  }
  if (state.mysteryAddon) {
    total += 10.99;
    retail += RETAIL_PRICE;
  }
  return { total, retail, savings: retail - total };
}

function renderSummary() {
  const deal = DEALS[state.deal];
  const totals = calculateDeal();
  document.querySelector('#summary-deal').textContent = deal.name;
  document.querySelector('#summary-retail').textContent = formatPrice(totals.retail);
  document.querySelector('#summary-savings').textContent = formatPrice(totals.savings);
  document.querySelector('#summary-total').textContent = formatPrice(totals.total);

  const selectedColors = state.colors.slice(0, currentQuantity());
  document.querySelector('#summary-collars').innerHTML = selectedColors.map((color, index) => `<div><span><i class="summary-dot ${color.toLowerCase()}"></i>Collar ${index + 1}</span><strong>${color}</strong></div>`).join('') + (state.mysteryAddon ? '<div><span><i class="summary-dot mystery"></i>Extra collar</span><strong>Mystery</strong></div>' : '');

  const remaining = Math.max(0, SHIPPING_THRESHOLD - totals.total);
  const progress = Math.min(100, (totals.total / SHIPPING_THRESHOLD) * 100);
  document.querySelector('#shipping-progress').style.width = `${progress}%`;
  document.querySelector('#shipping-message').textContent = remaining === 0 ? 'You unlocked free shipping' : `Add ${formatPrice(remaining)} for free shipping`;
  document.querySelector('#shipping-status').textContent = remaining === 0 ? 'Free' : `${Math.round(progress)}%`;
}

function updateCurrency() {
  document.querySelector('.deal-shipping-threshold').textContent = formatPrice(SHIPPING_THRESHOLD);
  document.querySelectorAll('[data-usd]').forEach(element => {
    const prefix = element.closest('.addon-card') ? '+' : '';
    element.textContent = `${prefix}${formatPrice(Number(element.dataset.usd))}`;
  });
  renderSummary();
}

document.querySelector('#deal-currency').addEventListener('change', event => {
  state.currency = event.target.value;
  updateCurrency();
});

document.querySelectorAll('.deal-option').forEach(button => button.addEventListener('click', () => {
  state.deal = button.dataset.deal;
  document.querySelectorAll('.deal-option').forEach(option => {
    option.classList.remove('selected');
    option.setAttribute('aria-checked', 'false');
  });
  button.classList.add('selected');
  button.setAttribute('aria-checked', 'true');
  document.querySelector('#deal-status').textContent = 'Choose your colors, then add the configured deal.';
  renderColorSlots();
  renderSummary();
}));

document.querySelector('#second-addon').addEventListener('change', event => {
  state.secondAddon = event.target.checked;
  renderColorSlots();
  renderSummary();
});

document.querySelector('#mystery-addon').addEventListener('change', event => {
  state.mysteryAddon = event.target.checked;
  renderSummary();
});

document.querySelector('.deal-add-button').addEventListener('click', () => {
  const total = calculateDeal().total;
  document.querySelector('#deal-status').textContent = `${DEALS[state.deal].name} configured at ${formatPrice(total)}.`;
  const toast = document.querySelector('.deal-toast');
  toast.textContent = 'Deal configured successfully';
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1900);
});

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

renderColorSlots();
updateCurrency();

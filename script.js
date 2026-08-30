const body = document.body;
const cart = [];
const CAD_RATE = 1.38;
let activeCurrency = 'USD';
let themeWasManuallyChanged = false;

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeToggle = document.querySelector('.theme-toggle');
const currencySelect = document.querySelector('#currency-select');
const cartDrawer = document.querySelector('.cart-drawer');
const backdrop = document.querySelector('.drawer-backdrop');
const cartItems = document.querySelector('.cart-items');
const emptyState = cartItems.innerHTML;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(!isDark));
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
}

setTheme(systemTheme.matches ? 'dark' : 'light');

themeToggle.addEventListener('click', () => {
  themeWasManuallyChanged = true;
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

systemTheme.addEventListener('change', event => {
  if (!themeWasManuallyChanged) setTheme(event.matches ? 'dark' : 'light');
});

function formatPrice(usdPrice) {
  const amount = activeCurrency === 'CAD' ? usdPrice * CAD_RATE : usdPrice;
  return `${activeCurrency === 'CAD' ? 'C$' : '$'}${amount.toFixed(2)} ${activeCurrency}`;
}

function updateCurrency() {
  currencySelect.value = activeCurrency;
  document.querySelector('.announcement-price').textContent = formatPrice(19.99);
  document.querySelector('.shipping-threshold').textContent = formatPrice(35);
  document.querySelector('.inline-price').textContent = formatPrice(19.99);
  document.querySelectorAll('.product-card').forEach(card => {
    card.querySelector('.product-price').textContent = formatPrice(Number(card.dataset.price));
  });
  renderCart();
}

currencySelect.addEventListener('change', event => {
  activeCurrency = event.target.value;
  updateCurrency();
});

function toggleCart(open = !cartDrawer.classList.contains('open')) {
  cartDrawer.classList.toggle('open', open);
  backdrop.classList.toggle('open', open);
  cartDrawer.setAttribute('aria-hidden', String(!open));
  body.style.overflow = open ? 'hidden' : '';
  if (open) document.querySelector('.close-cart').focus();
}

function renderCart() {
  const count = cart.length;
  document.querySelector('.cart-count').textContent = count;
  document.querySelector('.drawer-count').textContent = `(${count})`;
  cartDrawer.classList.toggle('has-items', count > 0);

  if (!count) {
    cartItems.innerHTML = emptyState;
    document.querySelector('.close-cart-link')?.addEventListener('click', () => toggleCart(false));
    return;
  }

  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-line">
      <div class="cart-thumb ${item.color.toLowerCase()}" aria-hidden="true"></div>
      <div><h3>${item.name}</h3><p>${item.color} · One size</p><strong>${formatPrice(item.price)}</strong></div>
      <button class="remove-item" type="button" data-index="${index}" aria-label="Remove ${item.name}">×</button>
    </div>`).join('');

  document.querySelector('.subtotal').textContent = formatPrice(cart.reduce((sum, item) => sum + item.price, 0));
  document.querySelectorAll('.remove-item').forEach(button => button.addEventListener('click', () => {
    cart.splice(Number(button.dataset.index), 1);
    renderCart();
  }));
}

document.querySelector('.cart-button').addEventListener('click', () => toggleCart(true));
document.querySelector('.close-cart').addEventListener('click', () => toggleCart(false));
backdrop.addEventListener('click', () => toggleCart(false));

document.querySelectorAll('.quick-add').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.product-card');
  cart.push({ name: card.dataset.name, price: Number(card.dataset.price), color: card.dataset.color });
  renderCart();
  const toast = document.querySelector('.toast');
  toast.textContent = `${card.dataset.color} collar added`;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1800);
}));

document.querySelectorAll('.color-node').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.color-node').forEach(node => {
    node.classList.remove('selected');
    node.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('selected');
  button.setAttribute('aria-pressed', 'true');
}));

const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
menuButton.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const searchOverlay = document.querySelector('.search-overlay');
function toggleSearch(open) {
  searchOverlay.classList.toggle('open', open);
  searchOverlay.setAttribute('aria-hidden', String(!open));
  body.style.overflow = open ? 'hidden' : '';
  if (open) document.querySelector('#site-search').focus();
}
document.querySelector('.search-button').addEventListener('click', () => toggleSearch(true));
document.querySelector('.close-search').addEventListener('click', () => toggleSearch(false));
searchOverlay.addEventListener('click', event => { if (event.target === searchOverlay) toggleSearch(false); });
document.querySelector('.search-form').addEventListener('submit', event => event.preventDefault());

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (cartDrawer.classList.contains('open')) toggleCart(false);
  if (searchOverlay.classList.contains('open')) toggleSearch(false);
});

document.querySelector('#newsletter-form').addEventListener('submit', event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  button.textContent = 'You’re In';
  event.currentTarget.querySelector('input').value = '';
});

document.querySelector('.checkout-button').addEventListener('click', () => {
  window.alert('Checkout will be connected when store functionality is added.');
});

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReducedMotion) {
  document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}

updateCurrency();

const PRICE = 18.99;
const SHIPPING_THRESHOLD = 40;
const CAD_RATE = 1.38;
const COLORS = ['Red', 'Green', 'Yellow', 'Blue', 'Orange'];
const DOG_DESCRIPTIONS = {
  Red: 'Brindle mixed-breed dog',
  Green: 'Chocolate Labrador',
  Yellow: 'Golden retriever',
  Blue: 'Black-and-white border collie mix',
  Orange: 'Beagle mix'
};
const body = document.body;
let activeCurrency = 'USD';
let themeWasManuallyChanged = false;
let cart = [];

try { cart = JSON.parse(localStorage.getItem('nighthound-cart') || '[]'); } catch { cart = []; }
cart = cart.map(item => ({ ...item, price: PRICE }));

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themeToggle = document.querySelector('.theme-toggle');
const currencySelect = document.querySelector('#currency-select');
const cartDrawer = document.querySelector('.cart-drawer');
const backdrop = document.querySelector('.drawer-backdrop');
const cartItems = document.querySelector('.cart-items');
const emptyState = cartItems?.innerHTML || '';

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (!themeToggle) return;
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(!isDark));
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
}

setTheme(systemTheme.matches ? 'dark' : 'light');
themeToggle?.addEventListener('click', () => {
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
  if (currencySelect) currencySelect.value = activeCurrency;
  document.querySelectorAll('.announcement-price').forEach(el => { el.textContent = formatPrice(PRICE); });
  document.querySelectorAll('.shipping-threshold').forEach(el => { el.textContent = formatPrice(SHIPPING_THRESHOLD); });
  document.querySelectorAll('.inline-price').forEach(el => { el.textContent = `${formatPrice(PRICE)}${el.closest('.shop-preview-copy') ? ' each' : ''}`; });
  document.querySelectorAll('.product-card, .product-detail').forEach(card => {
    card.querySelectorAll('.product-price').forEach(el => { el.textContent = formatPrice(Number(card.dataset.price || PRICE)); });
  });
  renderCart();
}

currencySelect?.addEventListener('change', event => {
  activeCurrency = event.target.value;
  updateCurrency();
});

function saveCart() {
  try { localStorage.setItem('nighthound-cart', JSON.stringify(cart)); } catch { /* Cart still works in memory. */ }
}

function toggleCart(open = !cartDrawer?.classList.contains('open')) {
  if (!cartDrawer || !backdrop) return;
  cartDrawer.classList.toggle('open', open);
  backdrop.classList.toggle('open', open);
  cartDrawer.setAttribute('aria-hidden', String(!open));
  body.style.overflow = open ? 'hidden' : '';
  if (open) document.querySelector('.close-cart')?.focus();
}

function renderCart() {
  const count = cart.length;
  document.querySelectorAll('.cart-count').forEach(el => { el.textContent = count; });
  document.querySelectorAll('.drawer-count').forEach(el => { el.textContent = `(${count})`; });
  if (!cartDrawer || !cartItems) return;
  cartDrawer.classList.toggle('has-items', count > 0);
  if (!count) {
    cartItems.innerHTML = emptyState;
    const subtotal = document.querySelector('.subtotal');
    if (subtotal) subtotal.textContent = formatPrice(0);
    document.querySelector('.close-cart-link')?.addEventListener('click', () => toggleCart(false));
    return;
  }
  cartItems.innerHTML = cart.map((item, index) => `
    <div class="cart-line">
      <div class="cart-thumb ${item.color.toLowerCase()}" aria-hidden="true"></div>
      <div><h3>${item.name}</h3><p>${item.color} · Adjustable</p><strong>${formatPrice(item.price)}</strong></div>
      <button class="remove-item" type="button" data-index="${index}" aria-label="Remove ${item.name}">×</button>
    </div>`).join('');
  document.querySelector('.subtotal').textContent = formatPrice(cart.reduce((sum, item) => sum + item.price, 0));
  document.querySelectorAll('.remove-item').forEach(button => button.addEventListener('click', () => {
    cart.splice(Number(button.dataset.index), 1);
    saveCart();
    renderCart();
  }));
}

function addToCart(source) {
  cart.push({ name: source.dataset.name, price: Number(source.dataset.price), color: source.dataset.color });
  saveCart();
  renderCart();
  const toast = document.querySelector('.toast');
  if (!toast) return;
  toast.textContent = `${source.dataset.color} collar added`;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 1800);
}

document.querySelector('.cart-button')?.addEventListener('click', () => toggleCart(true));
document.querySelector('.close-cart')?.addEventListener('click', () => toggleCart(false));
backdrop?.addEventListener('click', () => toggleCart(false));
document.querySelectorAll('.quick-add').forEach(button => button.addEventListener('click', () => addToCart(button.closest('.product-card, .product-detail'))));

const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
menuButton?.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
mainNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const searchOverlay = document.querySelector('.search-overlay');
function toggleSearch(open) {
  if (!searchOverlay) return;
  searchOverlay.classList.toggle('open', open);
  searchOverlay.setAttribute('aria-hidden', String(!open));
  body.style.overflow = open ? 'hidden' : '';
  if (open) document.querySelector('#site-search')?.focus();
}
document.querySelector('.search-button')?.addEventListener('click', () => toggleSearch(true));
document.querySelector('.close-search')?.addEventListener('click', () => toggleSearch(false));
searchOverlay?.addEventListener('click', event => { if (event.target === searchOverlay) toggleSearch(false); });
document.querySelector('.search-form')?.addEventListener('submit', event => event.preventDefault());

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (cartDrawer?.classList.contains('open')) toggleCart(false);
  if (searchOverlay?.classList.contains('open')) toggleSearch(false);
});

document.querySelector('.checkout-button')?.addEventListener('click', () => { window.location.href = 'checkout.html'; });

function setupProductPage() {
  const detail = document.querySelector('.product-detail');
  if (!detail) return;
  const requested = new URLSearchParams(window.location.search).get('color') || 'blue';
  const color = COLORS.find(item => item.toLowerCase() === requested.toLowerCase()) || 'Blue';
  const slug = color.toLowerCase();
  const productImage = `assets/collar-${slug}.png`;
  const lifestyleImage = `assets/dog-collar-${slug}.png`;
  detail.dataset.name = `${color} Glow Collar`;
  detail.dataset.color = color;
  document.title = `${color} Glow Collar — NightHound`;
  document.querySelector('#product-color').textContent = color;
  document.querySelector('#selected-color').textContent = color;
  document.querySelector('#crumb-color').textContent = color;
  const mainImage = document.querySelector('#main-product-image');
  const productThumb = document.querySelector('#product-thumb');
  const lifestyleThumb = document.querySelector('#lifestyle-thumb');
  const storyImage = document.querySelector('#story-image');
  mainImage.src = productImage;
  mainImage.alt = `${color} glowing dog collar close-up`;
  productThumb.src = productImage;
  lifestyleThumb.src = lifestyleImage;
  storyImage.src = lifestyleImage;
  storyImage.alt = `${DOG_DESCRIPTIONS[color]} wearing a ${slug} glowing collar at dusk`;

  document.querySelectorAll('.gallery-thumb').forEach(button => button.addEventListener('click', () => {
    const lifestyle = button.dataset.image === 'lifestyle';
    mainImage.src = lifestyle ? lifestyleImage : productImage;
    mainImage.alt = lifestyle ? `${DOG_DESCRIPTIONS[color]} wearing a ${slug} glowing collar at dusk` : `${color} glowing dog collar close-up`;
    document.querySelectorAll('.gallery-thumb').forEach(thumb => {
      const selected = thumb === button;
      thumb.classList.toggle('selected', selected);
      thumb.setAttribute('aria-pressed', String(selected));
    });
  }));

  const colorPicker = document.querySelector('#detail-colors');
  colorPicker.innerHTML = COLORS.map(item => `<a class="detail-swatch ${item.toLowerCase()} ${item === color ? 'selected' : ''}" href="product.html?color=${item.toLowerCase()}" aria-label="View ${item} collar" ${item === color ? 'aria-current="page"' : ''}><i></i>${item}</a>`).join('');
}

setupProductPage();

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

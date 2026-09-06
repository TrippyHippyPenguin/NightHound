(function () {
  'use strict';

  const CONFIG = window.NIGHTHOUND;
  if (!CONFIG) return;

  const PRODUCT = CONFIG.products[0];
  const CART_KEY = 'nighthound-cart-v2';
  const THEME_KEY = 'nighthound-theme';
  const CURRENCY_KEY = 'nighthound-currency';
  const currencies = Object.fromEntries(CONFIG.store.displayCurrencies.map(currency => [currency.code, currency]));
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  function storedPreference(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  const storedTheme = storedPreference(THEME_KEY);
  const storedCurrency = storedPreference(CURRENCY_KEY);
  let themePreference = ['system', 'dark', 'light'].includes(storedTheme) ? storedTheme : 'system';
  let selectedCurrency = currencies[storedCurrency] ? storedCurrency : CONFIG.store.currency;
  const bySlug = Object.fromEntries(PRODUCT.colors.map(color => [color.slug, color]));
  const bySize = Object.fromEntries(PRODUCT.sizes.map(size => [size.name, size]));
  let cart = loadCart();
  let lastFocused = null;

  function money(value) {
    const currency = currencies[selectedCurrency] || currencies[CONFIG.store.currency];
    const converted = Math.round(Number(value) * currency.usdRate * 100) / 100;
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      currencyDisplay: currency.code === 'USD' ? 'narrowSymbol' : 'code'
    }).format(converted);
  }

  function resolvedTheme() {
    return themePreference === 'system' ? (systemTheme.matches ? 'dark' : 'light') : themePreference;
  }

  function applyTheme() {
    const resolved = resolvedTheme();
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = themePreference;
    document.documentElement.style.colorScheme = resolved;
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      const selected = button.dataset.themeChoice === themePreference;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-preference-summary]').forEach(element => {
      element.textContent = `${themePreference[0].toUpperCase()}${themePreference.slice(1)} · ${selectedCurrency}`;
    });
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = resolved === 'dark' ? '#0a0c10' : '#f5f7fa';
  }

  function setTheme(preference) {
    if (!['system', 'dark', 'light'].includes(preference)) return;
    themePreference = preference;
    try { localStorage.setItem(THEME_KEY, preference); } catch { /* Keep the in-memory preference. */ }
    applyTheme();
  }

  function renderPrices() {
    document.querySelectorAll('[data-product-price]').forEach(element => { element.textContent = money(PRODUCT.price); });
    document.querySelectorAll('[data-shipping-price]').forEach(element => { element.textContent = money(CONFIG.store.standardShipping); });
    document.querySelectorAll('[data-shipping-threshold]').forEach(element => { element.textContent = money(CONFIG.store.freeShippingThreshold); });
    document.querySelectorAll('[data-money-usd]').forEach(element => { element.textContent = money(Number(element.dataset.moneyUsd)); });
    document.querySelectorAll('[data-announcement]').forEach(element => {
      const shippingThreshold = money(CONFIG.store.freeShippingThreshold);
      const accessibleMessage = `Free pendant per collar. Free shipping ${shippingThreshold} and over.`;
      const marqueeMessage = `<span class="announcement-copy"><b>Free pendant</b><em>per collar</em><i aria-hidden="true">•</i><b>Free shipping ${shippingThreshold}+</b></span>`;
      element.setAttribute('aria-label', accessibleMessage);
      element.innerHTML = `<div class="announcement-track" aria-hidden="true">${marqueeMessage.repeat(4)}</div>`;
    });
  }

  function setCurrency(code) {
    if (!currencies[code]) return;
    selectedCurrency = code;
    try { localStorage.setItem(CURRENCY_KEY, code); } catch { /* Keep the in-memory preference. */ }
    document.querySelectorAll('[data-currency-select]').forEach(select => { select.value = code; });
    renderPrices();
    renderCart();
    renderCheckoutSummary();
    applyTheme();
    document.dispatchEvent(new CustomEvent('nighthound:currencychange'));
  }

  function preferenceControls() {
    const currencyOptions = CONFIG.store.displayCurrencies.map(currency => `<option value="${currency.code}">${currency.code} — ${currency.label}</option>`).join('');
    document.querySelectorAll('.site-header .header-inner').forEach((header, index) => {
      const cartButton = header.querySelector(':scope > .cart-button');
      if (!cartButton) return;
      const actions = document.createElement('div');
      actions.className = 'header-actions';
      actions.innerHTML = `
        <button class="preferences-toggle" type="button" data-preferences-toggle aria-expanded="false" aria-controls="preferences-panel-${index}">
          <span aria-hidden="true">◐</span><b data-preference-summary>System · USD</b>
        </button>
        <section class="preferences-panel" id="preferences-panel-${index}" data-preferences-panel hidden aria-label="Display preferences">
          <div class="preference-heading"><strong>Display preferences</strong><button type="button" data-preferences-close aria-label="Close display preferences">×</button></div>
          <fieldset><legend>Color mode</legend><div class="theme-switch" role="group" aria-label="Color mode">
            <button type="button" data-theme-choice="system" aria-pressed="false">System</button>
            <button type="button" data-theme-choice="dark" aria-pressed="false">Dark</button>
            <button type="button" data-theme-choice="light" aria-pressed="false">Light</button>
          </div></fieldset>
          <label class="currency-field">Display currency<select data-currency-select>${currencyOptions}</select></label>
          <p>Converted amounts are estimates using ${CONFIG.store.exchangeRateSource}, dated ${CONFIG.store.exchangeRateDate}. Store pricing remains in USD.</p>
        </section>`;
      cartButton.replaceWith(actions);
      actions.appendChild(cartButton);
    });
    document.querySelectorAll('[data-currency-select]').forEach(select => { select.value = selectedCurrency; });
    applyTheme();
  }

  function togglePreferences(panel, open) {
    if (!panel) return;
    panel.hidden = !open;
    const toggle = document.querySelector(`[aria-controls="${panel.id}"]`);
    toggle?.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('button, select')?.focus();
  }

  function enhanceNavigation() {
    document.querySelectorAll('a[href$="#how-it-works"]').forEach(link => { link.textContent = 'How to Use'; });
    document.querySelectorAll('[data-main-nav]').forEach(nav => {
      if (!nav.querySelector('a[href="policies.html"]')) nav.insertAdjacentHTML('beforeend', '<a href="policies.html">Policies</a>');
    });
    document.querySelectorAll('.footer-grid').forEach(footer => {
      const helpColumn = [...footer.children].find(column => column.querySelector('strong')?.textContent.trim() === 'Help');
      if (helpColumn && !helpColumn.querySelector('a[href="policies.html"]')) {
        const shippingLink = helpColumn.querySelector('a[href="shipping.html"]');
        shippingLink?.insertAdjacentHTML('beforebegin', '<a href="policies.html">Policies</a>');
      }
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
  }

  function variantId(color, size) {
    return `${PRODUCT.id}:${color}:${size}`;
  }

  function sanitizeCart(value) {
    if (!Array.isArray(value)) return [];
    const combined = new Map();
    value.forEach(item => {
      const color = String(item?.color || '').toLowerCase();
      const size = String(item?.size || '').toUpperCase();
      const quantity = Math.min(20, Math.max(1, Math.trunc(Number(item?.quantity) || 1)));
      if (item?.productId !== PRODUCT.id || !bySlug[color] || !bySize[size]) return;
      const id = variantId(color, size);
      const existing = combined.get(id);
      if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
      else combined.set(id, { productId: PRODUCT.id, variantId: id, color, size, quantity });
    });
    return [...combined.values()];
  }

  function loadCart() {
    try {
      return sanitizeCart(JSON.parse(localStorage.getItem(CART_KEY) || '[]'));
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // The cart remains usable in memory when storage is unavailable.
    }
  }

  function cartSummary() {
    const itemQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = Math.round(itemQuantity * PRODUCT.price * 100) / 100;
    const shipping = itemQuantity === 0 ? 0 : subtotal >= CONFIG.store.freeShippingThreshold ? 0 : CONFIG.store.standardShipping;
    const total = Math.round((subtotal + shipping) * 100) / 100;
    const pendantQuantity = CONFIG.promotions.freePendantEnabled
      ? itemQuantity * CONFIG.promotions.freePendantQuantityPerCollar
      : 0;
    return { itemQuantity, subtotal, shipping, total, pendantQuantity };
  }

  function addItem(color, size, quantity = 1) {
    if (!bySlug[color] || !bySize[size]) return false;
    const id = variantId(color, size);
    const existing = cart.find(item => item.variantId === id);
    if (existing) existing.quantity = Math.min(20, existing.quantity + Math.max(1, quantity));
    else cart.push({ productId: PRODUCT.id, variantId: id, color, size, quantity: Math.min(20, Math.max(1, quantity)) });
    saveCart();
    renderCart();
    renderCheckoutSummary();
    return true;
  }

  function changeQuantity(id, change) {
    const item = cart.find(entry => entry.variantId === id);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) cart = cart.filter(entry => entry.variantId !== id);
    else item.quantity = Math.min(20, item.quantity);
    saveCart();
    renderCart();
    renderCheckoutSummary();
  }

  function removeItem(id) {
    cart = cart.filter(item => item.variantId !== id);
    saveCart();
    renderCart();
    renderCheckoutSummary();
  }

  function sharedOverlays() {
    const sizeRows = PRODUCT.sizes.map(size => `<tr><th scope="row">${size.name}</th><td>${size.label}</td></tr>`).join('');
    document.body.insertAdjacentHTML('beforeend', `
      <div class="drawer-backdrop" data-drawer-backdrop></div>
      <aside class="cart-drawer" data-cart-drawer aria-label="Shopping cart" aria-hidden="true" role="dialog" aria-modal="true" inert>
        <div class="drawer-header">
          <div><span class="mini-label">Your selections</span><h2>Shopping cart <span data-drawer-count>(0)</span></h2></div>
          <button class="icon-button close-button" type="button" data-cart-close aria-label="Close cart">×</button>
        </div>
        <div class="shipping-progress" data-shipping-progress></div>
        <div class="cart-items" data-cart-items></div>
        <div class="cart-footer" data-cart-footer></div>
      </aside>

      <div class="modal-backdrop" data-size-modal hidden>
        <section class="modal-panel size-modal" role="dialog" aria-modal="true" aria-labelledby="size-guide-title">
          <button class="icon-button modal-close" type="button" data-size-guide-close aria-label="Close size guide">×</button>
          <span class="mini-label">Measure before ordering</span>
          <h2 id="size-guide-title">NightHound size guide</h2>
          <p>Measure around the part of your dog’s neck where the collar normally sits. Use a soft measuring tape if possible and allow comfortable room rather than measuring extremely tight.</p>
          <div class="table-wrap"><table><thead><tr><th>Size</th><th>Neck measurement</th></tr></thead><tbody>${sizeRows}</tbody></table></div>
          <p class="fine-print">Supplier size ranges overlap intentionally. Choose the range that best contains your dog’s measured neck size.</p>
        </section>
      </div>

      <div class="toast" role="status" aria-live="polite" data-toast></div>
    `);
  }

  function shippingProgressMarkup(summary) {
    if (!summary.itemQuantity) {
      return `<div class="progress-copy"><span>Add a collar to begin</span><strong>Free shipping at ${money(CONFIG.store.freeShippingThreshold)}</strong></div><div class="progress-track"><i style="width:0%"></i></div>`;
    }
    const unlocked = summary.subtotal >= CONFIG.store.freeShippingThreshold;
    const remaining = Math.max(0, Math.round((CONFIG.store.freeShippingThreshold - summary.subtotal) * 100) / 100);
    const percent = Math.min(100, (summary.subtotal / CONFIG.store.freeShippingThreshold) * 100);
    return `<div class="progress-copy"><span>${unlocked ? '✓ You’ve unlocked free shipping.' : `You’re ${money(remaining)} away from free shipping.`}</span><strong>${unlocked ? 'Unlocked' : `${Math.round(percent)}%`}</strong></div><div class="progress-track"><i style="width:${percent}%"></i></div>`;
  }

  function renderCart() {
    const summary = cartSummary();
    document.querySelectorAll('[data-cart-count]').forEach(element => {
      element.textContent = summary.itemQuantity;
      element.hidden = summary.itemQuantity === 0;
    });
    document.querySelectorAll('[data-drawer-count]').forEach(element => {
      element.textContent = `(${summary.itemQuantity})`;
    });
    document.querySelectorAll('[data-shipping-progress]').forEach(element => {
      element.innerHTML = shippingProgressMarkup(summary);
    });

    const container = document.querySelector('[data-cart-items]');
    const footer = document.querySelector('[data-cart-footer]');
    if (!container || !footer) return;

    if (!cart.length) {
      container.innerHTML = `
        <div class="empty-cart">
          <span class="empty-icon" aria-hidden="true">○</span>
          <h3>Your next night walk starts here.</h3>
          <p>Choose a glow color and measure your dog’s neck to get started.</p>
          <a class="button button-primary" href="product.html">Shop the Glow Collar</a>
        </div>`;
    } else {
      container.innerHTML = cart.map(item => {
        const color = bySlug[item.color];
        const size = bySize[item.size];
        return `
          <article class="cart-line" data-variant-id="${escapeHtml(item.variantId)}">
            <img src="${color.productImage}" alt="${color.name} NightHound Glow Collar" width="92" height="92">
            <div class="cart-line-copy">
              <h3>${PRODUCT.name}</h3>
              <p>${color.name} / ${size.name} · ${size.label}</p>
              <strong>${money(PRODUCT.price)} each</strong>
              <div class="quantity-control" aria-label="Quantity for ${color.name}, size ${size.name}">
                <button type="button" data-quantity-change="-1" aria-label="Decrease quantity">−</button>
                <span aria-live="polite">${item.quantity}</span>
                <button type="button" data-quantity-change="1" aria-label="Increase quantity">+</button>
              </div>
            </div>
            <div class="cart-line-end">
              <button type="button" class="text-button" data-remove-item>Remove</button>
              <strong>${money(PRODUCT.price * item.quantity)}</strong>
            </div>
          </article>`;
      }).join('');

      if (summary.pendantQuantity) {
        container.insertAdjacentHTML('beforeend', `
          <article class="gift-line">
            <img src="${CONFIG.promotions.pendantImage}" alt="Assorted colorful rechargeable LED pendants" width="72" height="72">
            <div><span class="mini-label">Promotional item</span><h3>${CONFIG.promotions.pendantName} × ${summary.pendantQuantity}</h3><p>Automatically included. Pendant color may vary.</p></div>
            <strong>FREE</strong>
          </article>`);
      }
    }

    footer.innerHTML = `
      <dl class="cart-totals">
        <div><dt>Subtotal</dt><dd>${money(summary.subtotal)}</dd></div>
        <div><dt>Shipping</dt><dd>${!summary.itemQuantity ? '—' : summary.shipping === 0 ? 'FREE' : money(summary.shipping)}</dd></div>
        <div><dt>Taxes</dt><dd>Included</dd></div>
        <div class="cart-total"><dt>Total</dt><dd>${money(summary.total)}</dd></div>
      </dl>
      <a class="button button-primary checkout-action" href="${summary.itemQuantity ? 'checkout.html' : 'product.html'}">${summary.itemQuantity ? 'Review checkout' : 'Choose a collar'}</a>
      <p class="fine-print">Taxes are included in the displayed prices. Online ordering is currently unavailable.</p>`;
  }

  function renderCheckoutSummary() {
    const container = document.querySelector('[data-checkout-lines]');
    if (!container) return;
    const summary = cartSummary();
    if (!cart.length) {
      container.innerHTML = `<div class="checkout-empty"><h2>Your cart is empty</h2><p>Choose a color and size before returning here.</p><a class="button button-primary" href="product.html">Shop the Glow Collar</a></div>`;
    } else {
      const itemLines = cart.map(item => {
        const color = bySlug[item.color];
        const size = bySize[item.size];
        return `<article class="checkout-line"><img src="${color.productImage}" alt="" width="88" height="88"><div><h3>${PRODUCT.name}</h3><p>${color.name} / ${size.name} · ${size.label} · Qty ${item.quantity}</p></div><strong>${money(PRODUCT.price * item.quantity)}</strong></article>`;
      }).join('');
      const giftLine = summary.pendantQuantity ? `<article class="checkout-line gift"><img src="${CONFIG.promotions.pendantImage}" alt="" width="88" height="88"><div><span class="mini-label">Included bonus</span><h3>${CONFIG.promotions.pendantName} × ${summary.pendantQuantity}</h3><p>Pendant color may vary.</p></div><strong>FREE</strong></article>` : '';
      container.innerHTML = `${itemLines}${giftLine}<div class="checkout-progress-card">${shippingProgressMarkup(summary)}</div><dl class="checkout-totals"><div><dt>Subtotal</dt><dd>${money(summary.subtotal)}</dd></div><div><dt>Shipping</dt><dd>${summary.shipping === 0 ? 'FREE' : money(summary.shipping)}</dd></div><div><dt>Taxes</dt><dd>Included</dd></div><div><dt>Total</dt><dd>${money(summary.total)}</dd></div></dl>`;
    }
  }

  function toggleCart(open) {
    const drawer = document.querySelector('[data-cart-drawer]');
    const backdrop = document.querySelector('[data-drawer-backdrop]');
    if (!drawer || !backdrop) return;
    if (open) lastFocused = document.activeElement;
    drawer.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    drawer.inert = !open;
    document.body.classList.toggle('no-scroll', open);
    if (open) window.setTimeout(() => drawer.querySelector('[data-cart-close]')?.focus(), 50);
    else lastFocused?.focus?.();
  }

  function toggleSizeGuide(open) {
    const modal = document.querySelector('[data-size-modal]');
    if (!modal) return;
    if (open) {
      lastFocused = document.activeElement;
      modal.hidden = false;
      document.body.classList.add('no-scroll');
      window.setTimeout(() => modal.querySelector('[data-size-guide-close]')?.focus(), 20);
    } else {
      modal.hidden = true;
      document.body.classList.remove('no-scroll');
      lastFocused?.focus?.();
    }
  }

  function showToast(message) {
    const toast = document.querySelector('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  function setShowcaseColor(root, slug) {
    const color = bySlug[slug] || PRODUCT.colors[0];
    const image = root.querySelector('[data-showcase-image]');
    const name = root.querySelector('[data-showcase-color]');
    const link = root.querySelector('[data-showcase-link]');
    if (image) {
      image.classList.add('is-changing');
      window.setTimeout(() => {
        image.src = color.productImage;
        image.alt = `${color.name} NightHound Glow Collar illuminated against a dark background`;
        image.classList.remove('is-changing');
      }, 100);
    }
    if (name) name.textContent = color.name;
    if (link) link.href = `product.html?color=${color.slug}`;
    root.querySelectorAll('[data-showcase-swatch]').forEach(button => {
      const selected = button.dataset.showcaseSwatch === color.slug;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function focusTrap(event, root) {
    if (event.key !== 'Tab') return;
    const controls = [...root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(control => !control.hidden);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function initialize() {
    enhanceNavigation();
    preferenceControls();
    sharedOverlays();
    renderPrices();
    document.querySelectorAll('[data-current-year]').forEach(element => { element.textContent = new Date().getFullYear(); });

    document.querySelectorAll('[data-color-showcase]').forEach(root => {
      setShowcaseColor(root, root.dataset.initialColor || 'blue');
      root.addEventListener('click', event => {
        const swatch = event.target.closest('[data-showcase-swatch]');
        if (swatch) setShowcaseColor(root, swatch.dataset.showcaseSwatch);
      });
    });

    renderCart();
    renderCheckoutSummary();

    document.addEventListener('click', event => {
      const preferenceToggle = event.target.closest('[data-preferences-toggle]');
      if (preferenceToggle) {
        const panel = document.getElementById(preferenceToggle.getAttribute('aria-controls'));
        togglePreferences(panel, panel?.hidden);
      }
      if (event.target.closest('[data-preferences-close]')) togglePreferences(event.target.closest('[data-preferences-panel]'), false);
      const themeButton = event.target.closest('[data-theme-choice]');
      if (themeButton) setTheme(themeButton.dataset.themeChoice);
      if (event.target.closest('[data-cart-open]')) toggleCart(true);
      if (event.target.closest('[data-cart-close]') || event.target.matches('[data-drawer-backdrop]')) toggleCart(false);
      if (event.target.closest('[data-size-guide-open]')) toggleSizeGuide(true);
      if (event.target.closest('[data-size-guide-close]') || event.target.matches('[data-size-modal]')) toggleSizeGuide(false);

      const quantityButton = event.target.closest('[data-quantity-change]');
      if (quantityButton) {
        const line = quantityButton.closest('[data-variant-id]');
        changeQuantity(line?.dataset.variantId, Number(quantityButton.dataset.quantityChange));
      }
      const removeButton = event.target.closest('[data-remove-item]');
      if (removeButton) removeItem(removeButton.closest('[data-variant-id]')?.dataset.variantId);
      if (!event.target.closest('.header-actions')) document.querySelectorAll('[data-preferences-panel]:not([hidden])').forEach(panel => togglePreferences(panel, false));
    });

    document.querySelectorAll('[data-currency-select]').forEach(select => select.addEventListener('change', () => setCurrency(select.value)));
    systemTheme.addEventListener?.('change', () => { if (themePreference === 'system') applyTheme(); });

    const menu = document.querySelector('[data-main-nav]');
    const menuButton = document.querySelector('[data-menu-toggle]');
    menuButton?.addEventListener('click', () => {
      const open = !menu?.classList.contains('is-open');
      menu?.classList.toggle('is-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.classList.remove('is-open');
      menuButton?.setAttribute('aria-expanded', 'false');
    }));

    document.addEventListener('keydown', event => {
      const drawer = document.querySelector('[data-cart-drawer]');
      const sizeModal = document.querySelector('[data-size-modal]');
      if (event.key === 'Escape') {
        if (drawer?.classList.contains('is-open')) toggleCart(false);
        else if (sizeModal && !sizeModal.hidden) toggleSizeGuide(false);
        else document.querySelectorAll('[data-preferences-panel]:not([hidden])').forEach(panel => togglePreferences(panel, false));
      }
      if (drawer?.classList.contains('is-open')) focusTrap(event, drawer);
      else if (sizeModal && !sizeModal.hidden) focusTrap(event, sizeModal);
    });

    const revealItems = document.querySelectorAll('[data-reveal]');
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }), { threshold: 0.1 });
      revealItems.forEach(item => observer.observe(item));
    } else revealItems.forEach(item => item.classList.add('is-visible'));
  }

  window.NightHoundStore = Object.freeze({
    addItem,
    cartSummary,
    money,
    product: PRODUCT,
    showToast,
    renderCart
  });

  initialize();
})();

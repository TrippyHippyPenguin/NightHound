(function () {
  'use strict';

  const CONFIG = window.NIGHTHOUND;
  const STORE = window.NightHoundStore;
  const root = document.querySelector('[data-product-detail]');
  if (!CONFIG || !STORE || !root) return;

  const product = CONFIG.products[0];
  const colors = Object.fromEntries(product.colors.map(color => [color.slug, color]));
  const sizes = Object.fromEntries(product.sizes.map(size => [size.name.toLowerCase(), size]));
  const params = new URLSearchParams(window.location.search);
  const requestedColor = (params.get('color') || 'blue').toLowerCase();
  const requestedSize = (params.get('size') || '').toLowerCase();
  const requestedQuantity = Math.min(10, Math.max(1, Math.trunc(Number(params.get('quantity')) || 1)));
  let selectedColor = colors[requestedColor] || colors.blue;
  let selectedSize = sizes[requestedSize] || null;
  let selectedQuantity = requestedQuantity;
  let galleryIndex = 0;
  let touchStartX = null;

  const mainImage = document.querySelector('[data-main-product-image]');
  const lightbox = document.querySelector('[data-lightbox]');

  function updateUrl(replace = false) {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('color', selectedColor.slug);
    if (selectedSize) url.searchParams.set('size', selectedSize.name.toLowerCase());
    if (selectedQuantity > 1) url.searchParams.set('quantity', String(selectedQuantity));
    history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  function galleryItems() {
    return [
      { src: selectedColor.productImage, alt: `${selectedColor.name} NightHound Glow Collar illuminated against a dark background`, label: 'Collar view' },
      { src: selectedColor.lifestyleImage, alt: selectedColor.lifestyleAlt, label: 'On a dog' }
    ];
  }

  function showGalleryItem(index) {
    const items = galleryItems();
    galleryIndex = (index + items.length) % items.length;
    const item = items[galleryIndex];
    if (mainImage) {
      mainImage.classList.add('is-changing');
      window.setTimeout(() => {
        mainImage.src = item.src;
        mainImage.alt = item.alt;
        mainImage.classList.remove('is-changing');
      }, 100);
    }
    document.querySelectorAll('[data-gallery-thumb]').forEach((button, buttonIndex) => {
      const current = buttonIndex === galleryIndex;
      button.classList.toggle('is-selected', current);
      button.setAttribute('aria-pressed', String(current));
    });
  }

  function updateColor(color, updateHistory = true) {
    selectedColor = color;
    galleryIndex = 0;
    document.querySelectorAll('[data-selected-color]').forEach(element => { element.textContent = color.name; });
    document.querySelectorAll('[data-color-swatch]').forEach(button => {
      const selected = button.dataset.colorSwatch === color.slug;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const images = galleryItems();
    document.querySelectorAll('[data-gallery-thumb]').forEach((button, index) => {
      const image = button.querySelector('img');
      if (image) { image.src = images[index].src; image.alt = ''; }
    });
    document.documentElement.style.setProperty('--selected-product-color', color.hex);
    document.title = `${product.name} – ${color.name} | NightHound`;
    showGalleryItem(0);
    if (updateHistory) updateUrl();
  }

  function updateSize(size, updateHistory = true) {
    selectedSize = size;
    document.querySelectorAll('[data-size-option]').forEach(button => {
      const selected = button.dataset.sizeOption === size?.name;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const error = document.querySelector('[data-size-error]');
    if (error) error.textContent = '';
    if (updateHistory) updateUrl();
  }

  function updateQuantity(next) {
    selectedQuantity = Math.min(10, Math.max(1, next));
    document.querySelectorAll('[data-product-quantity]').forEach(element => { element.textContent = selectedQuantity; });
    document.querySelectorAll('[data-add-price]').forEach(element => { element.textContent = STORE.money(product.price * selectedQuantity); });
    updateUrl(true);
  }

  function addSelection() {
    if (!selectedSize) {
      const error = document.querySelector('[data-size-error]');
      if (error) error.textContent = 'Choose a size before adding your collar.';
      document.querySelector('[data-size-option]')?.focus();
      return;
    }
    STORE.addItem(selectedColor.slug, selectedSize.name, selectedQuantity);
    STORE.showToast(`${selectedColor.name} ${product.name}, size ${selectedSize.name}, added to your cart.`);
    document.querySelector('[data-cart-open]')?.click();
  }

  root.addEventListener('click', event => {
    const swatch = event.target.closest('[data-color-swatch]');
    if (swatch) updateColor(colors[swatch.dataset.colorSwatch]);
    const size = event.target.closest('[data-size-option]');
    if (size) updateSize(product.sizes.find(item => item.name === size.dataset.sizeOption));
    const thumb = event.target.closest('[data-gallery-thumb]');
    if (thumb) showGalleryItem(Number(thumb.dataset.galleryThumb));
    if (event.target.closest('[data-quantity-minus]')) updateQuantity(selectedQuantity - 1);
    if (event.target.closest('[data-quantity-plus]')) updateQuantity(selectedQuantity + 1);
    if (event.target.closest('[data-add-to-cart]')) addSelection();
  });

  document.querySelector('[data-sticky-add]')?.addEventListener('click', addSelection);

  const mobileBuyBar = document.querySelector('.mobile-buy-bar');
  const mainAddButton = document.querySelector('[data-add-to-cart]');
  if (mobileBuyBar && mainAddButton && 'IntersectionObserver' in window) {
    let hasSeenMainAdd = false;
    const addObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) hasSeenMainAdd = true;
      mobileBuyBar.classList.toggle('is-visible', hasSeenMainAdd && !entry.isIntersecting);
    }), { threshold: 0.25 });
    addObserver.observe(mainAddButton);
  }

  document.querySelector('[data-gallery-zoom]')?.addEventListener('click', () => {
    if (!lightbox) return;
    const image = lightbox.querySelector('img');
    image.src = galleryItems()[galleryIndex].src;
    image.alt = galleryItems()[galleryIndex].alt;
    lightbox.hidden = false;
    document.body.classList.add('no-scroll');
    lightbox.querySelector('button')?.focus();
  });
  mainImage?.parentElement?.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
  mainImage?.parentElement?.addEventListener('touchend', event => {
    if (touchStartX === null) return;
    const distance = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(distance) > 45) showGalleryItem(galleryIndex + (distance < 0 ? 1 : -1));
    touchStartX = null;
  }, { passive: true });

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.classList.remove('no-scroll');
    document.querySelector('[data-gallery-zoom]')?.focus();
  }
  lightbox?.addEventListener('click', event => {
    if (event.target === lightbox || event.target.closest('[data-lightbox-close]')) closeLightbox();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
    if (event.key === 'Tab' && lightbox && !lightbox.hidden) {
      event.preventDefault();
      lightbox.querySelector('[data-lightbox-close]')?.focus();
    }
  });
  document.addEventListener('nighthound:currencychange', () => updateQuantity(selectedQuantity));

  updateColor(selectedColor, false);
  if (selectedSize) updateSize(selectedSize, false);
  updateQuantity(selectedQuantity);
  if (!colors[requestedColor]) updateUrl(true);
})();

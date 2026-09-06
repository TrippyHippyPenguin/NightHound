const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const base = process.env.NIGHTHOUND_TEST_BASE || 'http://127.0.0.1:4173';
const pages = ['index.html', 'products.html', 'product.html', 'deals.html', 'checkout.html', 'shipping.html', 'returns.html', 'contact.html', 'policies.html', 'privacy.html', 'terms.html', '404.html'];

test('local links, assets, metadata, and business copy are internally consistent', async () => {
  const missing = [];
  const metadataMissing = [];
  const banned = /17\.99|18\.99|19\.98|34\.99|35\.98|47\.99|53\.97|59\.99|40\.00|4\.99|NIGHTHOUND10|Send Order Request|Payment not due|Verified customer|Review section reserved/;
  for (const name of pages) {
    const source = fs.readFileSync(path.join(__dirname, name), 'utf8');
    expect(source, `${name} contains retired pricing or messaging`).not.toMatch(banned);
    for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = match[1];
      if (/^(?:https?:|mailto:|#)/.test(url)) continue;
      const target = url.split(/[?#]/)[0];
      if (target && !fs.existsSync(path.join(__dirname, target))) missing.push(`${name} -> ${url}`);
    }
    if (!['404.html', 'checkout.html'].includes(name)) {
      for (const token of ['<title>', 'name="description"', 'property="og:title"', 'property="og:description"', 'property="og:image"', 'name="twitter:card"', 'rel="canonical"']) {
        if (!source.includes(token)) metadataMissing.push(`${name} missing ${token}`);
      }
    }
  }
  expect(missing).toEqual([]);
  expect(metadataMissing).toEqual([]);
});

test('all public pages load without console errors or horizontal overflow', async ({ page }) => {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of pages) {
      const response = await page.goto(`${base}/${name}`);
      expect(response.ok(), name).toBeTruthy();
      expect(await page.locator('body').evaluate(node => node.scrollWidth <= node.clientWidth + 1), `${name} at ${width}`).toBeTruthy();
    }
  }
  expect(errors).toEqual([]);
});

test('the supplied NightHound logo is the primary site wordmark', async ({ page }) => {
  await page.goto(`${base}/index.html`);
  const logo = page.locator('.site-header .brand-symbol');
  await expect(logo).toBeVisible();
  expect(await logo.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('LogoNH.png');
});

test('announcement bar uses an accessible marquee without creating overflow', async ({ page }) => {
  await page.goto(`${base}/index.html`);
  const bar = page.locator('[data-announcement]');
  await expect(bar).toHaveAttribute('aria-label', /Free pendant.*Free shipping/i);
  await expect(bar.locator('.announcement-copy')).toHaveCount(4);
  expect(await bar.locator('.announcement-track').evaluate(element => getComputedStyle(element).animationName)).toBe('announcement-marquee');
  expect(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBeTruthy();
});

test('nested GitHub Pages 404 resolves project assets and navigation', async ({ page }) => {
  const failed = [];
  const deployedBase = 'https://trippyhippypenguin.github.io/NightHound';
  // Serve local files at the deployed URL so the actual project-path branch runs.
  await page.route(`${deployedBase}/**`, route => {
    const relativePath = new URL(route.request().url()).pathname.slice('/NightHound/'.length);
    const file = path.join(__dirname, relativePath || 'index.html');
    return fs.existsSync(file)
      ? route.fulfill({ path: file })
      : route.fulfill({ status: 404, body: 'Not found' });
  });
  const missingUrl = `${deployedBase}/missing/nested-page.html`;
  await page.route(missingUrl, route => route.fulfill({
    status: 404,
    contentType: 'text/html',
    path: path.join(__dirname, '404.html')
  }));
  page.on('response', response => {
    if (response.url() !== missingUrl && response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  const response = await page.goto(missingUrl);
  expect(response.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This trail ends here.' })).toBeVisible();
  await expect(page.locator('base')).toHaveAttribute('href', '/NightHound/');
  await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute('href', '/NightHound/styles.css');
  expect(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  expect(failed).toEqual([]);
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page).toHaveURL(`${deployedBase}/index.html`);
});

test('all six query colors initialize the complete product state', async ({ page }) => {
  for (const color of ['blue', 'green', 'red', 'pink', 'orange', 'yellow']) {
    await page.goto(`${base}/product.html?color=${color}`);
    await expect(page.locator('[data-selected-color]')).toHaveText(new RegExp(`^${color}$`, 'i'));
    await expect(page.locator(`[data-color-swatch="${color}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-main-product-image]')).toHaveAttribute('src', new RegExp(`collar-${color}(?:-v2)?\\.webp$`));
  }
});

test('invalid color normalizes to blue and all exact sizes are present', async ({ page }) => {
  await page.goto(`${base}/product.html?color=purple`);
  await expect(page).toHaveURL(/color=blue/);
  await expect(page.locator('[data-selected-color]')).toHaveText('Blue');
  await expect(page.locator('[data-size-option]')).toHaveCount(6);
  await expect(page.locator('[data-size-option="XS"]')).toContainText('28–38 cm');
  await expect(page.locator('[data-size-option="XXL"]')).toContainText('43–62 cm');
});

test('cart validates size, calculates shipping, gifts, quantity, and persistence', async ({ page }) => {
  await page.goto(`${base}/product.html?color=red`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-add-to-cart]').click();
  await expect(page.locator('[data-size-error]')).toContainText('Choose a size');
  await page.locator('[data-size-option="M"]').click();
  await page.locator('[data-add-to-cart]').click();
  await expect(page.locator('[data-cart-drawer]')).toHaveClass(/is-open/);
  await expect(page.locator('[data-cart-items]')).toContainText('Red / M · 37–46 cm');
  await expect(page.locator('[data-cart-items]')).toContainText('Rechargeable LED Pendant × 1');
  await expect(page.locator('[data-cart-footer]')).toContainText('$16.99');
  await expect(page.locator('[data-cart-footer]')).toContainText('$1.99');
  await expect(page.locator('[data-cart-footer]')).toContainText('$18.98');
  await expect(page.locator('[data-cart-footer]')).toContainText(/Taxes\s*Included/);
  await page.locator('[data-quantity-change="1"]').click();
  await expect(page.locator('[data-cart-items]')).toContainText('Rechargeable LED Pendant × 2');
  await expect(page.locator('[data-cart-footer]')).toContainText('$33.98');
  await expect(page.locator('[data-cart-footer]')).toContainText('FREE');
  await page.reload();
  await page.locator('[data-cart-open]').click();
  await expect(page.locator('.quantity-control span')).toHaveText('2');
  await page.locator('[data-remove-item]').click();
  await expect(page.locator('[data-cart-count]')).toBeHidden();
});

test('size guide is accessible and checkout is deliberately disabled', async ({ page }) => {
  await page.goto(`${base}/product.html`);
  await page.locator('[data-size-guide-open]').first().click();
  await expect(page.locator('[data-size-modal]')).toBeVisible();
  await expect(page.locator('[data-size-modal] tbody tr')).toHaveCount(6);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-size-modal]')).toBeHidden();
  await page.goto(`${base}/checkout.html`);
  await expect(page.getByRole('heading', { name: /Checkout is currently being prepared/i })).toBeVisible();
  await expect(page.locator('input')).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
});

test('display preferences persist theme and estimated currency conversion', async ({ page }) => {
  await page.goto(`${base}/index.html`);
  await page.evaluate(() => {
    localStorage.removeItem('nighthound-theme');
    localStorage.removeItem('nighthound-currency');
  });
  await page.reload();
  await expect(page.locator('[data-preference-summary]')).toHaveText('System · USD');
  await page.locator('[data-preferences-toggle]').click();
  await page.locator('[data-theme-choice="light"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.locator('[data-currency-select]').selectOption('CAD');
  await expect(page.locator('[data-preference-summary]')).toHaveText('Light · CAD');
  await expect(page.locator('[data-product-price]').first()).toContainText('CAD');
  await expect(page.locator('[data-shipping-threshold]').first()).toContainText('CAD');
  await expect(page.locator('[data-money-usd="33.98"]').first()).toContainText('CAD');
  await page.reload();
  await expect(page.locator('[data-preference-summary]')).toHaveText('Light · CAD');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('policies tab and practical usage section are available', async ({ page }) => {
  await page.goto(`${base}/index.html`);
  await expect(page.getByRole('link', { name: 'Policies', exact: true }).first()).toBeVisible();
  await expect(page.locator('#how-it-works')).toContainText('Charge before use');
  await expect(page.locator('#how-it-works')).toContainText('Check after the walk');
  await page.getByRole('link', { name: 'Policies', exact: true }).first().click();
  await expect(page).toHaveURL(`${base}/policies.html`);
  await expect(page.getByRole('heading', { name: 'Store policies' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Read the return policy/ })).toHaveAttribute('href', 'returns.html');
});

for (const width of [375, 390, 430, 768, 1440]) {
  test(`homepage and product page fit ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['index.html', 'product.html?color=orange']) {
      await page.goto(`${base}/${name}`);
      expect(await page.locator('body').evaluate(node => node.scrollWidth <= node.clientWidth + 1), `${name} at ${width}`).toBeTruthy();
    }
  });
}

test('mobile gallery, navigation, size guide, and sticky purchase controls remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto(`${base}/product.html?color=blue&size=m`);
  await page.locator('[data-menu-toggle]').click();
  await expect(page.locator('[data-main-nav]')).toHaveClass(/is-open/);
  await page.locator('[data-menu-toggle]').click();
  await page.locator('[data-gallery-thumb="1"]').click();
  await expect(page.locator('[data-main-product-image]')).toHaveAttribute('src', 'assets/dog-collar-blue-v2.webp');
  await page.locator('[data-gallery-zoom]').click();
  await expect(page.locator('[data-lightbox]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-gallery-zoom]')).toBeFocused();
  await page.locator('[data-size-guide-open]').first().click();
  await expect(page.locator('[data-size-modal]')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('[data-add-to-cart]').scrollIntoViewIfNeeded();
  await expect(page.locator('.mobile-buy-bar')).not.toHaveClass(/is-visible/);
  await page.locator('.product-story-section').scrollIntoViewIfNeeded();
  await expect(page.locator('.mobile-buy-bar')).toHaveClass(/is-visible/);
  await page.locator('[data-sticky-add]').click();
  await expect(page.locator('[data-cart-drawer]')).toHaveClass(/is-open/);
  await expect(page.locator('[data-cart-footer]')).toContainText('$18.98');
});

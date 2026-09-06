const { chromium } = require('@playwright/test');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ colorScheme: 'dark', reducedMotion: 'reduce' });
  const phase = process.argv[2] || 'after';
  for (const [name, width, height] of [['product',1440,1050],['product',390,844],['index',1440,1000],['index',390,844],['deals',1440,1000],['policies',390,844]]) {
    await page.setViewportSize({width,height});
    await page.goto(`http://127.0.0.1:4173/${name}.html`);
    await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(img => img.decode().catch(() => {}))));
    if(name === 'product') await page.locator('[data-size-option="M"]').click();
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({path: path.join(__dirname,`${phase}-${name}-${width}-viewport.png`)});
    if(name === 'product' && width === 390) {
      await page.locator('.product-buy-box').scrollIntoViewIfNeeded();
      await page.screenshot({path: path.join(__dirname,`${phase}-product-mobile-controls.png`)});
      await page.evaluate(() => window.scrollTo(0,0));
    }
    await page.screenshot({path: path.join(__dirname,`${phase}-${name}-${width}.png`),fullPage:true});
  }
  await browser.close();
})();

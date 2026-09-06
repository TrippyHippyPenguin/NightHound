const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const { images } = require('./manifest.json');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const item of images) {
    const target = path.join(root, item.dest);
    const png = target.replace(/\.webp$/, '.png');
    fs.copyFileSync(item.source, png);
    const input = 'data:image/png;base64,' + fs.readFileSync(png).toString('base64');
    const result = await page.evaluate(async input => {
      const img = new Image(); img.src = input; await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return { data: canvas.toDataURL('image/webp', 0.9).split(',')[1], width: canvas.width, height: canvas.height };
    }, input);
    fs.writeFileSync(target, Buffer.from(result.data, 'base64'));
    console.log(`${item.dest}: ${result.width}x${result.height}, ${Math.round(fs.statSync(target).size / 1024)} KB`);
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

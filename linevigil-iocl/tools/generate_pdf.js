const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  try {
    const htmlPath = path.resolve(__dirname, '..', 'docs', 'LineVigil_OnePage.html');
    if (!fs.existsSync(htmlPath)) {
      console.error('HTML source not found at', htmlPath);
      process.exit(1);
    }

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });

    const outPath = path.resolve(__dirname, '..', 'docs', 'LineVigil_OnePage.pdf');
    await page.pdf({ path: outPath, format: 'A4', printBackground: true, margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } });

    await browser.close();
    console.log('PDF generated at', outPath);
  } catch (err) {
    console.error('PDF generation failed:', err);
    process.exit(1);
  }
})();
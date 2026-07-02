LineVigil One-Page PDF generation

1) Install dependencies (Node + npm required):

```powershell
cd c:\Users\Asmi\OneDrive\Desktop\linevigil\tools
npm install puppeteer
```

2) Generate the PDF (writes to `docs/LineVigil_OnePage.pdf`):

```powershell
node generate_pdf.js
```

Notes:
- Puppeteer will download a Chromium binary the first time; ensure you have network access.
- If you prefer not to install Puppeteer, open `docs/LineVigil_OnePage.html` in your browser and print to PDF (A4, portrait, margins 20mm).

# Merchant Atlas — Pluxee Store Locator

Search Hyderabad merchant/store records by PIN code and address.

## Features
- Filter by six-digit PIN code, including 500068
- Search merchant name, locality, address, and IDs
- Inspect store/business IDs, coordinates and terminal count
- Export filtered merchants and PIN summary to CSV
- Responsive layout for desktop and mobile

## Run locally
```bash
npm install
npm run dev
``

## Build
```bash
npm run build
npm run preview
``

## Deploy to Vercel
Import this GitHub repository into Vercel. Use the Vite framework preset and default build command `npm run build`. Output directory: `dist`.

## Import your master sheet
The initial deployment starts without a bundled merchant dataset. Use **Import data** in the site header and select the generated `Hyderabad_Merchant_Master_By_PIN.xlsx` workbook, or select multiple CSV exports. The importer reads the first worksheet (the workbook's `Master Merchants` sheet), normalizes fields, deduplicates store records and saves them in browser local storage.

**Important:** imported records stay in that browser on that device; they are not uploaded to GitHub or shared between visitors. Clearing site data can remove the saved import. The app does not automatically sync edits back into the workbook or live directory.
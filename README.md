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

## Dataset note
The directory dataset was assembled from user-provided CSV exports. It contains merchant/store data and may not reflect live directory changes. Verify addresses and completeness before operational use.
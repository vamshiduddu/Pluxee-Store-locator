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
This repository is connected to Vercel. Commits to `main` trigger a deployment.

## Master workbook
The site automatically fetches and reads this workbook on startup:

`public/data/Hyderabad_Merchant_Master_By_PIN.xlsx`

**The workbook must exist at exactly that path in GitHub.** The connected GitHub write action used for this setup can write text files but cannot upload the local binary Excel workbook. Until the workbook is added at the path above, the app will show a data-loading error. To add it once, open `public/data` in GitHub, choose **Add file → Upload files**, select `Hyderabad_Merchant_Master_By_PIN.xlsx`, and commit it to `main`. Vercel will redeploy, and future visitors will load the same repository data automatically without selecting a workbook in the site.

You can still use **Import data** to temporarily override the repository dataset in your own browser; those local imports are not shared with other visitors or written back to GitHub.

## Dataset note
The master workbook was generated from user-provided merchant CSV exports. It may not reflect live directory changes. Verify addresses and completeness before operational use.

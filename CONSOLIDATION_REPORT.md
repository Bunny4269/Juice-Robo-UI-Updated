# Juice Robo Consolidated Project

This folder is the consolidated Juice Robo project created from:

1. `D:\NGE Agromate\juice-robo`
2. `D:\NGE Agromate\juice robo upd design`

## Base used

`juice robo upd design` was used as the primary/current source because it contains the newer Juice Robo architecture and the latest product-card/image-resolution changes.

## Consolidation decisions

- Kept the updated-design versions of files that existed in both projects and differed.
- Kept the updated-design API, Menu, Checkout, Product Detail, App, and Vite implementation.
- Kept the centralized `src/shared/utils/imageResolver.js`.
- Kept the newer `src/apps/juiceRobo/` entry point.
- Did not restore superseded legacy files that only existed in the older project, including:
  - `src/utils/productImage.js`
  - duplicated nested PaymentScreen component paths
  - duplicate `src/assets/SG-*.png` files (the current project uses `public/assets/`)
- HCK was removed from this consolidated Juice Robo folder because HCK is now a separate standalone project at:
  `D:\NGE Agromate\hck`
- The backend source is retained from the updated project.
- Generated `.git`, `node_modules`, and `dist` directories are not included in this deliverable.

## Sensitive local configuration

For safety, local credential-bearing files are excluded from this deliverable:
- `.env.local`
- `juice_robo_backend/.env`
- `login_details.txt`
- `razorpay_test_api_keys_1787734599506.csv`

Use the existing local copies when setting up the project. `.env.example` files are included.

## Expected Juice Robo entry point

The Vite app uses `index.html` -> `src/apps/juiceRobo/main.jsx`.

The HCK application is no longer part of this Juice Robo build.

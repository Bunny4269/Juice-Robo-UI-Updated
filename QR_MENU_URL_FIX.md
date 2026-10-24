# Juice Robo QR Menu URL Fix

## What changed

- QR scans now recognize the legacy menu UUID in URLs such as `https://ordertest.juicerobo.com/menu-items/f9eef7a2-bbf5-4a98-a1ce-ceb69b171996`.
- After a successful scan, the redesigned site navigates to `/order_now/menu-items/<menu-UUID>/`, preserving the legacy URL structure under the Vite `/order_now/` base path.
- Direct visits to that route open the correct outlet menu rather than the scanner.
- Item-master requests use the legacy order-master API host/path: `https://tptest.juicerobo.com/tpordermaster/api/v1/itemmaster/items/<menu-UUID>`.
- The same route resolution works for the configured HCK menu UUID.

## Verify locally

1. Run `npm ci` and `npm run dev` in the project directory.
2. Open `/order_now/` and scan the Juice Robo QR code.
3. Confirm the URL changes to `/order_now/menu-items/f9eef7a2-bbf5-4a98-a1ce-ceb69b171996/` and the menu loads.
4. Open that URL directly in a new tab; it should load the menu without requiring a scan.
5. In DevTools Network, confirm the item-master request goes to `/tpordermaster/api/v1/itemmaster/items/<menu-UUID>`.

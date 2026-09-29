# Juice Robo Frontend

React + Vite frontend for Juice Robo.

## Setup

1. Install Node.js 20+.
2. Open this project folder in VS Code.
3. Run:

```bash
npm install
```

4. Copy `.env.example` to `.env.local` and fill the same backend/API values used by your existing project, especially:

```env
VITE_JR_UPI_ID=YOUR_REAL_UPI_VPA
```

5. Start the frontend:

```bash
npm run dev
```

The app runs on `http://localhost:5173`.

## Payment-app deep links

- PhonePe: `phonepe://pay?...`
- Google Pay: `gpay://upi/pay?...` on supported platforms, with Android fallback `tez://upi/pay?...`

The app does not treat opening a UPI app as payment success. Backend verification remains authoritative.

## Important

The backend is not included and has not been modified. Use the existing Juice Robo backend/API configuration.

export const PAYMENT_STATUS = Object.freeze({
  IDLE: "idle",
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  FAILED: "failed",
});

export const POLL_INTERVAL_MS = 2500;
export const MAX_POLL_DURATION_MS = 5 * 60 * 1000;

export const isIOSDevice =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export const isAndroidDevice =
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");

export const isMobileDevice =
  isIOSDevice ||
  isAndroidDevice ||
  (typeof navigator !== "undefined" &&
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ""
    ));

/**
 * The backend owns the UPI payload. Do not strip, rewrite, normalize,
 * or invent gateway parameters from its qrString.
 */
export function normalizeBackendUpiUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw || !/^upi:\/\/pay\?/i.test(raw)) return "";
  return raw;
}

const APP_SCHEMES = Object.freeze({
  phonepe: { ios: "phonepe://pay", android: "phonepe://pay" },
  googlepay: { ios: "gpay://upi/pay", android: "tez://upi/pay" },
  gpay: { ios: "gpay://upi/pay", android: "tez://upi/pay" },
  paytm: { ios: "paytmmp://pay", android: "paytmmp://pay" },
  bhim: { ios: "bhim://upi/pay", android: "bhim://upi/pay" },
});

export function getUpiAppScheme(app, android = false) {
  if (!app) return "";
  if (app.scheme && !app.id) return String(app.scheme).trim();
  const config = APP_SCHEMES[String(app.id || "").toLowerCase()];
  if (!config) return String(app.scheme || "").trim();
  return String(android ? config.android : config.ios).trim();
}

export function buildUpiAppUrl(backendUpiUrl, scheme) {
  const genericUrl = normalizeBackendUpiUrl(backendUpiUrl);
  if (!genericUrl || !scheme) return "";

  const queryIndex = genericUrl.indexOf("?");
  if (queryIndex < 0) return "";

  const cleanScheme = String(scheme).trim().replace(/:+$/, "").replace(/\/+$/, "");
  if (!cleanScheme) return "";

  // Preserve the backend query byte-for-byte. Only the URI scheme changes.
  return `${cleanScheme}?${genericUrl.slice(queryIndex + 1)}`;
}

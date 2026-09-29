/**
 * Currency Formatter Utility
 */

export function formatINR(value, options = {}) {
  const numeric = Number(value || 0);
  const safeNumber = Number.isFinite(numeric) ? numeric : 0;

  const minDecimals = options.minDecimals ?? 0;
  const maxDecimals = options.maxDecimals ?? 2;

  return `₹${safeNumber.toLocaleString("en-IN", {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  })}`;
}

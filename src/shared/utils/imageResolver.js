/**
 * Centralized Image URL Resolver for Juice Robo & Kiosk Apps
 * Resolves API-returned image filenames (e.g. "SG-Plain-200X200.png")
 * to the authoritative Vite base asset path.
 */

export function resolveJuiceProductImage(filenameOrUrl) {
  if (!filenameOrUrl) return "";
  const raw = String(filenameOrUrl).trim();
  if (!raw) return "";

  // Absolute URLs or data/blob URIs remain intact
  if (/^(https?:|\/\/|data:|blob:)/i.test(raw)) {
    return raw;
  }

  const base = String(import.meta.env.BASE_URL || "/").endsWith("/")
    ? String(import.meta.env.BASE_URL || "/")
    : `${String(import.meta.env.BASE_URL || "/")}/`;

  const assetBase = `${base}assets/`;

  // Already prefixed with assetBase
  if (raw.startsWith(assetBase)) {
    return raw;
  }

  // Already starts with base URL
  if (raw.startsWith(base)) {
    return raw;
  }

  // Strip leading slashes and any variant of assets/ prefix
  let cleanName = raw.replace(/^\.?\/?(order_now\/)?(assets\/)?/, "");
  cleanName = cleanName.replace(/^\/+/, "");

  return `${assetBase}${cleanName}`;
}

/**
 * Returns prioritized image candidate URLs for a given product and variant,
 * including clean fallback image names where available.
 */
export function getProductImageCandidates(product = {}) {
  const candidates = [];
  const seen = new Set();

  function addCandidate(raw) {
    if (!raw) return;
    const resolved = resolveJuiceProductImage(raw);
    if (resolved && !seen.has(resolved)) {
      seen.add(resolved);
      candidates.push(resolved);
    }
  }

  const variants = Array.isArray(product?.lstVariants)
    ? product.lstVariants
    : Array.isArray(product?.variants)
    ? product.variants
    : [];

  const primaryVariant = product?._variant || variants[0] || {};

  // 1. Direct API photo filenames from variant or item
  addCandidate(primaryVariant.variantPhoto);
  addCandidate(primaryVariant.photo);
  addCandidate(product.itemPhoto);
  addCandidate(product.photo);
  addCandidate(product.image_url);
  addCandidate(product.image);

  // 2. Sibling variants
  for (const v of variants) {
    addCandidate(v?.variantPhoto);
    addCandidate(v?.photo);
  }

  // 3. Fallback to existing jpg asset filename by flavor name if PNG is missing
  const name = String(product?.itemName || product?.name || "").toLowerCase();
  if (name.includes("ginger") && name.includes("lemon")) {
    addCandidate("ginger-lemon-juice.jpg");
    addCandidate("SG-Ginger-Lemon-200X200.png");
  } else if (name.includes("ginger")) {
    addCandidate("ginger-juice.jpg");
    addCandidate("SG-Ginger-200X200.png");
  } else if (name.includes("lemon")) {
    addCandidate("lemon-juice.jpg");
    addCandidate("SG-Lemon-200X200.png");
  } else if (name.includes("plain") || name.includes("classic")) {
    addCandidate("plain-juice.jpg");
    addCandidate("SG-Plain-200X200.png");
  }

  return candidates;
}

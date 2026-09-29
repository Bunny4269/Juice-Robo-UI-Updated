/*
 * Juice Robo product-image resolver.
 *
 * The API remains the source of truth for which image belongs to an item.
 * We only resolve the API-provided filename/URL against the local assets
 * bundled with this website. This avoids authenticated /tpimages requests
 * returning 401 in the browser while keeping product data fully API-driven.
 */

const LOCAL_ASSETS = import.meta.glob(
  "../assets/*.{png,jpg,jpeg,webp,avif}",
  {
    eager: true,
    query: "?url",
    import: "default",
  }
);

function clean(value) {
  return String(value ?? "").trim();
}

function fileName(value) {
  const raw = clean(value);
  if (!raw) return "";

  try {
    const withoutQuery = raw.split("?")[0].split("#")[0];
    const decoded = decodeURIComponent(withoutQuery);
    return decoded.split("/").pop() || "";
  } catch {
    return raw.split("/").pop() || "";
  }
}

function normalizeKey(value) {
  return fileName(value).toLowerCase();
}

function normalizeStem(value) {
  return normalizeKey(value).replace(/\.[^.]+$/, "").replace(/[^a-z0-9]/g, "");
}

const byFileName = new Map();
const byStem = new Map();

Object.entries(LOCAL_ASSETS).forEach(([source, url]) => {
  const name = fileName(source);
  if (!name || !url) return;

  byFileName.set(normalizeKey(name), url);
  byStem.set(normalizeStem(name), url);
});

export function resolveLocalProductImage(value) {
  const raw = clean(value);
  if (!raw) return "";

  if (/^(data:|blob:)/i.test(raw)) {
    return raw;
  }

  const exact = byFileName.get(normalizeKey(raw));
  if (exact) return exact;

  const stem = byStem.get(normalizeStem(raw));
  if (stem) return stem;

  return "";
}

export function resolveProductImage(value) {
  const raw = clean(value);
  if (!raw) return "";

  const local = resolveLocalProductImage(raw);
  if (local) return local;

  if (/^(https?:|data:|blob:)/i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("/")) return raw;
  if (raw.startsWith("./")) return raw.slice(1);
  return raw;
}

export function getApiProductImage(product = {}, variant = null) {
  const variants = Array.isArray(product?.lstVariants)
    ? product.lstVariants
    : Array.isArray(product?.variants)
      ? product.variants
      : [];

  const selectedVariant =
    variant ||
    product?._variant ||
    variants.find(
      (entry) =>
        entry &&
        entry?.isAvailable !== false &&
        entry?.is_available !== false
    ) ||
    variants[0] ||
    null;

  return (
    selectedVariant?.variantPhoto ||
    selectedVariant?.variant_photo ||
    selectedVariant?.image_url ||
    selectedVariant?.imageUrl ||
    selectedVariant?.image ||
    product?.image_url ||
    product?.imageUrl ||
    product?.image ||
    product?.itemPhoto ||
    product?.itemImage ||
    product?.photo_url ||
    product?.photoUrl ||
    product?.photo ||
    product?.thumbnail ||
    product?.thumbnail_url ||
    product?.thumbnailUrl ||
    ""
  );
}

export function resolveApiProductImage(product = {}, variant = null) {
  return resolveProductImage(getApiProductImage(product, variant));
}

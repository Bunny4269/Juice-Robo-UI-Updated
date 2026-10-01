/**
 * Shared Cart Matcher for Juice Robo
 * Consistently identifies cart items matching a product and variant
 * across Menu, Product Detail, and Cart screens.
 */

export function getCartVariantId(item = {}) {
  const vid =
    item?.variantId ??
    item?.variant_id ??
    item?._variant?.variantId ??
    item?._variant?.variant_id ??
    item?._variant?.id ??
    item?.id;

  if (vid !== undefined && vid !== null && vid !== "") {
    return vid;
  }
  return 0;
}

export function findCartItemForProduct(cart, product, variant = null) {
  if (!Array.isArray(cart) || !product) return null;

  // 1. Candidate variant IDs (from explicit variant or product variants)
  const candidateVariantIds = [
    variant?.variantId,
    variant?.variant_id,
    variant?.id,
    variant?._variant?.variantId,
    variant?._variant?.id,
  ]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map(String);

  // If no explicit variant passed, also check product's default variants or product variantId
  if (candidateVariantIds.length === 0) {
    const rawVariants = Array.isArray(product?.lstVariants)
      ? product.lstVariants
      : Array.isArray(product?.variants)
      ? product.variants
      : [];
    for (const v of rawVariants) {
      const vId = v?.variantId ?? v?.variant_id ?? v?.id;
      if (vId !== undefined && vId !== null && vId !== "") {
        candidateVariantIds.push(String(vId));
      }
    }
    if (product?.variantId) candidateVariantIds.push(String(product.variantId));
    if (product?.variant_id) candidateVariantIds.push(String(product.variant_id));
  }

  // 2. Candidate product IDs (NEVER mix product IDs with variant IDs)
  const candidateProductIds = [
    product?.id,
    product?.productId,
    product?.itemId,
    product?.product_id,
  ]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map(String);

  // Match by variant ID first
  if (candidateVariantIds.length > 0) {
    const matched = cart.find((item) => {
      const itemVariantIds = [
        item?.variantId,
        item?.variant_id,
        item?._variant?.variantId,
        item?._variant?.variant_id,
        item?._variant?.id,
        item?.id,
      ]
        .filter((v) => v !== undefined && v !== null && v !== "")
        .map(String);

      return candidateVariantIds.some((cvId) => itemVariantIds.includes(cvId));
    });

    if (matched) return matched;
  }

  // Match by product ID
  if (candidateProductIds.length > 0) {
    const matched = cart.find((item) => {
      const itemProductIds = [
        item?.productId,
        item?.itemId,
        item?.product_id,
      ]
        .filter((v) => v !== undefined && v !== null && v !== "")
        .map(String);

      return candidateProductIds.some((cpId) => itemProductIds.includes(cpId));
    });

    if (matched) return matched;
  }

  // Fallback: match by product name, ONLY if not a generic fallback placeholder
  const pName = (product?.name || product?.productName || product?.displayName || product?.itemName || "").trim().toLowerCase();
  const genericNames = [
    "helmet cleaning service",
    "sugarcane juice",
    "juice",
    "fresh juice",
    "helmet service",
    "helmet care",
    "juices"
  ];
  if (pName && !genericNames.includes(pName)) {
    const matched = cart.find((item) => {
      const iName = (item?.name || item?.productName || item?.displayName || item?.itemName || "").trim().toLowerCase();
      return iName && iName === pName;
    });
    if (matched) return matched;
  }

  return null;
}

export function getCartQuantityForProduct(cart, product, variant = null) {
  if (!Array.isArray(cart) || !product) return 0;
  const item = findCartItemForProduct(cart, product, variant);
  if (!item) return 0;
  const qty = Number(item?.quantity ?? item?.qty ?? item?.count ?? 0);
  return Number.isFinite(qty) && qty > 0 ? Math.min(Math.floor(qty), 9) : 0;
}

export function isSamePackage(p1, p2) {
  if (!p1 || !p2) return false;
  if (p1 === p2) return true;
  const id1 = p1?.id ?? p1?.productId ?? p1?.product_id ?? p1?.itemId;
  const id2 = p2?.id ?? p2?.productId ?? p2?.product_id ?? p2?.itemId;
  if (id1 !== undefined && id2 !== undefined && id1 !== null && id2 !== null) {
    return String(id1) === String(id2);
  }
  const name1 = (p1?.name ?? p1?.title ?? p1?.displayName ?? "").toLowerCase().trim();
  const name2 = (p2?.name ?? p2?.title ?? p2?.displayName ?? "").toLowerCase().trim();
  return Boolean(name1 && name1 === name2);
}


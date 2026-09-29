/**
 * Shared Cart Matcher for Juice Robo
 * Consistently identifies cart items matching a product and variant
 * across Menu, Product Detail, and Cart screens.
 */

export function getCartVariantId(item = {}) {
  return Number(
    item?.variantId ??
      item?.variant_id ??
      item?._variant?.variantId ??
      item?._variant?.variant_id ??
      item?._variant?.id ??
      item?.id ??
      0
  );
}

export function findCartItemForProduct(cart, product, variant = null) {
  if (!Array.isArray(cart) || !product) return null;

  const candidateVariantIds = [
    variant?.variantId,
    variant?.variant_id,
    variant?.id,
    product?.variantId,
    product?.variant_id,
    product?.id,
  ]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map(String);

  const candidateProductIds = [
    product?.id,
    product?.productId,
    product?.itemId,
    product?.product_id,
  ]
    .filter((v) => v !== undefined && v !== null && v !== "")
    .map(String);

  // 1. Match by variant ID
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

  // 2. Match by product ID
  if (candidateProductIds.length > 0) {
    const matched = cart.find((item) => {
      const itemProductIds = [
        item?.productId,
        item?.itemId,
        item?.product_id,
        item?.id,
      ]
        .filter((v) => v !== undefined && v !== null && v !== "")
        .map(String);

      return candidateProductIds.some((cpId) => itemProductIds.includes(cpId));
    });

    if (matched) return matched;
  }

  // 3. Fallback: match by name
  const pName = (product?.name || product?.productName || product?.displayName || "").trim().toLowerCase();
  if (pName) {
    const matched = cart.find((item) => {
      const iName = (item?.name || item?.productName || item?.displayName || "").trim().toLowerCase();
      return iName && iName === pName;
    });
    if (matched) return matched;
  }

  return null;
}

export function getCartQuantityForProduct(cart, product, variant = null) {
  const item = findCartItemForProduct(cart, product, variant);
  const qty = Number(item?.quantity ?? item?.qty ?? 0);
  return Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0;
}

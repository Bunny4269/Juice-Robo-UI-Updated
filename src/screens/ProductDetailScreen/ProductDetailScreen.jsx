import { useEffect, useMemo, useState } from "react";
import { resolveJuiceProductImage } from "../../shared/utils/imageResolver.js";
import { findCartItemForProduct } from "../../shared/utils/cartMatcher.js";
import "./ProductDetailScreen.css";

/*
 * JUICE ROBO — PRODUCT DETAIL
 *
 * Close behavior:
 * - Uses onClose when supplied by App.jsx.
 * - Falls back to onBack for older App.jsx versions.
 * - The close handler is attached directly to the X button.
 * - pointerdown + click are both handled to make the button
 *   reliable on mouse, touch and mobile browsers.
 */

const PRODUCT_ASSETS = {
  plain: "plain-juice.jpg",
  lemon: "lemon-juice.jpg",
  ginger: "ginger-juice.jpg",
  "ginger-lemon": "ginger-lemon-juice.jpg",
};

function clean(value) {
  return String(value ?? "").trim();
}

function productSearchText(product = {}) {
  return [
    product?.displayName,
    product?.name,
    product?.itemName,
    product?.productName,
    product?.product_name,
    product?.title,
    product?.description,
    product?.displayDescription,
    product?.desc,
    product?.variantName,
    product?.variantDesc,
    product?.type,
    product?.productType,
    product?.product_type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function productType(product = {}) {
  const text = productSearchText(product);

  if (
    text.includes("ginger") &&
    text.includes("lemon")
  ) {
    return "ginger-lemon";
  }

  if (text.includes("ginger")) {
    return "ginger";
  }

  if (text.includes("lemon")) {
    return "lemon";
  }

  return "plain";
}

function getProductName(
  product = {},
  displayProductName,
  isHck = false
) {
  const generated =
    typeof displayProductName === "function"
      ? clean(displayProductName(product))
      : "";

  const apiName = clean(product?.displayName);

  const rawName = clean(
    product?.name ||
      product?.itemName ||
      product?.productName ||
      product?.product_name ||
      product?.title
  );

  const usable = (value) => {
    if (!value) {
      return false;
    }

    const lower = value.toLowerCase();

    return (
      lower !== "juice" &&
      !lower.includes("undefined") &&
      !lower.includes("null")
    );
  };

  if (usable(apiName)) {
    return apiName;
  }

  if (usable(generated)) {
    return generated;
  }

  if (usable(rawName)) {
    return rawName;
  }

  if (isHck) {
    return "Helmet Cleaning Service";
  }

  const type = productType(product);

  if (type === "ginger-lemon") {
    return "Ginger + Lemon Sugarcane Juice";
  }

  if (type === "ginger") {
    return "Ginger Sugarcane Juice";
  }

  if (type === "lemon") {
    return "Lemon Sugarcane Juice";
  }

  return "Plain Sugarcane Juice";
}

function getProductDescription(
  product = {},
  displayDescription
) {
  const generated =
    typeof displayDescription === "function"
      ? clean(displayDescription(product))
      : "";

  if (generated) {
    return generated;
  }

  return (
    clean(
      product?.displayDescription ||
        product?.description ||
        product?.desc
    ) ||
    ""
  );
}

function getProductImage(
  product = {},
  productImage,
  isHck = false
) {
  const supplied =
    typeof productImage === "function"
      ? clean(productImage(product))
      : "";

  if (supplied) {
    return resolveJuiceProductImage(supplied);
  }

  const direct = clean(
    product?.variantPhoto ||
      product?.image ||
      product?.image_url ||
      product?.imageUrl ||
      product?.photo_url ||
      product?.photoUrl ||
      product?.photo ||
      product?.itemPhoto
  );

  if (direct) {
    return resolveJuiceProductImage(direct);
  }

  const fallback = isHck
    ? "hck-helmet-clean.svg"
    : (PRODUCT_ASSETS[productType(product)] || "plain-juice.jpg");
  return resolveJuiceProductImage(fallback);
}

function getVariants(product = {}) {
  const variants = Array.isArray(product?.variants)
    ? product.variants
    : Array.isArray(product?.lstVariants)
      ? product.lstVariants
      : [];

  return variants.filter(
    (variant) =>
      variant &&
      variant?.isAvailable !== false &&
      variant?.is_available !== false
  );
}

function getVariantName(
  variant = {},
  index,
  isHck = false
) {
  return (
    clean(
      variant?.variantName ||
        variant?.variant_name ||
        variant?.name ||
        variant?.title ||
        variant?.size
    ) ||
    (isHck ? "Disinfection Service" : (index === 0 ? "Full" : "Half"))
  );
}

function getVariantDescription(
  variant = {},
  product = {}
) {
  return (
    clean(
      variant?.description ||
        variant?.variantDesc ||
        variant?.variant_description
    ) ||
    getProductDescription(product)
  );
}

function getVariantPrice(
  variant = {},
  product = {}
) {
  const values = [
    variant?.unitPrice,
    variant?.unit_price,
    variant?.price,
    variant?.sellingPrice,
    variant?.selling_price,
    variant?.amount,

    product?.price,
    product?.unitPrice,
    product?.unit_price,
    product?.sellingPrice,
    product?.selling_price,
    product?.amount,
  ];

  for (const value of values) {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      continue;
    }

    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return 0;
}

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }

  return `₹${Number(
    value || 0
  ).toLocaleString("en-IN")}`;
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 6l12 12M18 6L6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="m3.5 9 3.2 3.2L14.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ProductDetailScreen({
  product = {},
  variant = null,
  cart = [],
  onUpdate,
  onClose,
  onBack,
  onVariantChange,
  onAddToCart,
  productImage,
  displayProductName,
  displayDescription,
  formatMoney = (value, moneyFn) =>
    typeof moneyFn === "function"
      ? moneyFn(value)
      : `₹${Number(value || 0).toFixed(2)}`,
  money,
  initialQuantity = 1,
  isHck = false,
}) {
  const variants = useMemo(
    () => getVariants(product),
    [product]
  );

  const fallbackVariants = useMemo(
    () =>
      variants.length > 0
        ? variants
        : [
            {
              name: isHck ? "Standard Service" : "Full",
              price:
                product?.price ??
                product?.unitPrice ??
                0,
            },
          ],
    [variants, product, isHck]
  );

  const [selectedVariantIndex, setSelectedVariantIndex] =
    useState(0);

  // Sync initial variant when product opens or changes:
  // If product is already in the cart, select the variant currently in the cart
  useEffect(() => {
    if (!product) return;
    const itemInCart = findCartItemForProduct(cart, product, null);
    if (itemInCart) {
      const vId =
        itemInCart?.variantId ??
        itemInCart?.variant_id ??
        itemInCart?._variant?.variantId ??
        itemInCart?._variant?.id ??
        itemInCart?.id;
      const idx = fallbackVariants.findIndex((v) => {
        const id = v?.variantId ?? v?.variant_id ?? v?.id;
        return String(id) === String(vId);
      });
      if (idx >= 0) {
        setSelectedVariantIndex(idx);
        return;
      }
    }
    setSelectedVariantIndex(0);
  }, [product]);

  const [imageError, setImageError] =
    useState(false);

  useEffect(() => {
    setImageError(false);
  }, [product]);

  const selectedVariant =
    fallbackVariants[
      selectedVariantIndex
    ] ||
    fallbackVariants[0];

  /* =======================================================
     CART SYNCHRONIZATION
     Derive quantity directly from the current cart state.
     ======================================================= */

  const cartItem = useMemo(
    () => findCartItemForProduct(cart, product, selectedVariant),
    [cart, product, selectedVariant]
  );

  const cartQuantity = useMemo(() => {
    const q = Number(cartItem?.quantity ?? cartItem?.qty ?? 0);
    return Number.isFinite(q) && q > 0 ? Math.floor(q) : 0;
  }, [cartItem]);

  const isInCart = cartQuantity > 0;

  // If not in cart, quantity starts at 1
  const [unaddedQuantity, setUnaddedQuantity] = useState(() =>
    Math.max(1, Number(initialQuantity) || 1)
  );

  useEffect(() => {
    setUnaddedQuantity(1);
  }, [product, selectedVariantIndex]);

  // Real-time synchronized quantity:
  // When in cart -> exact cart quantity
  // When not in cart -> starts at 1
  const quantity = isInCart ? cartQuantity : unaddedQuantity;

  const name = getProductName(
    product,
    displayProductName,
    isHck
  );

  const description =
    getProductDescription(
      product,
      displayDescription
    );

  const image = getProductImage(
    product,
    productImage,
    isHck
  );

  const selectedPrice =
    getVariantPrice(
      selectedVariant,
      product
    );

  const total =
    selectedPrice * quantity;

  /*
   * ONE close function for every close path.
   */
  function closeScreen() {
    if (typeof onClose === "function") {
      onClose();
      return;
    }

    if (typeof onBack === "function") {
      onBack();
    }
  }

  function handleCloseClick(event) {
    event.preventDefault();
    event.stopPropagation();

    closeScreen();
  }

  function handleClosePointerDown(event) {
    event.stopPropagation();
  }

  function handleBackdropClick(event) {
    if (
      event.target ===
      event.currentTarget
    ) {
      closeScreen();
    }
  }

  async function decreaseQuantity() {
    if (isInCart) {
      const nextQty = cartQuantity - 1;
      const targetId =
        cartItem?.id ??
        cartItem?.variantId ??
        cartItem?._variant?.variantId ??
        cartItem?._variant?.id ??
        selectedVariant?.variantId ??
        selectedVariant?.variant_id ??
        selectedVariant?.id ??
        product?.id;

      if (nextQty <= 0) {
        // Requirement 7: If quantity reaches 0, follow existing cart removal behavior
        if (typeof onUpdate === "function") {
          await onUpdate(targetId, 0);
        }
      } else {
        if (typeof onUpdate === "function") {
          await onUpdate(targetId, nextQty);
        }
      }
    } else {
      setUnaddedQuantity((current) => Math.max(1, current - 1));
    }
  }

  async function increaseQuantity() {
    if (quantity >= 9) return;
    const nextQty = Math.min(quantity + 1, 9);
    if (isInCart) {
      const targetId =
        cartItem?.id ??
        cartItem?.variantId ??
        cartItem?._variant?.variantId ??
        cartItem?._variant?.id ??
        selectedVariant?.variantId ??
        selectedVariant?.variant_id ??
        selectedVariant?.id ??
        product?.id;

      if (typeof onUpdate === "function") {
        await onUpdate(targetId, nextQty);
      }
    } else {
      // Requirement 5: If product not yet in cart, increasing quantity adds to cart with nextQty
      if (typeof onAddToCart === "function") {
        await onAddToCart(product, selectedVariant, nextQty, { keepOpen: true });
      } else {
        setUnaddedQuantity(nextQty);
      }
    }
  }

  async function handleAddToCart() {
    if (
      typeof onAddToCart !==
      "function"
    ) {
      return;
    }

    await onAddToCart(
      product,
      selectedVariant,
      quantity
    );
  }

  return (
    <div
      className="jr-product-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} product details`}
      onClick={handleBackdropClick}
    >
      <section
        className="jr-product-detail-sheet"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* =================================================
            CLOSE
           ================================================= */}

        <button
          type="button"
          className="jr-product-detail-close"
          onPointerDown={
            handleClosePointerDown
          }
          onClick={
            handleCloseClick
          }
          aria-label="Close product details"
          title="Close product details"
        >
          <CloseIcon />
        </button>

        {/* =================================================
            PRODUCT IMAGE
           ================================================= */}

        <div className="jr-product-detail-image-wrap">
          {!imageError && image ? (
            <img
              src={image}
              alt={name}
              className="jr-product-detail-image"
              loading="eager"
              decoding="async"
              onError={() =>
                setImageError(true)
              }
            />
          ) : (
            <div
              className="jr-product-detail-image-fallback"
              aria-hidden="true"
            >
              {isHck ? (
                <svg
                  viewBox="0 0 64 64"
                  width="48"
                  height="48"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect width="64" height="64" rx="14" fill="#EDF7ED" />
                  <path
                    d="M16 34 C16 22 23 16 32 16 C41 16 48 22 48 34 C48 43 43 47 36 47 L24 47 C18 47 16 41 16 34 Z"
                    fill="#287F46"
                  />
                  <path
                    d="M22 31 H42 V37 C42 39 40 41 38 41 H26 C24 41 22 39 22 37 Z"
                    fill="#a3e635"
                    opacity="0.9"
                  />
                </svg>
              ) : (
                <span>🧃</span>
              )}
            </div>
          )}
        </div>

        {/* =================================================
            PRODUCT INFO
           ================================================= */}

        <div className="jr-product-detail-info">
          <span className="jr-product-detail-eyebrow">
            {isHck ? "HELMET DISINFECTION & CLEANING" : "FRESH SUGARCANE JUICE"}
          </span>

          <h1>{name}</h1>

          {description ? (
            <p>{description}</p>
          ) : null}
        </div>

        {/* =================================================
            CHOOSE SIZE / PACKAGE DETAILS
           ================================================= */}

        <section className="jr-product-detail-section">
          <div className="jr-product-detail-section-heading">
            <strong>{isHck ? "PACKAGE DETAILS" : "CHOOSE SIZE"}</strong>
            <small>
              {isHck ? "Select your preferred package" : "Select your preferred serving"}
            </small>
          </div>

          <div className="jr-product-variants">
            {fallbackVariants.map(
              (variant, index) => {
                const active =
                  index ===
                  selectedVariantIndex;

                const variantName =
                  getVariantName(
                    variant,
                    index,
                    isHck
                  );

                const variantDescription =
                  getVariantDescription(
                    variant,
                    product
                  );

                const variantPrice =
                  getVariantPrice(
                    variant,
                    product
                  );

                return (
                  <button
                    type="button"
                    key={
                      variant?.id ??
                      variant?.variantId ??
                      variant?.variant_id ??
                      index
                    }
                    className={
                      active
                        ? "jr-product-variant active"
                        : "jr-product-variant"
                    }
                    onClick={() => {
                      setSelectedVariantIndex(index);
                      if (typeof onVariantChange === "function") {
                        onVariantChange(variant);
                      }
                    }}
                    aria-pressed={active}
                  >
                    <span
                      className="jr-product-variant-check"
                      aria-hidden="true"
                    >
                      {active ? (
                        <CheckIcon />
                      ) : null}
                    </span>

                    <span className="jr-product-variant-copy">
                      <strong>
                        {variantName}
                      </strong>

                      <small>
                        {variantDescription}
                      </small>
                    </span>

                    <strong className="jr-product-variant-price">
                      {formatMoney(
                        variantPrice,
                        money
                      )}
                    </strong>
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* =================================================
            QUANTITY
           ================================================= */}

        <section className="jr-product-detail-quantity-section">
          <div className="jr-product-detail-section-heading">
            <strong>{isHck ? "NUMBER OF HELMETS" : "QUANTITY"}</strong>
            <small>
              {isHck ? "How many helmets to clean?" : "How many would you like?"}
            </small>
          </div>

          <div
            className="jr-product-quantity-control"
            role="group"
            aria-label="Quantity"
          >
            <button
              type="button"
              onClick={
                decreaseQuantity
              }
              disabled={
                !isInCart && quantity <= 1
              }
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span
              aria-live="polite"
              aria-atomic="true"
            >
              {quantity}
            </span>

            <button
              type="button"
              onClick={
                increaseQuantity
              }
              disabled={quantity >= 9}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </section>

        {/* =================================================
            TOTAL
           ================================================= */}

        <div className="jr-product-detail-total">
          <span>TOTAL</span>

          <strong>
            {formatMoney(
              total,
              money
            )}
          </strong>
        </div>

        {/* =================================================
            ADD TO CART
           ================================================= */}

        <button
          type="button"
          className="jr-product-detail-add"
          onClick={
            handleAddToCart
          }
        >
          <span>ADD TO CART</span>

          <span className="jr-product-detail-add-arrow">
            →
          </span>
        </button>
      </section>
    </div>
  );
}

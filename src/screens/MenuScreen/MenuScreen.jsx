import { useMemo, useState, useCallback } from "react";
import "./MenuScreen.css";
import {
  getProductImageCandidates,
  resolveJuiceProductImage,
} from "../../shared/utils/imageResolver.js";

/*
 * Juice Robo Menu
 *
 * CART CONTRACT
 * -------------
 * The backend cart is keyed by variantId.
 *
 * +:
 *   onAddToCart(product, variant, absoluteQuantity)
 *
 * -:
 *   onUpdate(variantId, absoluteQuantity)
 *
 * RESPONSIVE LAYOUT
 * -----------------
 * Device type is NOT detected in this component.
 *
 * Layout/responsiveness is handled entirely by CSS.
 * This allows the UI to expand naturally up to 1300px
 * without incorrectly treating a resized desktop browser
 * as a mobile device.
 *
 * The component does not hardcode product names, prices,
 * outlet names, machine names, IDs, or API data.
 */

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).replace(/^"|"$/g, "").trim();
}

function sanitizeText(value) {
  return clean(value)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsableText(value) {
  if (!value) return false;
  const str = sanitizeText(value);
  const lower = str.toLowerCase();
  return (
    str !== "" &&
    lower !== "undefined" &&
    lower !== "null" &&
    lower !== "juice" &&
    lower !== "full" &&
    lower !== "item"
  );
}

function getProductCategory(product = {}) {
  // 1. Check explicit category fields
  const candidates = [
    product?.category,
    product?.categoryName,
    product?.category_name,
    product?.catName,
    product?.productCategory,
    product?.product_category,
    product?.itemCategory,
    product?.item_category,
    product?.group,
    product?.itemGroup,
    product?.item_group,
    product?.productType,
    product?.product_type,
    product?.type,
    product?._variant?.category,
    product?._variant?.productType,
  ];

  for (const candidate of candidates) {
    if (isUsableText(candidate)) {
      return sanitizeText(candidate);
    }
  }

  // 2. Derive from product text (name, description, variants)
  const variants = Array.isArray(product?.lstVariants)
    ? product.lstVariants
    : Array.isArray(product?.variants)
    ? product.variants
    : [];

  const text = [
    product?.name,
    product?.itemName,
    product?.productName,
    product?.product_name,
    product?.title,
    product?.desc,
    product?.description,
    ...variants.map((v) => v?.variantName),
    ...variants.map((v) => v?.variantDesc),
    ...variants.map((v) => v?.itemName),
    ...variants.map((v) => v?.sizeML),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("ginger") && text.includes("lemon")) {
    return "Ginger Lemon";
  }

  if (text.includes("ginger")) {
    return "Ginger";
  }

  if (text.includes("lemon")) {
    return "Lemon";
  }

  if (text.includes("plain") || text.includes("classic")) {
    return "Classic";
  }

  if (text.includes("sugarcane")) {
    return "Sugarcane Juice";
  }

  const rawName = sanitizeText(product?.name || product?.itemName || product?.productName);
  if (isUsableText(rawName)) {
    return rawName;
  }

  return "Juices";
}

function toPositiveId(value) {
  const id = Number(value);

  return Number.isFinite(id) && id > 0
    ? id
    : null;
}

function getVariants(product = {}) {
  if (Array.isArray(product?.lstVariants)) {
    return product.lstVariants.filter(Boolean);
  }

  if (Array.isArray(product?.variants)) {
    return product.variants.filter(Boolean);
  }

  return [];
}

function getVariantId(product = {}, variant = null) {
  const value =
    variant?.variantId ??
    variant?.variant_id ??
    variant?.id ??
    product?.variantId ??
    product?.variant_id ??
    product?.id;

  return toPositiveId(value);
}

function isAvailable(value) {
  return (
    value?.isAvailable !== false &&
    value?.is_available !== false
  );
}

function getDefaultVariant(product = {}) {
  const variants = getVariants(product);

  if (!variants.length) {
    return null;
  }

  return (
    variants.find(isAvailable) ??
    variants.find(
      (variant) =>
        clean(
          variant?.variantName ??
          variant?.name
        ).toLowerCase() === "full"
    ) ??
    variants[0]
  );
}

function productCartId(product = {}) {
  return getVariantId(
    product,
    getDefaultVariant(product)
  );
}

function cartItemVariantId(item = {}) {
  const nestedVariant =
    item?._variant ??
    item?.variant ??
    null;

  return getVariantId(
    item,
    nestedVariant
  );
}

function readQuantity(value) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(quantity)
  );
}

function quantityForProduct(cart, product) {
  const targetVariantId =
    productCartId(product);

  if (targetVariantId === null) {
    return 0;
  }

  const items =
    Array.isArray(cart)
      ? cart
      : [];

  const item = items.find(
    (entry) =>
      cartItemVariantId(entry) ===
      targetVariantId
  );

  return readQuantity(
    item?.quantity ??
    item?.qty ??
    0
  );
}

function displayName(
  product,
  resolver
) {
  if (typeof resolver === "function") {
    const resolved = sanitizeText(
      resolver(product)
    );

    if (resolved) {
      return resolved;
    }
  }

  const raw = sanitizeText(
    product?.displayName ??
    product?.name ??
    product?.productName ??
    product?.itemName
  );

  return raw || "Juice";
}

function displayDescription(
  product,
  resolver
) {
  if (typeof resolver === "function") {
    const resolved = sanitizeText(
      resolver(product)
    );

    if (resolved) {
      return resolved;
    }
  }

  return sanitizeText(
    product?.description ??
    product?.desc
  );
}

function productPrice(product) {
  const variant =
    getDefaultVariant(product);

  const values = [
    variant?.unitPrice,
    variant?.unit_price,
    variant?.price,

    product?.unitPrice,
    product?.unit_price,
    product?.sellingPrice,
    product?.selling_price,
    product?.price,
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

    const amount = Number(value);

    if (Number.isFinite(amount)) {
      return amount;
    }
  }

  return 0;
}

function imageCandidates(
  product,
  resolver
) {
  const candidates = getProductImageCandidates(product);

  if (typeof resolver === "function") {
    try {
      const custom = resolver(product);
      if (custom) {
        const resolved = resolveJuiceProductImage(custom);
        if (resolved && !candidates.includes(resolved)) {
          candidates.unshift(resolved);
        }
      }
    } catch (error) {
      console.warn(
        "[Juice Robo] Product image resolver failed:",
        error
      );
    }
  }

  return candidates;
}

function moneyValue(
  value,
  formatter
) {
  if (typeof formatter === "function") {
    return formatter(value);
  }

  return `₹${Number(
    value || 0
  ).toLocaleString("en-IN")}`;
}

function productKey(
  product,
  index
) {
  return (
    product?.id ??
    product?.productId ??
    product?.product_id ??
    productCartId(product) ??
    `product-${index}`
  );
}


/* =========================================================
   MENU SCREEN
   ========================================================= */

export default function MenuScreen({
  products = [],
  selectedLocation,
  selectedMachine,
  cart = [],
  onProduct,
  onUpdate,
  onAddToCart,
  productImage,
  displayProductName,
  displayDescription:
    displayDescriptionResolver,
  money,
}) {

  /* =======================================================
     PRODUCTS
     ======================================================= */

  const safeProducts = useMemo(
    () =>
      Array.isArray(products)
        ? products.filter(Boolean)
        : [],
    [products]
  );


  /* =======================================================
     VISIBLE PRODUCTS
     ======================================================= */

  // Category/filter buttons have been removed.
  // Always display every product returned by the API.
  const visibleProducts = safeProducts;

  /* =======================================================
     PRODUCT SELECT
     ======================================================= */

  const handleProductSelect =
    useCallback(
      (product) => {
        if (
          typeof onProduct === "function"
        ) {
          onProduct(product);
        }
      },
      [onProduct]
    );


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className="jr-content jr-menu-page">

      {/* ===================================================
          WELCOME / HERO
          =================================================== */}

      <section className="jr-welcome jr-menu-welcome">

        <div className="jr-welcome-copy">

          <span className="jr-eyebrow">
            FRESHLY MADE
          </span>

          <h1>
            Your favourite
            <br />
            <em>juice, your way.</em>
          </h1>

          <p>
            Pick your juice, choose your quantity and
            collect it fresh from your Juice Robo machine.
          </p>

        </div>

        <div
          className="jr-welcome-icon"
          aria-hidden="true"
        >
          🧃
        </div>

      </section>


      {/* ===================================================
          MENU SECTION
          =================================================== */}

      <section className="jr-menu-section">

        <div className="jr-section-heading">

          <div className="jr-section-heading-copy">

            <span className="jr-section-eyebrow">
              AVAILABLE JUICES
            </span>

            <h2>
              What are you craving?
            </h2>

          </div>

          <span
            className="jr-count"
            aria-label={`${visibleProducts.length} juices available`}
          >
            {visibleProducts.length}
          </span>

        </div>


        <p className="jr-section-subtitle">
          Choose your favourite fresh juice.
        </p>


        {/* =================================================
            PRODUCT GRID
            ================================================= */}

        <div className="jr-products">

          {safeProducts.length === 0 ? (

            <div className="jr-products-empty">

              <span aria-hidden="true">
                🧃
              </span>

              <strong>
                No juices available
              </strong>

              <p>
                No available products were returned by
                the Juice Robo Products API.
              </p>

            </div>

          ) : (

            visibleProducts.map(
              (product, index) => (

                <ProductCard
                  key={productKey(
                    product,
                    index
                  )}
                  product={product}
                  cart={cart}
                  onSelect={
                    handleProductSelect
                  }
                  onUpdate={onUpdate}
                  onAddToCart={
                    onAddToCart
                  }
                  productImage={
                    productImage
                  }
                  displayProductName={
                    displayProductName
                  }
                  displayDescription={
                    displayDescriptionResolver
                  }
                  money={money}
                />

              )
            )

          )}

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   PRODUCT CARD
   ========================================================= */

function ProductCard({
  product,
  cart,
  onSelect,
  onUpdate,
  onAddToCart,
  productImage,
  displayProductName,
  displayDescription: displayDescriptionResolver,
  money,
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  /* =======================================================
     PRODUCT DATA (FROM LIVE API)
     ======================================================= */

  const name = displayName(product, displayProductName);
  const description = displayDescription(product, displayDescriptionResolver);
  const price = productPrice(product);

  const variant = getDefaultVariant(product);
  const variantId = getVariantId(product, variant);

  /* =======================================================
     PRODUCT IMAGES (WITH RESOLVER & FALLBACKS)
     ======================================================= */

  const candidates = useMemo(
    () => imageCandidates(product, productImage),
    [product, productImage]
  );

  const handleImageError = useCallback(() => {
    setImageIndex((current) => {
      const next = current + 1;
      if (next < candidates.length) {
        return next;
      }
      setImageFailed(true);
      return current;
    });
  }, [candidates.length]);

  const currentImage =
    !imageFailed && candidates.length > 0 ? candidates[imageIndex] : "";

  /* =======================================================
     CART SYNCHRONIZATION
     ======================================================= */

  const quantity = quantityForProduct(cart, product);

  /* =======================================================
     AVAILABILITY
     ======================================================= */

  const available = isAvailable(product) && isAvailable(variant);

  /* =======================================================
     ADD TO CART / INCREMENT
     ======================================================= */

  async function handlePlus(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!available) return;

    if (typeof onAddToCart !== "function") {
      console.error("[Juice Robo] MenuScreen: onAddToCart is not connected.");
      return;
    }

    if (!variantId) {
      console.error("[Juice Robo] Product has no valid variantId:", product);
      return;
    }

    const nextQuantity = quantity + 1;
    try {
      await onAddToCart(product, variant, nextQuantity);
    } catch (error) {
      console.error("[Juice Robo] Menu + failed:", error);
    }
  }

  /* =======================================================
     REMOVE FROM CART / DECREMENT
     ======================================================= */

  async function handleMinus(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (quantity <= 0 || !variantId || typeof onUpdate !== "function") {
      return;
    }

    const nextQuantity = Math.max(0, quantity - 1);
    try {
      await onUpdate(variantId, nextQuantity);
    } catch (error) {
      console.error("[Juice Robo] Menu - failed:", error);
    }
  }

  /* =======================================================
     RENDER FOOD PRODUCT CARD
     ======================================================= */

  return (
    <article
      className={`jr-product-card jr-food-card${
        quantity > 0 ? " jr-product-card-in-cart jr-food-card--selected" : ""
      }${!available ? " jr-product-card-unavailable jr-food-card--unavailable" : ""}`}
      onClick={() => {
        if (typeof onSelect === "function") {
          onSelect(product);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (typeof onSelect === "function") {
            onSelect(product);
          }
        }
      }}
      style={{ cursor: "pointer" }}
    >
      {/* 1. MEDIA CONTAINER AT THE TOP */}
      <div className="jr-product-image-wrap jr-food-card__media">
        {currentImage ? (
          <img
            src={currentImage}
            alt={name}
            className="jr-product-image jr-food-card__image"
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
        ) : (
          <div
            className="jr-product-image-placeholder jr-food-card__placeholder"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 64 64"
              fill="none"
              className="jr-fallback-juice-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="52"
              height="52"
            >
              <rect width="64" height="64" rx="14" fill="#EDF7ED" />
              <path
                d="M22 18H42L39 48C39 50.2 37.2 52 35 52H29C26.8 52 25 50.2 25 48L22 18Z"
                fill="#287F46"
                fillOpacity="0.15"
                stroke="#287F46"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M20 18H44"
                stroke="#287F46"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M25 28H39"
                stroke="#287F46"
                strokeWidth="2"
                strokeDasharray="2 2"
                strokeLinecap="round"
              />
              <path
                d="M38 10L33 22"
                stroke="#E67E22"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle
                cx="32"
                cy="38"
                r="4"
                fill="#287F46"
                fillOpacity="0.25"
              />
            </svg>
          </div>
        )}

        <div className="jr-food-card__badges">
          {!available ? (
            <span className="jr-badge jr-badge--soldout">Sold Out</span>
          ) : (
            <span className="jr-fresh-badge jr-badge jr-badge--fresh">
              <span className="jr-badge__dot" />
              100% PURE
            </span>
          )}
        </div>
      </div>

      {/* 2. PRODUCT INFO CONTAINER */}
      <div className="jr-product-info jr-food-card__content">
        {/* ROW 1: PRODUCT NAME ON LEFT, ADD / COUNTER ON RIGHT */}
        <div className="jr-food-card__header-row">
          <div className="jr-product-main jr-food-card__title-wrap">
            <h3 className="jr-food-card__title">{name}</h3>
          </div>

          <div className="jr-food-card__action-wrap">
            {!available ? (
              <button
                type="button"
                className="jr-add-btn jr-add-btn--disabled"
                disabled
                onClick={(e) => e.stopPropagation()}
              >
                SOLD OUT
              </button>
            ) : quantity === 0 ? (
              <button
                type="button"
                className="jr-add-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlus(e);
                }}
                aria-label={`Add ${name} to cart`}
              >
                ADD
              </button>
            ) : (
              <div
                className="jr-qty-counter"
                role="group"
                aria-label={`${name} quantity: ${quantity}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="jr-qty-btn jr-qty-btn--minus"
                  onClick={handleMinus}
                  aria-label={`Decrease ${name} quantity`}
                >
                  −
                </button>
                <span className="jr-qty-value" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  className="jr-qty-btn jr-qty-btn--plus"
                  onClick={handlePlus}
                  aria-label={`Increase ${name} quantity`}
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: DESCRIPTION BELOW NAME */}
        {description ? (
          <p className="jr-food-card__desc">{description}</p>
        ) : null}

        {/* ROW 3: PRICE ROW WITH LIVE API PRICE & TAX NOTE */}
        <div className="jr-product-bottom jr-food-card__price-row">
          <div className="jr-food-card__price-group">
            <strong className="jr-product-price jr-food-card__price">
              {moneyValue(price, money)}
            </strong>
            <span className="jr-food-card__tax-info">
              {variant?.taxInclusive === false
                ? `+ ${variant?.taxRate || 5}% GST`
                : "Inclusive of all taxes"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
import { useMemo, useState, useCallback } from "react";
import "./MenuScreen.css";
import {
  getProductImageCandidates,
  resolveJuiceProductImage,
} from "../../shared/utils/imageResolver.js";
import { getCartQuantityForProduct, isSamePackage } from "../../shared/utils/cartMatcher.js";

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
  return getCartQuantityForProduct(cart, product);
}

function displayName(
  product,
  resolver,
  isHck = false
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

  return raw || (isHck ? "Helmet Cleaning Service" : "Juice");
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
  isHck = false,
  selectedHckPackage,
  onToggleHckPackage,
}) {
  /* =======================================================
     HCK SINGLE SELECTION STATE
     ======================================================= */

  const [internalSelectedPackage, setInternalSelectedPackage] = useState(null);
  const activeHckPackage = selectedHckPackage !== undefined ? selectedHckPackage : internalSelectedPackage;

  const handleToggleHckPackage = useCallback(
    (product) => {
      setInternalSelectedPackage((prev) => (isSamePackage(prev, product) ? null : product));
      if (typeof onToggleHckPackage === "function") {
        onToggleHckPackage(product);
      }
    },
    [onToggleHckPackage]
  );

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
            {isHck ? "PROFESSIONAL CARE" : "FRESHLY MADE"}
          </span>

          <h1>
            {isHck ? (
              <>
                Clean helmet,
                <br />
                <em>fresh ride.</em>
              </>
            ) : (
              <>
                Your favourite
                <br />
                <em>juice, your way.</em>
              </>
            )}
          </h1>

          <p>
            {isHck
              ? "Choose your cleaning package and refresh your helmet in minutes."
              : "Pick your juice, choose your quantity and collect it fresh from your Juice Robo machine."}
          </p>

        </div>

        <div
          className="jr-welcome-icon"
          aria-hidden="true"
        >
          {isHck ? (
            <svg
              viewBox="0 0 48 48"
              width="38"
              height="38"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 24 C10 14 17 8 24 8 C31 8 38 14 38 24 C38 31 34 35 28 35 L16 35 C11 35 10 30 10 24 Z"
                fill="#287F46"
              />
              <path
                d="M16 22 H32 V27 C32 29 30 30 28 30 H20 C18 30 16 29 16 27 Z"
                fill="#a3e635"
                opacity="0.9"
              />
              <path
                d="M21 15 L24 19 L29 13"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            "🧃"
          )}
        </div>

      </section>


      {/* ===================================================
          MENU SECTION
          =================================================== */}

      <section className="jr-menu-section">

        <div className="jr-section-heading">

          <div className="jr-section-heading-copy">

            <span className="jr-section-eyebrow">
              {isHck ? "CLEANING PACKAGES" : "AVAILABLE JUICES"}
            </span>

            <h2>
              {isHck ? "Choose your cleaning service" : "What are you craving?"}
            </h2>

          </div>

          <span
            className="jr-count"
            aria-label={
              isHck
                ? `${visibleProducts.length} packages available`
                : `${visibleProducts.length} juices available`
            }
          >
            {visibleProducts.length}
          </span>

        </div>


        <p className="jr-section-subtitle">
          {isHck
            ? "Select a package to keep your helmet fresh, clean, and disinfected."
            : "Choose your favourite fresh juice."}
        </p>


        {/* =================================================
            PRODUCT GRID
            ================================================= */}

        <div className="jr-products">

          {safeProducts.length === 0 ? (

            <div className="jr-products-empty">

              <span aria-hidden="true">
                {isHck ? (
                  <svg
                    viewBox="0 0 48 48"
                    width="42"
                    height="42"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M10 24 C10 14 17 8 24 8 C31 8 38 14 38 24 C38 31 34 35 28 35 L16 35 C11 35 10 30 10 24 Z"
                      fill="#287F46"
                    />
                    <path
                      d="M16 22 H32 V27 C32 29 30 30 28 30 H20 C18 30 16 29 16 27 Z"
                      fill="#a3e635"
                      opacity="0.9"
                    />
                  </svg>
                ) : (
                  "🧃"
                )}
              </span>

              <strong>
                {isHck ? "No cleaning services available" : "No juices available"}
              </strong>

              <p>
                {isHck
                  ? "No cleaning services were returned by the Products API."
                  : "No available products were returned by the Juice Robo Products API."}
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
                  isHck={isHck}
                  selectedHckPackage={activeHckPackage}
                  onToggleHckPackage={handleToggleHckPackage}
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
  isHck = false,
  selectedHckPackage,
  onToggleHckPackage,
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  /* =======================================================
     PRODUCT DATA (FROM LIVE API)
     ======================================================= */

  const name = displayName(product, displayProductName, isHck);
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
     CART SYNCHRONIZATION & SELECTION
     ======================================================= */

  const quantity = quantityForProduct(cart, product);
  const isSelected = isHck
    ? Boolean(isSamePackage(selectedHckPackage, product))
    : quantity > 0;

  /* =======================================================
     AVAILABILITY
     ======================================================= */

  const available = isAvailable(product) && isAvailable(variant);

  /* =======================================================
     HCK TOGGLE (SELECT / DESELECT RADIO LOGIC)
     ======================================================= */

  function handleHckToggle(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!available) return;

    if (typeof onToggleHckPackage === "function") {
      onToggleHckPackage(product);
    }
  }

  /* =======================================================
     ADD TO CART / INCREMENT (JR ONLY)
     ======================================================= */

  async function handlePlus(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!available) return;

    if (quantity >= 9) {
      return;
    }

    if (typeof onAddToCart !== "function") {
      console.error("[Juice Robo] MenuScreen: onAddToCart is not connected.");
      return;
    }

    if (!variantId) {
      console.error("[Juice Robo] Product has no valid variantId:", product);
      return;
    }

    const nextQuantity = Math.min(quantity + 1, 9);
    try {
      await onAddToCart(product, variant, nextQuantity);
    } catch (error) {
      console.error("[Juice Robo] Menu + failed:", error);
    }
  }

  /* =======================================================
     REMOVE FROM CART / DECREMENT (JR ONLY)
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
        isSelected ? " jr-product-card-in-cart jr-food-card--selected" : ""
      }${!available ? " jr-product-card-unavailable jr-food-card--unavailable" : ""}`}
      onClick={(e) => {
        if (isHck) {
          handleHckToggle(e);
        } else if (typeof onSelect === "function") {
          onSelect(product);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (isHck) {
            handleHckToggle(event);
          } else if (typeof onSelect === "function") {
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
            {isHck ? (
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
                  d="M16 34 C16 22 23 16 32 16 C41 16 48 22 48 34 C48 43 43 47 36 47 L24 47 C18 47 16 41 16 34 Z"
                  fill="#287F46"
                />
                <path
                  d="M22 31 H42 V37 C42 39 40 41 38 41 H26 C24 41 22 39 22 37 Z"
                  fill="#a3e635"
                  opacity="0.9"
                />
                <path
                  d="M28 22 L31 27 L37 19"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
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
            )}
          </div>
        )}

        <div className="jr-food-card__badges">
          {!available ? (
            <span className="jr-badge jr-badge--soldout">Sold Out</span>
          ) : (
            <span className="jr-fresh-badge jr-badge jr-badge--fresh">
              <span className="jr-badge__dot" />
              {isHck ? "SANITIZED" : "100% PURE"}
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
            ) : isHck ? (
              !isSelected ? (
                <button
                  type="button"
                  className="jr-add-btn jr-hck-select-btn"
                  onClick={handleHckToggle}
                  aria-label={`Select ${name}`}
                >
                  SELECT
                </button>
              ) : (
                <button
                  type="button"
                  className="jr-add-btn jr-hck-selected-btn"
                  onClick={handleHckToggle}
                  aria-label={`Deselect ${name}`}
                >
                  SELECTED ✓
                </button>
              )
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
                  className={`jr-qty-btn jr-qty-btn--plus${quantity >= 9 ? " jr-qty-btn--disabled" : ""}`}
                  onClick={handlePlus}
                  disabled={quantity >= 9}
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
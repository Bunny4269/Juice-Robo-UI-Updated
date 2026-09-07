import { useEffect, useMemo, useState } from "react";
import "./ProductDetailScreen.css";

/* =========================================================
   JUICE ROBO — PRODUCT DETAIL BOTTOM SHEET
   ========================================================= */

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

  if (text.includes("ginger") && text.includes("lemon")) {
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

function getProductName(product = {}, displayProductName) {
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
    if (!value) return false;

    const lower = value.toLowerCase();

    return (
      lower !== "juice" &&
      !lower.includes("undefined") &&
      !lower.includes("null")
    );
  };

  if (usable(apiName)) return apiName;
  if (usable(generated)) return generated;
  if (usable(rawName)) return rawName;

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

function getProductDescription(product = {}, displayDescription) {
  const generated =
    typeof displayDescription === "function"
      ? clean(displayDescription(product))
      : "";

  if (generated) return generated;

  const apiDescription = clean(
    product?.displayDescription ||
      product?.description ||
      product?.desc
  );

  if (apiDescription) return apiDescription;

  const type = productType(product);

  if (type === "ginger-lemon") {
    return "Sugarcane juice with Ginger & Lemon";
  }

  if (type === "ginger") {
    return "Sugarcane juice with Ginger";
  }

  if (type === "lemon") {
    return "Sugarcane juice with Lemon";
  }

  return "Sugarcane juice plain";
}

function getProductImage(product = {}, productImage) {
  const supplied =
    typeof productImage === "function"
      ? clean(productImage(product))
      : "";

  if (supplied) {
    if (
      supplied.startsWith("http://") ||
      supplied.startsWith("https://") ||
      supplied.startsWith("data:") ||
      supplied.startsWith("blob:") ||
      supplied.startsWith("/")
    ) {
      return supplied;
    }

    if (supplied.startsWith("assets/")) {
      return `/assets/${supplied.slice(7)}`;
    }

    return supplied;
  }

  const direct = clean(
    product?.image ||
      product?.image_url ||
      product?.imageUrl ||
      product?.photo_url ||
      product?.photoUrl ||
      product?.thumbnail ||
      product?.thumbnail_url ||
      product?.thumbnailUrl
  );

  if (direct) {
    if (
      direct.startsWith("http://") ||
      direct.startsWith("https://") ||
      direct.startsWith("data:") ||
      direct.startsWith("blob:") ||
      direct.startsWith("/")
    ) {
      return direct;
    }

    return `/assets/${direct}`;
  }

  return `/assets/${PRODUCT_ASSETS[productType(product)]}`;
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

function getVariantName(variant = {}, index) {
  return (
    clean(
      variant?.variantName ||
        variant?.variant_name ||
        variant?.name ||
        variant?.title ||
        variant?.size
    ) ||
    (index === 0 ? "Full" : "Half")
  );
}

function getVariantDescription(variant = {}, product = {}) {
  return (
    clean(
      variant?.description ||
        variant?.variantDesc ||
        variant?.variant_description
    ) ||
    getProductDescription(product)
  );
}

function getVariantPrice(variant = {}, product = {}) {
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
    if (value !== undefined && value !== null && value !== "") {
      const number = Number(value);

      if (Number.isFinite(number)) {
        return number;
      }
    }
  }

  return 0;
}

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }

  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

/* =========================================================
   CLOSE ICON
   ========================================================= */

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
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

/* =========================================================
   CHECK ICON
   ========================================================= */

function CheckIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
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

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function ProductDetailScreen({
  product = {},
  onClose,
  onAddToCart,
  productImage,
  displayProductName,
  displayDescription,
  money,
  initialQuantity = 1,
}) {
  const variants = useMemo(
    () => getVariants(product),
    [product]
  );

  const fallbackVariants =
    variants.length > 0
      ? variants
      : [
          {
            name: "Full",
            price:
              product?.price ??
              product?.unitPrice ??
              0,
          },
        ];

  const [selectedVariantIndex, setSelectedVariantIndex] =
    useState(0);

  const [quantity, setQuantity] = useState(
    Math.max(1, Number(initialQuantity) || 1)
  );

  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setSelectedVariantIndex(0);
    setQuantity(Math.max(1, Number(initialQuantity) || 1));
    setImageError(false);
  }, [product, initialQuantity]);

  const selectedVariant =
    fallbackVariants[selectedVariantIndex] ||
    fallbackVariants[0];

  const name = getProductName(
    product,
    displayProductName
  );

  const description = getProductDescription(
    product,
    displayDescription
  );

  const image = getProductImage(
    product,
    productImage
  );

  const selectedPrice = getVariantPrice(
    selectedVariant,
    product
  );

  const total = selectedPrice * quantity;

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  }

  function increaseQuantity() {
    setQuantity((current) => current + 1);
  }

  function handleAddToCart() {
    if (typeof onAddToCart !== "function") {
      return;
    }

    onAddToCart({
      product,
      variant: selectedVariant,
      variantIndex: selectedVariantIndex,
      quantity,
      unitPrice: selectedPrice,
      total,
    });
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  }

  return (
    <div
      className="jr-product-detail-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${name} product details`}
      onMouseDown={handleBackdropClick}
    >
      <section
        className="jr-product-detail-sheet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* =================================================
            CLOSE BUTTON
           ================================================= */}
        <button
          type="button"
          className="jr-product-detail-close"
          onClick={() => onClose?.()}
          aria-label="Close product details"
        >
          <CloseIcon />
        </button>

        {/* =================================================
            PRODUCT IMAGE
           ================================================= */}
        <div className="jr-product-detail-image-wrap">
          {!imageError ? (
            <img
              src={image}
              alt={name}
              className="jr-product-detail-image"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="jr-product-detail-image-fallback">
              <span>🧃</span>
            </div>
          )}
        </div>

        {/* =================================================
            PRODUCT INFO
           ================================================= */}
        <div className="jr-product-detail-info">
          <span className="jr-product-detail-eyebrow">
            FRESH SUGARCANE JUICE
          </span>

          <h1>{name}</h1>

          <p>{description}</p>
        </div>

        {/* =================================================
            CHOOSE SIZE
           ================================================= */}
        <section className="jr-product-detail-section">
          <div className="jr-product-detail-section-heading">
            <strong>CHOOSE SIZE</strong>
            <small>Select your preferred serving</small>
          </div>

          <div className="jr-product-variants">
            {fallbackVariants.map(
              (variant, index) => {
                const active =
                  index === selectedVariantIndex;

                const variantName =
                  getVariantName(
                    variant,
                    index
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
                      index
                    }
                    className={
                      active
                        ? "jr-product-variant active"
                        : "jr-product-variant"
                    }
                    onClick={() => {
                      setSelectedVariantIndex(index);
                    }}
                    aria-pressed={active}
                  >
                    <span
                      className="jr-product-variant-check"
                      aria-hidden="true"
                    >
                      {active && <CheckIcon />}
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
            <strong>QUANTITY</strong>
            <small>How many would you like?</small>
          </div>

          <div className="jr-product-quantity-control">
            <button
              type="button"
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              onClick={increaseQuantity}
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
            {formatMoney(total, money)}
          </strong>
        </div>

        {/* =================================================
            ADD TO CART
           ================================================= */}
        <button
          type="button"
          className="jr-product-detail-add"
          onClick={handleAddToCart}
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

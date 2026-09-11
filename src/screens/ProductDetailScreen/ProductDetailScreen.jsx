import { useEffect, useMemo, useState } from "react";
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
  displayProductName
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
  productImage
) {
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

function getVariantName(
  variant = {},
  index
) {
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

  /*
   * New App versions use onClose.
   * Older versions use onBack.
   * We support both so the X never depends on one
   * particular App.jsx revision.
   */
  onClose,
  onBack,

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

  const [quantity, setQuantity] =
    useState(
      Math.max(
        1,
        Number(initialQuantity) || 1
      )
    );

  const [imageError, setImageError] =
    useState(false);

  useEffect(() => {
    setSelectedVariantIndex(0);

    setQuantity(
      Math.max(
        1,
        Number(initialQuantity) || 1
      )
    );

    setImageError(false);
  }, [product, initialQuantity]);

  const selectedVariant =
    fallbackVariants[
      selectedVariantIndex
    ] ||
    fallbackVariants[0];

  const name = getProductName(
    product,
    displayProductName
  );

  const description =
    getProductDescription(
      product,
      displayDescription
    );

  const image = getProductImage(
    product,
    productImage
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
   *
   * App.jsx may provide either onClose or onBack.
   * Never rely on document-level click interception.
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
    /*
     * Prevent the parent/backdrop handlers from treating
     * the X interaction as a backdrop interaction.
     */
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

  function decreaseQuantity() {
    setQuantity(
      (current) =>
        Math.max(
          1,
          current - 1
        )
    );
  }

  function increaseQuantity() {
    setQuantity(
      (current) =>
        current + 1
    );
  }

  function handleAddToCart() {
    if (
      typeof onAddToCart !==
      "function"
    ) {
      return;
    }

    /*
     * App.jsx expects the cart callback in this form:
     *
     *   onAddToCart(product, variant, absoluteQuantity)
     *
     * The quantity selected in this Product Detail screen is
     * therefore sent directly to the cart handler.
     */
    onAddToCart(
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

          {description ? (
            <p>{description}</p>
          ) : null}
        </div>

        {/* =================================================
            CHOOSE SIZE
           ================================================= */}

        <section className="jr-product-detail-section">
          <div className="jr-product-detail-section-heading">
            <strong>CHOOSE SIZE</strong>
            <small>
              Select your preferred serving
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
                      variant?.variant_id ??
                      index
                    }
                    className={
                      active
                        ? "jr-product-variant active"
                        : "jr-product-variant"
                    }
                    onClick={() =>
                      setSelectedVariantIndex(
                        index
                      )
                    }
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
            <strong>QUANTITY</strong>
            <small>
              How many would you like?
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
                quantity <= 1
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

import { useMemo, useState, useCallback } from "react";
import "./MenuScreen.css";

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
  return String(value ?? "").trim();
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
    const resolved = clean(
      resolver(product)
    );

    if (resolved) {
      return resolved;
    }
  }

  return (
    clean(
      product?.name ??
      product?.productName ??
      product?.itemName
    ) || "Juice"
  );
}

function displayDescription(
  product,
  resolver
) {
  if (typeof resolver === "function") {
    const resolved = clean(
      resolver(product)
    );

    if (resolved) {
      return resolved;
    }
  }

  return clean(
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
  const values = [];

  if (typeof resolver === "function") {
    try {
      values.push(
        resolver(product)
      );
    } catch (error) {
      console.warn(
        "[Juice Robo] Product image resolver failed:",
        error
      );
    }
  }

  values.push(
    product?.image_url,
    product?.imageUrl,
    product?.image,
    product?.photo,
    product?.productPhoto,
    product?.productImage,
    product?.outletPhoto
  );

  const seen = new Set();

  return values
    .map(clean)
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
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
     LOCATION
     ======================================================= */

  const locationName =
    clean(
      selectedLocation?.name ??
      selectedLocation?.storeName ??
      selectedLocation?.outletName ??
      selectedLocation?.locationName
    ) || "Selected location";

  const locationAddress =
    clean(
      selectedLocation?.address ??
      selectedLocation?.outletDesc ??
      selectedLocation?.location ??
      selectedLocation?.description
    );


  /* =======================================================
     MACHINE
     ======================================================= */

  const machineName =
    clean(
      selectedMachine?.name ??
      selectedMachine?.machineName ??
      selectedMachine?.machine_name ??
      selectedMachine?.machineCode ??
      selectedMachine?.machine_code
    ) || "Juice Robo Machine";


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
          SELECTED MACHINE
          =================================================== */}

      <section
        className="jr-selected-machine-banner"
        aria-label="Current collection point"
      >

        <div
          className="jr-selected-machine-icon"
          aria-hidden="true"
        >
          📍
        </div>

        <div className="jr-selected-machine-copy">

          <small>
            COLLECTING FROM
          </small>

          <strong>
            {locationAddress ||
              locationName}
          </strong>

          <span>
            {machineName}

            {selectedMachine?.status
              ? ` · ${selectedMachine.status}`
              : ""}
          </span>

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
            aria-label={`${safeProducts.length} juices available`}
          >
            {safeProducts.length}
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

            safeProducts.map(
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
  displayDescription,
  money,
}) {

  const [
    imageIndex,
    setImageIndex,
  ] = useState(0);


  /* =======================================================
     PRODUCT DATA
     ======================================================= */

  const name =
    displayName(
      product,
      displayProductName
    );

  const description =
    displayDescription(
      product,
      displayDescription
    );

  const price =
    productPrice(product);


  /* =======================================================
     PRODUCT IMAGES
     ======================================================= */

  const candidates =
    useMemo(
      () =>
        imageCandidates(
          product,
          productImage
        ),
      [
        product,
        productImage,
      ]
    );


  /* =======================================================
     CART
     ======================================================= */

  const quantity =
    quantityForProduct(
      cart,
      product
    );

  const variant =
    getDefaultVariant(
      product
    );

  const variantId =
    getVariantId(
      product,
      variant
    );


  /* =======================================================
     AVAILABILITY
     ======================================================= */

  const available =
    isAvailable(product) &&
    isAvailable(variant);


  /* =======================================================
     PRODUCT SELECTION
     ======================================================= */

  const selectProduct =
    useCallback(
      () => {
        if (
          typeof onSelect ===
          "function"
        ) {
          onSelect(product);
        }
      },
      [
        onSelect,
        product,
      ]
    );


  /* =======================================================
     KEYBOARD ACCESSIBILITY
     ======================================================= */

  const handleCardKeyDown =
    useCallback(
      (event) => {

        if (
          event.key !== "Enter" &&
          event.key !== " "
        ) {
          return;
        }

        event.preventDefault();

        selectProduct();
      },
      [selectProduct]
    );


  /* =======================================================
     IMAGE ERROR / FALLBACK
     ======================================================= */

  const handleImageError =
    useCallback(
      () => {

        setImageIndex(
          (current) => {

            const next =
              current + 1;

            return next <
              candidates.length
              ? next
              : current;
          }
        );

      },
      [candidates.length]
    );


  /* =======================================================
     ADD TO CART
     ======================================================= */

  async function handlePlus(
    event
  ) {

    event.preventDefault();
    event.stopPropagation();

    if (!available) {
      return;
    }

    if (
      typeof onAddToCart !==
      "function"
    ) {

      console.error(
        "[Juice Robo] MenuScreen: onAddToCart is not connected."
      );

      return;
    }

    if (!variantId) {

      console.error(
        "[Juice Robo] Product has no valid variantId:",
        product
      );

      return;
    }

    const nextQuantity =
      Math.max(
        1,
        quantity + 1
      );

    try {

      await onAddToCart(
        product,
        variant,
        nextQuantity
      );

    } catch (error) {

      console.error(
        "[Juice Robo] Menu + failed:",
        error
      );

    }
  }


  /* =======================================================
     REMOVE FROM CART
     ======================================================= */

  async function handleMinus(
    event
  ) {

    event.preventDefault();
    event.stopPropagation();

    if (
      quantity <= 0 ||
      typeof onUpdate !==
        "function" ||
      !variantId
    ) {
      return;
    }

    const nextQuantity =
      Math.max(
        0,
        quantity - 1
      );

    try {

      await onUpdate(
        variantId,
        nextQuantity
      );

    } catch (error) {

      console.error(
        "[Juice Robo] Menu - failed:",
        error
      );

    }
  }


  /* =======================================================
     CURRENT IMAGE
     ======================================================= */

  const image =
    candidates[imageIndex] || "";


  /* =======================================================
     RENDER PRODUCT CARD
     ======================================================= */

  return (
    <article
      className={`jr-product-card${
        quantity > 0
          ? " jr-product-card-in-cart"
          : ""
      }`}
    >

      {/* =================================================
          PRODUCT IMAGE
          ================================================= */}

      <div
        className="jr-product-image-wrap"
        role="button"
        tabIndex={0}
        onClick={
          selectProduct
        }
        onKeyDown={
          handleCardKeyDown
        }
        aria-label={`View details for ${name}`}
      >

        {image ? (

          <img
            src={image}
            alt={name}
            className="jr-product-image"
            loading="lazy"
            decoding="async"
            onError={
              handleImageError
            }
          />

        ) : (

          <div
            className="jr-product-image-placeholder"
            aria-hidden="true"
          >
            🧃
          </div>

        )}


        <span className="jr-fresh-badge">

          <i />

          FRESH

        </span>

      </div>


      {/* =================================================
          PRODUCT INFORMATION
          ================================================= */}

      <div className="jr-product-info">

        <div
          className="jr-product-main"
          role="button"
          tabIndex={0}
          onClick={
            selectProduct
          }
          onKeyDown={
            handleCardKeyDown
          }
          aria-label={`View ${name} details`}
        >

          <h3>
            {name}
          </h3>

          {description ? (
            <p>
              {description}
            </p>
          ) : null}

        </div>


        {/* ===============================================
            PRICE + QUANTITY
            =============================================== */}

        <div className="jr-product-bottom">

          <strong className="jr-product-price">
            {moneyValue(
              price,
              money
            )}
          </strong>


          <div
            className="jr-product-quantity"
            role="group"
            aria-label={`${name} quantity`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* -------------------------------------------
                DECREASE
                ------------------------------------------- */}

            <button
              type="button"
              className="jr-quantity-minus"
              onClick={
                handleMinus
              }
              disabled={
                quantity <= 0
              }
              aria-label={`Decrease ${name} quantity`}
            >
              −
            </button>


            {/* -------------------------------------------
                QUANTITY
                ------------------------------------------- */}

            <strong
              aria-live="polite"
              aria-atomic="true"
            >
              {quantity}
            </strong>


            {/* -------------------------------------------
                INCREASE
                ------------------------------------------- */}

            <button
              type="button"
              className="jr-quantity-plus"
              onClick={
                handlePlus
              }
              disabled={
                !available
              }
              aria-label={`Increase ${name} quantity`}
            >
              +
            </button>

          </div>

        </div>

      </div>

    </article>
  );
}
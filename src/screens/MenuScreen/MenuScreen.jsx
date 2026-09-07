import "./MenuScreen.css";

/* =========================================================
   JUICE ROBO — MENU SCREEN
   API-DRIVEN / PREVIOUS UI MATCH
   ========================================================= */

/* =========================================================
   HELPERS
   ========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
}

function getProductName(product = {}) {
  return clean(
    firstDefined(
      product?.displayName,
      product?.name,
      product?.itemName,
      product?.productName,
      product?.product_name,
      product?.title
    )
  );
}

function getProductDescription(product = {}) {
  return clean(
    firstDefined(
      product?.displayDescription,
      product?.description,
      product?.desc,
      product?.display_desc
    )
  );
}

function getProductVariants(product = {}) {
  if (Array.isArray(product?.lstVariants)) {
    return product.lstVariants;
  }

  if (Array.isArray(product?.variants)) {
    return product.variants;
  }

  return [];
}

function getFirstAvailableVariant(product = {}) {
  const variants =
    getProductVariants(product);

  return (
    variants.find(
      (variant) =>
        variant &&
        variant.isAvailable !== false &&
        variant.is_available !== false
    ) ||
    variants[0] ||
    null
  );
}

function getProductPrice(product = {}) {
  const variant =
    getFirstAvailableVariant(product);

  const value =
    firstDefined(
      variant?.unitPrice,
      variant?.unit_price,
      variant?.price,
      product?.unitPrice,
      product?.unit_price,
      product?.price,
      product?.sellingPrice,
      product?.selling_price,
      product?.amount
    );

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }

  return `₹${Number(
    value || 0
  ).toLocaleString("en-IN")}`;
}

function getProductImage(
  product,
  productImage
) {
  if (typeof productImage === "function") {
    const value =
      clean(
        productImage(product)
      );

    if (value) {
      return value;
    }
  }

  return clean(
    firstDefined(
      product?.image_url,
      product?.imageUrl,
      product?.image,
      product?.photo_url,
      product?.photoUrl,
      product?.thumbnail_url,
      product?.thumbnailUrl,
      product?.itemPhoto,
      product?.item_photo
    )
  );
}

function getLocationName(location) {
  return clean(
    firstDefined(
      location?.name,
      location?.storeName,
      location?.locationName,
      location?.outletName
    )
  );
}

function getLocationAddress(location) {
  return clean(
    firstDefined(
      location?.address,
      location?.locAddress,
      location?.storeAddress,
      location?.location,
      location?.description,
      location?.outletDesc
    )
  );
}

function getMachineName(machine) {
  return clean(
    firstDefined(
      machine?.name,
      machine?.machineName,
      machine?.machine_name,
      machine?.machineCode,
      machine?.machine_code,
      machine?.code
    )
  );
}

function getMachineStatus(machine) {
  return clean(
    firstDefined(
      machine?.status,
      machine?.machineStatus,
      machine?.machine_status
    )
  );
}

/* =========================================================
   MAIN MENU SCREEN
   ========================================================= */

export default function MenuScreen({
  products = [],
  selectedLocation,
  selectedMachine,
  onProduct,
  productImage,
  displayProductName,
  displayDescription,
  money,
}) {
  const safeProducts =
    Array.isArray(products)
      ? products
      : [];

  const locationName =
    getLocationName(
      selectedLocation
    );

  const locationAddress =
    getLocationAddress(
      selectedLocation
    );

  const machineName =
    getMachineName(
      selectedMachine
    );

  const machineStatus =
    getMachineStatus(
      selectedMachine
    );

  return (
    <main className="jr-content jr-menu-page">

      {/* =====================================================
          WELCOME CARD
         ===================================================== */}

      <section className="jr-menu-welcome">

        <div className="jr-welcome-copy">

          <span className="jr-eyebrow">
            FRESHLY MADE
          </span>

          <h1>
            Your favourite juices
            <br />
            are on their way!
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
          <span>
            🧃
          </span>
        </div>

      </section>


      {/* =====================================================
          COLLECTION CARD
         ===================================================== */}

      <section className="jr-selected-machine-banner">

        <div
          className="jr-selected-machine-icon"
          aria-hidden="true"
        >
          <span>
            📍
          </span>
        </div>

        <div className="jr-selected-machine-copy">

          <small>
            COLLECTING FROM
          </small>

          <strong>
            {locationAddress ||
              locationName ||
              "Select collection point"}
          </strong>

          <span>
            {machineName
              ? machineStatus
                ? `${machineName} · ${machineStatus}`
                : machineName
              : locationName}
          </span>

        </div>

      </section>


      {/* =====================================================
          AVAILABLE JUICES
         ===================================================== */}

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


        {/* ===================================================
            PRODUCT LIST
           =================================================== */}

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
                No available products were returned
                by the Juice Robo API.
              </p>

            </div>

          ) : (

            safeProducts.map(
              (product, index) => (
                <ProductCard
                  key={
                    product?.id ??
                    product?.itemId ??
                    product?.productId ??
                    index
                  }
                  product={product}
                  onSelect={onProduct}
                  productImage={productImage}
                  displayProductName={
                    displayProductName
                  }
                  displayDescription={
                    displayDescription
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
  product = {},
  onSelect,
  productImage,
  displayProductName,
  displayDescription,
  money,
}) {
  const apiName =
    getProductName(product);

  const generatedName =
    typeof displayProductName === "function"
      ? clean(
          displayProductName(
            product
          )
        )
      : "";

  const name =
    apiName ||
    generatedName ||
    "Product";

  const apiDescription =
    getProductDescription(
      product
    );

  const generatedDescription =
    typeof displayDescription === "function"
      ? clean(
          displayDescription(
            product
          )
        )
      : "";

  const description =
    apiDescription ||
    generatedDescription;

  const price =
    getProductPrice(product);

  const image =
    getProductImage(
      product,
      productImage
    );

  function handleSelect() {
    if (
      typeof onSelect === "function"
    ) {
      onSelect(product);
    }
  }

  return (
    <button
      className="jr-product-card"
      type="button"
      onClick={handleSelect}
      aria-label={`Select ${name}`}
    >

      {/* =================================================
          IMAGE
         ================================================= */}

      <div className="jr-product-image-wrap">

        {image ? (

          <img
            src={image}
            alt={name}
            className="jr-product-image"
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display =
                "none";

              const placeholder =
                event.currentTarget.parentElement
                  ?.querySelector(
                    ".jr-product-image-placeholder"
                  );

              if (placeholder) {
                placeholder.style.display =
                  "flex";
              }
            }}
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

        <div className="jr-product-main">

          <h3>
            {name}
          </h3>

          {description && (
            <p>
              {description}
            </p>
          )}

        </div>


        {/* =================================================
            PRODUCT FOOTER
           ================================================= */}

        <div className="jr-product-footer">

          <strong className="jr-product-price">
            {formatMoney(
              price,
              money
            )}
          </strong>

          <span
            className="jr-select-circle"
            aria-hidden="true"
          >
            +
          </span>

        </div>

      </div>

    </button>
  );
}
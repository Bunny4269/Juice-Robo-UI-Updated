import "./HomeScreen.css";

/*
 * Juice Robo — Home Screen
 *
 * The collection-point logo is served from:
 * public/assets/app_logo.jpg
 */

const JUICE_ROBO_LOGO =
  `${import.meta.env.BASE_URL}assets/app_logo.jpg`;
const HCK_LOGO =
  `${import.meta.env.BASE_URL}assets/hck-logo.svg`;
const HCK_FALLBACK_IMAGE =
  `${import.meta.env.BASE_URL}assets/hck-helmet-clean.svg`;

export default function HomeScreen({
  products = [],
  selectedLocation,
  selectedMachine,
  onProduct,
  productImage,
  displayProductName,
  displayDescription,
  money,
  showLocation = false,
  isHck = false,
}) {
  const safeProducts = Array.isArray(products)
    ? products
    : [];

  const activeLogo = isHck ? HCK_LOGO : JUICE_ROBO_LOGO;

  return (
    <main className="jr-content jr-home-page">

      {/* =================================================
          HERO / WELCOME
         ================================================= */}

      <section className="jr-welcome">

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
          className="jr-welcome-icon jr-app-logo"
          aria-hidden="true"
        >
          <img
            src={activeLogo}
            alt=""
            className="jr-app-logo-image"
          />
        </div>

      </section>


      {/* =================================================
          SELECTED LOCATION / MACHINE
         ================================================= */}

      {showLocation && (
        <section
          className="jr-selected-machine-banner"
          aria-label="Collection point"
        >

          <div
            className="jr-selected-machine-icon jr-collection-logo"
            aria-hidden="true"
          >
            <img
              src={JUICE_ROBO_LOGO}
              alt=""
              className="jr-collection-logo-image"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";
              }}
            />
          </div>

          <div className="jr-selected-machine-copy">

            <small>
              COLLECTING FROM
            </small>

            <strong>
              {selectedLocation?.name ||
                "Selected location"}
            </strong>

            <small>
              {selectedMachine?.name ||
                "Selected machine"}
            </small>

          </div>

        </section>
      )}


      {/* =================================================
          AVAILABLE JUICES / CLEANING PACKAGES
         ================================================= */}

      <section className="jr-menu-section">

        <div className="jr-section-heading">

          <div>

            <span className="jr-eyebrow">
              {isHck ? "CLEANING PACKAGES" : "AVAILABLE JUICES"}
            </span>

            <h2>
              {isHck ? "Choose your cleaning service" : "What are you craving?"}
            </h2>

          </div>

          <span className="jr-count">
            {safeProducts.length}
          </span>

        </div>

        <p className="jr-section-subtitle">
          {isHck
            ? "Select a package to keep your helmet fresh, clean, and disinfected."
            : "Choose your favourite fresh juice."}
        </p>


        {/* =================================================
            PRODUCTS
           ================================================= */}

        <div className="jr-products">

          {safeProducts.length === 0 ? (

            <div className="jr-products-empty">

              <span
                className="jr-empty-logo"
                aria-hidden="true"
              >
                <img
                  src={activeLogo}
                  alt=""
                  className="jr-empty-logo-image"
                />
              </span>

              <strong>
                {isHck ? "No cleaning services available" : "No juices available"}
              </strong>

              <p>
                {isHck
                  ? "Cleaning service options will appear here when available."
                  : "Fresh juice options will appear here when available."}
              </p>

            </div>

          ) : (

            safeProducts.map(
              (product, index) => (

                <ProductCard
                  key={
                    product?.id ??
                    product?.productId ??
                    product?.product_id ??
                    `product-${index}`
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
                  isHck={isHck}
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
  isHck = false,
}) {
  const name =
    product?.displayName ||
    (
      typeof displayProductName === "function"
        ? displayProductName(product)
        : ""
    ) ||
    product?.name ||
    product?.productName ||
    product?.product_name ||
    product?.title ||
    (isHck ? "Helmet Cleaning Service" : "Juice");

  const description =
    product?.displayDescription ||
    (
      typeof displayDescription === "function"
        ? displayDescription(product)
        : ""
    ) ||
    product?.description ||
    (isHck
      ? "Professional helmet cleaning and disinfection service."
      : "Freshly prepared juice.");

  const image =
    product?.image ||
    product?.image_url ||
    product?.imageUrl ||
    (
      typeof productImage === "function"
        ? productImage(product)
        : ""
    );

  const price = Number(
    product?.price ??
      product?.sellingPrice ??
      product?.selling_price ??
      product?.amount ??
      product?.unitPrice ??
      product?.unit_price ??
      0
  );

  function handleSelect() {
    if (typeof onSelect === "function") {
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

      {/* PRODUCT IMAGE */}

      <div className="jr-product-image-wrap">

        {image ? (

          <img
            src={image}
            alt={name}
            className="jr-product-image"
            loading="lazy"
            onError={(event) => {
              if (
                typeof productImage ===
                "function"
              ) {
                event.currentTarget.src =
                  productImage(product);
              }
            }}
          />

        ) : (

          <div
            className="jr-product-image-placeholder jr-product-logo-placeholder"
            aria-hidden="true"
          >
            <img
              src={isHck ? HCK_FALLBACK_IMAGE : JUICE_ROBO_LOGO}
              alt=""
              className="jr-product-logo-image"
            />
          </div>

        )}

        <span className="jr-fresh-badge">
          <i />
          {isHck ? "CARE" : "FRESH"}
        </span>

      </div>


      {/* PRODUCT DETAILS */}

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


        {/* PRICE / SELECT */}

        <div className="jr-product-footer">

          <strong className="jr-product-price">
            {typeof money === "function"
              ? money(price)
              : `₹${price.toLocaleString("en-IN")}`}
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

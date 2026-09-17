import "./HomeScreen.css";

/*
 * Juice Robo — Home Screen
 *
 * The collection-point logo is served from:
 * public/assets/app_logo.jpg
 */

const JUICE_ROBO_LOGO =
  `${import.meta.env.BASE_URL}assets/app_logo.jpg`;

export default function HomeScreen({
  products = [],
  selectedLocation,
  selectedMachine,
  onProduct,
  onScanQR,
  productImage,
  displayProductName,
  displayDescription,
  money,
}) {
  const safeProducts = Array.isArray(products)
    ? products
    : [];

  return (
    <main className="jr-content jr-home-page">

      {/* =================================================
          HERO / WELCOME
         ================================================= */}

      <section className="jr-welcome">

        <div className="jr-welcome-copy">

          <span className="jr-eyebrow">
            FRESHLY MADE
          </span>

          <h1>
            Your favourite
            <br />
            <em>
              juice, your way.
            </em>
          </h1>

          <p>
            Pick your juice, choose your quantity and
            collect it fresh from your Juice Robo machine.
          </p>

        </div>

        <div
          className="jr-welcome-icon jr-app-logo"
          aria-hidden="true"
        >
          <img
            src={JUICE_ROBO_LOGO}
            alt=""
            className="jr-app-logo-image"
          />
        </div>

      </section>


      {/* =================================================
          SELECTED LOCATION / MACHINE
         ================================================= */}

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

      {/* =================================================
          QR CODE SCANNER CARD (TASK 3)
         ================================================= */}

      {onScanQR && (
        <section
          className="jr-qr-order-card"
          onClick={onScanQR}
          role="button"
          tabIndex={0}
          aria-label="Scan Machine QR to Order"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onScanQR();
            }
          }}
        >
          <div className="jr-qr-order-card-icon" aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 9V5C3 3.89543 3.89543 3 5 3H9M15 3H19C20.1046 3 21 3.89543 21 5V9M21 15V19C21 20.1046 20.1046 21 19 21H15M9 21H5C3.89543 21 3 20.1046 3 19V15M7 7H10V10H7V7ZM14 7H17V10H14V7ZM7 14H10V17H7V14ZM14 14H17V17H14V14Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="jr-qr-order-card-content">
            <small>INSTANT ORDER</small>
            <strong>Scan Machine QR Code</strong>
            <span>Point camera at machine screen to order</span>
          </div>
          <span className="jr-qr-order-card-arrow" aria-hidden="true">
            →
          </span>
        </section>
      )}

      {/* =================================================
          AVAILABLE JUICES
         ================================================= */}

      <section className="jr-menu-section">

        <div className="jr-section-heading">

          <div>

            <span className="jr-eyebrow">
              AVAILABLE JUICES
            </span>

            <h2>
              What are you craving?
            </h2>

          </div>

          <span className="jr-count">
            {safeProducts.length}
          </span>

        </div>

        <p className="jr-section-subtitle">
          Choose your favourite fresh juice.
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
                  src={JUICE_ROBO_LOGO}
                  alt=""
                  className="jr-empty-logo-image"
                />
              </span>

              <strong>
                No juices available
              </strong>

              <p>
                Fresh juice options will appear here
                when available.
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
    "Juice";

  const description =
    product?.displayDescription ||
    (
      typeof displayDescription === "function"
        ? displayDescription(product)
        : ""
    ) ||
    product?.description ||
    "Freshly prepared juice.";

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
              src={JUICE_ROBO_LOGO}
              alt=""
              className="jr-product-logo-image"
            />
          </div>

        )}

        <span className="jr-fresh-badge">
          <i />
          FRESH
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

import "./CartScreen.css";

/* =========================================================
   JUICE ROBO — CART SCREEN
   GST = 5%
   ========================================================= */

export default function CartScreen({
  cart = [],
  location,
  machine,
  onBack,
  onUpdate,
  onRemove,
  onLocation,
  onCheckout,
  productImage,
  displayProductName,
  money,
}) {
  const items = Array.isArray(cart) ? cart : [];

  /* =======================================================
     HELPERS
     ======================================================= */

  function getName(item) {
    if (typeof displayProductName === "function") {
      return displayProductName(item);
    }

    return (
      item?.displayName ||
      item?.name ||
      item?.productName ||
      item?.product_name ||
      "Sugarcane Juice"
    );
  }

  function getImage(item) {
    if (item?.image) {
      return item.image;
    }

    if (item?.image_url) {
      return item.image_url;
    }

    if (item?.imageUrl) {
      return item.imageUrl;
    }

    if (typeof productImage === "function") {
      return productImage(item);
    }

    return "";
  }

  function getPrice(item) {
    return Number(
      item?.price ??
        item?.unitPrice ??
        item?.sellingPrice ??
        item?.selling_price ??
        0
    );
  }

  function getQuantity(item) {
    const quantity = Number(
      item?.quantity ??
        item?.qty ??
        item?.count ??
        1
    );

    return Number.isFinite(quantity) && quantity > 0
      ? Math.floor(quantity)
      : 1;
  }

  /* =======================================================
     MONEY FORMATTING
     ======================================================= */

  function formatMoney(value) {
    if (typeof money === "function") {
      return money(value);
    }

    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function formatSummaryMoney(value) {
    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  /* =======================================================
     TOTALS
     ======================================================= */

  /*
   * Backend product prices are customer-facing prices
   * and already include GST.
   *
   * Gross Total = actual amount customer pays
   * Taxable Subtotal = Gross / 1.05
   * GST = Gross - Taxable Subtotal
   */

  const GST_RATE = 0.05;

  const grossTotal = items.reduce(
    (sum, item) => {
      const price = getPrice(item);
      const quantity = getQuantity(item);

      if (
        !Number.isFinite(price) ||
        !Number.isFinite(quantity)
      ) {
        return sum;
      }

      return sum + price * quantity;
    },
    0
  );

  const subtotal =
    grossTotal / (1 + GST_RATE);

  const gst =
    grossTotal - subtotal;

  const grandTotal =
    grossTotal;

  const itemCount = items.reduce(
    (sum, item) =>
      sum + getQuantity(item),
    0
  );

  /* =======================================================
     EMPTY CART
     ======================================================= */

  if (!items.length) {
    return (
      <main className="jr-content jr-page jr-cart-page">

        <div className="jr-cart-empty">

          <div className="jr-cart-empty-icon">
            🛒
          </div>

          <span className="jr-eyebrow">
            YOUR ORDER
          </span>

          <h1>
            Your cart is
            <br />
            <em>empty.</em>
          </h1>

          <p>
            Pick something fresh from the menu
            and add it to your order.
          </p>

          <button
            type="button"
            className="jr-cart-primary-button"
            onClick={onBack}
          >
            CONTINUE SHOPPING
            <span>→</span>
          </button>

        </div>

      </main>
    );
  }

  /* =======================================================
     CART
     ======================================================= */

  return (
    <main className="jr-content jr-page jr-cart-page">

      {/* =================================================
          CONTINUE SHOPPING
          TOP LEFT
         ================================================= */}

      <button
        type="button"
        className="jr-cart-continue"
        onClick={onBack}
      >
        ← Continue shopping
      </button>


      {/* =================================================
          PAGE HEADER
         ================================================= */}

      <div className="jr-cart-heading">

        <span className="jr-eyebrow">
          YOUR ORDER
        </span>

        <h1>
          Your
          <br />
          <em>cart.</em>
        </h1>

      </div>


      {/* =================================================
          COLLECTION LOCATION
         ================================================= */}

      <section className="jr-cart-location-card">

        <div className="jr-cart-location-icon">
          📍
        </div>

        <div className="jr-cart-location-copy">

          <small>
            COLLECT FROM
          </small>

          <strong>
            {location?.name ||
              "Juice Robo location"}
          </strong>

          {location?.address && (
            <span>
              {location.address}
            </span>
          )}

          {machine?.name && (
            <span>
              Machine: {machine.name}
            </span>
          )}

        </div>

        <button
          type="button"
          className="jr-cart-change-button"
          onClick={onLocation}
        >
          CHANGE
        </button>

      </section>


      {/* =================================================
          ITEM COUNT
         ================================================= */}

      <div className="jr-cart-items-header">

        <span>
          {itemCount}{" "}
          {itemCount === 1
            ? "ITEM"
            : "ITEMS"}
        </span>

        <button
          type="button"
          onClick={onBack}
        >
          + Add more
        </button>

      </div>


      {/* =================================================
          CART ITEMS
         ================================================= */}

      <section className="jr-cart-items">

        {items.map((item, index) => {

          const price =
            getPrice(item);

          const quantity =
            getQuantity(item);

          const lineTotal =
            price * quantity;

          const image =
            getImage(item);

          const name =
            getName(item);

          const variant =
            item?.variantName ||
            item?.variant_name ||
            "";

          return (
            <article
              className="jr-cart-item"
              key={`${item?.id || index}-${variant}`}
            >

              {/* =================================================
                  IMAGE
                 ================================================= */}

              <div className="jr-cart-item-image">

                {image ? (
                  <img
                    src={image}
                    alt={name}
                    onError={(event) => {
                      event.currentTarget.style.display =
                        "none";
                    }}
                  />
                ) : (
                  <div className="jr-cart-image-placeholder">
                    🧃
                  </div>
                )}

              </div>


              {/* =================================================
                  PRODUCT INFORMATION
                 ================================================= */}

              <div className="jr-cart-item-info">

                <span className="jr-cart-item-type">
                  FRESH JUICE
                </span>

                <h2>
                  {name}
                </h2>

                {variant && (
                  <span className="jr-cart-item-variant">
                    {variant}
                  </span>
                )}

                <div className="jr-cart-item-bottom">

                  <strong className="jr-cart-item-price">
                    {formatMoney(price)}
                  </strong>


                  {/* =================================================
                      QUANTITY
                     ================================================= */}

                  <div className="jr-cart-quantity">

                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() =>
                        onUpdate?.(
                          item.id,
                          Math.max(
                            0,
                            quantity - 1
                          )
                        )
                      }
                    >
                      −
                    </button>

                    <strong>
                      {quantity}
                    </strong>

                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() =>
                        onUpdate?.(
                          item.id,
                          quantity + 1
                        )
                      }
                    >
                      +
                    </button>

                  </div>

                </div>

              </div>


              {/* =================================================
                  RIGHT SIDE
                 ================================================= */}

              <div className="jr-cart-item-right">

                <strong>
                  {formatMoney(lineTotal)}
                </strong>

                <button
                  type="button"
                  className="jr-cart-remove"
                  onClick={() =>
                    onRemove?.(item.id)
                  }
                  aria-label={`Remove ${name}`}
                >
                  ×
                </button>

              </div>

            </article>
          );
        })}

      </section>


      {/* =================================================
          ORDER SUMMARY
         ================================================= */}

      <section className="jr-cart-summary">

        {/* SUMMARY HEADER */}

        <div className="jr-cart-summary-heading">

          <span className="jr-eyebrow">
            ORDER SUMMARY
          </span>

          <strong>
            {itemCount}{" "}
            {itemCount === 1
              ? "item"
              : "items"}
          </strong>

        </div>


        {/* =================================================
            SUBTOTAL
           ================================================= */}

        <div className="jr-summary-row">

          <span>
            Subtotal
          </span>

          <strong>
            {formatSummaryMoney(
              subtotal
            )}
          </strong>

        </div>


        {/* =================================================
            GST
           ================================================= */}

        <div className="jr-summary-row">

          <span>
            GST
            <small>
              {" "}5%
            </small>
          </span>

          <strong>
            {formatSummaryMoney(
              gst
            )}
          </strong>

        </div>


        {/* =================================================
            DIVIDER
           ================================================= */}

        <div className="jr-summary-divider" />


        {/* =================================================
            TOTAL
           ================================================= */}

        <div className="jr-summary-total">

          <div>

            <span>
              TOTAL
            </span>

            <small>
              Inclusive of 5% GST
            </small>

          </div>

          <strong>
            {formatSummaryMoney(
              grandTotal
            )}
          </strong>

        </div>


        {/* =================================================
            CHECKOUT
           ================================================= */}

        <button
          type="button"
          className="jr-cart-checkout"
          onClick={onCheckout}
        >

          <span>
            PROCEED TO PAYMENT
          </span>

          <b>
            →
          </b>

        </button>

      </section>

    </main>
  );
}
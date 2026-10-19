import "./CartScreen.css";

/* =========================================================
   JUICE ROBO — CART SCREEN
   GST = 12%
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
  showLocation = true,
  isHck = false,
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
      (isHck ? "Helmet Cleaning Service" : "Sugarcane Juice")
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
    const raw = Number(item?.quantity ?? item?.qty ?? item?.count ?? 1);
    return Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 9) : 1;
  }

  function formatMoney(value) {
    if (typeof money === "function") {
      return money(value);
    }

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

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      getPrice(item) *
        getQuantity(item),
    0
  );

  const GST_RATE = isHck ? 0.18 : 0.05;

  // Product prices are already GST-inclusive.
  // Do not add GST on top of the cart total.
  const grandTotal = subtotal;

  // Extract the taxable value and GST component from the inclusive total.
  const taxableSubtotal =
    Math.round(
      (grandTotal / (1 + GST_RATE) + Number.EPSILON) * 100
    ) / 100;

  const gst =
    Math.round(
      (grandTotal - taxableSubtotal + Number.EPSILON) * 100
    ) / 100;

  const itemCount = items.reduce(
    (sum, item) => sum + getQuantity(item),
    0
  );

  /* =======================================================
     EMPTY CART
     ======================================================= */

  if (!items.length) {
    return (
      <main className="jr-content jr-page jr-cart-page">

        <button
          type="button"
          className="jr-cart-back"
          onClick={onBack}
        >
          ← Back to menu
        </button>

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
            {isHck
              ? "Select a cleaning service from the menu and add it to your order."
              : "Pick something fresh from the menu and add it to your order."}
          </p>

          <button
            type="button"
            className="jr-cart-primary-button"
            onClick={onBack}
          >
            {isHck ? "VIEW SERVICES" : "CONTINUE SHOPPING"}
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
          BACK
         ================================================= */}

      <button
        type="button"
        className="jr-cart-back"
        onClick={onBack}
      >
        {isHck ? "← Back to services" : "← Back to menu"}
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

      {showLocation && (
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
                (isHck ? "HCK Station" : "Juice Robo location")}
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
      )}


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

          const price = getPrice(item);
          const quantity = getQuantity(item);
          const lineTotal =
            price * quantity;

          const image = getImage(item);
          const name = getName(item);

          const variant =
            item?.variantName ||
            item?.variant_name ||
            "";

          return (
            <article
              className="jr-cart-item"
              key={`${item?.id || index}-${variant}`}
            >

              {/* IMAGE */}

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
                    {isHck ? (
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
                        <path d="M4 12 C4 7 7.5 4 12 4 C16.5 4 20 7 20 12 C20 16 17.5 18 14 18 L8 18 C5.5 18 4 15 4 12 Z" fill="#287F46" />
                        <path d="M7 11 H17 V14 C17 15 16 16 15 16 H9 C8 16 7 15 7 14 Z" fill="#a3e635" />
                      </svg>
                    ) : (
                      "🧃"
                    )}
                  </div>
                )}

              </div>


              {/* INFO */}

              <div className="jr-cart-item-info">

                <span className="jr-cart-item-type">
                  {isHck ? "HELMET SERVICE" : "FRESH JUICE"}
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


                  {/* QUANTITY */}

                  <div className="jr-cart-quantity">

                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => {
                        const targetId = item?.variantId ?? item?.id ?? item?.productId;
                        if (quantity - 1 <= 0) {
                          if (typeof onRemove === "function") {
                            onRemove(targetId);
                          } else {
                            onUpdate?.(targetId, 0);
                          }
                        } else {
                          onUpdate?.(targetId, quantity - 1);
                        }
                      }}
                    >
                      −
                    </button>

                    <strong>
                      {quantity}
                    </strong>

                    <button
                      type="button"
                      aria-label="Increase quantity"
                      disabled={quantity >= 9}
                      className={quantity >= 9 ? "jr-cart-qty-btn--disabled" : ""}
                      onClick={() => {
                        if (quantity >= 9) return;
                        const targetId = item?.variantId ?? item?.id ?? item?.productId;
                        onUpdate?.(targetId, Math.min(quantity + 1, 9));
                      }}
                    >
                      +
                    </button>

                  </div>

                </div>

              </div>


              {/* RIGHT SIDE */}

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


        {/* SUBTOTAL */}

        <div className="jr-summary-row">

          <span>
            Subtotal
          </span>

          <strong>
            {formatMoney(taxableSubtotal)}
          </strong>

        </div>


        {/* GST */}

        <div className="jr-summary-row">

          <span>
            GST
            <small>
              {" "}5%
            </small>
          </span>

          <strong>
            {formatMoney(gst)}
          </strong>

        </div>


        <div className="jr-summary-divider" />


        {/* TOTAL */}

        <div className="jr-summary-total">

          <div>
            <span>
              TOTAL
            </span>

            <small>
              Inclusive of {isHck ? "18%" : "5%"} GST
            </small>
          </div>

          <strong>
            {formatMoney(grandTotal)}
          </strong>

        </div>


        {/* CHECKOUT */}

        <button
          type="button"
          className="jr-cart-checkout"
          onClick={onCheckout}
        >
          <span>
            CONTINUE
          </span>

          <b>
            →
          </b>
        </button>

      </section>

    </main>
  );
}
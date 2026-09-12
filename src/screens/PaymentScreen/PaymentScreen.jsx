import "./PaymentScreen.css";

/* =========================================================
   JUICE ROBO — PAYMENT SCREEN
   Pre-payment review only. No invoice/receipt is shown here.
   GST is inclusive at 5%.
   ========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }

  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/* =========================================================
   ITEM HELPERS
   ========================================================= */

function getItemName(item = {}) {
  return (
    clean(
      item?.displayName ||
        item?.name ||
        item?.itemName ||
        item?.productName ||
        item?.product_name ||
        item?.title
    )
      .replace(/\bundefined\b/gi, "")
      .replace(/\bnull\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() ||
    "Sugarcane Juice"
  );
}

function getItemQuantity(item = {}) {
  const quantity = Number(
    item?.quantity ??
      item?.qty ??
      item?.count ??
      1
  );

  return Number.isFinite(quantity) && quantity > 0
    ? quantity
    : 1;
}

function getItemUnitPrice(item = {}) {
  const directPrice = Number(
    item?.unitPrice ??
      item?.unit_price ??
      item?.price ??
      item?.sellingPrice ??
      item?.selling_price
  );

  if (
    Number.isFinite(directPrice) &&
    directPrice >= 0
  ) {
    return directPrice;
  }

  const quantity = getItemQuantity(item);

  const subtotal = Number(
    item?.subtotal ??
      item?.subTotal ??
      item?.total ??
      item?.lineTotal ??
      item?.line_total
  );

  if (
    Number.isFinite(subtotal) &&
    subtotal >= 0 &&
    quantity > 0
  ) {
    return subtotal / quantity;
  }

  return 0;
}

function getItemSubtotal(item = {}) {
  const direct = Number(
    item?.subtotal ??
      item?.subTotal ??
      item?.total ??
      item?.lineTotal ??
      item?.line_total
  );

  if (
    Number.isFinite(direct) &&
    direct >= 0
  ) {
    return direct;
  }

  return (
    getItemUnitPrice(item) *
    getItemQuantity(item)
  );
}

/* =========================================================
   ICONS
   ========================================================= */

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 3 19 6v5c0 4.6-2.9 8.2-7 10-4.1-1.8-7-5.4-7-10V6l7-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="m9 12 2 2 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <circle
        cx="12"
        cy="9"
        r="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

/* =========================================================
   MAIN
   ========================================================= */

export default function PaymentScreen({
  cart = [],
  items,
  total,
  gst,
  finalTotal,
  location,
  machine,
  onBack,
  onPay,
  money,
  paymentStatus,
  busy,
  error,
  paymentMethod,
}) {
  const safeCart = Array.isArray(items)
    ? items
    : Array.isArray(cart)
    ? cart
    : [];

  /* =======================================================
     ITEM TOTALS
     ======================================================= */

  const itemCount = safeCart.reduce(
    (sum, item) =>
      sum + getItemQuantity(item),
    0
  );

  const calculatedItemTotal =
    safeCart.reduce(
      (sum, item) =>
        sum + getItemSubtotal(item),
      0
    );

  /* =======================================================
     GST-INCLUSIVE TOTAL

     Cart:
       Subtotal = ₹0.95
       GST 5%   = ₹0.05
       Total    = ₹1.00

     Therefore, when total includes GST:

       taxable subtotal = total / 1.05
       GST               = total - subtotal
     ======================================================= */

  const amount =
    Number(
      finalTotal ??
        total ??
        calculatedItemTotal
    ) || 0;

  const roundedAmount =
    Math.round(
      (amount + Number.EPSILON) * 100
    ) / 100;

  const calculatedSubtotal =
    Math.round(
      (
        roundedAmount / 1.05 +
        Number.EPSILON
      ) * 100
    ) / 100;

  const gstAmount =
    Math.round(
      (
        roundedAmount -
        calculatedSubtotal +
        Number.EPSILON
      ) * 100
    ) / 100;

  /* =======================================================
     LOCATION
     ======================================================= */

  const locationName =
    clean(
      location?.name ||
        location?.storeName ||
        location?.locationName ||
        location?.outletName
    ) || "ICICI Bank";

  const locationAddress =
    clean(
      location?.address ||
        location?.locationAddress ||
        location?.storeAddress ||
        location?.location
    ) || "ICICI Tower, Hyderabad";

  /* =======================================================
     MACHINE
     ======================================================= */

  const machineName =
    clean(
      machine?.name ||
        machine?.machineName ||
        machine?.machineCode ||
        machine?.machine_code
    ) || "ICICI Bank";

  /* =======================================================
     PAYMENT
     ======================================================= */

  const paymentMode =
    clean(
      paymentMethod ||
        location?.paymentMethod
    ) || "UPI";

  const isProcessing =
    busy ||
    paymentStatus === "processing" ||
    paymentStatus === "PROCESSING";

  return (
    <main className="jr-content jr-page jr-payment-page">

      {/* =================================================
          BACK
         ================================================= */}

      <button
        className="jr-payment-back"
        onClick={onBack}
        type="button"
        disabled={isProcessing}
      >
        ← Back to cart
      </button>

      {/* =================================================
          HEADER
        ================================================= */}

      <header className="jr-payment-header">

        <span className="jr-payment-eyebrow">
          UPI PAYMENT
        </span>

        <h1>
          Complete your
          <br />
          <em>payment.</em>
        </h1>

        <p>
          Complete payment in your UPI app. We will
          verify it with Juice Robo.
        </p>

      </header>

      {/* =================================================
          COLLECTION CARD
         ================================================= */}

      <section className="jr-payment-collection-card">

        <div className="jr-payment-location-icon">
          <LocationIcon />
        </div>

        <div className="jr-payment-location-copy">

          <small>
            COLLECT FROM
          </small>

          <strong>
            {locationName}
          </strong>

          <span>
            {locationAddress}
          </span>

          <span>
            Machine: {machineName}
          </span>

        </div>

      </section>

      {/* =================================================
          ORDER SUMMARY
         ================================================= */}

      <section className="jr-payment-summary">

        <div className="jr-payment-section-heading">

          <div>
            <h2>
              ORDER SUMMARY
            </h2>

            <span>
              Review your selected items
            </span>
          </div>

          <strong>
            {itemCount}{" "}
            {itemCount === 1
              ? "ITEM"
              : "ITEMS"}
          </strong>

        </div>

        {/* ---------------------------------------------
            ITEM TABLE HEADER
           --------------------------------------------- */}

        {safeCart.length > 0 && (
          <div className="jr-payment-item-header">

            <span>
              ITEM
            </span>

            <span>
              QTY
            </span>

            <span>
              PRICE
            </span>

            <span>
              TOTAL
            </span>

          </div>
        )}

        {/* ---------------------------------------------
            ITEMS
           --------------------------------------------- */}

        <div className="jr-payment-items">

          {safeCart.length === 0 ? (

            <div className="jr-payment-empty">
              No items in your order.
            </div>

          ) : (

            safeCart.map((item, index) => {

              const quantity =
                getItemQuantity(item);

              const unitPrice =
                getItemUnitPrice(item);

              const subtotal =
                getItemSubtotal(item);

              return (
                <div
                  className="jr-payment-item"
                  key={
                    item?.id ||
                    item?.cartItemId ||
                    item?.productId ||
                    index
                  }
                >

                  <div className="jr-payment-item-name">

                    <strong>
                      {getItemName(item)}
                    </strong>

                  </div>

                  <span className="jr-payment-item-qty">
                    × {quantity}
                  </span>

                  <span className="jr-payment-item-unit">
                    {formatMoney(
                      unitPrice,
                      money
                    )}
                  </span>

                  <strong className="jr-payment-item-total">
                    {formatMoney(
                      subtotal,
                      money
                    )}
                  </strong>

                </div>
              );
            })
          )}

        </div>

        {/* ---------------------------------------------
            PRICE BREAKDOWN
           --------------------------------------------- */}

        <div className="jr-payment-divider" />

        <div className="jr-payment-breakdown">

          <div className="jr-payment-price-row">

            <span>
              Item subtotal
            </span>

            <strong>
              {formatMoney(
                calculatedSubtotal,
                money
              )}
            </strong>

          </div>

          <div className="jr-payment-price-row">

            <span>
              GST
              <small>
                5%
              </small>
            </span>

            <strong>
              {formatMoney(
                gstAmount,
                money
              )}
            </strong>

          </div>

        </div>

        {/* ---------------------------------------------
            GRAND TOTAL
           --------------------------------------------- */}

        <div className="jr-payment-total-row">

          <div>

            <span>
              TOTAL PAYABLE
            </span>

            <small>
              Inclusive of 5% GST
            </small>

          </div>

          <strong>
            {formatMoney(
              roundedAmount,
              money
            )}
          </strong>

        </div>

      </section>

      {/* =================================================
          SECURE PAYMENT INFO
         ================================================= */}

      <section className="jr-payment-secure-card">

        <div className="jr-payment-secure-icon">
          <ShieldIcon />
        </div>

        <div>

          <strong>
            Pay securely online
          </strong>

          <p>
            Your payment is securely processed
            through UPI. After successful payment,
            Juice Robo will provide your collection
            code.
          </p>

        </div>

      </section>

      {/* =================================================
          PAYMENT BUTTON
         ================================================= */}

      <button
        className="jr-payment-pay-button"
        type="button"
        onClick={onPay}
        disabled={
          isProcessing ||
          safeCart.length === 0
        }
      >

        <span>
          {isProcessing
            ? "PROCESSING PAYMENT..."
            : "PROCEED TO PAY"}
        </span>

        <strong>
          →
        </strong>

      </button>

      {/* =================================================
          SECURITY NOTE
         ================================================= */}

      <p className="jr-payment-security-note">
        Secure payment · Your payment details are protected
      </p>

      {/* =================================================
          ERROR
         ================================================= */}

      {error && (
        <div className="jr-payment-error">
          {error}
        </div>
      )}

    </main>
  );
}

import "./LocationConfirmationScreen.css";

/* =========================================================
   JUICE ROBO — LOCATION CONFIRMATION SCREEN

   Final review before payment.

   Flow:
   CART
     ↓
   CONFIRM LOCATION
     ↓
   CONFIRM LOCATION & PAY
     ↓
   UPI PAYMENT
   ========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function roundMoney(value) {
  return (
    Math.round(
      (Number(value || 0) + Number.EPSILON) * 100
    ) / 100
  );
}

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "₹0.00";
  }

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


/* =========================================================
   ITEM NAME
   ========================================================= */

function getItemName(item = {}) {
  const rawName =
    item?.displayName ||
    item?.name ||
    item?.itemName ||
    item?.productName ||
    item?.product_name ||
    item?.title;

  return (
    clean(rawName)
      .replace(/\bundefined\b/gi, "")
      .replace(/\bnull\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() ||
    "Sugarcane Juice"
  );
}

/* =========================================================
   QUANTITY
   ========================================================= */

function getQuantity(item = {}) {
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

/* =========================================================
   ITEM PRICE
   ========================================================= */

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

  const quantity = getQuantity(item);

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

/* =========================================================
   ITEM SUBTOTAL
   ========================================================= */

function getItemSubtotal(item = {}) {
  const directSubtotal = Number(
    item?.subtotal ??
      item?.subTotal ??
      item?.lineTotal ??
      item?.line_total
  );

  if (
    Number.isFinite(directSubtotal) &&
    directSubtotal >= 0
  ) {
    return directSubtotal;
  }

  const quantity = getQuantity(item);
  const unitPrice = getItemUnitPrice(item);

  return unitPrice * quantity;
}

/* =========================================================
   LOCATION ICON
   ========================================================= */

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="jr-location-confirm-svg"
    >
      <path
        d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <circle
        cx="12"
        cy="9"
        r="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/* =========================================================
   MACHINE ICON
   ========================================================= */

function MachineIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="jr-location-confirm-svg"
    >
      <rect
        x="6"
        y="3"
        width="12"
        height="18"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <rect
        x="9"
        y="6"
        width="6"
        height="5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="M9 15h6M9 18h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =========================================================
   MAIN SCREEN
   ========================================================= */

export default function LocationConfirmationScreen({
  location,
  machine,
  cart = [],
  total = 0,
  subtotal,
  gst,
  finalTotal,
  onBack,
  onConfirm,
  money,
  busy = false,
}) {
  const safeCart = Array.isArray(cart)
    ? cart
    : [];

  /* =======================================================
     ITEM COUNT
     ======================================================= */

  const itemCount = safeCart.reduce(
    (sum, item) =>
      sum + getQuantity(item),
    0
  );

  /* =======================================================
     TOTAL

     The App already calculates the GST-inclusive total.
     We use that total and derive the 5% GST breakdown
     exactly like the Cart screen.

     Example:
       Total    ₹1.00
       Subtotal ₹0.95
       GST      ₹0.05
     ======================================================= */

  const payableTotal = roundMoney(
    Number(finalTotal ?? total) || 0
  );

  const calculatedSubtotal = roundMoney(
    subtotal !== undefined && Number.isFinite(Number(subtotal))
      ? Number(subtotal)
      : payableTotal / 1.05
  );

  const calculatedGst = roundMoney(
    gst !== undefined && Number.isFinite(Number(gst))
      ? Number(gst)
      : payableTotal - calculatedSubtotal
  );

  /* =======================================================
     LOCATION
     ======================================================= */

  const locationName =
    clean(
      location?.name ||
        location?.storeName ||
        location?.outletName ||
        location?.locationName
    ) || "Selected location";

  const locationAddress =
    clean(
      location?.address ||
        location?.locAddress ||
        location?.storeAddress ||
        location?.location ||
        location?.description
    ) || "Juice Robo collection point";

  /* =======================================================
     MACHINE
     ======================================================= */

  const machineName =
    clean(
      machine?.name ||
        machine?.machineName ||
        machine?.machine_name ||
        machine?.machineCode ||
        machine?.machine_code
    ) || "Selected machine";

  const machineStatus =
    clean(
      machine?.status ||
        machine?.machineStatus ||
        machine?.machine_status
    ) || "Ready for collection";

  /* =======================================================
     SELECTION
     ======================================================= */

  const hasSelection =
    Boolean(location) &&
    Boolean(machine);

  return (
    <main className="jr-content jr-page jr-location-confirmation-page">

      {/* =================================================
          BACK
         ================================================= */}

      <button
        className="jr-location-confirm-back"
        type="button"
        onClick={onBack}
        disabled={busy}
      >
        ← Review order
      </button>

      {/* =================================================
          HEADER
         ================================================= */}

      <header className="jr-location-confirm-heading">

        <span className="jr-location-confirm-eyebrow">
          FINAL CHECK
        </span>

        <h1>
          Confirm your
          <br />
          <em>collection point.</em>
        </h1>

        <p>
          Please make sure your location and machine
          are correct before continuing to payment.
        </p>

      </header>

      {/* =================================================
          STEP 01 — LOCATION
         ================================================= */}

      <section className="jr-location-confirm-section">

        <div className="jr-location-confirm-section-label">

          <span>
            01
          </span>

          <div>
            <strong>
              COLLECTION LOCATION
            </strong>

            <small>
              Where you will collect your juice
            </small>
          </div>

        </div>

        <div className="jr-location-confirm-card">

          <div className="jr-location-confirm-icon">
            <LocationIcon />
          </div>

          <div className="jr-location-confirm-card-copy">

            <small>
              LOCATION
            </small>

            <strong>
              {locationName}
            </strong>

            <span>
              {locationAddress}
            </span>

          </div>

          <span className="jr-location-confirm-check">
            ✓
          </span>

        </div>

      </section>

      {/* =================================================
          STEP 02 — MACHINE
         ================================================= */}

      <section className="jr-location-confirm-section">

        <div className="jr-location-confirm-section-label">

          <span>
            02
          </span>

          <div>
            <strong>
              COLLECTION MACHINE
            </strong>

            <small>
              Your selected Juice Robo machine
            </small>
          </div>

        </div>

        <div className="jr-location-confirm-card">

          <div className="jr-location-confirm-icon">
            <MachineIcon />
          </div>

          <div className="jr-location-confirm-card-copy">

            <small>
              MACHINE
            </small>

            <strong>
              {machineName}
            </strong>

            <span>
              {machineStatus}
            </span>

          </div>

          <span className="jr-location-confirm-check">
            ✓
          </span>

        </div>

      </section>

      {/* =================================================
          ORDER SUMMARY
         ================================================= */}

      <section className="jr-location-confirm-order-card">

        <div className="jr-location-confirm-order-heading">

          <h2>
            ORDER SUMMARY
          </h2>

          <span>
            {itemCount}{" "}
            {itemCount === 1
              ? "item"
              : "items"}
          </span>

        </div>

        {/* =================================================
            ITEMS
           ================================================= */}

        {safeCart.length > 0 && (
          <div className="jr-location-confirm-items">

            {safeCart.map((item, index) => {

              const name =
                getItemName(item);

              const quantity =
                getQuantity(item);

              const itemSubtotal =
                getItemSubtotal(item);

              return (
                <div
                  className="jr-location-confirm-item"
                  key={
                    item?.id ||
                    item?.cartItemId ||
                    item?.productId ||
                    index
                  }
                >

                  <span>
                    {name}
                    {" × "}
                    {quantity}
                  </span>

                  <strong>
                    {formatMoney(itemSubtotal)}
                  </strong>

                </div>
              );
            })}

          </div>
        )}

        {/* =================================================
            PRICE BREAKDOWN
           ================================================= */}

        <div className="jr-location-confirm-breakdown">

          <div className="jr-location-confirm-price-row">

            <span>
              Subtotal
            </span>

            <strong>
              {formatMoney(
                calculatedSubtotal,
                money
              )}
            </strong>

          </div>

          <div className="jr-location-confirm-price-row">

            <span>
              GST 5%
            </span>

            <strong>
              {formatMoney(
                calculatedGst,
                money
              )}
            </strong>

          </div>

        </div>

        {/* =================================================
            TOTAL
           ================================================= */}

        <div className="jr-location-confirm-total">

          <div>
            <span>
              TOTAL TO PAY
            </span>

            <small>
              Inclusive of 5% GST
            </small>
          </div>

          <strong>
            {formatMoney(
              payableTotal,
              money
            )}
          </strong>

        </div>

      </section>

      {/* =================================================
          CONFIRM BUTTON
         ================================================= */}

      <button
        className="jr-location-confirm-button"
        type="button"
        onClick={onConfirm}
        disabled={
          busy ||
          !hasSelection ||
          safeCart.length === 0
        }
      >

        <span>
          {busy
            ? "CONTINUING..."
            : "CONFIRM LOCATION & PAY"}
        </span>

        <strong>
          →
        </strong>

      </button>

      {/* =================================================
          SECURITY NOTE
         ================================================= */}

      <p className="jr-location-confirm-note">
        🔒 You can go back and change your collection
        point before payment.
      </p>

    </main>
  );
}
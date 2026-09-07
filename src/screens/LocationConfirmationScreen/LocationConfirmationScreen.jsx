import "./LocationConfirmationScreen.css";

/* =========================================================
   JUICE ROBO — LOCATION CONFIRMATION SCREEN
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

function getLocationName(location) {
  return (
    clean(
      location?.name ||
        location?.storeName ||
        location?.outletName ||
        location?.locationName
    ) || "Selected location"
  );
}

function getLocationAddress(location) {
  return (
    clean(
      location?.address ||
        location?.locAddress ||
        location?.storeAddress ||
        location?.location ||
        location?.description
    ) || "Juice Robo collection point"
  );
}

function getMachineName(machine) {
  return (
    clean(
      machine?.name ||
        machine?.machineName ||
        machine?.machine_name ||
        machine?.machineCode ||
        machine?.machine_code
    ) || "Selected machine"
  );
}

function getMachineStatus(machine) {
  return (
    clean(
      machine?.status ||
        machine?.machineStatus ||
        machine?.machine_status
    ) || "Ready for collection"
  );
}

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
  onBack,
  onConfirm,
  money,
  busy = false,
  error,
}) {
  const safeCart = Array.isArray(cart)
    ? cart
    : [];

  const itemCount = safeCart.reduce(
    (sum, item) =>
      sum + getQuantity(item),
    0
  );

  const locationName =
    getLocationName(location);

  const locationAddress =
    getLocationAddress(location);

  const machineName =
    getMachineName(machine);

  const machineStatus =
    getMachineStatus(machine);

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
          <span>01</span>

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
          <span>02</span>

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
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>

        </div>


        {safeCart.length > 0 && (
          <div className="jr-location-confirm-items">

            {safeCart.map((item, index) => {

              const name =
                item?.displayName ||
                item?.name ||
                item?.itemName ||
                item?.productName ||
                item?.product_name ||
                "Sugarcane Juice";

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
                    {getQuantity(item)}
                  </span>

                </div>
              );
            })}

          </div>
        )}


        <div className="jr-location-confirm-total">

          <div>
            <span>
              TOTAL TO PAY
            </span>

            <small>
              Inclusive of applicable GST
            </small>
          </div>

          <strong>
            {formatMoney(total, money)}
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
        🔒 You can go back and change your collection point before payment.
      </p>


      {error && (
        <div className="jr-location-confirm-error">
          {error}
        </div>
      )}

    </main>
  );
}

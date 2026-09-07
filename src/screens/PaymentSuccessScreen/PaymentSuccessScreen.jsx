import "./PaymentSuccessScreen.css";

/* =========================================================
   JUICE ROBO — PAYMENT SUCCESS SCREEN
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

function getCollectionCode(order = {}) {
  const raw =
    order?.collection_code ??
    order?.collectionCode ??
    order?.pickupCode ??
    order?.collectionId ??
    order?.token ??
    order?.orderPin ??
    "";

  if (
    raw === "" ||
    raw === null ||
    raw === undefined
  ) {
    return "";
  }

  const code = String(raw)
    .replace(/\D/g, "")
    .slice(-4)
    .padStart(4, "0");

  return /^\d{4}$/.test(code)
    ? code
    : "";
}

function getOrderNumber(order = {}) {
  return (
    clean(
      order?.order_number ||
        order?.orderNumber ||
        order?.id ||
        order?.orderId
    ) || "—"
  );
}

function getTotal(order = {}) {
  return Number(
    order?.total_amount ??
      order?.totalAmount ??
      order?.grandTotal ??
      order?.grand_total ??
      0
  );
}

function getPaymentMethod(order = {}) {
  return (
    clean(
      order?.payment_method ||
        order?.paymentMethod
    ).toUpperCase() || "UPI"
  );
}

function getLocationName(order, location) {
  return (
    clean(
      location?.name ||
        location?.locationName ||
        location?.storeName ||
        order?.location_name ||
        order?.locationName ||
        order?.location?.name
    ) || "Juice Robo"
  );
}

function getLocationAddress(order, location) {
  return (
    clean(
      location?.address ||
        location?.locationAddress ||
        location?.storeAddress ||
        order?.location_address ||
        order?.locationAddress ||
        order?.location?.address
    ) || "Selected collection point"
  );
}

function getMachineName(order, machine) {
  return (
    clean(
      machine?.name ||
        machine?.machineName ||
        machine?.machine_code ||
        machine?.machineCode ||
        order?.machine_name ||
        order?.machineName ||
        order?.machine?.name
    ) || "Juice Robo Machine"
  );
}

function getMachineCode(order, machine) {
  return (
    clean(
      machine?.machine_code ||
        machine?.machineCode ||
        machine?.code ||
        order?.machine_code ||
        order?.machineCode
    )
  );
}


/* =========================================================
   SUCCESS ICON
   ========================================================= */

function SuccessIcon() {
  return (
    <div
      className="jr-payment-success-icon"
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />

        <path
          d="m9 16 4.5 4.5L23 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}


/* =========================================================
   MAIN
   ========================================================= */

export default function PaymentSuccessScreen({
  order = {},
  location,
  machine,
  onHome,
  onHistory,
  money,
}) {
  const collectionCode =
    getCollectionCode(order);

  const codeDigits =
    collectionCode
      ? collectionCode.split("")
      : ["—", "—", "—", "—"];

  const orderNumber =
    getOrderNumber(order);

  const total =
    getTotal(order);

  const paymentMethod =
    getPaymentMethod(order);

  const locationName =
    getLocationName(
      order,
      location
    );

  const locationAddress =
    getLocationAddress(
      order,
      location
    );

  const machineName =
    getMachineName(
      order,
      machine
    );

  const machineCode =
    getMachineCode(
      order,
      machine
    );

  return (
    <main className="jr-content jr-page jr-payment-success-page">

      {/* =================================================
          SUCCESS
         ================================================= */}

      <section className="jr-payment-success-heading">

        <SuccessIcon />

        <span className="jr-payment-success-eyebrow">
          PAYMENT SUCCESSFUL
        </span>

        <h1>
          Your juice is
          <br />
          <em>booked!</em>
        </h1>

        <p>
          Your payment was completed and your order
          is ready for collection.
        </p>

      </section>


      {/* =================================================
          COLLECTION CODE
         ================================================= */}

      <section
        className={
          collectionCode
            ? "jr-payment-success-code-card"
            : "jr-payment-success-code-card jr-payment-success-code-card-empty"
        }
      >

        <div className="jr-payment-success-code-header">

          <div>
            <span>
              YOUR COLLECTION CODE
            </span>

            <strong>
              Enter this 4-digit code on your Juice Robo machine
            </strong>
          </div>

          <small>
            4 DIGITS
          </small>

        </div>


        <div
          className="jr-payment-success-code-digits"
          aria-label={
            collectionCode
              ? `Collection code ${collectionCode}`
              : "Collection code unavailable"
          }
        >

          {codeDigits.map(
            (digit, index) => (
              <span
                className={
                  collectionCode
                    ? "jr-payment-success-digit"
                    : "jr-payment-success-digit jr-payment-success-digit-empty"
                }
                key={`${digit}-${index}`}
              >
                {digit}
              </span>
            )
          )}

        </div>


        <p>
          {collectionCode
            ? `Enter this 4-digit code on ${machineName} to begin preparation.`
            : "Your collection code was not returned by the server yet."}
        </p>

      </section>


      {/* =================================================
          ORDER DETAILS
         ================================================= */}

      <section className="jr-payment-success-details">

        <div className="jr-payment-success-detail">

          <div className="jr-payment-success-detail-icon">
            📍
          </div>

          <div className="jr-payment-success-detail-copy">

            <span>
              COLLECT FROM
            </span>

            <strong>
              {locationName}
            </strong>

            <p>
              {locationAddress}
            </p>

          </div>

        </div>


        <div className="jr-payment-success-divider" />


        <div className="jr-payment-success-detail">

          <div className="jr-payment-success-detail-icon">
            ▣
          </div>

          <div className="jr-payment-success-detail-copy">

            <span>
              MACHINE
            </span>

            <strong>
              {machineName}
            </strong>

            <p>
              {machineCode || "Collection machine"}
            </p>

          </div>

        </div>

      </section>


      {/* =================================================
          PAYMENT DETAILS
         ================================================= */}

      <section className="jr-payment-success-payment-card">

        <div>

          <span>
            ORDER
          </span>

          <strong>
            {orderNumber}
          </strong>

        </div>

        <div>

          <span>
            TOTAL
          </span>

          <strong>
            {formatMoney(
              total,
              money
            )}
          </strong>

        </div>

        <div>

          <span>
            PAYMENT
          </span>

          <strong className="jr-payment-success-paid">
            PAID
          </strong>

          <small>
            {paymentMethod}
          </small>

        </div>

      </section>


      {/* =================================================
          ACTIONS
         ================================================= */}

      <button
        className="jr-payment-success-primary"
        type="button"
        onClick={onHistory}
      >
        <span>
          VIEW ORDER HISTORY
        </span>

        <strong>
          →
        </strong>
      </button>


      <button
        className="jr-payment-success-secondary"
        type="button"
        onClick={onHome}
      >
        BACK TO MENU
      </button>


      <p className="jr-payment-success-note">
        Keep your collection code safe until you collect your juice.
      </p>

    </main>
  );
}

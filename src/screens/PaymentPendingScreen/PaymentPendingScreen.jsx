import "./PaymentPendingScreen.css";

/* =========================================================
   JUICE ROBO — PAYMENT PENDING SCREEN
   Active UPI payment screen:
   - Polling & backend verification indicator
   - Pay with UPI button (launches UPI intent / chooser)
   - Order & dispenser information
   - Manual status verification button
   - Safe cancel & return to cart
   ========================================================= */

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }
  const num = Number(value || 0);
  return `₹${num.toFixed(2)}`;
}

export default function PaymentPendingScreen({
  session = {},
  order = {},
  total,
  location,
  machine,
  money,
  launchError = "",
  onCheckStatus,
  onCancel,
  onOpenUpiApp,
  onProceedWithUpi,
  isMobile = false,
  paymentStatus = "pending",
  statusMessage = "",
  isVerifying = false,
  verifying = false,
  message = "Waiting for bank confirmation...",
}) {
  const displayTotal = Number(
    total ||
      order?.total_amount ||
      order?.totalAmount ||
      order?.total ||
      session?.total ||
      0
  );

  const rawOrderId = String(
    order?.orderId ||
      order?.order_id ||
      order?.id ||
      session?.orderId ||
      ""
  ).trim();

  const displayOrderId =
    rawOrderId.length > 14
      ? `JR-${rawOrderId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
      : rawOrderId || "PROCESSING";

  const locationName =
    location?.name ||
    location?.locationName ||
    order?.location?.name ||
    "Juice Robo Outlet";

  const machineName =
    machine?.name ||
    machine?.machineName ||
    order?.machine?.name ||
    "Sugarcane Juicer";

  const activeVerifying = Boolean(
    isVerifying ||
      verifying ||
      paymentStatus === "processing" ||
      paymentStatus === "PROCESSING"
  );

  const handlePay = onProceedWithUpi || onOpenUpiApp;

  return (
    <main className="jr-content jr-page jr-payment-pending-page">
      <section className="jr-payment-pending-content" aria-live="polite">
        {/* RADAR & CHIP LOADER ANIMATION */}
        <div className="jr-payment-loader-wrapper" aria-hidden="true">
          <div className="jr-pending-radar-ring" />
          <div className="jr-demo-payment-loader">
            <div className="jr-demo-pad">
              <div className="jr-demo-chip" />
              <div className="jr-demo-line line1" />
              <div className="jr-demo-line line2" />
            </div>
          </div>
        </div>

        {/* STATUS BADGE */}
        <div className="jr-payment-pending-badge">
          <span className="jr-payment-pending-dot" />
          <span>
            {activeVerifying
              ? "VERIFYING PAYMENT STATUS"
              : "PAYMENT VERIFICATION IN PROGRESS"}
          </span>
        </div>

        {/* TITLE */}
        <h1 className="jr-payment-pending-title">
          {activeVerifying ? "Verifying Payment..." : "Payment Processing"}
        </h1>

        {/* DESCRIPTION / STATUS MESSAGE */}
        <p className="jr-payment-pending-message">
          {activeVerifying
            ? "Verifying transaction with Juice Robo backend..."
            : statusMessage ||
              message ||
              "Complete payment in your UPI app. Juice Robo is checking the backend for confirmation."}
        </p>

        {/* LAUNCH ERROR ALERT */}
        {launchError && (
          <div className="jr-pending-launch-alert" role="alert">
            <span className="jr-pending-launch-alert-icon" aria-hidden="true">⚠️</span>
            <div className="jr-pending-launch-alert-content">
              <strong>UPI App Notice</strong>
              <p>{launchError}</p>
            </div>
          </div>
        )}

        {/* ORDER DETAILS CARD */}
        <div className="jr-payment-pending-card">
          <div className="jr-pending-card-row">
            <span className="jr-pending-card-label">Order Ref</span>
            <span className="jr-pending-order-pill">#{displayOrderId}</span>
          </div>

          <div className="jr-pending-card-row">
            <span className="jr-pending-card-label">Dispenser</span>
            <span className="jr-pending-card-value">
              {locationName} • {machineName}
            </span>
          </div>

          <div className="jr-pending-card-row jr-pending-card-amount-row">
            <span className="jr-pending-card-label">Amount Payable</span>
            <span className="jr-pending-card-amount">
              {formatMoney(displayTotal, money)}
            </span>
          </div>

          <div className="jr-pending-notice-box">
            <span className="jr-pending-notice-icon" aria-hidden="true">ℹ️</span>
            <p className="jr-pending-notice-text">
              Please do not refresh this page. Once your UPI app confirms the transfer, your machine pickup code will appear automatically.
            </p>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="jr-payment-pending-actions">
          {typeof handlePay === "function" && (
            <button
              type="button"
              className="jr-pending-proceed-upi-btn"
              onClick={handlePay}
              disabled={activeVerifying}
            >
              <span>{activeVerifying ? "Verifying Payment..." : "Pay with UPI"}</span>
              {!activeVerifying && <span aria-hidden="true">→</span>}
            </button>
          )}

          {!isMobile && (
            <div className="jr-pending-desktop-notice" role="note">
              <strong>Pay using your phone</strong>
              <span>
                UPI payment apps cannot be launched from this desktop browser. Open this same order on your mobile phone to complete payment.
              </span>
            </div>
          )}

          {typeof onCheckStatus === "function" && (
            <button
              type="button"
              className="jr-pending-check-btn"
              onClick={onCheckStatus}
              disabled={activeVerifying}
            >
              <span>{activeVerifying ? "Verifying..." : "⚡ Check Status Now"}</span>
            </button>
          )}

          {typeof onCancel === "function" && (
            <button
              type="button"
              className="jr-pending-cancel-btn"
              onClick={onCancel}
            >
              Cancel & Return to Cart
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

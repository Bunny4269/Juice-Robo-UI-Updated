import "./PaymentPendingScreen.css";

/* =========================================================
   JUICE ROBO — PAYMENT PENDING SCREEN
   Shows when payment is initiated and backend verification is actively in progress.
   Incorporates the demo's PaymentLoader terminal animation.
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
  paymentStatus = "pending",
  statusMessage = "",
  isVerifying = false,
  verifying = false,
  message = "Waiting for bank confirmation...",
}) {
  const displayTotal = Number(total || order?.total_amount || order?.totalAmount || 0);
  const rawOrderId = String(order?.orderId || order?.order_id || order?.id || "").trim();
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

  const activeVerifying = Boolean(isVerifying || verifying);

  return (
    <main className="jr-content jr-page jr-payment-pending-page">
      <section className="jr-payment-pending-content" aria-live="polite">
        {/* ===================================================
            1. DEMO ADAPTED PAYMENT LOADER
           =================================================== */}
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

        {/* ===================================================
            2. STATUS BADGE & TITLE
           =================================================== */}
        <div className="jr-payment-pending-badge">
          <span className="jr-payment-pending-dot" />
          <span>PAYMENT VERIFICATION IN PROGRESS</span>
        </div>

        <h1 className="jr-payment-pending-title">
          {activeVerifying ? "Verifying Payment..." : "Payment Processing"}
        </h1>

        <p className="jr-payment-pending-message">
          {activeVerifying
            ? "Verifying transaction with Juice Robo backend..."
            : statusMessage || message || "Complete payment in your UPI app. Juice Robo is checking the backend for confirmation."}
        </p>

        {/* Launch Error / Notice Banner */}
        {launchError && (
          <div className="jr-pending-launch-alert" role="alert">
            <span className="jr-pending-launch-alert-icon">⚠️</span>
            <div className="jr-pending-launch-alert-content">
              <strong>UPI App Notice</strong>
              <p>{launchError}</p>
            </div>
          </div>
        )}

        {/* ===================================================
            3. ORDER DETAILS CARD
           =================================================== */}
        <div className="jr-payment-pending-card">
          <div className="jr-pending-card-row">
            <span className="jr-pending-card-label">Order Ref</span>
            <span className="jr-pending-order-pill">#{displayOrderId}</span>
          </div>

          <div className="jr-pending-card-row">
            <span className="jr-pending-card-label">Dispenser</span>
            <span className="jr-pending-card-value">{locationName} • {machineName}</span>
          </div>

          <div
            className="jr-pending-card-row"
            style={{
              paddingTop: "10px",
              borderTop: "1px dashed #e5e7eb",
            }}
          >
            <span className="jr-pending-card-label">Amount Payable</span>
            <span className="jr-pending-card-amount">
              {formatMoney(displayTotal, money)}
            </span>
          </div>

          <div className="jr-pending-notice-box">
            <span className="jr-pending-notice-icon">ℹ️</span>
            <p className="jr-pending-notice-text">
              Please do not refresh this page. Once your UPI app confirms the transfer, your machine pickup code will appear automatically.
            </p>
          </div>
        </div>

        {/* ===================================================
            4. ACTION CONTROLS
           =================================================== */}
        <div className="jr-payment-pending-actions">
          {typeof onOpenUpiApp === "function" && (
            <div className="jr-pending-upi-apps">
              <div className="jr-pending-upi-heading">
                <strong>Continue with your UPI app</strong>
                <span>Choose an installed payment app</span>
              </div>

              <div className="jr-pending-upi-app-list">
                <button
                  type="button"
                  className="jr-pending-reopen-btn jr-pending-reopen-btn--phonepe"
                  onClick={() => onOpenUpiApp({
                    id: "phonepe",
                    name: "PhonePe",
                    scheme: "phonepe://pay",
                  })}
                >
                  <span className="jr-pending-upi-app-icon jr-pending-upi-app-icon--phonepe">पे</span>
                  <span>Open PhonePe</span>
                  <span className="jr-pending-upi-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="jr-pending-reopen-btn jr-pending-reopen-btn--gpay"
                  onClick={() => onOpenUpiApp({
                    id: "googlepay",
                    name: "Google Pay",
                    scheme: "gpay://upi/pay",
              androidScheme: "tez://upi/pay",
                  })}
                >
                  <span className="jr-pending-upi-app-icon jr-pending-upi-app-icon--gpay">G</span>
                  <span>Open Google Pay</span>
                  <span className="jr-pending-upi-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="jr-pending-reopen-btn"
                  onClick={() => onOpenUpiApp({ id: "paytm", name: "Paytm", scheme: "paytmmp://pay" })}
                >
                  <span className="jr-pending-upi-app-icon">P</span>
                  <span>Open Paytm</span>
                  <span className="jr-pending-upi-arrow">→</span>
                </button>

                <button
                  type="button"
                  className="jr-pending-reopen-btn"
                  onClick={() => onOpenUpiApp({ id: "bhim", name: "BHIM", scheme: "bhim://upi/pay" })}
                >
                  <span className="jr-pending-upi-app-icon">B</span>
                  <span>Open BHIM</span>
                  <span className="jr-pending-upi-arrow">→</span>
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="jr-pending-check-btn"
            onClick={onCheckStatus}
            disabled={activeVerifying}
          >
            <span>{activeVerifying ? "Verifying Payment..." : "⚡ Check Status Now"}</span>
          </button>


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

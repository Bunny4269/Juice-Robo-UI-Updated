import React from "react";
import "./DummyPaymentVerificationScreen.css";

/* =========================================================
   JUICE ROBO — DUMMY PAYMENT VERIFICATION SCREEN
   Development / Test Mode Only
   Used to test the frontend payment success & failure flows.
   Does not contact the real backend verification API.
   ========================================================= */

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }
  const num = Number(value || 0);
  return `₹${num.toFixed(2)}`;
}

export default function DummyPaymentVerificationScreen({
  session = {},
  order = {},
  total,
  money,
  onSimulateSuccess,
  onSimulateFailure,
  onCancel,
}) {
  React.useEffect(() => {
    console.log("[Juice Robo] DUMMY VERIFICATION STARTED");
  }, []);

  const displayTotal = Number(
    total ||
    session?.total ||
    order?.total_amount ||
    order?.totalAmount ||
    0
  );

  const rawOrderId = String(
    session?.orderId ||
    order?.orderId ||
    order?.order_id ||
    order?.id ||
    ""
  ).trim();

  const displayOrderId =
    rawOrderId.length > 14
      ? `JR-${rawOrderId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
      : rawOrderId || "PENDING";

  const rawCartId = String(
    session?.cartId ||
    order?.cartId ||
    order?.cart_id ||
    ""
  ).trim();

  const displayCartId =
    rawCartId.length > 14
      ? `CART-${rawCartId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
      : rawCartId || "N/A";

  const rawTxnId = String(
    session?.transactionId ||
    session?.transaction_id ||
    order?.transactionId ||
    order?.transaction_id ||
    ""
  ).trim();

  const displayTxnId = rawTxnId || "None (Direct UPI)";

  const paymentStatus = String(
    session?.paymentStatus ||
    order?.paymentStatus ||
    "PENDING"
  ).toUpperCase();

  return (
    <main className="jr-content jr-page jr-dummy-verification-page">
      <section className="jr-dummy-verification-content" aria-live="polite">
        
        {/* 1. DEV / TEST MODE BANNER */}
        <div className="jr-dummy-test-badge-wrap">
          <div className="jr-dummy-test-badge">
            <span className="jr-dummy-badge-dot" />
            DEVELOPMENT / TEST MODE
          </div>
          <p className="jr-dummy-test-note">
            This screen is for testing the payment success and failure flows only.
          </p>
        </div>

        {/* 2. TITLE & SUBTITLE */}
        <div className="jr-dummy-header">
          <h1 className="jr-dummy-title">Payment Verification</h1>
          <p className="jr-dummy-subtitle">Testing payment status flow</p>
        </div>

        {/* 3. CURRENT ORDER INFORMATION (ACTUAL VALUES) */}
        <div className="jr-dummy-order-card">
          <div className="jr-dummy-card-header">
            <span className="jr-dummy-card-title">Order Information</span>
            <span className="jr-dummy-status-pill">{paymentStatus}</span>
          </div>

          <div className="jr-dummy-details-list">
            <div className="jr-dummy-detail-row">
              <span className="jr-dummy-detail-label">Order ID</span>
              <strong className="jr-dummy-detail-value">{displayOrderId}</strong>
            </div>

            <div className="jr-dummy-detail-row">
              <span className="jr-dummy-detail-label">Cart ID</span>
              <strong className="jr-dummy-detail-value">{displayCartId}</strong>
            </div>

            <div className="jr-dummy-detail-row">
              <span className="jr-dummy-detail-label">Transaction ID</span>
              <strong className="jr-dummy-detail-value">{displayTxnId}</strong>
            </div>

            <div className="jr-dummy-detail-row total-row">
              <span className="jr-dummy-detail-label">Amount</span>
              <strong className="jr-dummy-detail-value amount-value">
                {formatMoney(displayTotal, money)}
              </strong>
            </div>

            <div className="jr-dummy-detail-row">
              <span className="jr-dummy-detail-label">Payment Status</span>
              <strong className="jr-dummy-detail-value status-value">
                {paymentStatus}
              </strong>
            </div>
          </div>
        </div>

        {/* 4. TEST CONTROLS */}
        <div className="jr-dummy-actions">
          <button
            type="button"
            className="jr-dummy-btn jr-dummy-btn--success"
            onClick={onSimulateSuccess}
            id="jr-btn-simulate-success"
          >
            <span className="jr-dummy-btn-icon">✓</span>
            <span>Simulate Payment Success</span>
          </button>

          <button
            type="button"
            className="jr-dummy-btn jr-dummy-btn--failure"
            onClick={onSimulateFailure}
            id="jr-btn-simulate-failure"
          >
            <span className="jr-dummy-btn-icon">✗</span>
            <span>Simulate Payment Failure</span>
          </button>

          {typeof onCancel === "function" && (
            <button
              type="button"
              className="jr-dummy-btn-cancel"
              onClick={onCancel}
            >
              Cancel &amp; Return to Cart
            </button>
          )}
        </div>

      </section>
    </main>
  );
}

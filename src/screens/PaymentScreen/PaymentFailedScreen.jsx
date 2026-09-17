import "./PaymentFailedScreen.css";

/* =========================================================
   JUICE ROBO — PAYMENT FAILED SCREEN
   Shows when payment fails or backend verification definitively fails.
   Matches the demo's PaymentStatus failure UI (_failed border, times-circle).
   Preserves the user's cart.
   ========================================================= */

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }
  const num = Number(value || 0);
  return `₹${num.toFixed(2)}`;
}

function TimesCircleIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="m15 9-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function PaymentFailedScreen({
  order = {},
  total,
  errorMessage,
  onRetry,
  onBackToCart,
  money,
}) {
  const displayTotal = Number(total || order?.total_amount || order?.totalAmount || 0);
  const rawOrderId = String(order?.orderId || order?.order_id || order?.id || "").trim();
  const displayOrderId =
    rawOrderId.length > 14
      ? `JR-${rawOrderId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
      : rawOrderId;

  const failureMessage =
    errorMessage ||
    "We could not confirm your payment. Please try again or choose another payment method.";

  return (
    <main className="jr-content jr-page jr-payment-failed-page">
      <section className="jr-payment-failed-content" aria-live="assertive">
        {/* ===================================================
            1. DEMO ADAPTED FAILED STATUS BOX
           =================================================== */}
        <div className="jr-demo-failed-box message-box _success _failed">
          <div className="jr-demo-failed-icon">
            <TimesCircleIcon />
          </div>

          <h1 className="jr-demo-failed-title">
            Your payment failed
          </h1>

          <p className="jr-demo-failed-subtitle">
            Payment verification could not be completed. Your cart items have been saved so you can try again without starting over.
          </p>

          {failureMessage && (
            <div className="jr-failed-reason-pill">
              {failureMessage}
            </div>
          )}

          {/* Order Summary Context */}
          <div className="jr-failed-order-summary">
            {displayOrderId && (
              <div className="jr-failed-summary-row">
                <span className="jr-failed-summary-label">Order Reference</span>
                <span className="jr-failed-summary-value">#{displayOrderId}</span>
              </div>
            )}
            <div className="jr-failed-summary-row">
              <span className="jr-failed-summary-label">Amount</span>
              <span className="jr-failed-summary-value" style={{ color: "#dc2626" }}>
                {formatMoney(displayTotal, money)}
              </span>
            </div>
            <div className="jr-failed-summary-row">
              <span className="jr-failed-summary-label">Cart Status</span>
              <span className="jr-failed-summary-value" style={{ color: "#16a34a" }}>
                ✓ Preserved & Ready
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================
            2. ACTION BUTTONS (TRY AGAIN & BACK TO CART)
           =================================================== */}
        <div className="jr-failed-actions">
          <button
            type="button"
            className="jr-failed-try-again-btn"
            onClick={onRetry}
          >
            <span>TRY AGAIN</span>
            <span>→</span>
          </button>

          <button
            type="button"
            className="jr-failed-back-cart-btn"
            onClick={onBackToCart}
          >
            BACK TO CART
          </button>

          <p className="jr-failed-help-text">
            If money was debited from your bank account, NPCI and your bank will automatically reverse it within 24 to 48 hours.
          </p>
        </div>
      </section>
    </main>
  );
}

import "./PaymentFailedScreen.css";

/* =========================================================
   JUICE ROBO — PAYMENT FAILED SCREEN
   Displays failed payment state with clear recovery options.
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
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path
        d="m15 9-6 6M9 9l6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function PaymentFailedScreen({
  order = {},
  total,
  errorMessage,
  onRetry,
  onBack,
  onHome,
  onBuyMore,
  money,
  isHck = false,
}) {
  const displayTotal = Number(
    total ||
      order?.total_amount ||
      order?.totalAmount ||
      order?.total ||
      0
  );

  const failureMessage =
    errorMessage ||
    "We could not confirm your payment. If money was deducted from your bank, UPI will automatically refund it within 24-48 hours.";

  const handleReturnToCart = () => {
    if (typeof onBack === "function") {
      onBack();
    } else if (typeof onBuyMore === "function") {
      onBuyMore();
    }
  };

  return (
    <main className={`jr-content jr-page jr-payment-failed-page ${isHck ? "hck-theme" : ""}`}>
      <section className="jr-payment-failed-content" aria-live="assertive">
        {/* FAILURE CARD */}
        <div className="jr-demo-failed-box message-box _failed">
          <div className="jr-demo-failed-icon">
            <TimesCircleIcon />
          </div>

          <h1 className="jr-demo-failed-title">Payment failed</h1>

          <p className="jr-demo-failed-subtitle">{failureMessage}</p>

          {displayTotal > 0 && (
            <div className="jr-failed-amount">
              Amount: {formatMoney(displayTotal, money)}
            </div>
          )}
        </div>

        {/* BANK REFUND INFO CARD */}
        <div className="jr-failed-info-card">
          <span className="jr-failed-info-icon" aria-hidden="true">💡</span>
          <div className="jr-failed-info-body">
            <strong>Was money deducted?</strong>
            <p>
              If your bank account was debited, your money is completely safe. UPI will automatically reverse the transaction back to your account within 24 to 48 hours.
            </p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="jr-failed-actions">
          {typeof onRetry === "function" && (
            <button
              type="button"
              className="jr-failed-try-again-btn"
              onClick={onRetry}
              id="jr-retry-payment-button"
            >
              <span>TRY AGAIN</span>
              <span aria-hidden="true">↻</span>
            </button>
          )}

          <button
            type="button"
            className="jr-failed-buy-more-btn"
            onClick={handleReturnToCart}
            id="jr-failed-buy-more-button"
          >
            RETURN TO CART
          </button>

          {typeof onHome === "function" && (
            <button
              type="button"
              className="jr-failed-menu-btn"
              onClick={onHome}
            >
              BROWSE MENU
            </button>
          )}
        </div>

        <p className="jr-failed-footer-note">
          Need help? Reach out to Juice Robo customer support.
        </p>
      </section>
    </main>
  );
}

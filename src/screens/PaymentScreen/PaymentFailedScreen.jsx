import "./PaymentFailedScreen.css";

function formatMoney(value, money) {
  if (typeof money === "function") return money(value);
  const num = Number(value || 0);
  return `₹${num.toFixed(2)}`;
}

function TimesCircleIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  onBuyMore,
  money,
}) {
  const displayTotal = Number(total || order?.total_amount || order?.totalAmount || 0);
  const failureMessage = errorMessage || "We could not confirm your payment. Please try again.";

  return (
    <main className="jr-content jr-page jr-payment-failed-page">
      <section className="jr-payment-failed-content" aria-live="assertive">
        <div className="jr-demo-failed-box message-box _failed">
          <div className="jr-demo-failed-icon"><TimesCircleIcon /></div>
          <h1 className="jr-demo-failed-title">Payment failed</h1>
          <p className="jr-demo-failed-subtitle">{failureMessage}</p>
          {displayTotal > 0 && (
            <div className="jr-failed-amount">Amount: {formatMoney(displayTotal, money)}</div>
          )}
        </div>

        <div className="jr-failed-actions">
          <button type="button" className="jr-failed-try-again-btn" onClick={onRetry} id="jr-retry-payment-button">
            TRY AGAIN
          </button>
          {onBuyMore && (
            <button type="button" className="jr-failed-buy-more-btn" onClick={onBuyMore} id="jr-failed-buy-more-button">
              BUY MORE
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

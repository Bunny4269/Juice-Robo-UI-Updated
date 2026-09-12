import { useMemo } from "react";
import "./PaymentSuccessScreen.css";

/* =========================================================
   JUICE ROBO — POST-PAYMENT SUCCESS SCREEN

   IMPORTANT:
   - App.jsx decides whether payment is actually successful.
   - This screen NEVER generates a collection PIN.
   - The PIN must come from the verified backend response.
   - The PIN is also restored from sessionStorage after refresh.
   ========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function getCollectionCode(order = {}) {
  const candidates = [
    order?.collection_code,
    order?.collectionCode,
    order?.collection_pin,
    order?.collectionPin,
    order?.orderPin,
    order?.order_pin,
    order?.pickupCode,
    order?.pickup_code,

    order?.data?.collection_code,
    order?.data?.collectionCode,
    order?.data?.collection_pin,
    order?.data?.collectionPin,
    order?.data?.orderPin,
    order?.data?.order_pin,
    order?.data?.pickupCode,
    order?.data?.pickup_code,

    order?.result?.collection_code,
    order?.result?.collectionCode,
    order?.result?.collection_pin,
    order?.result?.collectionPin,
    order?.result?.orderPin,
    order?.result?.order_pin,
    order?.result?.pickupCode,
    order?.result?.pickup_code,
  ];

  for (const candidate of candidates) {
    const raw = clean(candidate);

    if (/^\d{4}$/.test(raw)) {
      return raw;
    }

    const match = raw.match(/\b(\d{4})\b/);

    if (match?.[1] && /^\d{4}$/.test(match[1])) {
      return match[1];
    }
  }

  /*
   * Restore the backend-provided PIN after a browser refresh.
   * This is only a read; no PIN is generated here.
   */
  try {
    const storedCode = sessionStorage.getItem(
      "juice_robo_collection_code"
    );

    if (/^\d{4}$/.test(clean(storedCode))) {
      return clean(storedCode);
    }
  } catch {
    // Ignore storage errors.
  }

  return "";
}

/* =========================================================
   SUCCESS ANIMATION
   ========================================================= */

function PaymentSuccessGif() {
  const gifSrc =
    `${import.meta.env.BASE_URL}assets/Payment-successful.gif`;

  return (
    <div
      className="jr-payment-success-animation"
      aria-hidden="true"
    >
      <img
        src={gifSrc}
        alt=""
        className="jr-payment-success-gif"
        draggable="false"
      />
    </div>
  );
}

/* =========================================================
   ICONS
   ========================================================= */

function HomeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 10.5 12 3l9 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 9.5V21h13V9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 21v-6h5v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 12a9 9 0 1 0 3-6.7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 4v5h5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   MAIN
   ========================================================= */

export default function PaymentSuccessScreen({
  order = {},
  onHome,
  onHistory,
}) {
  const collectionCode = useMemo(
    () => getCollectionCode(order),
    [order]
  );

  const digits = collectionCode
    ? collectionCode.split("")
    : ["—", "—", "—", "—"];

  const hasCollectionCode = Boolean(collectionCode);

  return (
    <main className="jr-content jr-page jr-payment-success-page">
      <section
        className="jr-payment-success-content"
        aria-labelledby="payment-success-title"
      >
        <PaymentSuccessGif />

        <span className="jr-payment-success-eyebrow">
          PAYMENT SUCCESSFUL
        </span>

        <h1 id="payment-success-title">
          Payment
          <br />
          <em>successful!</em>
        </h1>

        <p className="jr-payment-success-message">
          Your payment has been completed successfully.
        </p>

        <section
          className={
            hasCollectionCode
              ? "jr-payment-success-code-card"
              : "jr-payment-success-code-card jr-payment-success-code-card-empty"
          }
          aria-label="Collection code"
        >
          <div className="jr-payment-success-code-heading">
            <span className="jr-payment-success-check">
              <CheckIcon />
            </span>

            <span className="jr-payment-success-code-label">
              YOUR 4-DIGIT COLLECTION CODE
            </span>
          </div>

          <div
            className="jr-payment-success-code-digits"
            aria-label={
              hasCollectionCode
                ? `Your collection code is ${collectionCode}`
                : "Collection code is not available"
            }
          >
            {digits.map((digit, index) => (
              <span
                key={`${digit}-${index}`}
                className={
                  hasCollectionCode
                    ? "jr-payment-success-digit"
                    : "jr-payment-success-digit jr-payment-success-digit-empty"
                }
              >
                {digit}
              </span>
            ))}
          </div>

          <p className="jr-payment-success-code-message">
            {hasCollectionCode
              ? "Enter this code on your Juice Robo machine to collect your juice."
              : "Your collection code is not available yet. Please wait a moment and try again."}
          </p>
        </section>

        {hasCollectionCode && (
          <p className="jr-payment-success-safe-note">
            Keep this code safe until collection.
          </p>
        )}

        <div className="jr-payment-success-actions">
          <button
            type="button"
            className="jr-payment-success-home-button"
            onClick={onHome}
          >
            <HomeIcon />
            <span>GO TO HOME</span>
          </button>

          <button
            type="button"
            className="jr-payment-success-history-button"
            onClick={onHistory}
          >
            <HistoryIcon />
            <span>VIEW ORDER HISTORY</span>
          </button>
        </div>
      </section>
    </main>
  );
}

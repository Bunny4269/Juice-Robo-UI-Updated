import "./PaymentPendingScreen.css";

/* =========================================================
   JUICE ROBO — PAYMENT PENDING SCREEN
   Active UPI payment screen:
   - Polling & backend verification indicator
   - Direct app buttons (PhonePe, Google Pay, Paytm, BHIM, CRED, Other)
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

function PhonePeIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" width="30" height="30" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#5f259f" />
      <path
        d="M19.8 9.5H13.2C12.5 9.5 12 10 12 10.7V25.3C12 26 12.5 26.5 13.2 26.5H15.5V20.2H19.2C22.6 20.2 25.2 17.6 25.2 14.8C25.2 11.9 22.6 9.5 19.8 9.5ZM19.2 16.8H15.5V12.9H19.2C20.5 12.9 21.6 13.8 21.6 14.8C21.6 15.9 20.5 16.8 19.2 16.8Z"
        fill="#FFFFFF"
      />
      <path
        d="M19.5 20.2L24.5 26.5H20.8L16.2 20.7"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GooglePayIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" width="30" height="30" aria-hidden="true">
      <rect width="36" height="36" rx="9" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
      <path
        d="M24.8 18.2C24.8 17.6 24.7 17.1 24.6 16.6H18V19.6H21.8C21.6 20.6 21 21.4 20.1 22V24H22.7C24.2 22.6 25.1 20.6 24.8 18.2Z"
        fill="#4285F4"
      />
      <path
        d="M18 25.1C19.9 25.1 21.5 24.5 22.7 23.4L20.1 21.4C19.4 21.9 18.5 22.2 17.5 22.2C15.6 22.2 14 20.9 13.4 19.2H10.7V21.3C11.9 23.6 14.8 25.1 18 25.1Z"
        fill="#34A853"
      />
      <path
        d="M13.4 19.2C13.1 18.3 13.1 17.3 13.4 16.4V14.3H10.7C9.7 16.3 9.7 18.7 10.7 20.7L13.4 19.2Z"
        fill="#FBBC05"
      />
      <path
        d="M18 13.4C19 13.4 20 13.8 20.7 14.5L22.9 12.3C21.5 11 19.8 10.3 18 10.3C14.8 10.3 11.9 11.8 10.7 14.1L13.4 16.2C14 14.5 15.6 13.4 18 13.4Z"
        fill="#EA4335"
      />
    </svg>
  );
}

const UPI_BUTTON_LIST = [
  {
    id: "phonepe",
    name: "PhonePe",
    subtitle: "Pay via PhonePe app",
    badge: "RECOMMENDED",
    Icon: PhonePeIcon,
  },
  {
    id: "gpay",
    name: "Google Pay (GPay)",
    subtitle: "Pay via Google Pay app",
    badge: "RECOMMENDED",
    Icon: GooglePayIcon,
  },
];

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
  onSelectApp,
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

  const handleAppLaunch = (appId = "generic") => {
    if (typeof onSelectApp === "function") {
      onSelectApp(appId);
    } else if (typeof onProceedWithUpi === "function") {
      onProceedWithUpi(appId);
    } else if (typeof onOpenUpiApp === "function") {
      onOpenUpiApp(appId);
    }
  };

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
              "Choose your UPI app below to pay. Juice Robo will verify the transaction automatically."}
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

        {/* APP-SPECIFIC UPI CHOOSER */}
        <div className="jr-pending-apps-section">
          <div className="jr-pending-apps-header">
            <h2 className="jr-pending-apps-title">Pay using UPI App</h2>
            <span className="jr-pending-apps-subtitle">Tap to open your app directly</span>
          </div>

          <div className="jr-pending-apps-grid">
            {UPI_BUTTON_LIST.map(({ id, name, subtitle, badge, Icon }) => (
              <button
                key={id}
                type="button"
                className={`jr-pending-app-btn jr-pending-app-btn-${id}`}
                onClick={() => handleAppLaunch(id)}
                disabled={activeVerifying}
              >
                <div className="jr-pending-app-icon-wrap">
                  <Icon />
                </div>
                <div className="jr-pending-app-info">
                  <div className="jr-pending-app-name-row">
                    <strong className="jr-pending-app-name">{name}</strong>
                    {badge && <span className="jr-pending-app-badge">{badge}</span>}
                  </div>
                  <span className="jr-pending-app-sub">{subtitle}</span>
                </div>
                <span className="jr-pending-app-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="jr-payment-pending-actions">
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

import { useMemo, useState } from "react";
import paymentSuccessGifAsset from "../../assets/Payment-successful.gif";
import "./PaymentSuccessScreen.css";

const GST_RATE = 0.05;

/* =========================================================
   HELPERS
   ========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }

  const numeric = Number(value || 0);

  return `₹${numeric.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
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

    order?.data?.order?.collection_code,
    order?.data?.order?.collectionCode,
    order?.data?.order?.orderPin,

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

    if (!raw) {
      continue;
    }

    if (/^\d{4}$/.test(raw)) {
      return raw;
    }

    const match = raw.match(/\b(\d{4})\b/);

    if (match?.[1]) {
      return match[1];
    }

    if (/^\d{1,3}$/.test(raw)) {
      return raw.padStart(4, "0");
    }
  }

  try {
    const storedCode =
      sessionStorage.getItem("juice_robo_collection_code") ||
      localStorage.getItem("juice_robo_collection_code");

    if (/^\d{4}$/.test(clean(storedCode))) {
      return clean(storedCode);
    }

    if (/^\d{1,3}$/.test(clean(storedCode))) {
      return clean(storedCode).padStart(4, "0");
    }
  } catch {
    // Ignore storage access errors.
  }

  return "";
}

function getOrderNumber(order = {}) {
  return (
    clean(
      order?.orderNumber ||
        order?.order_number ||
        order?.orderId ||
        order?.order_id ||
        order?.id ||
        order?.rawOrderResponse?.data?.orderNumber ||
        order?.rawOrderResponse?.data?.orderId
    ) || ""
  );
}

function formatOrderDisplayTag(rawId) {
  const cleanId = clean(rawId);
  if (!cleanId) return "";
  // If it's a UUID (e.g. 07b881fe-b47a-4058-ba0b-a1bff6e002d5), show compact prefix...suffix
  const uuidMatch = cleanId.match(
    /^([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-([0-9a-f]{12})$/i
  );
  if (uuidMatch) {
    return `#${uuidMatch[1].slice(0, 6).toUpperCase()}...${uuidMatch[2].slice(-4).toUpperCase()}`;
  }
  if (cleanId.length > 14) {
    return `#${cleanId.slice(0, 6).toUpperCase()}...${cleanId.slice(-4).toUpperCase()}`;
  }
  return cleanId.startsWith("#") ? cleanId : `#${cleanId}`;
}

function getLocationName(order = {}, location = {}) {
  return (
    clean(
      order?.location?.name ||
        order?.location?.locationName ||
        order?.location?.storeName ||
        order?.locationName ||
        location?.name ||
        location?.locationName ||
        location?.storeName
    ) || "Selected location"
  );
}

function getMachineName(order = {}, machine = {}) {
  return (
    clean(
      order?.machine?.name ||
        order?.machine?.machineName ||
        order?.machine?.machineCode ||
        order?.machineName ||
        order?.machineCode ||
        machine?.name ||
        machine?.machineName ||
        machine?.machineCode ||
        machine?.code
    ) || "Juice Robo Machine"
  );
}

function getItems(order = {}) {
  const sources = [
    order?.items,
    order?.orderItems,
    order?.order_items,
    order?.cartItems,
  ];

  return sources.find((items) => Array.isArray(items) && items.length > 0) || [];
}

function getItemName(item = {}) {
  return (
    clean(
      item?.displayName ||
        item?.name ||
        item?.product_name ||
        item?.productName ||
        item?.itemName ||
        item?.title
    )
      .replace(/\bundefined\b/gi, "")
      .replace(/\bnull\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || "Sugarcane Juice"
  );
}

function getItemQuantity(item = {}) {
  const quantity = Number(
    item?.quantity ??
      item?.qty ??
      item?.count ??
      1
  );

  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getItemUnitPrice(item = {}) {
  const directPrice = Number(
    item?.unitPrice ??
      item?.unit_price ??
      item?.price ??
      item?.sellingPrice ??
      item?.selling_price
  );

  if (Number.isFinite(directPrice) && directPrice >= 0) {
    return directPrice;
  }

  const quantity = getItemQuantity(item);

  const subtotal = Number(
    item?.subtotal ??
      item?.subTotal ??
      item?.total ??
      item?.lineTotal ??
      item?.line_total
  );

  if (Number.isFinite(subtotal) && subtotal >= 0 && quantity > 0) {
    return subtotal / quantity;
  }

  return 0;
}

function getItemSubtotal(item = {}) {
  const direct = Number(
    item?.subtotal ??
      item?.subTotal ??
      item?.total ??
      item?.lineTotal ??
      item?.line_total
  );

  if (Number.isFinite(direct) && direct >= 0) {
    return direct;
  }

  return getItemUnitPrice(item) * getItemQuantity(item);
}

function getTotalPaid(order = {}, items = []) {
  const direct = Number(
    order?.total_amount ??
      order?.totalAmount ??
      order?.total ??
      order?.netBill ??
      order?.grandTotal ??
      order?.grand_total
  );

  if (Number.isFinite(direct) && direct >= 0) {
    return direct;
  }

  return items.reduce(
    (sum, item) => sum + getItemSubtotal(item),
    0
  );
}

function getOrderDate(order = {}) {
  const raw =
    order?.orderDate ||
    order?.order_date ||
    order?.createdAt ||
    order?.created_at ||
    order?.paymentDate ||
    order?.payment_date ||
    order?.timestamp;

  if (!raw) {
    return "—";
  }

  const date = new Date(raw);

  if (Number.isNaN(date.getTime())) {
    return clean(raw) || "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getPaymentMethod(order = {}) {
  return (
    clean(
      order?.payment_method ||
        order?.paymentMethod ||
        order?.paymentMode ||
        order?.payment_mode
    ).toUpperCase() || "UPI"
  );
}

/* =========================================================
   ICONS
   ========================================================= */

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="m5 12 4 4L19 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <rect
        x="5"
        y="10"
        width="14"
        height="11"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M4 7.5A2.5 2.5 0 0 0 6.5 5h11A2.5 2.5 0 0 0 20 7.5v2a2.5 2.5 0 0 0 0 5v2a2.5 2.5 0 0 0-2.5 2.5h-11A2.5 2.5 0 0 0 4 16.5v-2a2.5 2.5 0 0 0 0-5v-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 9v6M12 9v6M15 9v6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="1.5 1.5"
      />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M5 3v18l3-1.5 4 1.5 4-1.5 3 1.5V3H5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 12h6M9 16h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="9"
        r="2.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <rect
        x="4"
        y="5"
        width="16"
        height="15"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 3v4M16 3v4M4 9h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 13h3M8 16h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MachineIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <rect
        x="6"
        y="3"
        width="12"
        height="18"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect
        x="9"
        y="6"
        width="6"
        height="5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="16.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

function PaymentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 9h18M7 14h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function JuiceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M8 8h8l-1 12H9L8 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M7 8h10M10 5h5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M13 5c1.2-2 1.4-2.8 1.1-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M3 12a9 9 0 1 0 3-6.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 4v5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7v5l3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path
        d="M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9.5 21v-6h5v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   SUCCESS GIF
   ========================================================= */

function PaymentSuccessGif() {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const gifSrc =
    paymentSuccessGifAsset ||
    `${import.meta.env.BASE_URL}assets/Payment-successful.gif`;

  return (
    <div className="jr-payment-success-animation" aria-hidden="true">
      {!imageError ? (
        <img
          src={gifSrc}
          alt="Payment successful celebration animation"
          className={`jr-payment-success-gif ${
            imageLoaded ? "jr-payment-success-gif-loaded" : ""
          }`}
          width="200"
          height="200"
          loading="eager"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : null}

      {/* Microinteraction fallback: shown while image is loading or if asset fails to load */}
      {(!imageLoaded || imageError) && (
        <div
          className={`jr-payment-success-fallback ${
            imageLoaded ? "jr-payment-success-fallback-hidden" : ""
          }`}
          aria-hidden="true"
        >
          <svg
            className="jr-payment-success-fallback-svg"
            viewBox="0 0 200 200"
            role="presentation"
          >
            <defs>
              <linearGradient id="jr-success-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#30b96c" />
                <stop offset="100%" stopColor="#237a4b" />
              </linearGradient>
              <filter id="jr-success-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#17643d" floodOpacity="0.18" />
              </filter>
            </defs>

            {/* Expanding pulse ripple */}
            <circle
              className="jr-fallback-ripple"
              cx="100"
              cy="100"
              r="68"
              fill="none"
              stroke="#c9f0a8"
              strokeWidth="2.5"
            />

            {/* Celebratory spark rays */}
            <g className="jr-fallback-sparks">
              <circle cx="100" cy="24" r="3.5" fill="#f5af28" />
              <circle cx="152" cy="46" r="3" fill="#b6df5e" />
              <circle cx="176" cy="100" r="3.5" fill="#30b96c" />
              <circle cx="152" cy="154" r="3" fill="#f5af28" />
              <circle cx="100" cy="176" r="3.5" fill="#b6df5e" />
              <circle cx="48" cy="154" r="3" fill="#c9f0a8" />
              <circle cx="24" cy="100" r="3.5" fill="#30b96c" />
              <circle cx="48" cy="46" r="3" fill="#f5af28" />
            </g>

            {/* Main success circle with spring pop */}
            <circle
              className="jr-fallback-circle"
              cx="100"
              cy="100"
              r="48"
              fill="url(#jr-success-grad)"
              filter="url(#jr-success-shadow)"
            />

            {/* Inner highlight rim */}
            <circle
              cx="100"
              cy="100"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="2"
            />

            {/* Animated white checkmark */}
            <path
              className="jr-fallback-check"
              d="M80 100 l14 14 l26 -28"
              fill="none"
              stroke="#ffffff"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function PaymentSuccessScreen({
  order = {},
  location,
  machine,
  money,
  onHome,
  onBack,
  onHistory,
  isHck = false,
}) {
  const collectionCode = useMemo(
    () => getCollectionCode(order),
    [order]
  );

  const digits = collectionCode
    ? collectionCode.split("")
    : ["—", "—", "—", "—"];

  const orderNumber = useMemo(
    () => getOrderNumber(order),
    [order]
  );

  const locationName = useMemo(
    () => getLocationName(order, location),
    [order, location]
  );

  const machineName = useMemo(
    () => getMachineName(order, machine),
    [order, machine]
  );

  const items = useMemo(
    () => getItems(order),
    [order]
  );

  const totalPaid = useMemo(
    () => getTotalPaid(order, items),
    [order, items]
  );

  const orderDate = useMemo(
    () => getOrderDate(order),
    [order]
  );

  const paymentMethod = useMemo(
    () => getPaymentMethod(order),
    [order]
  );

  const currentGstRate = isHck ? 0.18 : 0.05;

  const taxableSubtotal = useMemo(() => {
    const total = Number(totalPaid) || 0;

    return Math.round(
      (total / (1 + currentGstRate) + Number.EPSILON) * 100
    ) / 100;
  }, [totalPaid, currentGstRate]);

  const gstAmount = useMemo(() => {
    const total = Number(totalPaid) || 0;

    return Math.round(
      (total - taxableSubtotal + Number.EPSILON) * 100
    ) / 100;
  }, [totalPaid, taxableSubtotal]);

  const handleBackToHome = () => {
    if (typeof onHome === "function") {
      onHome();
      return;
    }

    if (typeof onBack === "function") {
      onBack();
    }
  };

  const handleContinue = () => {
    if (typeof onBack === "function") {
      onBack();
      return;
    }

    if (typeof onHome === "function") {
      onHome();
    }
  };

  return (
    <main className="jr-content jr-page jr-payment-success-page">
      <section
        className="jr-payment-success-content"
        aria-labelledby="payment-success-title"
      >
        <PaymentSuccessGif />

        <span className="jr-payment-success-eyebrow">
          ORDER & PAYMENT CONFIRMED
        </span>

        <h1 id="payment-success-title">
          Thank You for
          <br />
          <em>Choosing {isHck ? "HCK" : "Juice Robo"}!</em>
        </h1>

        <p className="jr-payment-success-message">
          Your payment was successful and your order is confirmed.
        </p>

        {/* =================================================
            COLLECTION PIN
           ================================================= */}

        <section
          className={
            collectionCode
              ? "jr-payment-success-code-card"
              : "jr-payment-success-code-card jr-payment-success-code-card-empty"
          }
          aria-label="Collection PIN"
        >
          <div className="jr-payment-success-code-heading">
            <span className="jr-payment-success-lock">
              <LockIcon />
            </span>

            <span className="jr-payment-success-code-label">
              YOUR 4-DIGIT COLLECTION PIN
            </span>
          </div>

          <div
            className="jr-payment-success-code-digits"
            aria-label={
              collectionCode
                ? `Your collection PIN is ${collectionCode}`
                : "Collection PIN is being generated"
            }
          >
            {digits.map((digit, index) => (
              <span
                key={`${digit}-${index}`}
                className={
                  collectionCode
                    ? "jr-payment-success-digit"
                    : "jr-payment-success-digit jr-payment-success-digit-empty"
                }
              >
                {digit}
              </span>
            ))}
          </div>

          <div className="jr-payment-success-code-instruction">
            <span className="jr-payment-success-ticket">
              <TicketIcon />
            </span>

            <div>
              <p>
                {collectionCode
                  ? isHck
                    ? "Use this PIN to collect your order from the kiosk."
                    : "Use this PIN to collect your order from the machine."
                  : "Your collection PIN will appear here once ready."}
              </p>

              {collectionCode && (
                <strong>Keep this PIN safe until collection.</strong>
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            ORDER SUMMARY
           ================================================= */}

        <section
          className="jr-payment-success-summary-card"
          aria-label="Order Summary"
        >
          <div className="jr-payment-success-summary-header">
            <div className="jr-payment-success-summary-title">
              <ReceiptIcon />
              <span>ORDER SUMMARY</span>
            </div>

            {orderNumber && (
              <span
                className="jr-payment-success-order-tag"
                title={`Order ID: ${orderNumber}`}
              >
                {formatOrderDisplayTag(orderNumber)}
              </span>
            )}
          </div>

          <div className="jr-payment-success-summary-divider" />

          <div className="jr-payment-success-summary-grid">
            <div className="jr-payment-success-summary-item">
              <span className="jr-payment-success-summary-icon">
                <LocationIcon />
              </span>

              <div>
                <small>Location</small>
                <strong>{locationName}</strong>
              </div>
            </div>

            <div className="jr-payment-success-summary-item">
              <span className="jr-payment-success-summary-icon">
                <CalendarIcon />
              </span>

              <div>
                <small>Order Date</small>
                <strong>{orderDate}</strong>
              </div>
            </div>

            <div className="jr-payment-success-summary-item">
              <span className="jr-payment-success-summary-icon">
                <MachineIcon />
              </span>

              <div>
                <small>Machine</small>
                <strong>{machineName}</strong>
              </div>
            </div>

            <div className="jr-payment-success-summary-item">
              <span className="jr-payment-success-summary-icon">
                <PaymentIcon />
              </span>

              <div>
                <small>Payment Method</small>
                <strong>{paymentMethod}</strong>
              </div>
            </div>

            <div className="jr-payment-success-summary-item jr-payment-success-summary-item-wide">
              <span className="jr-payment-success-summary-icon">
                <JuiceIcon />
              </span>

              <div className="jr-payment-success-items-col">
                <small>Items</small>

                {items.length > 0 ? (
                  <div className="jr-payment-success-items-list">
                    {items.map((item, index) => {
                      const qty = getItemQuantity(item);
                      const name = getItemName(item);
                      const subtotal = getItemSubtotal(item);
                      return (
                        <div
                          key={item?.id || item?.productId || index}
                          className="jr-payment-success-item-row"
                        >
                          <div className="jr-payment-success-item-meta">
                            <span className="jr-payment-success-item-name">
                              {name}
                            </span>
                            {qty > 1 && (
                              <span className="jr-payment-success-item-qty">
                                × {qty}
                              </span>
                            )}
                          </div>
                          {subtotal > 0 && (
                            <strong className="jr-payment-success-item-price">
                              {formatMoney(subtotal, money)}
                            </strong>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="jr-payment-success-item-row">
                    <span className="jr-payment-success-item-name">
                      {isHck ? "Helmet Cleaning Service" : "Sugarcane Juice"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="jr-payment-success-total-divider" />

          <div className="jr-payment-success-total-row">
            <div className="jr-payment-success-total-copy">
              <span>Total Paid</span>
            </div>

            <div className="jr-payment-success-total-value">
              <strong>{formatMoney(totalPaid, money)}</strong>
              <small>
                (Includes {isHck ? "18%" : "5%"} GST)
              </small>
            </div>
          </div>

          <div className="jr-payment-success-price-details" aria-hidden="true">
            <span>
              Item subtotal {formatMoney(taxableSubtotal, money)}
            </span>
            <span>
              GST {isHck ? "18%" : "5%"} {formatMoney(gstAmount, money)}
            </span>
          </div>
        </section>

        {/* =================================================
            CONTINUATION ACTIONS
           ================================================= */}

        <div className="jr-payment-success-actions">
          <button
            type="button"
            className="jr-payment-success-primary-button"
            onClick={handleBackToHome}
          >
            <HomeIcon />
            <span>BACK TO HOME</span>
          </button>

          <button
            type="button"
            className="jr-payment-success-secondary-button"
            onClick={handleContinue}
          >
            <span>ORDER MORE / BACK TO MENU</span>
            <ArrowRightIcon />
          </button>

          {typeof onHistory === "function" && (
            <button
              type="button"
              className="jr-payment-success-secondary-button"
              onClick={onHistory}
            >
              <HistoryIcon />
              <span>VIEW ORDER HISTORY</span>
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

import { useMemo } from "react";

const GST_RATE = 0.05;
import "./PaymentSuccessScreen.css";

/* =========================================================
   JUICE ROBO — DEDICATED PAYMENT SUCCESS SCREEN

   Displays confirmed booking details after payment verification:
   - 4-Digit Collection Code for machine pickup
   - Order Number & Payment Status
   - Collection Location & Machine Name
   - Ordered Items Breakdown
   - Total Amount Paid (GST inclusive)
   - Navigation options to continue / return to app
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
    if (!raw) continue;

    if (/^\d{4}$/.test(raw)) {
      return raw;
    }

    const match = raw.match(/\b(\d{4})\b/);
    if (match?.[1] && /^\d{4}$/.test(match[1])) {
      return match[1];
    }

    // Handle numeric codes that lost leading zeros (e.g. 482 -> 0482)
    if (/^\d{1,3}$/.test(raw)) {
      return raw.padStart(4, "0");
    }
  }

  // Restore stored collection code from storage if available
  try {
    const storedCode =
      sessionStorage.getItem("juice_robo_collection_code") ||
      localStorage.getItem("juice_robo_collection_code");

    const cleanedStored = clean(storedCode);
    if (/^\d{4}$/.test(cleanedStored)) {
      return cleanedStored;
    }
    if (/^\d{1,3}$/.test(cleanedStored)) {
      return cleanedStored.padStart(4, "0");
    }
  } catch {
    // Ignore storage errors.
  }

  return "";
}

function getOrderNumber(order = {}) {
  const num = clean(
    order?.orderNumber ||
      order?.order_number ||
      order?.orderId ||
      order?.order_id ||
      order?.id ||
      order?.rawOrderResponse?.data?.orderNumber ||
      order?.rawOrderResponse?.data?.orderId
  );

  return num || "";
}

function getLocationName(order = {}, location = {}, isHck = false) {
  return (
    clean(
      order?.location?.name ||
        order?.location?.locationName ||
        order?.location?.storeName ||
        order?.locationName ||
        location?.name ||
        location?.locationName ||
        location?.storeName
    ) || (isHck ? "HCK Station" : "Juice Robo Outlet")
  );
}

function getLocationAddress(order = {}, location = {}) {
  return (
    clean(
      order?.location?.address ||
        order?.location?.locationAddress ||
        order?.location?.storeAddress ||
        order?.locationAddress ||
        location?.address ||
        location?.locationAddress ||
        location?.storeAddress
    ) || ""
  );
}

function getMachineName(order = {}, machine = {}, isHck = false) {
  return (
    clean(
      order?.machine?.name ||
        order?.machine?.machineName ||
        order?.machine?.code ||
        order?.machine?.machineCode ||
        order?.machineName ||
        order?.machineCode ||
        machine?.name ||
        machine?.machineName ||
        machine?.code ||
        machine?.machineCode
    ) || (isHck ? "HCK Machine" : "Juice Robo Machine")
  );
}

function getItems(order = {}) {
  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items;
  }
  if (Array.isArray(order?.orderItems) && order.orderItems.length > 0) {
    return order.orderItems;
  }
  if (Array.isArray(order?.order_items) && order.order_items.length > 0) {
    return order.order_items;
  }
  if (Array.isArray(order?.cartItems) && order.cartItems.length > 0) {
    return order.cartItems;
  }
  return [];
}

function getItemName(item = {}, isHck = false) {
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
      .trim() || (isHck ? "Helmet Cleaning Service" : "Sugarcane Juice")
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

  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  return items.reduce((sum, item) => sum + getItemSubtotal(item), 0);
}

/* =========================================================
   ICONS & MEDIA
   ========================================================= */

function PaymentSuccessGif() {
  const gifSrc = `${import.meta.env.BASE_URL}assets/Payment-successful.gif`;

  return (
    <div className="jr-payment-success-animation" aria-hidden="true">
      <img
        src={gifSrc}
        alt=""
        className="jr-payment-success-gif"
        draggable="false"
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationPinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 3v18l3-1.5 3 1.5 3-1.5 3 1.5 3-1.5 1-1V3H5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  const collectionCode = useMemo(() => getCollectionCode(order), [order]);
  const hasCollectionCode = Boolean(collectionCode);

  const digits = useMemo(() => {
    return collectionCode ? collectionCode.split("") : ["—", "—", "—", "—"];
  }, [collectionCode]);

  const orderNumber = useMemo(() => getOrderNumber(order), [order]);
  const locationName = useMemo(() => getLocationName(order, location, isHck), [order, location, isHck]);
  const locationAddress = useMemo(() => getLocationAddress(order, location), [order, location]);
  const machineName = useMemo(() => getMachineName(order, machine, isHck), [order, machine, isHck]);
  const items = useMemo(() => getItems(order), [order]);
  const totalPaid = useMemo(() => getTotalPaid(order, items), [order, items]);

  // Prices are GST-inclusive. Extract the 5% GST component from the total.
  const taxableSubtotal = useMemo(() => {
    const total = Number(totalPaid) || 0;
    return Math.round(
      (total / (1 + GST_RATE) + Number.EPSILON) * 100
    ) / 100;
  }, [totalPaid]);

  const gstAmount = useMemo(() => {
    const total = Number(totalPaid) || 0;
    return Math.round(
      (total - taxableSubtotal + Number.EPSILON) * 100
    ) / 100;
  }, [totalPaid, taxableSubtotal]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + getItemQuantity(item), 0);
  }, [items]);

  const handleContinue = () => {
    if (typeof onBack === "function") {
      onBack();
    } else if (typeof onHome === "function") {
      onHome();
    }
  };

  return (
    <main className="jr-content jr-page jr-payment-success-page">
      <section
        className="jr-payment-success-content"
        aria-labelledby="payment-success-title"
      >
        {/* ===================================================
            ANIMATION & HERO HEADING
           =================================================== */}
        <PaymentSuccessGif />

        <span className="jr-payment-success-eyebrow">
          PAYMENT CONFIRMED
        </span>

        <h1 id="payment-success-title">
          Payment
          <br />
          <em>successful!</em>
        </h1>

        <p className="jr-payment-success-message">
          {isHck
            ? "Your order has been verified and confirmed. Enter your service code at the machine to start helmet cleaning."
            : "Your order has been verified and confirmed. Enter your pickup code at the machine to collect your fresh juice."}
        </p>

        {/* ===================================================
            4-DIGIT COLLECTION CODE CARD
           =================================================== */}
        <section
          className={
            hasCollectionCode
              ? "jr-payment-success-code-card"
              : "jr-payment-success-code-card jr-payment-success-code-card-empty"
          }
          aria-label={isHck ? "Service code" : "Collection code"}
        >
          <div className="jr-payment-success-code-heading">
            <span className="jr-payment-success-check">
              <CheckIcon />
            </span>
            <span className="jr-payment-success-code-label">
              {isHck ? "YOUR 4-DIGIT SERVICE CODE" : "YOUR 4-DIGIT COLLECTION CODE"}
            </span>
          </div>

          <div
            className="jr-payment-success-code-digits"
            aria-label={
              hasCollectionCode
                ? isHck
                  ? `Your service code is ${collectionCode}`
                  : `Your collection code is ${collectionCode}`
                : isHck
                ? "Service code is being generated"
                : "Collection code is being generated"
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
              ? isHck
                ? "Enter this code on your HCK machine to start helmet cleaning."
                : "Enter this code on your Juice Robo machine to collect your juice."
              : isHck
              ? "Your service code will appear here once ready by the machine."
              : "Your collection code will appear here once ready by the machine."}
          </p>

          {hasCollectionCode && (
            <p className="jr-payment-success-safe-note">
              {isHck
                ? "Keep this code safe until service."
                : "Keep this code safe until collection."}
            </p>
          )}
        </section>

        {/* ===================================================
            BOOKING & OUTLET DETAILS
           =================================================== */}
        <section className="jr-payment-success-details-card" aria-label="Booking Details">
          {/* Order Reference Row */}
          <div className="jr-payment-success-card-header">
            <div className="jr-payment-success-header-title">
              <ReceiptIcon />
              <span>BOOKING SUMMARY</span>
            </div>
            {orderNumber && (
              <span className="jr-payment-success-order-tag">
                #{orderNumber}
              </span>
            )}
          </div>

          {/* Payment Status Badge */}
          <div className="jr-payment-success-status-badge">
            <span className="jr-payment-success-status-dot" />
            <span>Paid via UPI • Confirmed</span>
          </div>

          {/* Location & Machine */}
          <div className="jr-payment-success-location-block">
            <div className="jr-payment-success-loc-icon">
              <LocationPinIcon />
            </div>
            <div className="jr-payment-success-loc-info">
              <small className="jr-payment-success-loc-label">COLLECT FROM</small>
              <strong className="jr-payment-success-loc-name">{locationName}</strong>
              {locationAddress && (
                <span className="jr-payment-success-loc-address">{locationAddress}</span>
              )}
              <span className="jr-payment-success-machine-pill">
                Machine: {machineName}
              </span>
            </div>
          </div>

          {/* Items Breakdown */}
          {items.length > 0 && (
            <div className="jr-payment-success-items-section">
              <div className="jr-payment-success-items-header">
                <span>ORDER ITEMS</span>
                <span>
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="jr-payment-success-items-list">
                {items.map((item, idx) => {
                  const qty = getItemQuantity(item);
                  const subtotal = getItemSubtotal(item);
                  const name = getItemName(item, isHck);

                  return (
                    <div
                      key={item?.id || item?.productId || item?.cartItemId || idx}
                      className="jr-payment-success-item-row"
                    >
                      <div className="jr-payment-success-item-info">
                        <span className="jr-payment-success-item-name">{name}</span>
                        <span className="jr-payment-success-item-qty">× {qty}</span>
                      </div>
                      <strong className="jr-payment-success-item-price">
                        {formatMoney(subtotal, money)}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GST-INCLUSIVE PRICE BREAKDOWN */}
          <div className="jr-payment-success-price-breakdown">
            <div className="jr-payment-success-price-row">
              <span>Item subtotal</span>
              <strong>{formatMoney(taxableSubtotal, money)}</strong>
            </div>

            <div className="jr-payment-success-price-row">
              <span>
                GST <small>5% included</small>
              </span>
              <strong>{formatMoney(gstAmount, money)}</strong>
            </div>
          </div>

          {/* Total Amount Row */}
          <div className="jr-payment-success-total-row">
            <div>
              <span className="jr-payment-success-total-label">TOTAL PAID</span>
              <small className="jr-payment-success-gst-note">Inclusive of 5% GST</small>
            </div>
            <strong className="jr-payment-success-total-amount">
              {formatMoney(totalPaid, money)}
            </strong>
          </div>
        </section>

        {/* ===================================================
            ACTION BUTTONS (RETURN / CONTINUE OPTIONS)
           =================================================== */}
        <div className="jr-payment-success-actions">
          <button
            type="button"
            className="jr-payment-success-primary-button"
            onClick={handleContinue}
          >
            <span>{isHck ? "BACK TO SERVICES" : "BACK TO MENU / ORDER MORE"}</span>
            <ArrowRightIcon />
          </button>

          {typeof onHistory === "function" && (
            <button
              type="button"
              className="jr-payment-success-history-button"
              onClick={onHistory}
            >
              <HistoryIcon />
              <span>VIEW ORDER HISTORY</span>
            </button>
          )}

          {typeof onHome === "function" && (
            <button
              type="button"
              className="jr-payment-success-home-button"
              onClick={onHome}
            >
              <HomeIcon />
              <span>GO TO HOME</span>
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
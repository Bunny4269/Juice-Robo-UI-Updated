import { useMemo, useState } from "react";
import "./CheckoutScreen.css";

/* =========================================================
   JUICE ROBO — ZOMATO-STYLE CHECKOUT SCREEN
   Rich, responsive checkout flow inspired by modern food-delivery
   apps (Zomato / Swiggy) tailored for automated sugarcane juice
   vending machines.
   ========================================================= */

const PRODUCT_ASSETS = {
  plain: `${import.meta.env.BASE_URL}assets/plain-juice.jpg`,
  lemon: `${import.meta.env.BASE_URL}assets/lemon-juice.jpg`,
  ginger: `${import.meta.env.BASE_URL}assets/ginger-juice.jpg`,
  "ginger-lemon": `${import.meta.env.BASE_URL}assets/ginger-lemon-juice.jpg`,
};

function clean(value) {
  return String(value ?? "").trim();
}

function resolveJuiceImage(item = {}) {
  const direct =
    item?.image ||
    item?.image_url ||
    item?.imageUrl ||
    item?.variantPhoto ||
    item?.photo;

  if (
    direct &&
    typeof direct === "string" &&
    direct.trim() &&
    !direct.includes("undefined") &&
    !direct.includes("null")
  ) {
    return direct;
  }

  const text = [
    item?.name,
    item?.displayName,
    item?.productName,
    item?.product_name,
    item?.title,
    item?.variantName,
    item?.variant_name,
    item?.description,
    item?.desc,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("ginger") && text.includes("lemon")) {
    return PRODUCT_ASSETS["ginger-lemon"];
  }
  if (text.includes("ginger")) {
    return PRODUCT_ASSETS["ginger"];
  }
  if (text.includes("lemon")) {
    return PRODUCT_ASSETS["lemon"];
  }
  return PRODUCT_ASSETS["plain"];
}

/* =========================================================
   SVG ICONS
   ========================================================= */

function ArrowBackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VegBadgeIcon() {
  return (
    <span className="jr-zomato-veg-badge" title="100% Pure Plant-Based / Vegetarian" aria-hidden="true">
      <span className="jr-zomato-veg-dot" />
    </span>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UpiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7" cy="15" r="1.5" fill="currentColor" />
      <path d="M11 15h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BillIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16l3-2 3 2 3-2 3 2 3-2 3 2V4a2 2 0 0 0-2-2h-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 7h8M8 11h8M8 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* =========================================================
   CHECKOUT SCREEN COMPONENT
   ========================================================= */

export default function CheckoutScreen({
  cart = [],
  items,
  location,
  machine,
  onBack,
  onUpdate,
  onRemove,
  onPay,
  onSimulatePay,
  money,
  busy = false,
  error = "",
  paymentStatus = "idle",
  productImage,
  displayProductName,
  loggedIn = true,
  onLogin,
  configuredUpiId = "JUICEROBO@ybl",
  onChangeUpiId,
}) {
  const safeCart = Array.isArray(items)
    ? items
    : Array.isArray(cart)
    ? cart
    : [];

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("upi");
  const [showUpiEditor, setShowUpiEditor] = useState(false);
  const [upiInputValue, setUpiInputValue] = useState(configuredUpiId || "JUICEROBO@ybl");

  /* =======================================================
     ITEM HELPERS
     ======================================================= */

  function getName(item) {
    if (typeof displayProductName === "function") {
      return displayProductName(item);
    }
    return (
      item?.displayName ||
      item?.name ||
      item?.productName ||
      item?.product_name ||
      "Sugarcane Juice"
    );
  }

  function getImage(item) {
    if (typeof productImage === "function") {
      const custom = productImage(item);
      if (custom) return custom;
    }
    return resolveJuiceImage(item);
  }

  function getItemQuantity(item) {
    const quantity = Number(
      item?.quantity ??
        item?.qty ??
        item?.count ??
        1
    );
    return Number.isFinite(quantity) && quantity > 0
      ? Math.floor(quantity)
      : 1;
  }

  function getItemUnitPrice(item) {
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
    return 0;
  }

  function formatMoney(value) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) {
      return "₹0.00";
    }
    return `₹${num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /* =======================================================
     FINANCIAL TOTALS (5% INCLUSIVE GST)
     ======================================================= */

  const GST_RATE = 0.05;

  const grossTotal = safeCart.reduce((sum, item) => {
    const price = getItemUnitPrice(item);
    const quantity = getItemQuantity(item);
    return sum + price * quantity;
  }, 0);

  const roundedGross = Math.round((grossTotal + Number.EPSILON) * 100) / 100;
  const subtotal = Math.round((roundedGross / (1 + GST_RATE) + Number.EPSILON) * 100) / 100;
  const gstAmount = Math.round((roundedGross - subtotal + Number.EPSILON) * 100) / 100;
  const finalTotal = roundedGross;

  const itemCount = safeCart.reduce(
    (sum, item) => sum + getItemQuantity(item),
    0
  );

  /* =======================================================
     LOCATION & MACHINE
     ======================================================= */

  const locationName =
    clean(
      location?.name ||
        location?.storeName ||
        location?.outletName ||
        location?.locationName
    ) || "Juice Robo Outlet";

  const locationAddress =
    clean(
      location?.address ||
        location?.locAddress ||
        location?.storeAddress ||
        location?.location ||
        location?.description
    ) || "Select collection point";

  const machineName =
    clean(
      machine?.name ||
        machine?.machineName ||
        machine?.machine_name ||
        machine?.code
    ) || "Smart Dispensing Unit";

  const isProcessing =
    busy ||
    paymentStatus === "processing" ||
    paymentStatus === "PROCESSING";

  /* =======================================================
     EMPTY STATE
     ======================================================= */

  if (!safeCart.length) {
    return (
      <main className="jr-zomato-checkout jr-zomato-empty-checkout">
        <div className="jr-zomato-card jr-zomato-empty-card">
          <div className="jr-zomato-empty-emoji">🧃</div>
          <h2>Your cart is empty</h2>
          <p>Please add fresh cold-pressed sugarcane juice from the menu.</p>
          <button
            type="button"
            className="jr-zomato-primary-button"
            onClick={onBack}
          >
            ← Back to Menu
          </button>
        </div>
      </main>
    );
  }

  /* =======================================================
     MAIN ZOMATO-STYLE CHECKOUT UI
     ======================================================= */

  return (
    <main className="jr-zomato-checkout">
      {/* ---------------------------------------------------
          1. TOP NAVIGATION HEADER
         --------------------------------------------------- */}
      <header className="jr-zomato-nav-header">
        <button
          type="button"
          className="jr-zomato-back-btn"
          onClick={onBack}
          disabled={isProcessing}
          aria-label="Back to cart"
        >
          <ArrowBackIcon />
        </button>

        <div className="jr-zomato-header-text">
          <h1>Checkout</h1>
          <span className="jr-zomato-header-subtitle">
            {locationName} · {itemCount} {itemCount === 1 ? "Item" : "Items"}
          </span>
        </div>
      </header>

      <div className="jr-zomato-checkout-content">
        {/* ---------------------------------------------------
            2. ORDER SUMMARY / ITEMS WITH LIVE STEPPERS
           --------------------------------------------------- */}
        <section className="jr-zomato-card jr-zomato-items-card">
          <div className="jr-zomato-card-heading">
            <div>
              <h2>ORDER ITEMS</h2>
              <span className="jr-zomato-heading-sub">Fresh sugarcane juices</span>
            </div>
            <span className="jr-zomato-items-badge">
              {itemCount} {itemCount === 1 ? "ITEM" : "ITEMS"}
            </span>
          </div>

          <div className="jr-zomato-items-list">
            {safeCart.map((item, index) => {
              const name = getName(item);
              const image = getImage(item);
              const quantity = getItemQuantity(item);
              const unitPrice = getItemUnitPrice(item);
              const lineTotal = unitPrice * quantity;
              const variantName =
                item?.variantName ||
                item?.variant_name ||
                item?.selectedVariant?.variantName ||
                "300ml • 100% Cold-Pressed";

              const itemId =
                item?.variantId ??
                item?.id ??
                item?.productId ??
                index;

              return (
                <div key={`${itemId}-${index}`} className="jr-zomato-item-row">
                  {/* Item Image */}
                  <div className="jr-zomato-item-img-wrap">
                    <img src={image} alt={name} loading="lazy" />
                  </div>

                  {/* Item Details */}
                  <div className="jr-zomato-item-main">
                    <div className="jr-zomato-item-title-row">
                      <VegBadgeIcon />
                      <strong className="jr-zomato-item-title">{name}</strong>
                    </div>

                    <span className="jr-zomato-item-variant">{variantName}</span>

                    <span className="jr-zomato-item-price-tag">
                      {formatMoney(unitPrice)} each
                    </span>
                  </div>

                  {/* Right: Static Quantity & Line Total */}
                  <div className="jr-zomato-item-actions">
                    <span className="jr-zomato-item-qty-badge">
                      Qty: <strong>{quantity}</strong>
                    </span>

                    <strong className="jr-zomato-item-total">
                      {formatMoney(lineTotal)}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------
            4. BILL DETAILS (ZOMATO-STYLE)
           --------------------------------------------------- */}
        <section className="jr-zomato-card jr-zomato-bill-card">
          <div className="jr-zomato-card-heading">
            <div className="jr-zomato-heading-with-icon">
              <BillIcon />
              <h2>BILL DETAILS</h2>
            </div>
          </div>

          <div className="jr-zomato-bill-rows">
            <div className="jr-zomato-bill-row">
              <span>Item Total</span>
              <strong>{formatMoney(grossTotal)}</strong>
            </div>

            <div className="jr-zomato-bill-row">
              <span>Taxable Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>

            <div className="jr-zomato-bill-row">
              <span>
                GST (5% Inclusive)
                <small className="jr-zomato-tax-pill">5%</small>
              </span>
              <strong>{formatMoney(gstAmount)}</strong>
            </div>

            <div className="jr-zomato-bill-divider" />

            <div className="jr-zomato-bill-row grand-total">
              <div>
                <strong className="jr-zomato-grand-label">TO PAY</strong>
                <small className="jr-zomato-grand-sub">Inclusive of 5% GST</small>
              </div>
              <strong className="jr-zomato-grand-amount">
                {formatMoney(finalTotal)}
              </strong>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------
            6. PAYMENT METHOD SELECTION
           --------------------------------------------------- */}
        <section className="jr-zomato-card jr-zomato-payment-section">
          <div className="jr-zomato-card-heading">
            <div className="jr-zomato-heading-with-icon">
              <UpiIcon />
              <h2>PAYMENT METHOD</h2>
            </div>
            <span className="jr-zomato-instant-badge">INSTANT UPI</span>
          </div>

          <div className="jr-zomato-payment-options">
            <label className={`jr-zomato-payment-option ${selectedPaymentMethod === "upi" ? "selected" : ""}`}>
              <input
                type="radio"
                name="payment_method"
                value="upi"
                checked={selectedPaymentMethod === "upi"}
                onChange={() => setSelectedPaymentMethod("upi")}
              />
              <div className="jr-zomato-payment-details">
                <div className="jr-zomato-payment-title-row">
                  <strong>UPI / QR Payment</strong>
                  <span className="jr-zomato-recommended-tag">RECOMMENDED</span>
                </div>
                <span className="jr-zomato-payment-desc">
                  PhonePe, Google Pay, Paytm, BHIM, Cred, or any UPI app
                </span>
                <div className="jr-zomato-upi-pills">
                  <span className="jr-upi-chip">PhonePe</span>
                  <span className="jr-upi-chip">GPay</span>
                  <span className="jr-upi-chip">Paytm</span>
                  <span className="jr-upi-chip">BHIM</span>
                  <span className="jr-upi-chip">Cred</span>
                </div>
              </div>
            </label>
          </div>

          {/* Machine Payee VPA Info & Quick Change */}
          <div className="jr-zomato-payee-info">
            <div className="jr-zomato-payee-text">
              <span className="jr-zomato-payee-label">Machine Payee VPA:</span>
              <span className="jr-zomato-payee-vpa">{configuredUpiId || "JUICEROBO@ybl"}</span>
            </div>
            {typeof onChangeUpiId === "function" && (
              <button
                type="button"
                className="jr-zomato-change-upi-btn"
                onClick={() => {
                  if (!showUpiEditor) {
                    setUpiInputValue(configuredUpiId || "JUICEROBO@ybl");
                  }
                  setShowUpiEditor((prev) => !prev);
                }}
                title="Change or verify Payee UPI ID for this machine"
              >
                {showUpiEditor ? "Close" : "Change"}
              </button>
            )}
          </div>

          {showUpiEditor && typeof onChangeUpiId === "function" && (
            <div className="jr-zomato-upi-edit-box">
              <div className="jr-zomato-upi-edit-label">Custom Payee UPI ID (VPA):</div>
              <div className="jr-zomato-upi-input-group">
                <input
                  type="text"
                  className="jr-zomato-upi-input"
                  placeholder="e.g. merchant@ybl or yourname@oksbi"
                  value={upiInputValue}
                  onChange={(e) => setUpiInputValue(e.target.value)}
                />
                <button
                  type="button"
                  className="jr-zomato-upi-save-btn"
                  onClick={() => {
                    onChangeUpiId(upiInputValue.trim());
                    setShowUpiEditor(false);
                  }}
                >
                  Save
                </button>
              </div>
              <div className="jr-zomato-upi-quick-pills">
                <span className="jr-zomato-upi-quick-title">Quick VPAs:</span>
                <button
                  type="button"
                  className="jr-zomato-quick-btn"
                  onClick={() => {
                    setUpiInputValue("JUICEROBO@ybl");
                    onChangeUpiId("JUICEROBO@ybl");
                    setShowUpiEditor(false);
                  }}
                >
                  JUICEROBO@ybl
                </button>
              </div>
            </div>
          )}

          <div className="jr-zomato-security-badge">
            <ShieldCheckIcon />
            <span>100% Safe &amp; Secure Payments via UPI Intent • NPCI Verified</span>
          </div>
        </section>

        {/* ---------------------------------------------------
            7. HYGIENE & AUTOMATION ASSURANCE
           --------------------------------------------------- */}
        <section className="jr-zomato-hygiene-note">
          <p>
            🔒 Automated cold-press extraction begins upon payment confirmation.
            You will receive a <strong>4-digit instant pickup code</strong> on screen to collect your fresh juice.
          </p>
        </section>

        {/* Login notice if guest user */}
        {!loggedIn && (
          <section className="jr-checkout-login-notice" aria-label="Login required for payment">
            <div className="jr-checkout-login-notice-content">
              <span className="jr-checkout-login-icon">🔒</span>
              <div>
                <strong>Please log in to continue with payment.</strong>
                <p>Sign in to complete your payment and order fresh juice.</p>
              </div>
            </div>
            <button
              type="button"
              className="jr-checkout-login-btn"
              onClick={() => {
                if (typeof onLogin === "function") {
                  onLogin();
                } else if (typeof onPay === "function") {
                  onPay();
                }
              }}
            >
              Log in →
            </button>
          </section>
        )}

        {/* Error message if payment creation fails */}
        {error && (
          <div className="jr-zomato-error-box">
            {error}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------
          8. STICKY BOTTOM BAR (PRIMARY PROCEED TO PAY ACTION)
         --------------------------------------------------- */}
      <footer className="jr-zomato-bottom-bar">
        <div className="jr-zomato-bottom-inner">
          <div className="jr-zomato-bottom-pricing">
            <span className="jr-zomato-bottom-label">TOTAL PAYABLE</span>
            <strong className="jr-zomato-bottom-amount">
              {formatMoney(finalTotal)}
            </strong>
          </div>

          <div className="jr-zomato-bottom-actions">
            <button
              type="button"
              className="jr-zomato-pay-cta"
              disabled={isProcessing || safeCart.length === 0}
              onClick={onPay}
            >
              <span>
                {isProcessing
                  ? "PREPARING PAYMENT..."
                  : !loggedIn
                  ? "CONTINUE TO PAYMENT"
                  : "PAY NOW"}
              </span>
              <span className="jr-zomato-cta-arrow" aria-hidden="true">
                {isProcessing ? "⏳" : "→"}
              </span>
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

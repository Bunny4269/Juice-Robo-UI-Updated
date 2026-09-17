import { useState, useMemo } from "react";
import "./PaymentSuccessScreen.css";

/* =========================================================
   JUICE ROBO — PRODUCTION PAYMENT SUCCESS SCREEN
   Real verified payment & dispenser collection screen.
   Features:
   - Animated payment success celebration badge
   - High-contrast 4-digit dispenser collection PIN card
   - One-tap PIN copy with visual feedback
   - Location & dispenser machine verification details
   - Itemized order receipt with juice images and GST breakdown
   - 3-step physical collection walkthrough
   - Direct CTA buttons: "Order Another Juice" & "View Orders"
   ========================================================= */

function clean(value) {
  return String(value ?? "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMoney(value, money) {
  if (typeof money === "function") return money(value);
  const val = number(value);
  return `₹${val.toLocaleString("en-IN", {
    minimumFractionDigits: val % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function resolveItemImage(item) {
  const direct =
    item?.imageUrl ||
    item?.image_url ||
    item?.image ||
    item?.imagePath ||
    item?.image_path ||
    item?.productImage ||
    item?.product_image ||
    item?.thumbnail ||
    item?.variantPhoto;

  if (direct && typeof direct === "string" && direct.trim() && !direct.includes("undefined")) {
    return direct;
  }

  const name = clean(
    item?.displayName ||
    item?.name ||
    item?.productName ||
    item?.product_name ||
    item?.title ||
    ""
  ).toLowerCase();

  if (name.includes("ginger") && name.includes("lemon")) {
    return "/assets/ginger-lemon-juice.jpg";
  }
  if (name.includes("ginger")) {
    return "/assets/ginger-juice.jpg";
  }
  if (name.includes("lemon")) {
    return "/assets/lemon-juice.jpg";
  }
  return "/assets/plain-juice.jpg";
}

function getCollectionCode(order) {
  const candidates = [
    order?.orderPin,
    order?.order_pin,
    order?.collectionCode,
    order?.collection_code,
    order?.collectionPin,
    order?.collection_pin,
    order?.pickupCode,
    order?.pickup_code,
    order?.data?.collection_code,
    order?.data?.orderPin,
    order?.result?.collection_code,
    order?.result?.orderPin,
  ];

  for (const c of candidates) {
    const str = clean(c);
    if (/^\d{4}$/.test(str)) return str;
    const match = str.match(/\b(\d{4})\b/);
    if (match?.[1]) return match[1];
  }

  try {
    const s1 = clean(sessionStorage.getItem("juice_robo_payment_collection_code"));
    if (/^\d{4}$/.test(s1)) return s1;
    const s2 = clean(sessionStorage.getItem("juice_robo_collection_code"));
    if (/^\d{4}$/.test(s2)) return s2;
  } catch {}

  // Fallback to numeric digits from orderId
  const rawId = clean(order?.orderId || order?.order_id || order?.id || "");
  const numOnly = rawId.replace(/\D/g, "");
  if (numOnly.length >= 4) {
    return numOnly.slice(-4);
  }

  return "";
}

export default function PaymentSuccessScreen({
  order = {},
  location,
  machine,
  onHome,
  onMenu,
  onBack,
  onHistory,
  money,
}) {
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Restore from storage if order is incomplete
  const safeOrder = useMemo(() => {
    if (order && (order.orderId || order.id || order.collectionCode || order.items)) {
      return order;
    }
    try {
      const stored =
        sessionStorage.getItem("juice_robo_payment_success") ||
        localStorage.getItem("juice_robo_payment_success") ||
        sessionStorage.getItem("juice_robo_last_order");
      return stored ? JSON.parse(stored) : order;
    } catch {
      return order;
    }
  }, [order]);

  const code = getCollectionCode(safeOrder);
  const digits = code ? code.split("") : ["—", "—", "—", "—"];

  const rawOrderId = clean(
    safeOrder?.orderId ||
    safeOrder?.order_id ||
    safeOrder?.id ||
    safeOrder?.transactionId ||
    safeOrder?.transaction_id ||
    "ORD"
  );
  const displayOrderId =
    rawOrderId.length > 14
      ? `JR-${rawOrderId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}`
      : `#${rawOrderId.toUpperCase()}`;

  const items = Array.isArray(safeOrder?.items)
    ? safeOrder.items
    : Array.isArray(safeOrder?.orderItems)
    ? safeOrder.orderItems
    : Array.isArray(safeOrder?.order_items)
    ? safeOrder.order_items
    : [];

  const total = number(
    safeOrder?.totalAmount ??
    safeOrder?.total_amount ??
    safeOrder?.netBill ??
    safeOrder?.net_bill ??
    safeOrder?.total ??
    (items.length > 0
      ? items.reduce(
          (sum, it) =>
            sum +
            number(it.price || it.sellingPrice || it.unitPrice || 0) *
              number(it.quantity || it.qty || 1),
          0
        )
      : 0)
  );

  const subtotal = number(
    safeOrder?.subtotal ??
    safeOrder?.subTotal ??
    (items.length > 0
      ? items.reduce(
          (sum, it) =>
            sum +
            number(it.price || it.sellingPrice || it.unitPrice || 0) *
              number(it.quantity || it.qty || 1),
          0
        )
      : total)
  );

  const gst = number(safeOrder?.gst ?? (total > subtotal ? total - subtotal : 0));

  const locationTitle = clean(
    location?.name ||
    location?.outletName ||
    location?.locationName ||
    location?.storeName ||
    safeOrder?.location?.name ||
    safeOrder?.locationName ||
    safeOrder?.locName ||
    "Juice Robo Outlet"
  );

  const locationAddress = clean(
    location?.address ||
    location?.locationAddress ||
    location?.storeAddress ||
    safeOrder?.location?.address ||
    safeOrder?.locationAddress ||
    "On-site Fresh Juicer"
  );

  const machineTitle = clean(
    machine?.name ||
    machine?.machineName ||
    machine?.code ||
    safeOrder?.machine?.name ||
    safeOrder?.machineName ||
    "Sugarcane Juicer #1"
  );

  const orderDate = useMemo(() => {
    try {
      const d = safeOrder?.createdAt ? new Date(safeOrder.createdAt) : new Date();
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Today";
    }
  }, [safeOrder?.createdAt]);

  async function handleCopyPin() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2200);
    } catch {
      // Ignore clipboard fallback
    }
  }

  async function handleCopyOrderId() {
    if (!rawOrderId) return;
    try {
      await navigator.clipboard.writeText(rawOrderId);
      setCopiedOrderId(true);
      setTimeout(() => setCopiedOrderId(false), 2000);
    } catch {}
  }

  const handleOrderMore = onMenu || onBack || onHome;

  return (
    <main className="jr-content jr-page jr-success-page" aria-live="polite">
      {/* ===================================================
          1. TOP APP BAR / BRANDING
         =================================================== */}
      <header className="jr-success-topbar">
        <div className="jr-success-topbar-brand">
          <img
            src="/assets/juice-robo-logo.jpg"
            alt="Juice Robo"
            className="jr-success-brand-logo"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <span className="jr-success-brand-name">Juice Robo</span>
        </div>
        <div className="jr-success-topbar-badge">
          <span className="jr-success-pulse-dot" />
          <span>ORDER CONFIRMED</span>
        </div>
      </header>

      {/* ===================================================
          2. CELEBRATION HERO
         =================================================== */}
      <section className="jr-success-hero">
        <div className="jr-success-icon-wrapper">
          <div className="jr-success-icon-glow" />
          <div className="jr-success-icon-circle">
            <svg
              className="jr-success-check-svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <div className="jr-success-hero-badge">
          <span>✓ UPI PAYMENT CONFIRMED</span>
        </div>

        <h1 className="jr-success-title">
          Payment Successful!
        </h1>

        <p className="jr-success-subtitle">
          Your sugarcane juice is queued and ready to pour at the dispenser.
        </p>

        <div className="jr-success-meta-row">
          <button
            type="button"
            className="jr-success-order-id-chip"
            onClick={handleCopyOrderId}
            title="Click to copy Order ID"
          >
            <span>{displayOrderId}</span>
            <small>{copiedOrderId ? "Copied!" : "Copy"}</small>
          </button>
          <span className="jr-success-meta-dot">•</span>
          <span className="jr-success-time">{orderDate}</span>
        </div>
      </section>

      {/* ===================================================
          3. HERO 4-DIGIT MACHINE PIN CARD
         =================================================== */}
      <section className={`jr-success-pin-card ${code ? "ready" : "pending"}`}>
        <div className="jr-success-pin-header">
          <div className="jr-success-pin-label-group">
            <span className="jr-success-pin-icon">🔑</span>
            <div>
              <strong className="jr-success-pin-title">DISPENSER COLLECTION PIN</strong>
              <p className="jr-success-pin-desc">
                Punch this 4-digit code on the Juice Robo machine screen
              </p>
            </div>
          </div>
          <span className="jr-success-pin-status-pill">
            <span className="jr-success-status-beacon" />
            READY
          </span>
        </div>

        <div className="jr-success-digits-container" aria-label={`Collection PIN: ${code || "Pending"}`}>
          {digits.map((digit, index) => (
            <div key={index} className={`jr-success-digit-box ${digit === "—" ? "placeholder" : ""}`}>
              <span className="jr-success-digit-char">{digit}</span>
            </div>
          ))}
        </div>

        {code && (
          <button
            type="button"
            className={`jr-success-copy-pin-btn ${copiedPin ? "copied" : ""}`}
            onClick={handleCopyPin}
          >
            {copiedPin ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>PIN Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy 4-Digit PIN</span>
              </>
            )}
          </button>
        )}

        <div className="jr-success-pin-note">
          <span className="jr-success-note-icon">💡</span>
          <span>
            Please keep this code ready when standing in front of the dispenser.
          </span>
        </div>
      </section>

      {/* ===================================================
          4. 3-STEP COLLECTION GUIDE
         =================================================== */}
      <section className="jr-success-steps-card">
        <h3 className="jr-success-section-title">
          <span>HOW TO COLLECT YOUR JUICE</span>
        </h3>

        <div className="jr-success-steps-list">
          <div className="jr-success-step-item">
            <div className="jr-success-step-num">1</div>
            <div className="jr-success-step-text">
              <strong>Walk to the Dispenser</strong>
              <span>Head over to {locationTitle}</span>
            </div>
          </div>

          <div className="jr-success-step-item">
            <div className="jr-success-step-num">2</div>
            <div className="jr-success-step-text">
              <strong>Punch in your 4-digit PIN</strong>
              <span>Type <strong>{code || "your code"}</strong> on the machine screen</span>
            </div>
          </div>

          <div className="jr-success-step-item">
            <div className="jr-success-step-num">3</div>
            <div className="jr-success-step-text">
              <strong>Freshly Crushed &amp; Poured</strong>
              <span>Place your cup in the tray and enjoy freshly cold-pressed juice!</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          5. DISPENSER LOCATION DETAILS CARD
         =================================================== */}
      <section className="jr-success-location-card">
        <div className="jr-success-location-icon-wrapper">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="jr-success-location-info">
          <span className="jr-success-location-tag">COLLECTION POINT</span>
          <strong className="jr-success-location-name">{locationTitle}</strong>
          <span className="jr-success-machine-pill">
            <span className="jr-success-machine-indicator" />
            {machineTitle}
          </span>
          {locationAddress && (
            <p className="jr-success-location-address">{locationAddress}</p>
          )}
        </div>
      </section>

      {/* ===================================================
          6. DIGITAL RECEIPT & ORDER SUMMARY
         =================================================== */}
      <section className="jr-success-receipt-card">
        <div className="jr-success-receipt-header">
          <span className="jr-success-receipt-title">ORDER SUMMARY</span>
          <span className="jr-success-receipt-count">
            {items.reduce((s, it) => s + number(it.quantity || it.qty || 1), 0) || 1} Item(s)
          </span>
        </div>

        {items.length > 0 ? (
          <div className="jr-success-items-list">
            {items.map((item, idx) => {
              const itemName = clean(
                item.displayName ||
                item.name ||
                item.productName ||
                item.product_name ||
                item.title ||
                "Sugarcane Juice"
              );
              const qty = number(item.quantity || item.qty || 1);
              const itemPrice = number(item.price || item.sellingPrice || item.unitPrice || 0);
              const lineTotal = itemPrice * qty;
              const imgSrc = resolveItemImage(item);

              return (
                <div key={item.id || item.productId || idx} className="jr-success-item-row">
                  <img
                    src={imgSrc}
                    alt={itemName}
                    className="jr-success-item-img"
                    onError={(e) => {
                      e.currentTarget.src = "/assets/plain-juice.jpg";
                    }}
                  />
                  <div className="jr-success-item-info">
                    <strong className="jr-success-item-name">{itemName}</strong>
                    <span className="jr-success-item-qty">Qty: {qty}</span>
                  </div>
                  <strong className="jr-success-item-price">
                    {formatMoney(lineTotal, money)}
                  </strong>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="jr-success-item-row">
            <img
              src="/assets/plain-juice.jpg"
              alt="Sugarcane Juice"
              className="jr-success-item-img"
            />
            <div className="jr-success-item-info">
              <strong className="jr-success-item-name">Sugarcane Juice</strong>
              <span className="jr-success-item-qty">Qty: 1</span>
            </div>
            <strong className="jr-success-item-price">
              {formatMoney(total, money)}
            </strong>
          </div>
        )}

        <div className="jr-success-receipt-divider" />

        <div className="jr-success-bill-breakdown">
          <div className="jr-success-bill-row">
            <span>Item Subtotal</span>
            <span>{formatMoney(subtotal, money)}</span>
          </div>

          {gst > 0 && (
            <div className="jr-success-bill-row">
              <span>GST (Included)</span>
              <span>{formatMoney(gst, money)}</span>
            </div>
          )}

          <div className="jr-success-bill-row total">
            <strong>Amount Paid</strong>
            <strong className="jr-success-bill-total-amount">
              {formatMoney(total, money)}
            </strong>
          </div>

          <div className="jr-success-payment-method-row">
            <span>Payment Method</span>
            <span className="jr-success-payment-verified-pill">
              ✓ UPI Auto-Verified
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================
          7. ACTION CONTROLS
         =================================================== */}
      <div className="jr-success-actions">
        {handleOrderMore && (
          <button
            type="button"
            className="jr-success-order-more-btn"
            onClick={handleOrderMore}
          >
            <span>🧃 Order Another Juice</span>
          </button>
        )}

        {typeof onHistory === "function" && (
          <button
            type="button"
            className="jr-success-history-btn"
            onClick={onHistory}
          >
            <span>📜 View All Orders</span>
          </button>
        )}

        {typeof onHome === "function" && (
          <button
            type="button"
            className="jr-success-home-link"
            onClick={onHome}
          >
            Return to Home
          </button>
        )}
      </div>

      {/* ===================================================
          8. FOOTER ASSISTANCE
         =================================================== */}
      <footer className="jr-success-footer-note">
        <p>
          Need help? Contact Juice Robo on-site assistant or call customer care with your Order ID: <strong>{displayOrderId}</strong>.
        </p>
      </footer>
    </main>
  );
}

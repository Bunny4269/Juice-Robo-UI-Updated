import "./PaymentScreen.css";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function moneyValue(value, money) {
  if (typeof money === "function") return money(value);
  return `₹${number(value).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function itemName(item) {
  return clean(
    item?.displayName ??
    item?.name ??
    item?.itemName ??
    item?.productName ??
    item?.product_name ??
    item?.title
  ) || "Juice";
}

function itemQuantity(item) {
  return Math.max(1, Math.floor(number(item?.quantity ?? item?.qty ?? item?.count, 1)));
}

function itemTotal(item) {
  const direct = number(
    item?.subtotal ??
    item?.subTotal ??
    item?.lineTotal ??
    item?.line_total ??
    item?.total,
    NaN
  );
  if (Number.isFinite(direct)) return direct;

  return number(
    item?.unitPrice ??
    item?.unit_price ??
    item?.price ??
    item?.sellingPrice ??
    item?.selling_price,
    0
  ) * itemQuantity(item);
}

function locationName(location) {
  return clean(
    location?.outletName ??
    location?.locationName ??
    location?.storeName ??
    location?.name
  ) || "Choose location";
}

function locationAddress(location) {
  return clean(
    location?.address ??
    location?.locationAddress ??
    location?.storeAddress ??
    location?.location
  );
}

function machineName(machine) {
  return clean(
    machine?.machineName ??
    machine?.machine_name ??
    machine?.name ??
    machine?.machineCode ??
    machine?.machine_code
  ) || "Choose machine";
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 10.2c0 5.2-8 10.8-8 10.8S4 15.4 4 10.2a8 8 0 1 1 16 0Z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 19 6v5c0 4.6-2.9 8.2-7 10-4.1-1.8-7-5.4-7-10V6l7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function PaymentScreen({
  cart = [],
  items,
  total,
  gst,
  finalTotal,
  location,
  machine,
  onBack,
  onPay,
  money,
  paymentStatus,
  busy,
  error,
}) {
  const safeItems = Array.isArray(items) ? items : Array.isArray(cart) ? cart : [];
  const safeTotal = number(finalTotal ?? total, 0);

  const calculatedItemsTotal = safeItems.reduce((sum, item) => sum + itemTotal(item), 0);
  const itemsTotal = number(total ?? calculatedItemsTotal, calculatedItemsTotal);
  const gstAmount = number(gst, 0);

  const processing =
    Boolean(busy) ||
    paymentStatus === "processing" ||
    paymentStatus === "PROCESSING";

  return (
    <main className="jr-content jr-page jr-payment-page">
      <button type="button" className="jr-payment-back" onClick={onBack} disabled={processing}>
        ← Back to order
      </button>

      <header className="jr-payment-header">
        <span className="jr-payment-eyebrow">PAYMENT</span>
        <h1>
          Almost
          <br />
          <em>there.</em>
        </h1>
        <p>Review your order and complete secure payment.</p>
      </header>

      <section className="jr-payment-collection">
        <div className="jr-payment-collection-icon"><LocationIcon /></div>
        <div>
          <span>COLLECT FROM</span>
          <strong>{locationName(location)}</strong>
          {locationAddress(location) && <small>{locationAddress(location)}</small>}
          <small>Machine: {machineName(machine)}</small>
        </div>
      </section>

      <section className="jr-payment-summary">
        <div className="jr-payment-summary-head">
          <span>ORDER SUMMARY</span>
          <strong>{safeItems.length} {safeItems.length === 1 ? "item" : "items"}</strong>
        </div>

        <div className="jr-payment-items">
          {safeItems.map((item, index) => (
            <div className="jr-payment-item" key={item?.id ?? item?.variantId ?? index}>
              <div>
                <strong>{itemName(item)}</strong>
                <span>× {itemQuantity(item)}</span>
              </div>
              <strong>{moneyValue(itemTotal(item), money)}</strong>
            </div>
          ))}
        </div>

        <div className="jr-payment-row">
          <span>Items total</span>
          <strong>{moneyValue(itemsTotal, money)}</strong>
        </div>

        <div className="jr-payment-row">
          <span>GST 5%</span>
          <strong>{moneyValue(gstAmount, money)}</strong>
        </div>

        <div className="jr-payment-divider" />

        <div className="jr-payment-total">
          <div>
            <span>TOTAL</span>
            <small>Inclusive of 5% GST</small>
          </div>
          <strong>{moneyValue(safeTotal, money)}</strong>
        </div>
      </section>

      <section className="jr-payment-secure">
        <div className="jr-payment-secure-icon"><ShieldIcon /></div>
        <div>
          <strong>Pay securely online</strong>
          <p>Your payment is securely processed through UPI. After successful payment, Juice Robo will generate your 4-digit collection code.</p>
        </div>
      </section>

      <button
        type="button"
        className="jr-payment-pay"
        onClick={onPay}
        disabled={processing || safeTotal <= 0}
      >
        <span>{processing ? "Starting payment..." : "PAY"}</span>
        <strong>{moneyValue(safeTotal, money)} →</strong>
      </button>

      <p className="jr-payment-note">🔒 Secure payment · Your payment details are protected</p>

      {error && (
        <div className="jr-payment-error" role="alert">
          {clean(error)}
        </div>
      )}
    </main>
  );
}

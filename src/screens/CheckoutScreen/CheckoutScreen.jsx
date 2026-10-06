import "./CheckoutScreen.css";

export default function CheckoutScreen({
  cart = [],
  subtotal = 0,
  gst = 0,
  total = 0,
  location,
  machine,
  money,
  onBack,
  onChangeCollection,
  onProceedToPayment,
  displayProductName,
  isHck = false,
}) {
  const items = Array.isArray(cart) ? cart : [];

  const formatMoney = (value) => {
    if (typeof money === "function") return money(value);
    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getName = (item) => {
    if (typeof displayProductName === "function") {
      return displayProductName(item);
    }
    return item?.displayName || item?.name || item?.productName || "Item";
  };

  const getPrice = (item) =>
    Number(item?.price ?? item?.unitPrice ?? item?.sellingPrice ?? 0);

  const getQuantity = (item) =>
    Math.max(1, Math.min(9, Math.floor(Number(item?.quantity ?? item?.qty ?? 1))));

  const itemCount = items.reduce((sum, item) => sum + getQuantity(item), 0);

  return (
    <main className="jr-content jr-page jr-checkout-page">
      <button type="button" className="jr-checkout-back" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to cart
      </button>

      <header className="jr-checkout-header">
        <span className="jr-eyebrow">CHECKOUT</span>
        <h1>
          Review your
          <br />
          <em>order.</em>
        </h1>
      </header>

      <section className="jr-checkout-card">
        <div className="jr-checkout-card-heading">
          <div>
            <span className="jr-checkout-kicker">YOUR ORDER</span>
            <strong>{itemCount} {itemCount === 1 ? "item" : "items"}</strong>
          </div>
        </div>

        <div className="jr-checkout-items">
          {items.map((item, index) => {
            const quantity = getQuantity(item);
            const unitPrice = getPrice(item);
            return (
              <div className="jr-checkout-item" key={`${item?.id ?? index}-${index}`}>
                <div className="jr-checkout-item-copy">
                  <strong>{getName(item)}</strong>
                  <span>Qty {quantity} × {formatMoney(unitPrice)}</span>
                </div>
                <strong>{formatMoney(unitPrice * quantity)}</strong>
              </div>
            );
          })}
        </div>
      </section>

      <section className="jr-checkout-card jr-checkout-collection-card">
        <div className="jr-checkout-section-title">COLLECT FROM</div>
        <div className="jr-checkout-location-row">
          <div className="jr-checkout-location-icon" aria-hidden="true">⌖</div>
          <div>
            <strong>{location?.name || location?.location_name || location?.title || "Juice Robo Outlet"}</strong>
            <span>{machine?.name || machine?.machine_name || "Vending machine"}</span>
          </div>
          {onChangeCollection && (location || machine) && (
            <button type="button" onClick={onChangeCollection}>Change</button>
          )}
        </div>
      </section>

      <section className="jr-checkout-card jr-checkout-total-card">
        <div className="jr-checkout-total-row">
          <span>Subtotal</span>
          <strong>{formatMoney(subtotal)}</strong>
        </div>
        <div className="jr-checkout-total-row">
          <span>GST <small>5%</small></span>
          <strong>{formatMoney(gst)}</strong>
        </div>
        <div className="jr-checkout-divider" />
        <div className="jr-checkout-total-row jr-checkout-grand-total">
          <div>
            <span>Total</span>
            <small>Inclusive of 5% GST</small>
          </div>
          <strong>{formatMoney(total)}</strong>
        </div>
      </section>

      <div className="jr-checkout-bottom-space" />

      <div className="jr-checkout-action-bar">
        <div>
          <span>{itemCount} {itemCount === 1 ? "ITEM" : "ITEMS"}</span>
          <strong>{formatMoney(total)}</strong>
        </div>
        <button type="button" onClick={onProceedToPayment}>
          <span>Proceed to payment</span>
          <b aria-hidden="true">›</b>
        </button>
      </div>
    </main>
  );
}

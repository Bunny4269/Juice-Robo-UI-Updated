import "./CartScreen.css";

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

function itemName(item, displayProductName) {
  if (typeof displayProductName === "function") {
    const value = clean(displayProductName(item));
    if (value) return value;
  }
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
  return Math.max(
    1,
    Math.floor(
      number(
        item?.quantity ??
        item?.qty ??
        item?.count ??
        item?.itemQuantity ??
        item?.item_quantity,
        1
      )
    )
  );
}

function itemPrice(item) {
  return number(
    item?.unitPrice ??
    item?.unit_price ??
    item?.price ??
    item?.sellingPrice ??
    item?.selling_price ??
    item?.variant?.price ??
    0
  );
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
  return Number.isFinite(direct) ? direct : itemPrice(item) * itemQuantity(item);
}

function itemImage(item, productImage, displayProductName) {
  if (typeof productImage === "function") {
    try {
      const value = clean(productImage(item));
      if (value) return value;
    } catch {}
  }
  return clean(
    item?.imageUrl ??
    item?.image_url ??
    item?.image ??
    item?.productImage ??
    item?.product_image
  );
}

function locationName(location) {
  return clean(
    location?.outletName ??
    location?.locationName ??
    location?.storeName ??
    location?.name
  ) || "Choose location";
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

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h2l1.6 10h9.7L19 8H7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="19" r="1.3" fill="currentColor"/>
      <circle cx="16" cy="19" r="1.3" fill="currentColor"/>
    </svg>
  );
}

export default function CartScreen({
  cart = [],
  total,
  subtotal,
  gst,
  finalTotal,
  location,
  machine,
  onBack,
  onUpdate,
  onRemove,
  onClear,
  onLocation,
  onCheckout,
  productImage,
  displayProductName,
  money,
}) {
  const items = Array.isArray(cart) ? cart : [];
  const safeFinalTotal = number(finalTotal, number(total, 0));
  const safeSubtotal = number(subtotal, safeFinalTotal);
  const safeGst = number(gst, 0);

  return (
    <main className="jr-content jr-page jr-cart-page">
      <button type="button" className="jr-cart-back" onClick={onBack}>
        ← Back to menu
      </button>

      <header className="jr-cart-header">
        <div>
          <span className="jr-cart-eyebrow">YOUR ORDER</span>
          <h1>Your <em>cart.</em></h1>
          <p>{items.length} {items.length === 1 ? "item" : "items"} ready for checkout.</p>
        </div>
        <div className="jr-cart-header-actions">
          {items.length > 0 && (
            <button
              type="button"
              className="jr-cart-header-clear"
              onClick={onClear}
              aria-label="Clear all items in cart"
            >
              Clear cart
            </button>
          )}
          <div className="jr-cart-header-icon"><CartIcon /></div>
        </div>
      </header>

      {items.length === 0 ? (
        <section className="jr-cart-empty">
          <div className="jr-cart-empty-icon"><CartIcon /></div>
          <h2>Your cart is empty</h2>
          <p>Add a fresh juice from the menu to continue.</p>
          <button type="button" onClick={onBack}>Browse menu</button>
        </section>
      ) : (
        <>
          <section className="jr-cart-items">
            <div className="jr-cart-section-title">
              <span>SELECTED JUICES</span>
              <strong>{items.length}</strong>
            </div>

            {items.map((item, index) => {
              const name = itemName(item, displayProductName);
              const quantity = itemQuantity(item);
              const price = itemPrice(item);
              const lineTotal = itemTotal(item);
              const image = itemImage(item, productImage, displayProductName);
              const id =
                item?.variantId ??
                item?.variant_id ??
                item?.productVariantId ??
                item?.product_variant_id ??
                item?.itemId ??
                item?.item_id ??
                item?.id;

              return (
                <article className="jr-cart-item" key={id ?? `cart-${index}`}>
                  <div className="jr-cart-item-image">
                    {image ? (
                      <img
                        src={image}
                        alt={name}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span>J</span>
                    )}
                  </div>

                  <div className="jr-cart-item-main">
                    <div className="jr-cart-item-head">
                      <div>
                        <h2>{name}</h2>
                        <span>{moneyValue(price, money)} each</span>
                      </div>
                      <strong>{moneyValue(lineTotal, money)}</strong>
                    </div>

                    <div className="jr-cart-item-actions">
                      <div className="jr-cart-stepper">
                        <button
                          type="button"
                          aria-label={`Decrease ${name}`}
                          onClick={() => {
                            if (quantity <= 1) onRemove?.(id);
                            else onUpdate?.(id, quantity - 1);
                          }}
                        >−</button>
                        <strong>{quantity}</strong>
                        <button
                          type="button"
                          aria-label={`Increase ${name}`}
                          onClick={() => onUpdate?.(id, quantity + 1)}
                        >+</button>
                      </div>

                      <button
                        type="button"
                        className="jr-cart-remove"
                        onClick={() => onRemove?.(id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="jr-cart-collection">
            <div className="jr-cart-collection-mark">⌖</div>
            <div>
              <span>COLLECT FROM</span>
              <strong>{locationName(location)}</strong>
              <small>{machineName(machine)}</small>
            </div>
            <button type="button" onClick={onLocation}>Change</button>
          </section>

          <section className="jr-cart-summary">
            <div className="jr-cart-summary-head">
              <span>ORDER SUMMARY</span>
              <strong>{items.length} {items.length === 1 ? "item" : "items"}</strong>
            </div>

            <div className="jr-cart-row">
              <span>Items total</span>
              <strong>{moneyValue(safeSubtotal, money)}</strong>
            </div>
            <div className="jr-cart-row">
              <span>GST 5%</span>
              <strong>{moneyValue(safeGst, money)}</strong>
            </div>

            <div className="jr-cart-divider" />

            <div className="jr-cart-total-row">
              <div>
                <span>TOTAL</span>
                <small>Inclusive of 5% GST</small>
              </div>
              <strong>{moneyValue(safeFinalTotal, money)}</strong>
            </div>
          </section>

          <div className="jr-cart-actions">
            <button type="button" className="jr-cart-checkout" onClick={onCheckout}>
              <span>Continue to payment</span>
              <strong>→</strong>
            </button>
          </div>
        </>
      )}
    </main>
  );
}

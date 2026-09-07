import "./ConfirmationScreen.css";

/* =========================================================
   JUICE ROBO — CONFIRMATION SCREEN
   ========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

function formatMoney(value, money) {
  if (typeof money === "function") {
    return money(value);
  }

  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getOrderNumber(order = {}) {
  return (
    clean(
      order?.orderNumber ||
        order?.order_number ||
        order?.id ||
        order?.orderId
    ) || "Pending"
  );
}

function getLocationName(order, location) {
  return (
    clean(
      order?.location?.name ||
        order?.location?.locationName ||
        order?.locationName ||
        location?.name ||
        location?.locationName ||
        location?.storeName
    ) || "ICICI Bank"
  );
}

function getLocationAddress(order, location) {
  return (
    clean(
      order?.location?.address ||
        order?.location?.locationAddress ||
        order?.locationAddress ||
        location?.address ||
        location?.locationAddress ||
        location?.storeAddress
    ) || "ICICI Tower, Hyderabad"
  );
}

function getMachineName(order, machine) {
  return (
    clean(
      order?.machine?.name ||
        order?.machine?.code ||
        order?.machineName ||
        order?.machineCode ||
        machine?.name ||
        machine?.machineName ||
        machine?.code ||
        machine?.machineCode
    ) || "ICICI Bank"
  );
}

function getItems(order = {}) {
  if (Array.isArray(order?.items)) {
    return order.items;
  }

  if (Array.isArray(order?.orderItems)) {
    return order.orderItems;
  }

  if (Array.isArray(order?.order_items)) {
    return order.order_items;
  }

  return [];
}

function getItemName(item = {}) {
  return (
    clean(
      item?.product_name ||
        item?.productName ||
        item?.displayName ||
        item?.name ||
        item?.itemName ||
        item?.title
    ) || "Sugarcane Juice"
  );
}

function getItemQuantity(item = {}) {
  const quantity = Number(
    item?.quantity ??
      item?.qty ??
      item?.count ??
      1
  );

  return Number.isFinite(quantity) && quantity > 0
    ? quantity
    : 1;
}

function getItemSubtotal(item = {}) {
  const direct = Number(
    item?.subtotal ??
      item?.subTotal ??
      item?.lineTotal ??
      item?.line_total ??
      item?.total
  );

  if (Number.isFinite(direct) && direct >= 0) {
    return direct;
  }

  const price = Number(
    item?.unit_price ??
      item?.unitPrice ??
      item?.price ??
      item?.sellingPrice ??
      item?.selling_price ??
      0
  );

  return price * getItemQuantity(item);
}

function getTotal(order, items) {
  const direct = Number(
    order?.total ??
      order?.total_amount ??
      order?.totalAmount ??
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

function getPaymentStatus(order) {
  return (
    clean(
      order?.paymentStatus ||
        order?.payment_status ||
        order?.payment?.status
    ) || "PAID"
  );
}

function getOrderStatus(order) {
  return (
    clean(
      order?.orderStatus ||
        order?.order_status ||
        order?.status
    ) || "READY FOR COLLECTION"
  );
}

function getCollectionCode(order) {
  return (
    clean(
      order?.collectionCode ||
        order?.collection_code ||
        order?.collection_code_value
    ) || ""
  );
}


/* =========================================================
   MAIN SCREEN
   ========================================================= */

export default function ConfirmationScreen({
  order = {},
  location,
  machine,
  onHome,
  onHistory,
  money,
}) {
  const items = getItems(order);

  const orderNumber = getOrderNumber(order);

  const locationName =
    getLocationName(order, location);

  const locationAddress =
    getLocationAddress(order, location);

  const machineName =
    getMachineName(order, machine);

  const total =
    getTotal(order, items);

  const paymentStatus =
    getPaymentStatus(order);

  const orderStatus =
    getOrderStatus(order);

  const collectionCode =
    getCollectionCode(order);

  return (
    <main className="jr-content jr-page jr-confirmation-page">

      {/* =================================================
          SUCCESS ICON
         ================================================= */}

      <div className="jr-confirmation-success-icon">
        ✓
      </div>


      {/* =================================================
          HEADING
         ================================================= */}

      <header className="jr-confirmation-heading">

        <span className="jr-confirmation-eyebrow">
          ORDER SUCCESSFUL
        </span>

        <h1>
          Order
          <br />
          <em>confirmed!</em>
        </h1>

        <p>
          Payment successful. Your order is ready
          for collection at the selected Juice Robo.
        </p>

      </header>


      {/* =================================================
          ORDER NUMBER
         ================================================= */}

      <section className="jr-confirmation-order-number">

        <span>
          ORDER NUMBER
        </span>

        <strong>
          {orderNumber}
        </strong>

      </section>


      {/* =================================================
          COLLECTION LOCATION
         ================================================= */}

      <section className="jr-confirmation-location-card">

        <div className="jr-confirmation-card-icon">
          📍
        </div>

        <div className="jr-confirmation-location-copy">

          <small>
            COLLECT FROM
          </small>

          <strong>
            {locationName}
          </strong>

          <span>
            {locationAddress}
          </span>

          <span>
            Machine: {machineName}
          </span>

        </div>

      </section>


      {/* =================================================
          ORDER ITEMS
         ================================================= */}

      {items.length > 0 && (
        <section className="jr-confirmation-items-card">

          <div className="jr-confirmation-section-heading">

            <h2>
              YOUR ORDER
            </h2>

            <span>
              {items.reduce(
                (sum, item) =>
                  sum + getItemQuantity(item),
                0
              )} items
            </span>

          </div>

          <div className="jr-confirmation-items">

            {items.map((item, index) => (
              <div
                className="jr-confirmation-item"
                key={
                  item?.id ||
                  item?.productId ||
                  index
                }
              >

                <div className="jr-confirmation-item-name">

                  <strong>
                    {getItemName(item)}
                  </strong>

                  <span>
                    × {getItemQuantity(item)}
                  </span>

                </div>

                <strong>
                  {formatMoney(
                    getItemSubtotal(item),
                    money
                  )}
                </strong>

              </div>
            ))}

          </div>

        </section>
      )}


      {/* =================================================
          TOTAL
         ================================================= */}

      <section className="jr-confirmation-total-card">

        <span>
          TOTAL PAID
        </span>

        <strong>
          {formatMoney(total, money)}
        </strong>

      </section>


      {/* =================================================
          STATUS
         ================================================= */}

      <section className="jr-confirmation-status-card">

        <div>
          <span>
            PAYMENT
          </span>

          <strong className="jr-confirmation-paid">
            {paymentStatus}
          </strong>
        </div>

        <div>
          <span>
            ORDER
          </span>

          <strong>
            {orderStatus}
          </strong>
        </div>

      </section>


      {/* =================================================
          COLLECTION CODE
         ================================================= */}

      <section
        className={
          collectionCode
            ? "jr-collection-code-card jr-collection-code-active"
            : "jr-collection-code-card"
        }
      >

        <span className="jr-collection-code-eyebrow">
          YOUR 4-DIGIT COLLECTION CODE
        </span>

        <strong className="jr-collection-code-value">
          {collectionCode || "----"}
        </strong>

        <p>
          {collectionCode
            ? "Save this code. Enter it at your selected Juice Robo machine when you arrive."
            : "Your collection code will appear here once it is provided by the machine backend."}
        </p>

      </section>


      {/* =================================================
          ACTIONS
         ================================================= */}

      <button
        type="button"
        className="jr-confirmation-primary-button"
        onClick={onHome}
      >
        <span>
          BACK TO MENU
        </span>

        <strong>
          →
        </strong>

      </button>


      <button
        type="button"
        className="jr-confirmation-secondary-button"
        onClick={onHistory}
      >
        VIEW ORDER HISTORY
      </button>

    </main>
  );
}

import "./HistoryScreen.css";

/* =========================================================
   JUICE ROBO — HISTORY SCREEN
   ========================================================= */

export default function HistoryScreen({
  orders = [],
  onBack,
  onClear,
  money,
}) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  function formatDate(value) {
    if (!value) return "Recent order";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getOrderNumber(order, index) {
    return (
      order?.orderNumber ||
      order?.orderNo ||
      order?.order_no ||
      order?.order_id ||
      order?.orderId ||
      `#${String(index + 1).padStart(4, "0")}`
    );
  }

  function getStatus(order) {
    return (
      order?.status ||
      order?.orderStatus ||
      order?.order_status ||
      "Placed"
    );
  }

  function getTotal(order) {
    return Number(
      order?.total ??
        order?.grandTotal ??
        order?.grand_total ??
        order?.amount ??
        order?.totalAmount ??
        order?.total_amount ??
        0
    );
  }

  function getItems(order) {
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

  function getLocation(order) {
    return (
      order?.location?.name ||
      order?.locationName ||
      order?.location_name ||
      order?.collectionLocation ||
      order?.collection_location ||
      order?.storeName ||
      order?.store_name ||
      "Juice Robo location"
    );
  }

  function getItemName(item) {
    return (
      item?.displayName ||
      item?.name ||
      item?.productName ||
      item?.product_name ||
      item?.title ||
      "Sugarcane Juice"
    );
  }

  function getItemQuantity(item) {
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

  function formatMoney(value) {
    if (typeof money === "function") {
      return money(value);
    }

    return `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }

  return (
    <main className="jr-content jr-page jr-history-page">

      {/* =================================================
          BACK TO ACCOUNT
         ================================================= */}

      <button
        type="button"
        className="jr-history-back"
        onClick={onBack}
      >
        ← Back to account
      </button>


      {/* =================================================
          HEADER
         ================================================= */}

      <header className="jr-history-heading">

        <span className="jr-history-eyebrow">
          ORDER HISTORY
        </span>

        <div className="jr-history-title-row">
          <div>
            <h1>
              My orders.
            </h1>

            <p>
              View your previous Juice Robo orders.
            </p>
          </div>

          {safeOrders.length > 0 && (
            <button
              type="button"
              className="jr-history-clear"
              onClick={onClear}
              aria-label="Clear order history"
              title="Clear order history"
            >
              ×
            </button>
          )}
        </div>

      </header>


      {/* =================================================
          EMPTY HISTORY
         ================================================= */}

      {safeOrders.length === 0 ? (

        <section className="jr-history-empty">

          <div className="jr-history-empty-icon">
            <span>🧃</span>
          </div>

          <h2>
            No orders yet
          </h2>

          <p>
            Your Juice Robo orders will appear here after you
            <br className="jr-history-empty-break" />
            place an order.
          </p>

          <button
            type="button"
            className="jr-history-shop-button"
            onClick={onBack}
          >
            <span>BACK TO ACCOUNT</span>
            <strong>→</strong>
          </button>

        </section>

      ) : (

        /* =================================================
           ORDER LIST
           ================================================= */

        <section className="jr-history-list">

          {safeOrders.map((order, index) => {

            const orderNumber =
              getOrderNumber(order, index);

            const status =
              getStatus(order);

            const total =
              getTotal(order);

            const items =
              getItems(order);

            const date =
              order?.createdAt ||
              order?.created_at ||
              order?.orderDate ||
              order?.order_date ||
              order?.date;

            return (
              <article
                className="jr-history-card"
                key={
                  order?.id ||
                  order?.orderId ||
                  orderNumber ||
                  index
                }
              >

                <div className="jr-history-card-header">

                  <div className="jr-history-order-info">

                    <span>
                      ORDER
                    </span>

                    <strong>
                      {orderNumber}
                    </strong>

                  </div>

                  <span className="jr-history-status">
                    {status}
                  </span>

                </div>


                <div className="jr-history-date">
                  {formatDate(date)}
                </div>


                <div className="jr-history-location">
                  {getLocation(order)}
                </div>


                {items.length > 0 && (
                  <div className="jr-history-items">

                    {items.map((item, itemIndex) => (

                      <div
                        className="jr-history-item"
                        key={
                          item?.id ||
                          item?.productId ||
                          itemIndex
                        }
                      >
                        <span>
                          {getItemName(item)}
                          {" × "}
                          {getItemQuantity(item)}
                        </span>

                      </div>

                    ))}

                  </div>
                )}


                <div className="jr-history-total">

                  <span>
                    TOTAL
                  </span>

                  <strong>
                    {formatMoney(total)}
                  </strong>

                </div>

              </article>
            );
          })}

        </section>

      )}

    </main>
  );
}

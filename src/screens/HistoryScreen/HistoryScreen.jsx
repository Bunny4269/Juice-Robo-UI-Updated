import React, { useMemo, useState } from "react";
import "./HistoryScreen.css";

function text(value, fallback = "—") {
  const v = value == null ? "" : String(value).trim();
  return v || fallback;
}

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function orderTransaction(order = {}) {
  return text(
    order?.transactionId ??
      order?.transaction_id ??
      order?.transactionReference ??
      order?.transaction_reference
  );
}

function orderDate(order = {}) {
  return (
    order?.orderDate ??
    order?.order_date ??
    order?.createdAt ??
    order?.created_at ??
    order?.date ??
    null
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return text(value);

  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function orderStatus(order = {}) {
  return text(
    order?.orderStatus ??
      order?.order_status ??
      order?.paymentStatus ??
      order?.payment_status ??
      "—"
  );
}

function pickupCode(order = {}) {
  const raw =
    order?.orderPin ??
    order?.order_pin ??
    order?.collectionCode ??
    order?.collection_code ??
    "";

  const digits = String(raw).replace(/\D/g, "");
  return digits ? digits.slice(-4).padStart(4, "0") : "—";
}

export default function HistoryScreen({
  orders = [],
  onBack,
  onClear,
  money = (value) => `₹${Number(value || 0).toFixed(2)}`,
}) {
  const [expanded, setExpanded] = useState(0);

  const safeOrders = useMemo(
    () => (Array.isArray(orders) ? orders.filter(Boolean) : []),
    [orders]
  );

  return (
    <main className="jr-history-page">
      <button
        type="button"
        className="jr-history-back"
        onClick={onBack}
      >
        <span aria-hidden="true">←</span>
        Back to Profile
      </button>

      <div className="jr-history-title-row">
        <h1>My Orders</h1>
      </div>

      {safeOrders.length === 0 ? (
        <section className="jr-history-empty">
          <strong>No orders yet</strong>
          <span>Your completed orders will appear here.</span>
        </section>
      ) : (
        <section className="jr-history-list">
          {safeOrders.map((order, index) => {
            const isOpen = expanded === index;

            const status = orderStatus(order);
            const quantity = number(
              order?.orderQuantity ??
                order?.order_quantity ??
                order?.quantity ??
                order?.qty ??
                0
            );

            const gst = number(
              order?.cartGST ??
                order?.cart_gst ??
                order?.gst ??
                order?.gstAmount ??
                order?.gst_amount ??
                0
            );

            const total = number(
              order?.netBill ??
                order?.net_bill ??
                order?.totalAmount ??
                order?.total_amount ??
                order?.grossBill ??
                order?.gross_bill ??
                0
            );

            const explicitItemsTotal =
              order?.itemsTotal ??
              order?.items_total ??
              order?.itemTotal ??
              order?.item_total;

            const itemsTotal =
              explicitItemsTotal != null
                ? number(explicitItemsTotal)
                : Math.max(0, total - gst);

            return (
              <article
                className={`jr-order-card ${isOpen ? "is-open" : ""}`}
                key={
                  order?.orderId ??
                  order?.order_id ??
                  orderTransaction(order) ??
                  index
                }
              >
                <button
                  type="button"
                  className="jr-order-summary"
                  onClick={() =>
                    setExpanded(isOpen ? -1 : index)
                  }
                  aria-expanded={isOpen}
                >
                  <span className="jr-order-summary-copy">
                    <span className="jr-order-label">
                      Transaction Id #
                    </span>
                    <strong className="jr-order-transaction">
                      {orderTransaction(order)}
                    </strong>
                    <span className="jr-order-date">
                      {formatDate(orderDate(order))}
                    </span>
                  </span>

                  <span className="jr-order-summary-status">
                    <span className="jr-order-status">
                      {status}
                    </span>
                    <span className="jr-order-chevron" aria-hidden="true">
                      {isOpen ? "⌃" : "⌄"}
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="jr-order-details">
                    <div className="jr-order-row">
                      <span>Pickup Code</span>
                      <strong>{pickupCode(order)}</strong>
                    </div>

                    <div className="jr-order-row">
                      <span>Order Quantity</span>
                      <strong>{quantity || "—"}</strong>
                    </div>

                    <div className="jr-order-row">
                      <span>Items Total</span>
                      <strong>{money(itemsTotal)}</strong>
                    </div>

                    <div className="jr-order-row">
                      <span>GST</span>
                      <strong>{money(gst)}</strong>
                    </div>

                    <div className="jr-order-total">
                      <span>Total Amount</span>
                      <strong>{money(total)}</strong>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {safeOrders.length > 0 && typeof onClear === "function" && (
        <button
          type="button"
          className="jr-history-clear"
          onClick={onClear}
        >
          Clear Local History
        </button>
      )}
    </main>
  );
}

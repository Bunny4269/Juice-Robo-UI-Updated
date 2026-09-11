import {
  useEffect,
  useState,
} from "react";

import "./HistoryScreen.css";

/* =========================================================
   JUICE ROBO — HISTORY / MY ORDERS
   ========================================================= */

export default function HistoryScreen({
  orders = [],
  onBack,
  onClear,
  money,
}) {
  const safeOrders =
    Array.isArray(orders)
      ? orders.filter(Boolean)
      : [];

  /* =======================================================
     EXPANDED ORDER
     ======================================================= */

  const [
    expandedIndex,
    setExpandedIndex,
  ] = useState(
    safeOrders.length > 0
      ? 0
      : null
  );

  /* =======================================================
     KEEP FIRST ORDER OPEN WHEN ORDER DATA CHANGES
     ======================================================= */

  useEffect(() => {
    setExpandedIndex(
      safeOrders.length > 0
        ? 0
        : null
    );
  }, [
    safeOrders.length,
  ]);

  /* =======================================================
     MONEY
     ======================================================= */

  function formatMoney(value) {
    if (typeof money === "function") {
      return money(value);
    }

    const amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      return "₹0";
    }

    return `₹${amount.toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  /* =======================================================
     DATE / TIME
     ======================================================= */

  function formatDateTime(
    value
  ) {
    if (!value) {
      return "Recent order";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return String(value);
    }

    return `${date.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    )}, ${date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    )}`;
  }

  /* =======================================================
     ORDER FIELD HELPERS
     ======================================================= */

  function transactionId(
    order = {}
  ) {
    return (
      order?.transactionId ??
      order?.transaction_id ??
      order?.transactionReference ??
      order?.transaction_reference ??
      order?.orderId ??
      order?.order_id ??
      order?.id ??
      "—"
    );
  }

  function orderDate(
    order = {}
  ) {
    return (
      order?.orderDate ??
      order?.order_date ??
      order?.createdAt ??
      order?.created_at ??
      order?.date ??
      null
    );
  }

  function orderStatus(
    order = {}
  ) {
    return (
      order?.paymentStatus ??
      order?.payment_status ??
      order?.orderStatus ??
      order?.order_status ??
      order?.status ??
      "PENDING"
    );
  }

  function pickupCode(
    order = {}
  ) {
    const raw =
      order?.orderPin ??
      order?.order_pin ??
      order?.collectionCode ??
      order?.collection_code ??
      order?.pickupCode ??
      order?.pickup_code ??
      "";

    const value =
      String(raw).trim();

    return value || "—";
  }

  function statusClass(
    status
  ) {
    const value =
      String(status || "")
        .trim()
        .toUpperCase()
        .replace(
          /[\s-]+/g,
          "_"
        );

    if (
      [
        "SUCCESS",
        "SUCCESSFUL",
        "PAID",
        "PAYMENT_SUCCESS",
        "PAYMENT_SUCCESSFUL",
        "CAPTURED",
        "COMPLETED",
        "COMPLETE",
      ].includes(value)
    ) {
      return "success";
    }

    if (
      [
        "FAILED",
        "FAILURE",
        "DECLINED",
        "CANCELLED",
        "CANCELED",
        "REJECTED",
        "PAYMENT_FAILED",
        "PAYMENT_FAILURE",
        "TRANSACTION_FAILED",
        "TRANSACTION_FAILURE",
      ].includes(value)
    ) {
      return "failed";
    }

    if (
      [
        "PENDING",
        "PROCESSING",
        "INITIATED",
        "CREATED",
        "AWAITING_PAYMENT",
        "PAYMENT_PENDING",
        "PAYMENT_PROCESSING",
        "PENDING_PAYMENT",
      ].includes(value)
    ) {
      return "pending";
    }

    return "default";
  }

  function number(
    value
  ) {
    const amount =
      Number(value);

    return Number.isFinite(
      amount
    )
      ? amount
      : 0;
  }

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className="jr-history-page">

      {/* =================================================
          BACK
         ================================================= */}

      <button
        type="button"
        className="jr-history-back"
        onClick={onBack}
        aria-label="Back to Profile"
      >
        <span aria-hidden="true">
          ←
        </span>

        <span>
          Back to Profile
        </span>
      </button>


      {/* =================================================
          PAGE HEADER
         ================================================= */}

      <header className="jr-history-heading">

        <span className="jr-history-eyebrow">
          ORDER HISTORY
        </span>

        <div className="jr-history-title-row">

          <div>
            <h1>
              My Orders
            </h1>

            <p className="jr-history-subtitle">
              View and manage your order history
            </p>
          </div>

          {safeOrders.length > 0 && (
            <button
              type="button"
              className="jr-history-clear"
              onClick={onClear}
              aria-label="Clear history"
              title="Clear history"
            >
              Clear History
            </button>
          )}

        </div>

      </header>


      {/* =================================================
          ORDERS
          No search bar.
          No status filter.
          No date filter.
          No sort filter.
         ================================================= */}

      {safeOrders.length === 0 ? (

        <section className="jr-history-empty">

          <strong>
            No orders yet
          </strong>

          <span>
            Your completed orders will appear here.
          </span>

        </section>

      ) : (

        <section
          className="jr-history-list"
          aria-label="Order history"
        >

          {safeOrders.map(
            (
              order,
              index
            ) => {

              const isOpen =
                expandedIndex ===
                index;

              const status =
                orderStatus(
                  order
                );

              const statusType =
                statusClass(
                  status
                );

              const quantity =
                number(
                  order?.orderQuantity ??
                    order?.order_quantity ??
                    order?.quantity ??
                    order?.qty ??
                    0
                );

              const gst =
                number(
                  order?.cartGST ??
                    order?.cart_gst ??
                    order?.gst ??
                    order?.gstAmount ??
                    order?.gst_amount ??
                    0
                );

              const total =
                number(
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
                explicitItemsTotal !=
                  null
                  ? number(
                      explicitItemsTotal
                    )
                  : Math.max(
                      0,
                      total - gst
                    );

              const pickup =
                pickupCode(
                  order
                );

              const hasPickupCode =
                pickup !== "—";

              return (
                <article
                  className={`jr-order-card ${
                    isOpen
                      ? "is-open"
                      : ""
                  }`}
                  key={
                    order?.orderId ??
                    order?.order_id ??
                    order?.transactionId ??
                    order?.transaction_id ??
                    order?.id ??
                    index
                  }
                >

                  {/* =====================================
                      ORDER SUMMARY
                     ===================================== */}

                  <button
                    type="button"
                    className="jr-order-summary"
                    onClick={() =>
                      setExpandedIndex(
                        isOpen
                          ? null
                          : index
                      )
                    }
                    aria-expanded={
                      isOpen
                    }
                  >

                    <span className="jr-order-summary-copy">

                      <span className="jr-order-label">
                        Transaction Id #
                      </span>

                      <strong className="jr-order-transaction">
                        {transactionId(
                          order
                        )}
                      </strong>

                      <span className="jr-order-date">
                        {formatDateTime(
                          orderDate(
                            order
                          )
                        )}
                      </span>

                    </span>


                    <span className="jr-order-summary-status">

                      <span
                        className={`jr-order-status ${statusType}`}
                      >
                        {String(
                          status
                        )
                          .replace(
                            /_/g,
                            " "
                          )
                          .toUpperCase()}
                      </span>

                      <span
                        className="jr-order-chevron"
                        aria-hidden="true"
                      >
                        {isOpen
                          ? "⌃"
                          : "⌄"}
                      </span>

                    </span>

                  </button>


                  {/* =====================================
                      ORDER DETAILS
                     ===================================== */}

                  {isOpen && (

                    <div className="jr-order-details">

                      {hasPickupCode && (
                        <div className="jr-order-row">

                          <span>
                            Pickup Code
                          </span>

                          <strong>
                            {pickup}
                          </strong>

                        </div>
                      )}


                      <div className="jr-order-row">

                        <span>
                          Order Quantity
                        </span>

                        <strong>
                          {quantity || "—"}
                        </strong>

                      </div>


                      <div className="jr-order-row">

                        <span>
                          Items Total
                        </span>

                        <strong>
                          {formatMoney(
                            itemsTotal
                          )}
                        </strong>

                      </div>


                      <div className="jr-order-row">

                        <span>
                          GST
                        </span>

                        <strong>
                          {formatMoney(
                            gst
                          )}
                        </strong>

                      </div>


                      <div className="jr-order-total">

                        <span>
                          Total Amount
                        </span>

                        <strong>
                          {formatMoney(
                            total
                          )}
                        </strong>

                      </div>

                    </div>
                  )}

                </article>
              );
            }
          )}

        </section>
      )}

    </main>
  );
}

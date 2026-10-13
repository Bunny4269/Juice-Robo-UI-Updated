import {
  useEffect,
  useState,
} from "react";

import "./HistoryScreen.css";

/* =========================================================
   JUICE ROBO — HISTORY / MY ORDERS
   ========================================================= */

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function clean(value) {
  return String(value ?? "").trim();
}

/* =========================================================
   HISTORY SCREEN
   ========================================================= */

export default function HistoryScreen({
  orders = [],
  onBack,
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
     BACK TO PROFILE NAVIGATION

     App.jsx owns screen navigation. The history screen invokes
     its callback instead of hard-coding a URL or reloading the app.
     ======================================================= */

  function handleBackToProfile() {
    if (typeof onBack === "function") {
      onBack();
    }
  }

  /* =======================================================
     KEEP FIRST ORDER OPEN WHEN DATA CHANGES
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

  function formatDateTime(value) {
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
     ORDER ID / TRANSACTION ID
     ======================================================= */

  function getTransactionId(order = {}) {
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

  /* =======================================================
     ORDER DATE
     ======================================================= */

  function getOrderDate(order = {}) {
    return (
      order?.orderDate ??
      order?.order_date ??
      order?.createdAt ??
      order?.created_at ??
      order?.date ??
      null
    );
  }

  /* =======================================================
     COLLECTION / PICKUP CODE
     ======================================================= */

  function getPickupCode(order = {}) {
    const raw =
      order?.collectionCode ??
      order?.collection_code ??
      order?.pickupCode ??
      order?.pickup_code ??
      order?.collectionPin ??
      order?.collection_pin ??
      order?.orderPin ??
      order?.order_pin ??
      order?.data?.collectionCode ??
      order?.data?.collection_code ??
      order?.data?.pickupCode ??
      order?.data?.pickup_code ??
      order?.data?.collectionPin ??
      order?.data?.collection_pin ??
      order?.data?.orderPin ??
      order?.data?.order_pin ??
      order?.result?.collectionCode ??
      order?.result?.collection_code ??
      order?.result?.pickupCode ??
      order?.result?.pickup_code ??
      order?.result?.collectionPin ??
      order?.result?.collection_pin ??
      order?.result?.orderPin ??
      order?.result?.order_pin ??
      "";

    const value =
      clean(raw);

    return value || "—";
  }

  /* =======================================================
     VALID COLLECTION CODE
     ======================================================= */

  function hasValidPickupCode(order = {}) {
    const pickup =
      getPickupCode(order);

    return /^\d{4}$/.test(
      pickup
    );
  }

  /* =======================================================
     RAW PAYMENT STATUS
     ======================================================= */

  function getRawPaymentStatus(order = {}) {
    return clean(
      order?.paymentStatus ??
        order?.payment_status ??
        order?.paymentState ??
        order?.payment_state ??
        order?.transactionStatus ??
        order?.transaction_status ??
        order?.orderStatus ??
        order?.order_status ??
        order?.status ??
        order?.data?.paymentStatus ??
        order?.data?.payment_status ??
        order?.data?.paymentState ??
        order?.data?.payment_state ??
        order?.data?.transactionStatus ??
        order?.data?.transaction_status ??
        order?.data?.orderStatus ??
        order?.data?.order_status ??
        order?.data?.status ??
        order?.result?.paymentStatus ??
        order?.result?.payment_status ??
        order?.result?.paymentState ??
        order?.result?.payment_state ??
        order?.result?.transactionStatus ??
        order?.result?.transaction_status ??
        order?.result?.orderStatus ??
        order?.result?.order_status ??
        order?.result?.status ??
        ""
    );
  }

  /* =======================================================
     NORMALIZE PAYMENT STATUS
     
     IMPORTANT:
     A valid 4-digit collection code is issued by the
     Juice Robo order/payment flow. When it exists,
     the history card should not remain visually stuck
     at PENDING.
     ======================================================= */

  function getPaymentStatus(order = {}) {
    const rawStatus =
      getRawPaymentStatus(
        order
      );

    const normalized =
      rawStatus
        .toUpperCase()
        .replace(
          /[\s-]+/g,
          "_"
        );

    /*
     * Collection code takes priority.
     *
     * This prevents an order such as:
     *
     * paymentStatus = PENDING
     * pickupCode    = 5089
     *
     * from being displayed as PENDING.
     */
    if (
      hasValidPickupCode(
        order
      )
    ) {
      return "SUCCESSFUL";
    }

    /* =====================================================
       SUCCESS STATES
       ===================================================== */

    if (
      [
        "SUCCESS",
        "SUCCESSFUL",
        "SUCCEEDED",
        "PAID",
        "PAYMENT_SUCCESS",
        "PAYMENT_SUCCESSFUL",
        "PAYMENT_SUCCEEDED",
        "CAPTURED",
        "COMPLETED",
        "COMPLETE",
        "ORDER_SUCCESS",
        "ORDER_SUCCESSFUL",
        "ORDER_COMPLETED",
        "SUCCESSFULLY_PAID",
      ].includes(
        normalized
      )
    ) {
      return "SUCCESSFUL";
    }

    /* =====================================================
       FAILED STATES
       ===================================================== */

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
        "PAYMENT_DECLINED",
        "TRANSACTION_FAILED",
        "TRANSACTION_FAILURE",
        "ORDER_FAILED",
        "ORDER_CANCELLED",
        "ORDER_CANCELED",
      ].includes(
        normalized
      )
    ) {
      return "FAILED";
    }

    /* =====================================================
       PENDING STATES
       ===================================================== */

    if (
      [
        "",
        "PENDING",
        "PROCESSING",
        "INITIATED",
        "CREATED",
        "AWAITING_PAYMENT",
        "PAYMENT_PENDING",
        "PAYMENT_PROCESSING",
        "PENDING_PAYMENT",
      ].includes(
        normalized
      )
    ) {
      return "PENDING";
    }

    /*
     * Unknown backend states should not be treated as
     * successful. Keep them pending until the backend
     * explicitly confirms payment.
     */
    return "PENDING";
  }

  /* =======================================================
     STATUS CSS CLASS
     ======================================================= */

  function getStatusClass(status) {
    const normalized =
      clean(status)
        .toUpperCase()
        .replace(
          /[\s-]+/g,
          "_"
        );

    if (
      normalized ===
      "SUCCESSFUL"
    ) {
      return "success";
    }

    if (
      normalized ===
      "FAILED"
    ) {
      return "failed";
    }

    if (
      normalized ===
      "PENDING"
    ) {
      return "pending";
    }

    return "default";
  }

  /* =======================================================
     NUMBER
     ======================================================= */

  function number(value) {
    const amount =
      Number(value);

    return Number.isFinite(
      amount
    )
      ? amount
      : 0;
  }

  /* =======================================================
     ORDER QUANTITY
     ======================================================= */

  function getOrderQuantity(
    order = {}
  ) {
    return number(
      order?.orderQuantity ??
        order?.order_quantity ??
        order?.quantity ??
        order?.qty ??
        0
    );
  }

  /* =======================================================
     GST
     ======================================================= */

  function getGst(order = {}) {
    return number(
      order?.cartGST ??
        order?.cart_gst ??
        order?.gst ??
        order?.gstAmount ??
        order?.gst_amount ??
        0
    );
  }

  /* =======================================================
     TOTAL
     ======================================================= */

  function getTotal(order = {}) {
    return number(
      order?.netBill ??
        order?.net_bill ??
        order?.totalAmount ??
        order?.total_amount ??
        order?.grossBill ??
        order?.gross_bill ??
        order?.finalTotal ??
        order?.final_total ??
        order?.total ??
        0
    );
  }

  /* =======================================================
     ITEMS TOTAL
     ======================================================= */

  function getItemsTotal(
    order = {},
    total = 0,
    gst = 0
  ) {
    const explicitItemsTotal =
      order?.itemsTotal ??
      order?.items_total ??
      order?.itemTotal ??
      order?.item_total ??
      order?.subtotal ??
      order?.subTotal ??
      order?.taxableSubtotal ??
      order?.taxable_subtotal;

    if (
      explicitItemsTotal !=
        null &&
      Number.isFinite(
        Number(
          explicitItemsTotal
        )
      )
    ) {
      return number(
        explicitItemsTotal
      );
    }

    /*
     * Fallback:
     *
     * Total is GST-inclusive.
     *
     * We display the customer-facing item value
     * without adding GST on top.
     */
    return Math.max(
      0,
      total - gst
    );
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
        onClick={handleBackToProfile}
        aria-label="Back to Profile"
        title="Return to your profile"
      >
        <span className="jr-history-back-arrow" aria-hidden="true">
          ←
        </span>

        <span className="jr-history-back-label">
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

        </div>

      </header>


      {/* =================================================
          EMPTY STATE
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

        /* =================================================
           ORDER LIST
           ================================================= */

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

              /* =========================================
                 STATUS
                 ========================================= */

              const status =
                getPaymentStatus(
                  order
                );

              const statusType =
                getStatusClass(
                  status
                );

              /* =========================================
                 ORDER VALUES
                 ========================================= */

              const quantity =
                getOrderQuantity(
                  order
                );

              const gst =
                getGst(
                  order
                );

              const total =
                getTotal(
                  order
                );

              const itemsTotal =
                getItemsTotal(
                  order,
                  total,
                  gst
                );

              /* =========================================
                 PICKUP CODE
                 ========================================= */

              const pickup =
                getPickupCode(
                  order
                );

              const hasPickup =
                /^\d{4}$/.test(
                  pickup
                );

              /* =========================================
                 TRANSACTION
                 ========================================= */

              const transaction =
                getTransactionId(
                  order
                );

              /* =========================================
                 DATE
                 ========================================= */

              const date =
                getOrderDate(
                  order
                );

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
                      ORDER HEADER
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

                    {/* -----------------------------------
                        TRANSACTION INFO
                       ----------------------------------- */}

                    <span className="jr-order-summary-copy">

                      <span className="jr-order-label">
                        Transaction Id #
                      </span>

                      <strong className="jr-order-transaction">
                        {transaction}
                      </strong>

                      <span className="jr-order-date">
                        {formatDateTime(
                          date
                        )}
                      </span>

                    </span>


                    {/* -----------------------------------
                        STATUS
                       ----------------------------------- */}

                    <span className="jr-order-summary-status">

                      <span
                        className={`jr-order-status ${statusType}`}
                      >
                        {status}
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

                      {/* =================================
                          PICKUP CODE
                         ================================= */}

                      {hasPickup && (
                        <div className="jr-order-row">

                          <span>
                            Pickup Code
                          </span>

                          <strong>
                            {pickup}
                          </strong>

                        </div>
                      )}


                      {/* =================================
                          QUANTITY
                         ================================= */}

                      <div className="jr-order-row">

                        <span>
                          Order Quantity
                        </span>

                        <strong>
                          {quantity > 0
                            ? quantity
                            : "—"}
                        </strong>

                      </div>


                      {/* =================================
                          ITEMS TOTAL
                         ================================= */}

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


                      {/* =================================
                          GST
                         ================================= */}

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


                      {/* =================================
                          TOTAL
                         ================================= */}

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
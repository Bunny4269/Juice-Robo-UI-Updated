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
      ? orders
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
     HANDLE ORDER LIST CHANGES
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
    const amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      return "₹0.00";
    }

    return `₹${amount.toFixed(2)}`;
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
     PAYMENT STATUS CLASS
     ======================================================= */

  function getStatusClass(
    status
  ) {
    const value =
      String(
        status || ""
      )
        .trim()
        .toUpperCase();

    if (
      value.includes(
        "SUCCESS"
      )
    ) {
      return "success";
    }

    if (
      value.includes(
        "FAILED"
      )
    ) {
      return "failed";
    }

    if (
      value.includes(
        "PENDING"
      )
    ) {
      return "pending";
    }

    return "default";
  }


  /* =======================================================
     ACCORDION TOGGLE
     ======================================================= */

  function toggleOrder(
    index
  ) {
    setExpandedIndex(
      (currentIndex) => {
        if (
          currentIndex === index
        ) {
          return null;
        }

        return index;
      }
    );
  }


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main className="jr-history-page">

      {/* =================================================
          BACK TO PROFILE
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

      <header className="jr-history-header">
        <h1>
          My Orders
        </h1>
      </header>


      {/* =================================================
          EMPTY STATE
         ================================================= */}

      {safeOrders.length === 0 ? (

        <section className="jr-history-empty">

          <div className="jr-history-empty-icon">
            <span>
              🧃
            </span>
          </div>

          <h2>
            No orders yet
          </h2>

          <p>
            Your Juice Robo orders
            will appear here after
            you place an order.
          </p>

          <button
            type="button"
            className="jr-history-shop-button"
            onClick={onBack}
          >
            BACK TO PROFILE

            <span>
              →
            </span>
          </button>

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

              /* ===========================================
                 API FIELD MAPPING
                 =========================================== */

              const pickupCode =
                order?.orderPin;

              const transactionId =
                order?.transactionId;

              const orderDate =
                order?.orderDate;

              const orderQuantity =
                Number(
                  order?.orderQuantity ??
                    0
                );

              const itemsTotal =
                Number(
                  order?.grossBill ??
                    0
                );

              const gst =
                Number(
                  order?.cartGST ??
                    0
                );

              const totalAmount =
                Number(
                  order?.netBill ??
                    0
                );

              const paymentStatus =
                String(
                  order?.orderStatus ||
                    order?.paymentStatus ||
                    "PAYMENT-PENDING"
                )
                  .trim()
                  .toUpperCase();

              const isExpanded =
                expandedIndex ===
                index;

              const hasPickupCode =
                pickupCode !== null &&
                pickupCode !== undefined &&
                String(
                  pickupCode
                ).trim() !== "";


              return (
                <article
                  key={
                    order?.orderId ||
                    order?.transactionId ||
                    index
                  }
                  className={
                    `jr-history-card ${
                      isExpanded
                        ? "is-expanded"
                        : ""
                    }`
                  }
                >

                  {/* =====================================
                      CARD HEADER / TRIGGER
                     ===================================== */}

                  <button
                    type="button"
                    className="jr-history-card-trigger"
                    onClick={() =>
                      toggleOrder(
                        index
                      )
                    }
                    aria-expanded={
                      isExpanded
                    }
                    aria-controls={
                      `jr-history-details-${index}`
                    }
                  >

                    <div className="jr-history-card-main">

                      {/* =================================
                          TRANSACTION + STATUS
                         ================================= */}

                      <div className="jr-history-transaction-row">

                        <div className="jr-history-transaction">

                          <span className="jr-history-label">
                            Transaction Id #
                          </span>

                          <strong>
                            {transactionId ||
                              "—"}
                          </strong>

                        </div>


                        {/* PAYMENT STATUS */}

                        <span
                          className={
                            `jr-history-status ${getStatusClass(
                              paymentStatus
                            )}`
                          }
                        >
                          {paymentStatus}
                        </span>

                      </div>


                      {/* =================================
                          DATE
                         ================================= */}

                      <div className="jr-history-date">
                        {formatDateTime(
                          orderDate
                        )}
                      </div>

                    </div>


                    {/* =====================================
                        CHEVRON
                       ===================================== */}

                    <span
                      className={
                        `jr-history-chevron ${
                          isExpanded
                            ? "expanded"
                            : ""
                        }`
                      }
                      aria-hidden="true"
                    >
                      ⌄
                    </span>

                  </button>


                  {/* =====================================
                      EXPANDED DETAILS
                     ===================================== */}

                  {isExpanded && (

                    <div
                      id={
                        `jr-history-details-${index}`
                      }
                      className="jr-history-details"
                    >

                      {/* =================================
                          PICKUP CODE
                          
                          IMPORTANT:
                          Only shown when this specific
                          transaction is expanded.
                         ================================= */}

                      {hasPickupCode && (
                        <div className="jr-history-detail-row jr-history-pickup-row">

                          <span>
                            Pickup Code
                          </span>

                          <strong className="jr-history-pickup-code">
                            {pickupCode}
                          </strong>

                        </div>
                      )}


                      {/* =================================
                          ORDER QUANTITY
                         ================================= */}

                      <div className="jr-history-detail-row">

                        <span>
                          Order Quantity
                        </span>

                        <strong>
                          {orderQuantity}
                        </strong>

                      </div>


                      {/* =================================
                          ITEMS TOTAL
                         ================================= */}

                      <div className="jr-history-detail-row">

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

                      <div className="jr-history-detail-row">

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
                          TOTAL AMOUNT
                         ================================= */}

                      <div className="jr-history-detail-total">

                        <span>
                          Total Amount
                        </span>

                        <strong>
                          {formatMoney(
                            totalAmount
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
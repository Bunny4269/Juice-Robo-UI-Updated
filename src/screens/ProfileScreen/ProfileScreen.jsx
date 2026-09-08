import React from "react";
import "./ProfileScreen.css";

/* =========================================================
   JUICE ROBO — PROFILE SCREEN
   ========================================================= */

export default function ProfileScreen({
  user,
  customer,
  orders = [],
  onLogout,
  onBack,
  busy = false,
  onOrders,
}) {
  /* =======================================================
     SAFE DATA NORMALIZATION
     ======================================================= */

  const safeOrders = Array.isArray(orders) ? orders : [];

  /* =======================================================
     USER NAME
     ======================================================= */

  const rawName =
    user?.name ??
    user?.firstname ??
    customer?.name ??
    "";

  const name =
    String(rawName).trim() || "Juice Lover";

  /* =======================================================
     FIRST NAME
     ======================================================= */

  const firstName =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] || "Juice";

  /* =======================================================
     INITIALS
     ======================================================= */

  const initial = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "JL";

  /* =======================================================
     CONTACT / ACCOUNT DETAIL
     ======================================================= */

  const contact =
    user?.email ??
    user?.phone ??
    customer?.email ??
    customer?.phone ??
    "";

  const contactText =
    String(contact).trim() || "Juice Robo member";

  /* =======================================================
     ORDER COUNT
     ======================================================= */

  const orderCount = safeOrders.length;

  const orderLabel =
    `${orderCount} saved order${orderCount === 1 ? "" : "s"}`;


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <main
      className="jr-content jr-page jr-profile-page"
      data-theme="light"
      aria-label="Profile"
    >

      {/* ===================================================
          BACK TO MENU
         =================================================== */}

      <button
        className="jr-back-link"
        type="button"
        onClick={onBack}
        disabled={busy}
        aria-label="Back to menu"
      >
        <span aria-hidden="true">←</span>
        <span>&nbsp;Back to menu</span>
      </button>


      {/* ===================================================
          PAGE INTRO
         =================================================== */}

      <div className="jr-profile-heading">

        <span className="jr-eyebrow">
          Your account
        </span>

        <h1 className="jr-page-title">
          Hello,
          <br />
          <em>{firstName}.</em>
        </h1>

      </div>


      {/* ===================================================
          PROFILE IDENTITY
         =================================================== */}

      <section
        className="jr-profile-hero"
        aria-label="Account information"
      >

        <div
          className="jr-profile-avatar"
          aria-hidden="true"
        >
          {initial}
        </div>

        <div className="jr-profile-identity">

          <strong
            className="jr-profile-name"
            title={name}
          >
            {name}
          </strong>

          <small
            className="jr-profile-contact"
            title={contactText}
          >
            {contactText}
          </small>

        </div>

      </section>


      {/* ===================================================
          ACCOUNT ACTIONS
         =================================================== */}

      <section
        className="jr-profile-actions"
        aria-label="Account actions"
      >

        {/* =================================================
            MY ORDERS
           ================================================= */}

        <button
          className="jr-account-action"
          type="button"
          onClick={onOrders}
          disabled={busy}
          aria-label={`My orders. ${orderLabel}`}
        >

          <span
            className="jr-account-action-icon"
            aria-hidden="true"
          >
            ▣
          </span>

          <div className="jr-account-action-content">

            <strong>
              My orders
            </strong>

            <small>
              {orderLabel}
            </small>

          </div>

          <b
            className="jr-account-action-arrow"
            aria-hidden="true"
          >
            →
          </b>

        </button>


        {/* =================================================
            LOGOUT
           ================================================= */}

        <button
          className="
            jr-account-action
            jr-account-action-danger
          "
          type="button"
          onClick={onLogout}
          disabled={busy}
          aria-label="Logout"
        >

          <span
            className="jr-account-action-icon"
            aria-hidden="true"
          >
            ↪
          </span>

          <div className="jr-account-action-content">

            <strong>
              Logout
            </strong>

          </div>

        </button>

      </section>

    </main>
  );
}
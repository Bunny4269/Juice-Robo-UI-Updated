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
     USER DISPLAY DATA
     ======================================================= */

  const name =
    user?.name ||
    user?.firstname ||
    customer?.name ||
    "Juice Lover";

  const firstName =
    String(name)
      .trim()
      .split(/\s+/)[0] || "Juice";

  const initial =
    String(name)
      .trim()
      .split(/\s+/)
      .map((part) => part?.[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <main
      className="jr-content jr-page jr-profile-page"
      data-theme="light"
      style={{
        background: "#fbfaf3",
        color: "#151515",
        colorScheme: "light",
      }}
    >
      {/* ===================================================
          BACK
         =================================================== */}

      <button
        className="jr-back-link"
        onClick={onBack}
        type="button"
        disabled={busy}
      >
        ← Back to menu
      </button>

      {/* ===================================================
          ACCOUNT HEADING
         =================================================== */}

      <span className="jr-eyebrow">
        YOUR ACCOUNT
      </span>

      <h1 className="jr-page-title">
        Hello,
        <br />
        <em>{firstName}.</em>
      </h1>

      {/* ===================================================
          PROFILE HERO
         =================================================== */}

      <section className="jr-profile-hero">
        <div className="jr-profile-avatar">
          {initial}
        </div>

        <div>
          <strong>{name}</strong>

          <small>
            {user?.email ||
              user?.phone ||
              customer?.email ||
              customer?.phone ||
              "Juice Robo member"}
          </small>
        </div>
      </section>

      {/* ===================================================
          PROFILE ACTIONS
         =================================================== */}

      <section className="jr-profile-actions">
        {/* =================================================
            RECENT ORDERS
           ================================================= */}

        <button
          className="jr-account-action"
          type="button"
          onClick={onOrders}
          disabled={busy}
          aria-label="Recent orders"
        >
          <span aria-hidden="true">▣</span>

          <div>
            <strong>Recent orders</strong>
            <small>View your previous orders</small>
          </div>

          <b aria-hidden="true">→</b>
        </button>

        {/* =================================================
            LOGOUT
           ================================================= */}

        <button
          className="jr-account-action jr-account-action-danger"
          type="button"
          onClick={onLogout}
          disabled={busy}
          aria-label="Logout"
        >
          <span
            className="jr-logout-action-icon"
            aria-hidden="true"
          >
            ↪
          </span>

          <div>
            <strong>Logout</strong>
            <small>Sign out of your Juice Robo account</small>
          </div>

          <b aria-hidden="true">→</b>
        </button>
      </section>
    </main>
  );
}

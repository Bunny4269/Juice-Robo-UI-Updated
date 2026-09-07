import React, { useState } from "react";
import "./ProfileScreen.css";

/* =========================================================
   JUICE ROBO — PROFILE SCREEN
   ========================================================= */

export default function ProfileScreen({
  user,
  customer,
  setCustomer,
  orders = [],
  onSave,
  onLogout,
  onBack,
  busy,
  error,
  onOrders,
}) {
  /* =======================================================
     EDIT ACCOUNT DROPDOWN
     ======================================================= */

  const [isEditing, setIsEditing] = useState(false);

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

  /* =======================================================
     UPDATE CUSTOMER
     ======================================================= */

  function update(field, value) {
    setCustomer((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /* =======================================================
     TOGGLE EDIT ACCOUNT
     ======================================================= */

  function toggleEditAccount() {
    if (busy) {
      return;
    }

    setIsEditing((current) => !current);
  }

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

          <strong>
            {name}
          </strong>

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
          EDIT ACCOUNT DROPDOWN
         =================================================== */}

      <section
        className={
          isEditing
            ? "jr-account-card jr-account-card-open"
            : "jr-account-card"
        }
      >

        {/* =================================================
            DROPDOWN HEADER
           ================================================= */}

        <button
          className="jr-account-card-heading jr-account-edit-toggle"
          type="button"
          onClick={toggleEditAccount}
          aria-expanded={isEditing}
          disabled={busy}
        >

          <div>

            <span className="jr-eyebrow">
              PROFILE
            </span>

            <strong>
              Edit account details
            </strong>

            <small>
              {isEditing
                ? "Update your account information"
                : "Tap to edit your account information"}
            </small>

          </div>


          {/* =================================================
              ARROW
             ================================================= */}

          <span
            className={
              isEditing
                ? "jr-account-chevron jr-account-chevron-open"
                : "jr-account-chevron"
            }
            aria-hidden="true"
          >
            ↓
          </span>

        </button>


        {/* =================================================
            EDIT FORM
           ================================================= */}

        {isEditing && (
          <div className="jr-account-edit-panel">

            <form
              className="jr-form"
              onSubmit={onSave}
            >

              {/* =========================================
                  FULL NAME
                 ========================================= */}

              <label>
                FULL NAME

                <input
                  type="text"
                  value={
                    customer?.name || ""
                  }
                  onChange={(event) =>
                    update(
                      "name",
                      event.target.value
                    )
                  }
                  autoComplete="name"
                  disabled={busy}
                />
              </label>


              {/* =========================================
                  EMAIL
                 ========================================= */}

              <label>
                EMAIL

                <input
                  type="email"
                  value={
                    customer?.email ||
                    user?.email ||
                    ""
                  }
                  onChange={(event) =>
                    update(
                      "email",
                      event.target.value
                    )
                  }
                  autoComplete="email"
                  disabled={busy}
                />
              </label>


              {/* =========================================
                  ERROR
                 ========================================= */}

              {error && (
                <div className="jr-form-error">
                  {error}
                </div>
              )}


              {/* =========================================
                  SAVE
                 ========================================= */}

              <button
                className="jr-button jr-button-primary jr-full"
                type="submit"
                disabled={busy}
              >

                {busy
                  ? "SAVING..."
                  : "SAVE PROFILE"}

                {!busy && (
                  <span>
                    →
                  </span>
                )}

              </button>

            </form>

          </div>
        )}

      </section>


      {/* ===================================================
          MY ORDERS
         =================================================== */}

      <button
        className="jr-account-action"
        type="button"
        onClick={onOrders}
        disabled={busy}
      >

        <span>
          ▣
        </span>

        <div>

          <strong>
            My orders
          </strong>

          <small>
            {orders.length} saved order
            {orders.length === 1
              ? ""
              : "s"}
          </small>

        </div>

        <b>
          →
        </b>

      </button>


      {/* ===================================================
          SIGN OUT
         =================================================== */}

      <button
        className="jr-account-action jr-account-action-danger"
        type="button"
        onClick={onLogout}
        disabled={busy}
      >

        <span>
          ↪
        </span>

        <div>

          <strong>
            Sign out
          </strong>

          <small>
            Sign out of this Juice Robo account
          </small>

        </div>

        <b>
          →
        </b>

      </button>

    </main>
  );
}
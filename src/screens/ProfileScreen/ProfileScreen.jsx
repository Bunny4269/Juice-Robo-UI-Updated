import React, { useMemo } from "react";
import "./ProfileScreen.css";

/*
 * JUICE ROBO — PROFILE SCREEN
 *
 * Name handling:
 *   pratap.pattabhi@gmail.com
 *        -> Pratap Pattabhi
 *
 * The login email is used to derive the name when the backend
 * does not provide a real profile name.
 *
 * Phone number has intentionally been removed from the UI.
 */

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function isGenericName(value) {
  const normalized = clean(value).toLowerCase();

  return (
    !normalized ||
    normalized === "juice lover" ||
    normalized === "guest user" ||
    normalized === "guest"
  );
}

function nameFromEmail(email) {
  const normalizedEmail = clean(email).toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return "";
  }

  const localPart = normalizedEmail
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!localPart) {
    return "";
  }

  return localPart
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

function getEmail(user, customer) {
  return (
    clean(user?.email) ||
    clean(user?.userEmail) ||
    clean(user?.username) ||
    clean(customer?.email) ||
    clean(customer?.userEmail) ||
    clean(customer?.loginIdentifier)
  );
}

/*
 * Email-derived name is deliberately preferred when the
 * backend has no useful name or still contains the generic
 * "Juice Lover" value.
 */
function getDisplayName(user, customer) {
  const email = getEmail(user, customer);

  const backendName =
    clean(user?.name) ||
    clean(user?.fullName) ||
    [
      clean(user?.firstName),
      clean(user?.lastName),
    ]
      .filter(Boolean)
      .join(" ") ||
    clean(user?.firstname) ||
    clean(customer?.fullName) ||
    clean(customer?.name);

  if (!isGenericName(backendName)) {
    return backendName;
  }

  return nameFromEmail(email) || "Juice Lover";
}

function getInitials(name) {
  const value = clean(name);

  if (!value) {
    return "JL";
  }

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

export default function ProfileScreen({
  user,
  customer,
  setCustomer,
  onSave,
  onLogout,
  onSignOut,
  onBack,
  busy = false,
  error = "",
  onOrders,
  onHistory,
}) {
  const email = useMemo(
    () => getEmail(user, customer),
    [user, customer]
  );

  const displayName = useMemo(
    () => getDisplayName(user, customer),
    [user, customer]
  );

  const firstName =
    clean(displayName)
      .split(/\s+/)
      .filter(Boolean)[0] || "Juice";

  const initials = getInitials(displayName);

  /*
   * IMPORTANT:
   * Full name is derived from the login email whenever the
   * current stored profile name is the generic "Juice Lover".
   *
   * Therefore the field will show:
   *   Pratap Pattabhi
   * instead of:
   *   Juice Lover
   */
  const fullName =
    !isGenericName(customer?.name)
      ? clean(customer?.name)
      : displayName;

  function update(field, value) {
    if (typeof setCustomer !== "function") {
      return;
    }

    setCustomer((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  function handleBack() {
    if (typeof onBack === "function") {
      onBack();
    }
  }

  function handleOrders() {
    const handler =
      typeof onOrders === "function"
        ? onOrders
        : onHistory;

    if (typeof handler === "function") {
      handler();
    }
  }

  function handleLogout() {
    const handler =
      typeof onLogout === "function"
        ? onLogout
        : onSignOut;

    if (typeof handler === "function") {
      handler();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    /*
     * Save the email-derived name into customer.name when the
     * current profile name is still generic. This prevents the
     * old "Juice Lover" value from being submitted again.
     */
    if (
      typeof setCustomer === "function" &&
      displayName &&
      isGenericName(customer?.name)
    ) {
      setCustomer((current) => ({
        ...(current || {}),
        name: displayName,
      }));
    }

    if (typeof onSave === "function") {
      onSave(event);
    }
  }

  return (
    <main
      className="jr-content jr-page jr-profile-page"
      data-theme="light"
    >
      <div className="jr-profile-main">

        {/* BACK */}

        <button
          className="jr-profile-back"
          type="button"
          onClick={handleBack}
          disabled={busy}
        >
          <span aria-hidden="true">←</span>
          <span>Back to menu</span>
        </button>

        {/* ACCOUNT HEADING */}

        <header className="jr-profile-heading">
          <span className="jr-profile-eyebrow">
            YOUR ACCOUNT
          </span>

          <h1 className="jr-profile-title">
            <span>Hello,</span>
            <em>{firstName}.</em>
          </h1>
        </header>

        {/* USER SUMMARY */}

        <section
          className="jr-profile-user-card"
          aria-label="Account information"
        >
          <div className="jr-profile-avatar">
            {initials}
          </div>

          <div className="jr-profile-user-copy">
            <strong>{displayName}</strong>

            <small>
              {email || "Juice Robo member"}
            </small>
          </div>
        </section>

        {/* PROFILE */}

        <section className="jr-profile-form-card">
          <div className="jr-profile-form-heading">
            <span className="jr-profile-eyebrow">
              PROFILE
            </span>

            <strong>Your details</strong>
          </div>

          <form
            className="jr-profile-form"
            onSubmit={handleSubmit}
          >
            {/* FULL NAME */}

            <label className="jr-profile-field">
              <span>FULL NAME</span>

              <input
                type="text"
                value={fullName}
                onChange={(event) =>
                  update(
                    "name",
                    event.target.value
                  )
                }
                autoComplete="name"
                placeholder="Your full name"
              />
            </label>

            {/* EMAIL */}

            <label className="jr-profile-field">
              <span>EMAIL</span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  update(
                    "email",
                    event.target.value
                  )
                }
                autoComplete="email"
                placeholder="Email address"
              />
            </label>

            {clean(error) && (
              <div
                className="jr-profile-form-error"
                role="alert"
              >
                {clean(error)}
              </div>
            )}

            <button
              className="jr-profile-save"
              type="submit"
              disabled={busy}
            >
              <span>
                {busy ? "SAVING..." : "SAVE PROFILE"}
              </span>

              {!busy && (
                <span aria-hidden="true">→</span>
              )}
            </button>
          </form>
        </section>

        {/* ORDERS */}

        <button
          className="jr-profile-orders-button"
          type="button"
          onClick={handleOrders}
          disabled={busy}
        >
          <span className="jr-profile-orders-icon">
            <svg
              className="jr-profile-orders-svg"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="5"
                y="3"
                width="14"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M8 8h8M8 12h8M8 16h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>

          <span className="jr-profile-orders-copy">
            <strong>My orders</strong>
            <small>View your previous orders</small>
          </span>

          <span
            className="jr-profile-orders-arrow"
            aria-hidden="true"
          >
            →
          </span>
        </button>
      </div>

      {/* LOGOUT */}

      <button
        className="jr-profile-logout"
        type="button"
        onClick={handleLogout}
        disabled={busy}
      >
        <span className="jr-profile-logout-icon">
          <svg
            className="jr-profile-logout-svg"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 5H6.8A1.8 1.8 0 0 0 5 6.8v10.4A1.8 1.8 0 0 0 6.8 19H10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M14 8l4 4-4 4M18 12H9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="jr-profile-logout-text">
          Logout
        </span>
      </button>
    </main>
  );
}

import React, { useEffect } from "react";
import "./ProfileScreen.css";

/*
 * JUICE ROBO — PROFILE SCREEN
 *
 * Email handling:
 * Supports the different fields the legacy login flow may use
 * to store the signed-in email, including username and
 * loginIdentifier.
 *
 * Display name:
 * Uses the saved account name first. If it is unavailable or
 * generic, derives a readable name from the login email.
 */

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}


function getEmail(user, customer) {
  const candidates = [
    user?.email,
    user?.userEmail,
    user?.userName,
    user?.username,
    user?.loginIdentifier,
    customer?.email,
    customer?.userEmail,
    customer?.userName,
    customer?.username,
    customer?.loginIdentifier,
  ];

  return candidates.map(clean).find(Boolean) || "";
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

  if (!normalizedEmail.includes("@")) {
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

function getDisplayName(user, customer, email) {
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

  return nameFromEmail(email) || backendName || "Juice Lover";
}

export default function ProfileScreen({
  user,
  customer,
  setCustomer,
  orders = [],
  onSave,
  onLogout,
  onBack,
  busy = false,
  error = "",
  onOrders,
}) {
  const email = getEmail(user, customer);
  useEffect(() => {
    const currentEmail = clean(customer?.email);

    if (
      email &&
      currentEmail !== email &&
      typeof setCustomer === "function"
    ) {
      setCustomer((current) => ({
        ...(current || {}),
        email: clean(current?.email) || email,
      }));
    }
  }, [email, customer?.email, setCustomer]);
  const name = getDisplayName(user, customer, email);

  const firstName =
    name.split(/\s+/).filter(Boolean)[0] || "Juice";

  const initial = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function update(field, value) {
    if (typeof setCustomer !== "function") {
      return;
    }

    setCustomer((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    if (typeof onSave === "function") {
      onSave(event);
    } else {
      event.preventDefault();
    }
  }

  return (
    <main
      className="jr-content jr-page jr-profile-page"
      data-theme="light"
    >
      <button
        className="jr-back-link"
        onClick={onBack}
        type="button"
        disabled={busy}
      >
        ← Back to menu
      </button>

      <span className="jr-eyebrow">
        YOUR ACCOUNT
      </span>

      <h1 className="jr-page-title">
        Hello,
        <br />
        <em>{firstName}.</em>
      </h1>

      <section className="jr-profile-hero">
        <div className="jr-profile-avatar">
          {initial}
        </div>

        <div>
          <strong>{name}</strong>
          <small>
            {email || user?.phone || "Juice Robo member"}
          </small>
        </div>
      </section>

      <section className="jr-account-card">
        <div className="jr-account-card-heading">
          <div>
            <span className="jr-eyebrow">
              PROFILE
            </span>
            <strong>Your details</strong>
          </div>
        </div>

        <form
          className="jr-form"
          onSubmit={handleSubmit}
        >
          <label>
            FULL NAME
            <input
              type="text"
              value={clean(customer?.name) || name || ""}
              onChange={(event) =>
                update("name", event.target.value)
              }
              autoComplete="name"
              placeholder="Your full name"
            />
          </label>

          <label>
            EMAIL
            <input
              type="email"
              value={clean(customer?.email) || email || ""}
              onChange={(event) =>
                update("email", event.target.value)
              }
              autoComplete="email"
              placeholder="Email address"
            />
          </label>

          {error && (
            <div className="jr-form-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="jr-button jr-button-primary jr-full"
            type="submit"
            disabled={busy}
          >
            {busy ? "SAVING..." : "SAVE PROFILE"}
            {!busy && <span aria-hidden="true">→</span>}
          </button>
        </form>
      </section>

      <button
        className="jr-account-action"
        type="button"
        onClick={onOrders}
        disabled={busy}
      >
        <span aria-hidden="true">▣</span>
        <div>
          <strong>My orders</strong>
          <small>
            {orders.length} saved order
            {orders.length === 1 ? "" : "s"}
          </small>
        </div>
        <b aria-hidden="true">→</b>
      </button>

      <button
        className="jr-account-action jr-account-action-danger"
        type="button"
        onClick={onLogout}
        disabled={busy}
      >
        <span aria-hidden="true">↪</span>
        <div>
          <strong>Sign out</strong>
          <small>Sign out of this Juice Robo account</small>
        </div>
        <b aria-hidden="true">→</b>
      </button>
    </main>
  );
}

import React, { useEffect, useState } from "react";
import api from "../../api";
import "./ProfileScreen.css";
import {
  clean,
  isGenericName,
  nameFromEmail,
  getEmail,
  getDisplayName,
  getPhone,
} from "./profileUtils";

export {
  clean,
  isGenericName,
  nameFromEmail,
  getEmail,
  getDisplayName,
  getPhone,
};

/*
 * JUICE ROBO — PROFILE SCREEN (READ-ONLY)
 *
 * Requirements:
 * 1. Display customer information:
 *    - Full name and registered email address for the logged-in user.
 *    - Fetched and displayed using existing account/session data and backend API.
 * 2. Make profile details read-only:
 *    - Non-editable profile card.
 *    - No editable input fields, no Save Profile button.
 * 3. Preserve existing functionality:
 *    - Juice Robo branding, colors, spacing, responsive layout.
 *    - My Orders and Sign Out actions intact.
 * 4. Handle UI states:
 *    - Loading state while fetching if info is not yet available.
 *    - Fallback / error state if data cannot be retrieved.
 *    - Never display hardcoded sample customer info or another user's details.
 */

export default function ProfileScreen({
  user,
  customer,
  setCustomer,
  orders = [],
  onSave, // Kept for backwards compatibility
  onLogout,
  onSignOut,
  onBack,
  busy = false,
  error = "",
  onOrders,
  onHistory,
  api: apiProp,
}) {
  const clientApi = apiProp || api;

  // Resolve initial data from existing session/account props
  const initialEmail = getEmail(user, customer, null);
  const initialName = getDisplayName(user, customer, initialEmail, null);
  const initialPhone = getPhone(user, customer, null);
  const hasInitialInfo = Boolean(initialName || initialEmail || initialPhone);

  const [profileData, setProfileData] = useState(null);
  // Only show full loading spinner if we don't already have account/session data
  const [loading, setLoading] = useState(() => !hasInitialInfo);
  const [fetchError, setFetchError] = useState("");

  const handleLogout = onLogout || onSignOut;
  const handleOrders = onOrders || onHistory;

  useEffect(() => {
    let mounted = true;

    async function loadLatestProfile() {
      if (!clientApi || typeof clientApi.profile !== "function") {
        if (mounted) setLoading(false);
        return;
      }

      try {
        // Enforce a 2.5-second timeout so the UI never hangs indefinitely on slow/unreachable network
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Profile request timeout")), 2500)
        );
        const fetchPromise = clientApi.profile();
        const result = await Promise.race([fetchPromise, timeoutPromise]);

        if (mounted && result && typeof result === "object") {
          setProfileData(result);
        }
      } catch (err) {
        if (mounted) {
          console.warn("[Juice Robo] Profile fetch note:", err?.message || err);
          if (!hasInitialInfo) {
            setFetchError("Unable to retrieve profile details.");
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadLatestProfile();

    return () => {
      mounted = false;
    };
  }, [clientApi, user?.id, user?.email]);

  const email = getEmail(user, customer, profileData);
  const name = getDisplayName(user, customer, email, profileData);
  const phone = getPhone(user, customer, profileData);
  const hasCustomerInfo = Boolean(name || email || phone);

  const firstName =
    name.split(/\s+/).filter(Boolean)[0] ||
    (email ? nameFromEmail(email).split(/\s+/)[0] : "") ||
    "there";

  const initial =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    (email ? email.charAt(0).toUpperCase() : "JR");

  return (
    <main
      className="jr-content jr-page jr-profile-page"
      data-theme="light"
    >
      {onBack && (
        <button
          className="jr-back-link"
          onClick={onBack}
          type="button"
          disabled={busy}
          aria-label="Back to menu"
        >
          ← Back to menu
        </button>
      )}

      <span className="jr-eyebrow">YOUR ACCOUNT</span>

      <h1 className="jr-page-title">
        Hello,
        <br />
        <em>{firstName}.</em>
      </h1>

      {/* Hero Section */}
      <section className="jr-profile-hero" aria-label="Customer profile summary">
        <div className="jr-profile-avatar" aria-hidden="true">
          {initial}
        </div>

        <div>
          <strong>{name || "Juice Robo Member"}</strong>
          <small>
            {email || phone || "Signed in"}
          </small>
        </div>
      </section>

      {/* Profile Details Card */}
      <section className="jr-account-card" aria-label="Account details">
        <div className="jr-account-card-heading">
          <div>
            <span className="jr-eyebrow">PROFILE DETAILS</span>
            <strong>Your details</strong>
          </div>
          <span className="jr-profile-badge" title="Profile details are verified and read-only">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Read-only
          </span>
        </div>

        {error && (
          <div className="jr-profile-notice" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Priority 1: If customer details are available (from session or API), render read-only card immediately */}
        {hasCustomerInfo ? (
          <div className="jr-profile-details-list">
            <div className="jr-profile-readonly-item">
              <span className="jr-profile-label">FULL NAME</span>
              <div className="jr-profile-value-box">
                <div className="jr-profile-value-icon" aria-hidden="true">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="jr-profile-value-content">
                  <span className="jr-profile-value">
                    {name || "Not provided"}
                  </span>
                  <span className="jr-profile-value-hint">
                    Registered name
                  </span>
                </div>
              </div>
            </div>

            <div className="jr-profile-readonly-item">
              <span className="jr-profile-label">REGISTERED EMAIL</span>
              <div className="jr-profile-value-box">
                <div className="jr-profile-value-icon" aria-hidden="true">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </div>
                <div className="jr-profile-value-content">
                  <span className="jr-profile-value">
                    {email || "Not provided"}
                  </span>
                  <span className="jr-profile-value-hint">
                    Registered email address
                  </span>
                </div>
              </div>
            </div>

            {phone && (
              <div className="jr-profile-readonly-item">
                <span className="jr-profile-label">PHONE NUMBER</span>
                <div className="jr-profile-value-box">
                  <div className="jr-profile-value-icon" aria-hidden="true">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="jr-profile-value-content">
                    <span className="jr-profile-value">{phone}</span>
                    <span className="jr-profile-value-hint">
                      Registered phone number
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : loading ? (
          /* Priority 2: Only show loading spinner if we don't have customer information yet */
          <div
            className="jr-profile-loading"
            role="status"
            aria-live="polite"
          >
            <div className="jr-profile-spinner" aria-hidden="true" />
            <span>Loading profile details...</span>
          </div>
        ) : fetchError ? (
          /* Priority 3: Fallback error card when info cannot be retrieved */
          <div className="jr-profile-fallback" role="alert">
            <div className="jr-profile-fallback-icon" aria-hidden="true">
              ⚠️
            </div>
            <strong>Unable to retrieve profile</strong>
            <p>
              {fetchError ||
                "We could not load your profile details at this time. Please check your connection and try again."}
            </p>
            <button
              type="button"
              className="jr-profile-retry-btn"
              onClick={() => {
                setLoading(true);
                setFetchError("");
                if (clientApi && typeof clientApi.profile === "function") {
                  clientApi.profile()
                    .then((d) => setProfileData(d))
                    .catch(() => setFetchError("Unable to retrieve profile details."))
                    .finally(() => setLoading(false));
                }
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          /* Priority 4: Unauthenticated fallback */
          <div className="jr-profile-fallback" role="status">
            <div className="jr-profile-fallback-icon" aria-hidden="true">
              👤
            </div>
            <strong>No profile data found</strong>
            <p>Please sign in to view your account details and order history.</p>
            {handleLogout && (
              <button
                type="button"
                className="jr-profile-retry-btn"
                onClick={handleLogout}
              >
                Sign In
              </button>
            )}
          </div>
        )}
      </section>

      {/* My Orders Action */}
      <button
        className="jr-account-action"
        type="button"
        onClick={handleOrders}
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

      {/* Sign Out Action */}
      <button
        className="jr-account-action jr-account-action-danger"
        type="button"
        onClick={handleLogout}
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

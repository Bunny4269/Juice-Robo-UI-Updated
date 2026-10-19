import { useEffect, useState } from "react";
import "./LoginScreen.css";

import juiceRoboLogo from "../../../assets/juice-robo-logo.jpg";

const HCK_LOGO = `${import.meta.env.BASE_URL}assets/hck-logo.svg`;
const REMEMBER_KEY = "juice_robo_remember_me";
const SAVED_EMAIL_KEY = "juice_robo_saved_email";

export default function LoginScreen({
  customer,
  setCustomer,
  onLogin,
  onSignup,
  busy = false,
  error = "",
  onContinueWithoutLogin,
  isHck = false,
}) {
  const [authMode, setAuthMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem(REMEMBER_KEY) === "true"
  );

  const [formError, setFormError] = useState("");

  const name = customer?.name || "";
  const email = customer?.email || "";
  const phone = customer?.phone || "";
  const password = customer?.password || "";
  const confirmPassword = customer?.confirmPassword || "";

  useEffect(() => {
    const remembered =
      localStorage.getItem(REMEMBER_KEY) === "true";

    if (!remembered) return;

    const savedEmail =
      localStorage.getItem(SAVED_EMAIL_KEY) || "";

    if (!savedEmail) return;

    setCustomer((current) => ({
      ...current,
      email: savedEmail,
    }));
  }, [setCustomer]);

  function updateCustomer(field, value) {
    setCustomer((current) => ({
      ...current,
      [field]: value,
    }));

    setFormError("");
  }

  function handleRememberChange(event) {
    const checked = event.target.checked;

    setRememberMe(checked);

    if (checked) {
      localStorage.setItem(REMEMBER_KEY, "true");

      const savedEmail = String(
        customer?.email || ""
      ).trim();

      if (savedEmail) {
        localStorage.setItem(
          SAVED_EMAIL_KEY,
          savedEmail
        );
      }
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    setFormError("");
  }

  function handleEmailChange(event) {
    const value = event.target.value;

    updateCustomer("email", value);

    if (rememberMe) {
      const savedEmail = value.trim();

      if (savedEmail) {
        localStorage.setItem(
          SAVED_EMAIL_KEY,
          savedEmail
        );
      } else {
        localStorage.removeItem(
          SAVED_EMAIL_KEY
        );
      }
    }
  }

  function handlePasswordChange(event) {
    updateCustomer(
      "password",
      event.target.value
    );
  }

  function handleForgotPassword() {
    setFormError(
      "Password recovery will be connected to the authentication service."
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    setFormError("");

    const trimmedEmail = String(email).trim();
    if (!trimmedEmail) {
      setFormError("Enter your email address.");
      return;
    }

    if (!password) {
      setFormError("Enter your password.");
      return;
    }

    if (authMode === "signup") {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        setFormError("Enter your full name.");
        return;
      }

      if (password.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }

      if (typeof onSignup === "function") {
        onSignup({
          name: trimmedName,
          email: trimmedEmail,
          phone: String(phone).trim(),
          password,
          confirmPassword,
        });
      }
      return;
    }

    // SIGN IN MODE
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, "true");
      localStorage.setItem(SAVED_EMAIL_KEY, trimmedEmail);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }

    if (typeof onLogin === "function") {
      onLogin(event);
    }
  }

  function handleContinueWithoutLogin() {
    setFormError("");

    if (
      typeof onContinueWithoutLogin ===
      "function"
    ) {
      onContinueWithoutLogin();
    }
  }

  return (
    <main className="jr-login-screen">
      <section className="jr-login-container">

        {/* LOGO */}
        <div className="jr-login-logo-container">
          <img
            className="jr-login-logo-image"
            src={isHck ? HCK_LOGO : juiceRoboLogo}
            alt={isHck ? "HCK Helmet Cleaning" : "Juice Robo"}
          />
        </div>

        {/* INTRO */}
        <div className="jr-login-copy">
          <span className="jr-login-eyebrow">
            {isHck ? "HELMET CARE · READY WHEN YOU ARE" : "FRESH JUICE · READY WHEN YOU ARE"}
          </span>

          <h1>
            {authMode === "signup" ? (
              <>
                Create
                <br />
                <em>account.</em>
              </>
            ) : (
              <>
                Welcome
                <br />
                <em>back.</em>
              </>
            )}
          </h1>

          <p>
            {authMode === "signup"
              ? "Sign up to start your ordering experience."
              : isHck
              ? "Sign in to continue to your HCK services."
              : "Sign in to continue your Juice Robo experience."}
          </p>
        </div>

        {/* AUTH TABS: SIGN IN / SIGN UP */}
        <div className="jr-auth-tabs" role="tablist" aria-label="Sign in or Sign up">
          <button
            type="button"
            className={`jr-auth-tab ${authMode === "login" ? "active" : ""}`}
            onClick={() => {
              setAuthMode("login");
              setFormError("");
            }}
            role="tab"
            aria-selected={authMode === "login"}
            disabled={busy}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`jr-auth-tab ${authMode === "signup" ? "active" : ""}`}
            onClick={() => {
              setAuthMode("signup");
              setFormError("");
            }}
            role="tab"
            aria-selected={authMode === "signup"}
            disabled={busy}
          >
            Sign Up
          </button>
        </div>

        {/* FORM */}
        <form
          className="jr-login-form"
          onSubmit={handleSubmit}
        >
          {/* FULL NAME (SIGNUP ONLY) */}
          {authMode === "signup" && (
            <div className="jr-login-field">
              <label htmlFor="jr-login-name">
                FULL NAME
              </label>

              <input
                id="jr-login-name"
                type="text"
                value={name}
                onChange={(e) => updateCustomer("name", e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={busy}
                required
              />
            </div>
          )}

          {/* EMAIL */}
          <div className="jr-login-field">
            <label htmlFor="jr-login-email">
              EMAIL ADDRESS
            </label>

            <input
              id="jr-login-email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Enter your email"
              autoComplete="email"
              disabled={busy}
              required
            />
          </div>

          {/* PHONE (SIGNUP ONLY) */}
          {authMode === "signup" && (
            <div className="jr-login-field">
              <label htmlFor="jr-login-phone">
                PHONE NUMBER <small style={{ fontWeight: 400, opacity: 0.7 }}>(Optional)</small>
              </label>

              <input
                id="jr-login-phone"
                type="tel"
                value={phone}
                onChange={(e) => updateCustomer("phone", e.target.value)}
                placeholder="Enter 10-digit phone number"
                autoComplete="tel"
                disabled={busy}
              />
            </div>
          )}

          {/* PASSWORD */}
          <div className="jr-login-field">
            <label htmlFor="jr-login-password">
              PASSWORD
            </label>

            <div className="jr-login-password-wrap">
              <input
                id="jr-login-password"
                className="jr-login-password-input"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={handlePasswordChange}
                placeholder={authMode === "signup" ? "Create a password (min 6 chars)" : "Enter your password"}
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                disabled={busy}
                required
              />

              <button
                className="jr-login-password-toggle"
                type="button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                disabled={busy}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3l18 18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <path
                      d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <path
                      d="M9.9 5.2A10.9 10.9 0 0 1 12 5c5.2 0 8.7 4.7 9.8 6.4-.5.8-1.6 2.3-3.4 3.7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M6.2 8.1C4.6 9.3 3.2 11 2.2 12.4 3.3 14.1 6.8 19 12 19c1.5 0 2.8-.4 4-.9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />

                    <circle
                      cx="12"
                      cy="12"
                      r="2.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* CONFIRM PASSWORD (SIGNUP ONLY) */}
          {authMode === "signup" && (
            <div className="jr-login-field">
              <label htmlFor="jr-login-confirm-password">
                CONFIRM PASSWORD
              </label>

              <div className="jr-login-password-wrap">
                <input
                  id="jr-login-confirm-password"
                  className="jr-login-password-input"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(e) => updateCustomer("confirmPassword", e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  disabled={busy}
                  required
                />

                <button
                  className="jr-login-password-toggle"
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current
                    )
                  }
                  disabled={busy}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* OPTIONS (LOGIN ONLY) */}
          {authMode === "login" && (
            <div className="jr-login-options">
              <label className="jr-login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={
                    handleRememberChange
                  }
                  disabled={busy}
                />

                <span>
                  Remember me
                </span>
              </label>

              <button
                className="jr-login-forgot"
                type="button"
                onClick={
                  handleForgotPassword
                }
                disabled={busy}
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* ERROR */}
          {(formError || error) && (
            <div
              className="jr-login-error"
              role="alert"
            >
              <span className="jr-login-error-icon">
                !
              </span>

              <p>
                {formError || error}
              </p>
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            className="jr-button jr-button-primary jr-login-button"
            type="submit"
            disabled={busy}
          >
            <span>
              {busy
                ? "PLEASE WAIT..."
                : authMode === "signup"
                ? "CREATE ACCOUNT"
                : "SIGN IN"}
            </span>

            {!busy && (
              <span className="jr-login-arrow">
                →
              </span>
            )}
          </button>
        </form>

        {/* SWITCH MODE HELPER */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
            {authMode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setFormError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#1d6f42",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Sign Up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setFormError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#1d6f42",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>

        {/* SECURITY NOTE */}
        <div className="jr-login-note" style={{ marginTop: "24px" }}>
          <span
            className="jr-login-lock"
            aria-hidden="true"
          >
            🔒
          </span>

          <span>
            Your account and login details are securely protected.
          </span>
        </div>

      </section>
    </main>
  );
}
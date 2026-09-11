import { useEffect, useState } from "react";
import "./LoginScreen.css";

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;

const REMEMBER_KEY = "juice_robo_remember_me";
const SAVED_EMAIL_KEY = "juice_robo_saved_email";

export default function LoginScreen({
  customer,
  setCustomer,
  onLogin,
  busy = false,
  error = "",
  onContinueWithoutLogin,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem(REMEMBER_KEY) === "true"
  );

  const [formError, setFormError] = useState("");

  const email = customer?.email || "";
  const password = customer?.password || "";

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

    const trimmedEmail =
      String(email).trim();

    if (!trimmedEmail) {
      setFormError(
        "Enter your email address."
      );
      return;
    }

    if (!password) {
      setFormError(
        "Enter your password."
      );
      return;
    }

    /*
     * Remember ONLY the email.
     * Never save the password.
     */
    if (rememberMe) {
      localStorage.setItem(
        REMEMBER_KEY,
        "true"
      );

      localStorage.setItem(
        SAVED_EMAIL_KEY,
        trimmedEmail
      );
    } else {
      localStorage.removeItem(
        REMEMBER_KEY
      );

      localStorage.removeItem(
        SAVED_EMAIL_KEY
      );
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
            src={`${ASSET_BASE}app_logo.jpg`}
            alt="Juice Robo"
          />
        </div>

        {/* INTRO */}
        <div className="jr-login-copy">
          <span className="jr-login-eyebrow">
            FRESH JUICE · READY WHEN YOU ARE
          </span>

          <h1>
            Welcome
            <br />
            <em>back.</em>
          </h1>

          <p>
            Sign in to continue your
            Juice Robo experience.
          </p>
        </div>

        {/* FORM */}
        <form
          className="jr-login-form"
          onSubmit={handleSubmit}
        >
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
                placeholder="Enter your password"
                autoComplete="current-password"
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

          {/* OPTIONS */}
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

          {/* SIGN IN */}
          <button
            className="jr-button jr-button-primary jr-login-button"
            type="submit"
            disabled={busy}
          >
            <span>
              {busy
                ? "PLEASE WAIT..."
                : "SIGN IN"}
            </span>

            {!busy && (
              <span className="jr-login-arrow">
                →
              </span>
            )}
          </button>
        </form>

        {/* CONTINUE WITHOUT LOGIN */}
        <button
          type="button"
          className="jr-continue-without-login"
          onClick={
            handleContinueWithoutLogin
          }
          disabled={busy}
        >
          CONTINUE WITHOUT LOGIN
        </button>

        <p className="jr-login-guest-note">
          Browse the menu first. Sign in when
          you are ready to add items to your cart.
        </p>

        {/* SECURITY NOTE */}
        <div className="jr-login-note">
          <span
            className="jr-login-lock"
            aria-hidden="true"
          >
            🔒
          </span>

          <span>
            Your login details are securely protected.
          </span>
        </div>

      </section>
    </main>
  );
}
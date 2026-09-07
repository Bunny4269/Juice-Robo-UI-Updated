import { useEffect, useState } from "react";
import "./LoginScreen.css";

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;

const REMEMBER_KEY = "juice_robo_remember_me";
const SAVED_EMAIL_KEY = "juice_robo_saved_email";

export default function LoginScreen({
  customer,
  setCustomer,
  onLogin,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem(REMEMBER_KEY) === "true";
  });

  const [formError, setFormError] = useState("");
    /* =====================================================
     RESTORE REMEMBERED EMAIL
     ===================================================== */

  useEffect(() => {
    const remembered =
      localStorage.getItem(REMEMBER_KEY) === "true";

    if (!remembered) {
      return;
    }

    const savedEmail =
      localStorage.getItem(SAVED_EMAIL_KEY) || "";

    if (!savedEmail) {
      return;
    }

    setCustomer((current) => ({
      ...current,
      email: savedEmail,
    }));
  }, [setCustomer]);
    /* =====================================================
     EMAIL CHANGE
     ===================================================== */

  function handleEmailChange(event) {
    const value = event.target.value;

    setCustomer((current) => ({
      ...current,
      email: value,
    }));

    if (rememberMe) {
      const email = value.trim();

      if (email) {
        localStorage.setItem(
          SAVED_EMAIL_KEY,
          email
        );
      } else {
        localStorage.removeItem(
          SAVED_EMAIL_KEY
        );
      }
    }

    setFormError("");
  }
    /* =====================================================
     PASSWORD CHANGE
     ===================================================== */

  function handlePasswordChange(event) {
    setCustomer((current) => ({
      ...current,
      password: event.target.value,
    }));

    setFormError("");
  }
    /* =====================================================
     REMEMBER ME
     ===================================================== */

  function handleRememberChange(event) {
    const checked = event.target.checked;

    setRememberMe(checked);

    if (checked) {
      localStorage.setItem(
        REMEMBER_KEY,
        "true"
      );

      const email = String(
        customer?.email || ""
      ).trim();

      if (email) {
        localStorage.setItem(
          SAVED_EMAIL_KEY,
          email
        );
      }
    } else {
      localStorage.removeItem(
        REMEMBER_KEY
      );

      localStorage.removeItem(
        SAVED_EMAIL_KEY
      );
    }
  }
    /* =====================================================
     FORGOT PASSWORD
     ===================================================== */

  function handleForgotPassword() {
    setFormError(
      "Password recovery will be connected to the authentication service."
    );
  }
    /* =====================================================
     SUBMIT
     ===================================================== */

  function handleSubmit(event) {
    event.preventDefault();

    setFormError("");

    const email = String(
      customer?.email || ""
    ).trim();

    const password = String(
      customer?.password || ""
    );

    if (!email) {
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
        email
      );
    } else {
      localStorage.removeItem(
        REMEMBER_KEY
      );

      localStorage.removeItem(
        SAVED_EMAIL_KEY
      );
    }

    onLogin(event);
  }
    /* =====================================================
     UI
     ===================================================== */

  return (
    <main className="jr-login-screen">

      {/* =================================================
          CENTRE LOGO
          ================================================= */}

      <div className="jr-login-logo-center">

        <img
          className="jr-login-logo-image"
          src={`${ASSET_BASE}juice-robo-logo.jpg`}
          alt="Juice Robo"
        />

      </div>


      {/* =================================================
          LOGIN COPY
          ================================================= */}

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
            {/* =================================================
          LOGIN FORM
          ================================================= */}

      <form
        className="jr-login-form"
        onSubmit={handleSubmit}
      >

        {/* =================================================
            EMAIL
            ================================================= */}

        <div className="jr-login-field">

          <label
            className="jr-login-label"
            htmlFor="jr-login-email"
          >
            EMAIL ADDRESS
          </label>

          <input
            id="jr-login-email"
            type="email"
            value={customer?.email || ""}
            onChange={handleEmailChange}
            placeholder="Enter your Gmail address"
            autoComplete="email"
          />

        </div>
                {/* =================================================
            PASSWORD
            ================================================= */}

        <div className="jr-login-field">

          <label
            className="jr-login-label"
            htmlFor="jr-login-password"
          >
            PASSWORD
          </label>

          <div className="jr-password-wrap">

            <input
              id="jr-login-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={customer?.password || ""}
              onChange={handlePasswordChange}
              placeholder="Enter your password"
              autoComplete="current-password"
            />

            <button
              type="button"
              className="jr-password-toggle"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              <span
                className={`jr-eye-icon ${
                  showPassword
                    ? "visible"
                    : ""
                }`}
              />
            </button>

          </div>

        </div>
                {/* =================================================
            REMEMBER ME / FORGOT PASSWORD
            ================================================= */}

        <div className="jr-login-options">

          <label className="jr-remember">

            <input
              type="checkbox"
              checked={rememberMe}
              onChange={handleRememberChange}
            />

            <span className="jr-custom-checkbox">
              {rememberMe ? "✓" : ""}
            </span>

            <span className="jr-remember-text">
              Remember me
            </span>

          </label>


          {/*
            <button
              type="button"
              className="jr-login-forgot"
              onClick={handleForgotPassword}
            >
              Forgot password?
            </button>
            */}

        </div>
        {/* =================================================
         ERROR
         ================================================= */}

        {formError && (
          <div
            className="jr-login-error"
            role="alert"
          >
            <span>!</span>

            <p>
              {formError}
            </p>

          </div>
        )}


        {/* =================================================
            SIGN IN
            ================================================= */}

        <button
          type="submit"
          className="jr-login-button"
        >
          SIGN IN
          <span>→</span>
        </button>

      </form>
            {/* =================================================
          SECURITY NOTE
          ================================================= */}

      <div className="jr-login-note">

        <span className="jr-login-lock">
          🔒
        </span>

        Your login details are securely
        protected.

      </div>

    </main>
  );
}

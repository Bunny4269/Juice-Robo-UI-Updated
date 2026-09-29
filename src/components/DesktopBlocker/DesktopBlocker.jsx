import { useEffect, useState } from "react";
import "./DesktopBlocker.css";

/*
 * JUICE ROBO — DESKTOP DEVICE DETECTOR & NOTICE
 *
 * Juice Robo is an on-the-go mobile web application for ordering
 * fresh cold-pressed sugarcane juice at automated Juice Robo vending machines.
 *
 * Behavior:
 * - Desktop browsers (viewport > 1024px, non-mobile UA) -> display the polished desktop notice.
 * - Mobile devices & tablets (touchscreens, mobile UA, viewport <= 1024px) -> render the normal Juice Robo application.
 * - Chrome mobile emulation -> immediately renders the normal mobile Juice Robo application.
 */

function checkIsDesktop() {
  if (typeof window === "undefined") return false;

  // 1. Mobile User Agents (phones & tablets) are always supported
  const ua = (typeof navigator !== "undefined" ? navigator.userAgent : "") || "";
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i.test(ua);
  if (isMobileUA) {
    return false;
  }

  // 2. Responsive mobile/tablet viewport check (<= 1024px is mobile/tablet view)
  if (window.innerWidth <= 1024) {
    return false;
  }

  // 3. Desktop environment (wide screen, non-mobile UA)
  return true;
}

export default function DesktopBlocker() {
  const [isDesktop, setIsDesktop] = useState(checkIsDesktop);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(checkIsDesktop());
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  if (!isDesktop) {
    return null;
  }

  return (
    <aside
      className="jr-desktop-blocker-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Juice Robo is designed for mobile devices"
    >
      <div className="jr-desktop-blocker-card">
        {/* Brand Badge */}
        <div className="jr-desktop-badge">
          <span className="jr-desktop-badge-dot" aria-hidden="true" />
          <span>ORDER AT MACHINE</span>
        </div>

        {/* Mobile Smartphone Illustration */}
        <div className="jr-desktop-illustration" aria-hidden="true">
          <div className="jr-phone-mockup">
            <div className="jr-phone-notch" />
            <div className="jr-phone-screen">
              <div className="jr-phone-logo">
                <span className="jr-logo-green">JUICE</span>
                <span className="jr-logo-orange">ROBO</span>
              </div>
              <div className="jr-phone-juice-art">
                <svg
                  viewBox="0 0 100 100"
                  width="54"
                  height="54"
                  fill="none"
                  className="jr-juice-svg"
                >
                  <circle cx="50" cy="50" r="46" fill="#eaf6ed" />
                  <path
                    d="M32 30h36l-6 48a6 6 0 0 1-6 5H44a6 6 0 0 1-6-5l-6-48Z"
                    fill="#38a169"
                    opacity="0.85"
                  />
                  <path
                    d="M36 42h28l-4 32a4 4 0 0 1-4 4H44a4 4 0 0 1-4-4l-4-32Z"
                    fill="#2f855a"
                  />
                  <path
                    d="M30 30h40"
                    stroke="#276749"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M56 22l6-10"
                    stroke="#dd6b20"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="48" cy="52" r="3" fill="#ffffff" opacity="0.6" />
                  <circle cx="54" cy="62" r="2" fill="#ffffff" opacity="0.6" />
                </svg>
              </div>
              <div className="jr-phone-juice-title">Sugarcane Juice</div>
              <div className="jr-phone-juice-pill">Cold-Pressed Fresh</div>
            </div>
            <div className="jr-phone-bar" />
          </div>
        </div>

        {/* Logo and Titles */}
        <div className="jr-desktop-blocker-content">
          <div className="jr-desktop-blocker-logo">
            <span className="jr-desktop-logo-green">JUICE</span>
            <span className="jr-desktop-logo-orange">ROBO</span>
          </div>

          <h1 className="jr-desktop-blocker-title">
            Open Juice Robo on your phone
          </h1>

          <p className="jr-desktop-blocker-desc">
            For the best ordering experience, please open this website on your
            mobile device.
          </p>

          <div className="jr-desktop-features">
            <div className="jr-desktop-feature-item">
              <span className="jr-desktop-feature-icon" aria-hidden="true">⚡</span>
              <span>Order ahead & collect instantly</span>
            </div>
            <div className="jr-desktop-feature-item">
              <span className="jr-desktop-feature-icon" aria-hidden="true">🌱</span>
              <span>100% natural, freshly crushed at the machine</span>
            </div>
          </div>

          <div className="jr-desktop-blocker-hint">
            <span className="jr-desktop-hint-icon" aria-hidden="true">📱</span>
            <span>
              Open <strong>/order_now/menu/</strong> on your mobile phone
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

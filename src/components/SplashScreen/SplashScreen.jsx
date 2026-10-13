import "./SplashScreen.css";

const JUICE_ROBO_LOGO = `${import.meta.env.BASE_URL}assets/juice-robo-logo.jpg`;

export default function SplashScreen({ onComplete }) {
  return (
    <section
      className="jr-splash"
      role="status"
      aria-label="Loading Juice Robo"
    >
      <div className="jr-splash-background" aria-hidden="true" />

      <div className="jr-splash-content">
        <div className="jr-splash-brand">
          <img
            className="jr-splash-logo"
            src={JUICE_ROBO_LOGO}
            alt="Juice Robo"
            draggable="false"
          />

          <p className="jr-splash-tagline">
            <span>
              FRESHLY PREPARED <span aria-hidden="true">·</span> NATURALLY
            </span>
            <span>REFRESHING</span>
          </p>
        </div>
      </div>

      <div className="jr-splash-loading" aria-hidden="true">
        <p className="jr-splash-loader-label">Tapping to enter...</p>

        <div className="jr-splash-loader">
          <span />
        </div>
      </div>
    </section>
  );
}

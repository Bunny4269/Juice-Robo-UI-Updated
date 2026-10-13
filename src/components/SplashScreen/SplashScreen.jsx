import "./SplashScreen.css";

const juiceRoboLogo = `${import.meta.env.BASE_URL}assets/juice-robo-logo-white.jpg`;

export default function SplashScreen({ onComplete }) {
  return (
    <section
      className="jr-splash"
      role="status"
      aria-label="Loading Juice Robo"
    >
      <div
        className="jr-splash-orb jr-splash-orb-one"
        aria-hidden="true"
      />

      <div
        className="jr-splash-orb jr-splash-orb-two"
        aria-hidden="true"
      />

      <div className="jr-splash-content">
        <div className="jr-splash-logo-wrap">
          <img
            className="jr-splash-logo"
            src={juiceRoboLogo}
            alt="Juice Robo"
            draggable="false"
          />
        </div>

        <p className="jr-splash-tagline">
          FRESHLY PREPARED{" "}
          <span aria-hidden="true">·</span>{" "}
          NATURALLY
          <br />
          REFRESHING
        </p>
      </div>

      <p className="jr-splash-loader-label">
        Tapping to enter...
      </p>

      <div className="jr-splash-loader" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}
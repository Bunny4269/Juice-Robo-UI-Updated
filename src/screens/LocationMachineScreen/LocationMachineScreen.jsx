import "./LocationMachineScreen.css";

/**
 * Outlet entry screen.
 * The outlet and menu are identified from the QR code displayed at the kiosk;
 * users must not manually choose an outlet or machine here.
 */
export default function LocationMachineScreen({ onScanQR }) {
  const handleScanClick = () => {
    if (typeof onScanQR === "function") {
      onScanQR();
    }
  };

  return (
    <main className="jr-content jr-page jr-outlet-qr-page">
      <section className="jr-outlet-qr-content" aria-labelledby="jr-outlet-qr-title">
        <div className="jr-outlet-qr-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="44" height="44" fill="none">
            <rect x="5" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="3" />
            <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" />
            <rect x="29" y="5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="3" />
            <rect x="33" y="9" width="6" height="6" rx="1" fill="currentColor" />
            <rect x="5" y="29" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="3" />
            <rect x="9" y="33" width="6" height="6" rx="1" fill="currentColor" />
            <path d="M27 25h5v5h-5zM37 25h6v6h-6zM25 35h6v8h-6zM35 35h3v3h-3zM41 39h2v4h-2z" fill="currentColor" />
          </svg>
        </div>

        <p className="jr-outlet-qr-eyebrow">QUICK ACCESS</p>
        <h1 id="jr-outlet-qr-title" className="jr-outlet-qr-title">
          Scan Outlet QR Code
        </h1>
        <p className="jr-outlet-qr-description">
          Scan the QR code displayed at your outlet to open the correct menu.
        </p>

        <button
          className="jr-outlet-qr-button"
          type="button"
          onClick={handleScanClick}
          aria-label="Scan outlet QR code"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 8h8v8H8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M10 10h4v4h-4z" fill="currentColor" />
          </svg>
          <span>Scan Outlet QR Code</span>
        </button>
      </section>
    </main>
  );
}

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "./ScannerScreen.css";

/* =========================================================
   JUICE ROBO — QR SCANNER SCREEN
   Flow: Scan QR -> Select Location / Outlet -> Select Juice -> Cart -> Checkout
   ========================================================= */

function ArrowBackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QrCodeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="3" height="3" fill="currentColor" />
      <rect x="18" y="14" width="3" height="3" fill="currentColor" />
      <rect x="14" y="18" width="3" height="3" fill="currentColor" />
      <rect x="18" y="18" width="3" height="3" fill="currentColor" />
    </svg>
  );
}

export default function ScannerScreen({
  locations = [],
  machines = [],
  onScanSuccess,
  onManualSelect,
  onBack,
  isLocationConfirmed,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Persistent permission keys (one-time request per device)
  const CAMERA_REQUESTED_KEY = "juice_robo_camera_permission_requested";
  const CAMERA_GRANTED_KEY = "juice_robo_camera_permission_granted";
  const CAMERA_DENIED_KEY = "juice_robo_camera_permission_denied";

  // Permission & camera states: 'prompt' | 'granted' | 'denied' | 'insecure' | 'unsupported'
  const [permissionStatus, setPermissionStatus] = useState("prompt");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [selectedMachineIndex, setSelectedMachineIndex] = useState(0);

  const activeOutlet = locations[selectedMachineIndex] || locations[0] || null;

  const isLocalhost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const isInsecureContext = !isHttps && !isLocalhost;

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function requestCameraAccess(userTriggered = false) {
    if (isInsecureContext) {
      setPermissionStatus("insecure");
      setCameraError(
        "iOS Safari requires HTTPS to access the live camera. Switch to secure HTTPS or take a photo below."
      );
      return;
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionStatus("unsupported");
      setCameraError("Camera is not supported in this browser context. Please use 'Take Photo' below.");
      return;
    }

    setIsRequestingPermission(true);
    setCameraError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setPermissionStatus("granted");
      setCameraError("");

      // Record granted permission locally
      try {
        localStorage.setItem(CAMERA_REQUESTED_KEY, "true");
        localStorage.setItem(CAMERA_GRANTED_KEY, "true");
        localStorage.removeItem(CAMERA_DENIED_KEY);
      } catch (storageErr) {
        console.warn("[Juice Robo] Failed to save camera granted flag:", storageErr);
      }
    } catch (err) {
      console.warn("[Juice Robo] Camera request notice:", err?.name, err?.message);
      stopCamera();

      try {
        localStorage.setItem(CAMERA_REQUESTED_KEY, "true");
      } catch {}

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        try {
          localStorage.setItem(CAMERA_DENIED_KEY, "true");
          localStorage.removeItem(CAMERA_GRANTED_KEY);
        } catch {}
        setPermissionStatus("denied");
        setCameraError(
          "Camera permission was denied. Tap 'aA' in Safari address bar or the lock icon in Chrome > Website Settings > Camera > Allow, then tap Try Camera Again."
        );
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setPermissionStatus("unsupported");
        setCameraError("No camera device was found on this device.");
      } else {
        setPermissionStatus(userTriggered ? "denied" : "prompt");
        setCameraError(
          userTriggered
            ? `Unable to start camera: ${err?.message || "Permission restricted."}`
            : ""
        );
      }
    } finally {
      setIsRequestingPermission(false);
    }
  }

  /* One-time camera permission check on mount:
   * - If granted: start camera stream directly without prompting.
   * - If denied: do NOT auto-trigger getUserMedia; show instructions + manual retry.
   * - If first visit: request permission once.
   * - If previously requested but dismissed: show prompt UI with manual allow button.
   */
  useEffect(() => {
    let mounted = true;

    if (isInsecureContext) {
      setPermissionStatus("insecure");
      return;
    }

    let hasRequested = false;
    let isGranted = false;
    let isDenied = false;

    try {
      hasRequested = localStorage.getItem(CAMERA_REQUESTED_KEY) === "true";
      isGranted = localStorage.getItem(CAMERA_GRANTED_KEY) === "true";
      isDenied = localStorage.getItem(CAMERA_DENIED_KEY) === "true";
    } catch (e) {
      console.warn("[Juice Robo] localStorage unavailable for camera flags:", e);
    }

    // 1. If previously denied: DO NOT trigger getUserMedia automatically.
    // Display instructions with manual retry button.
    if (isDenied) {
      setPermissionStatus("denied");
      setCameraError(
        "Camera permission was denied. Tap 'aA' in Safari address bar or lock icon in Chrome > Website Settings > Camera > Allow, then tap Try Camera Again."
      );
      return;
    }

    // 2. If previously granted: open camera directly.
    if (isGranted) {
      requestCameraAccess(false);
      return;
    }

    // 3. First time opening scanner on this device: prompt once.
    if (!hasRequested) {
      try {
        localStorage.setItem(CAMERA_REQUESTED_KEY, "true");
      } catch {}
      requestCameraAccess(true);
      return;
    }

    // 4. Previously prompted, neither granted nor denied: do not auto-prompt.
    setPermissionStatus("prompt");

    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  // Frame analysis with jsQR for cross-browser QR detection
  useEffect(() => {
    if (!cameraActive || isProcessingScan) return;
    let animId = null;
    let cancelled = false;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    function analyzeFrame() {
      if (cancelled || isProcessingScan) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data && !cancelled) {
          console.log("[Juice Robo] Live QR code detected:", code.data);
          handleTriggerScan(code.data);
          return;
        }
      }

      animId = setTimeout(analyzeFrame, 250);
    }

    animId = setTimeout(analyzeFrame, 300);

    return () => {
      cancelled = true;
      if (animId) clearTimeout(animId);
    };
  }, [cameraActive, isProcessingScan]);

  function handleTriggerScan(data) {
    if (isProcessingScan) return;
    setIsProcessingScan(true);

    stopCamera();

    const payload = data || (activeOutlet ? { location: activeOutlet } : { source: "qr_camera" });
    console.log("[Juice Robo] QR Scan completed with payload:", payload);

    setTimeout(() => {
      setIsProcessingScan(false);
      if (typeof onScanSuccess === "function") {
        onScanSuccess(payload);
      }
    }, 350);
  }

  // Handle Photo Capture using jsQR directly
  async function handlePhotoCapture(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingScan(true);
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          handleTriggerScan(code.data);
        } else {
          handleTriggerScan(activeOutlet ? { location: activeOutlet } : { source: "qr_camera" });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        handleTriggerScan(activeOutlet ? { location: activeOutlet } : { source: "qr_camera" });
      };
      img.src = objectUrl;
    } catch (err) {
      console.warn("[Juice Robo] Photo QR parse notice:", err);
      handleTriggerScan(activeOutlet ? { location: activeOutlet } : { source: "qr_camera" });
    }
  }

  function handleSwitchToHttps() {
    const httpsUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}`;
    window.location.href = httpsUrl;
  }

  return (
    <main className="jr-scanner-screen">
      {/* HEADER */}
      <header className="jr-scanner-header">
        <button
          type="button"
          className="jr-scanner-back-btn"
          onClick={onBack}
          aria-label="Back"
        >
          <ArrowBackIcon />
        </button>
        <div className="jr-scanner-header-text">
          <h1>Scan Machine QR</h1>
          <span>Point camera at any Juice Robo machine to order</span>
        </div>
      </header>

      {/* VIEWFINDER AREA */}
      <div className="jr-scanner-viewport">
        {cameraActive && (
          <video
            ref={videoRef}
            className="jr-scanner-video"
            autoPlay
            playsInline
            muted
          />
        )}

        <div className="jr-scanner-frame-overlay">
          <div className="jr-scanner-target-box">
            <span className="corner top-left" />
            <span className="corner top-right" />
            <span className="corner bottom-left" />
            <span className="corner bottom-right" />

            {cameraActive ? (
              <div className="jr-scanner-laser-line" />
            ) : (
              /* PERMISSION PROMPT INSIDE VIEWFINDER */
              <div className="jr-scanner-permission-box">
                {permissionStatus === "insecure" ? (
                  <>
                    <div className="jr-scanner-permission-icon">🔒</div>
                    <h3 className="jr-scanner-permission-title">HTTPS Connection Required</h3>
                    <p className="jr-scanner-permission-desc">
                      iOS Safari requires HTTPS to access the live camera. Tap below to switch or take a photo:
                    </p>
                    <button
                      type="button"
                      className="jr-scanner-permission-action-btn"
                      onClick={handleSwitchToHttps}
                    >
                      <span>🔒 Switch to Secure HTTPS</span>
                    </button>
                    <button
                      type="button"
                      className="jr-scanner-permission-secondary-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📸 Take Photo (Works on HTTP)
                    </button>
                  </>
                ) : permissionStatus === "denied" ? (
                  <>
                    <div className="jr-scanner-permission-icon denied">🚫</div>
                    <h3 className="jr-scanner-permission-title">Camera Blocked</h3>
                    <p className="jr-scanner-permission-desc">
                      Camera access was denied. Tap 'aA' in Safari address bar or 🔒 in Chrome &gt; Website Settings &gt; Camera &gt; Allow, then tap Retry.
                    </p>
                    <button
                      type="button"
                      className="jr-scanner-permission-action-btn"
                      onClick={() => requestCameraAccess(true)}
                      disabled={isRequestingPermission}
                    >
                      <span>🔄 {isRequestingPermission ? "Checking..." : "Try Camera Again"}</span>
                    </button>
                    <button
                      type="button"
                      className="jr-scanner-permission-secondary-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📸 Take Photo Instead
                    </button>
                  </>
                ) : (
                  <>
                    <div className="jr-scanner-permission-icon">📷</div>
                    <h3 className="jr-scanner-permission-title">Camera Permission</h3>
                    <p className="jr-scanner-permission-desc">
                      Juice Robo needs camera permission to scan the QR code on the machine.
                    </p>
                    <button
                      type="button"
                      className="jr-scanner-permission-action-btn"
                      onClick={() => requestCameraAccess(true)}
                      disabled={isRequestingPermission}
                    >
                      <span>📹 {isRequestingPermission ? "Requesting..." : "Allow Camera"}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <p className="jr-scanner-instruction">
            {cameraActive
              ? "Align machine QR code inside the frame"
              : "Allow camera permission or take photo to scan"}
          </p>
        </div>

        {cameraError && permissionStatus !== "insecure" && permissionStatus !== "denied" && (
          <div className="jr-scanner-fallback-banner">
            <QrCodeIcon />
            <p>{cameraError}</p>
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      <footer className="jr-scanner-actions">
        {/* OUTLET SELECTOR FOR QR SCAN */}
        {locations.length > 0 && (
          <div className="jr-scanner-machine-picker">
            <label htmlFor="jr-scanner-outlet-select">MACHINE QR TO SCAN:</label>
            <select
              id="jr-scanner-outlet-select"
              value={selectedMachineIndex}
              onChange={(e) => setSelectedMachineIndex(Number(e.target.value))}
              className="jr-scanner-outlet-dropdown"
            >
              {locations.map((loc, idx) => (
                <option key={loc.id || loc.storeId || idx} value={idx}>
                  {loc.name || `Machine #${loc.id || idx + 1}`} ({loc.address || "Juice Robo"})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* PRIMARY CTA */}
        {!cameraActive ? (
          permissionStatus === "insecure" ? (
            <button
              type="button"
              className="jr-scanner-scan-cta"
              onClick={handleSwitchToHttps}
            >
              <span>🔒 SWITCH TO HTTPS FOR LIVE CAMERA</span>
            </button>
          ) : permissionStatus === "denied" ? (
            <button
              type="button"
              className="jr-scanner-scan-cta"
              onClick={() => requestCameraAccess(true)}
              disabled={isRequestingPermission}
            >
              <span>{isRequestingPermission ? "CHECKING PERMISSION..." : "🔄 TRY CAMERA AGAIN"}</span>
            </button>
          ) : (
            <button
              type="button"
              className="jr-scanner-scan-cta"
              onClick={() => requestCameraAccess(true)}
              disabled={isRequestingPermission}
            >
              <span>{isRequestingPermission ? "REQUESTING PERMISSION..." : "📷 ALLOW CAMERA"}</span>
            </button>
          )
        ) : (
          <button
            type="button"
            className="jr-scanner-scan-cta"
            onClick={() => handleTriggerScan()}
            disabled={isProcessingScan}
          >
            <span>{isProcessingScan ? "VERIFYING OUTLET..." : "⚡ SCAN MACHINE QR"}</span>
          </button>
        )}

        {/* PHOTO CAPTURE / UPLOAD QR */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={handlePhotoCapture}
        />
        <button
          type="button"
          className="jr-scanner-photo-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessingScan}
        >
          <span>📸 Take Photo of Machine QR</span>
        </button>

        <button
          type="button"
          className="jr-scanner-manual-btn"
          onClick={onManualSelect}
          disabled={isProcessingScan}
        >
          <span>📍 Select Location &amp; Machine Manually</span>
        </button>
      </footer>
    </main>
  );
}

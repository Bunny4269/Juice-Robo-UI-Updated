import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import "./ScannerScreen.css";

/* =========================================================
   JUICE ROBO — QR SCANNER SCREEN
   Two identification methods only:
   1. Scan QR using device camera
   2. Manually select machine/location
   NO image upload. NO "Machine to Scan" dropdown.
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

function CameraFlipIcon({ className = "" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 10c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 2.062.783 3.942 2.072 5.364" />
      <path d="M4 14c0 4.418 3.582 8 8 8s8-3.582 8-8c0-2.062-.783-3.942-2.072-5.364" />
      <polyline points="1 10 4 7 7 10" />
      <polyline points="23 14 20 17 17 14" />
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

  // Persistent permission flags (stored per device/browser profile)
  const CAMERA_GRANTED_KEY = "juice_robo_camera_permission_granted";
  const CAMERA_DENIED_KEY = "juice_robo_camera_permission_denied";


  // Permission & camera states: 'prompt' | 'granted' | 'denied' | 'unsupported'
  const [permissionStatus, setPermissionStatus] = useState("prompt");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanFeedback, setScanFeedback] = useState("");
  const [cameraNotice, setCameraNotice] = useState("");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  // Camera switching states: 'environment' (rear) | 'user' (front)
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(null);

  // Cooldown to prevent duplicate scan processing on rapid camera frames
  const lastScanTimestampRef = useRef(0);

  // Stop active media stream tracks
  function stopCameraTracks() {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (trackErr) {
        console.warn("[Juice Robo] Track stop warning:", trackErr);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function stopCamera() {
    stopCameraTracks();
    setCameraActive(false);
  }

  // Core stream starter with facingMode support & device enumeration fallback
  async function startCameraStream(targetFacing = "environment") {
    const constraints = {
      video: {
        facingMode: { ideal: targetFacing },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    };

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (idealErr) {
      console.warn("[Juice Robo] facingMode ideal failed, checking fallback:", idealErr);
      if (navigator?.mediaDevices?.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          if (videoDevices.length > 0) {
            let matchedDevice = null;
            if (targetFacing === "user") {
              matchedDevice =
                videoDevices.find((d) => /front|user|face/i.test(d.label || "")) ||
                videoDevices[0];
            } else {
              matchedDevice =
                videoDevices.find((d) => /back|rear|environment/i.test(d.label || "")) ||
                videoDevices[videoDevices.length - 1];
            }

            if (matchedDevice?.deviceId) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: {
                  deviceId: { exact: matchedDevice.deviceId },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
                audio: false,
              });
            }
          }
        } catch (enumErr) {
          console.warn("[Juice Robo] Device enumeration fallback warning:", enumErr);
        }
      }

      // Last fallback: generic video stream
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn("[Juice Robo] Video play notice:", playErr);
      }
    }

    setCameraActive(true);
    setPermissionStatus("granted");
    setCameraError("");

    // Detect if device supports multiple cameras
    try {
      if (navigator?.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoCount = devices.filter((d) => d.kind === "videoinput").length;
        setHasMultipleCameras(videoCount > 1);
      }
    } catch (e) {}

    return stream;
  }

  async function requestCameraAccess(userTriggered = false, targetFacing = cameraFacing) {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionStatus("unsupported");
      setCameraError("Camera streaming is unavailable on this device or browser. Please select location manually.");
      return;
    }

    setIsRequestingPermission(true);
    setCameraError("");

    try {
      await startCameraStream(targetFacing);

      try {
        localStorage.setItem(CAMERA_GRANTED_KEY, "true");
        localStorage.removeItem(CAMERA_DENIED_KEY);
      } catch (storageErr) {
        console.warn("[Juice Robo] Failed to save camera granted flag:", storageErr);
      }
    } catch (err) {
      console.warn("[Juice Robo] Camera request error:", err?.name, err?.message);
      stopCamera();

      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        try {
          localStorage.setItem(CAMERA_DENIED_KEY, "true");
          localStorage.removeItem(CAMERA_GRANTED_KEY);
        } catch {}
        setPermissionStatus("denied");
        setCameraError(
          "Camera permission was denied. Please allow camera access in your browser settings, or select your location manually."
        );
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setPermissionStatus("unsupported");
        setCameraError("No camera device was found on this device. Please select your location manually.");
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

  // Camera toggle handler
  async function handleToggleCamera() {
    if (isSwitchingCamera || isProcessingScan || !cameraActive) return;

    setIsSwitchingCamera(true);
    setCameraNotice("");

    try {
      if (navigator?.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        if (videoDevices.length <= 1) {
          setCameraNotice("Only one camera is available on this device");
          setHasMultipleCameras(false);
          setIsSwitchingCamera(false);
          setTimeout(() => setCameraNotice(""), 3500);
          return;
        }
      }
    } catch (e) {
      console.warn("[Juice Robo] enumerateDevices check notice:", e);
    }

    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    stopCameraTracks();

    try {
      await startCameraStream(nextFacing);
      setCameraFacing(nextFacing);
    } catch (switchErr) {
      console.warn("[Juice Robo] Camera toggle failed, returning to previous:", switchErr);
      try {
        await startCameraStream(cameraFacing);
      } catch (fallbackErr) {
        console.error("[Juice Robo] Camera recovery failed:", fallbackErr);
        setCameraError("Failed to switch camera. Tap 'Try Camera Again'.");
        setCameraActive(false);
      }
    } finally {
      setIsSwitchingCamera(false);
    }
  }

  // Permission check on mount.
  // IMPORTANT: Never automatically request camera permission on first visit.
  // The browser's native camera permission prompt must only appear after the
  // user explicitly taps the "Allow Camera" button. Auto-requesting is both
  // a UX violation and a browser security policy violation on some platforms.
  useEffect(() => {
    let isGranted = false;
    let isDenied = false;

    try {
      isGranted = localStorage.getItem(CAMERA_GRANTED_KEY) === "true";
      isDenied = localStorage.getItem(CAMERA_DENIED_KEY) === "true";
    } catch (e) {
      console.warn("[Juice Robo] localStorage unavailable for camera flags:", e);
    }

    if (isDenied) {
      // Previously denied — show denied state so user can tap retry
      setPermissionStatus("denied");
      setCameraError(
        "Camera permission was denied. Please allow camera access in your browser settings, or select your location manually."
      );
      return () => {
        stopCamera();
      };
    }

    if (isGranted) {
      // Previously granted — it is safe to auto-restart the stream
      // (the browser will not show the permission prompt again)
      requestCameraAccess(false, "environment");
      return () => {
        stopCamera();
      };
    }

    // First visit or permission not yet decided — show the permission
    // explanation screen. Do NOT call getUserMedia here. The camera will
    // only be started when the user taps the "Allow Camera" button.
    setPermissionStatus("prompt");

    return () => {
      stopCamera();
    };
  }, []);


  // Ensure stream plays on video element whenever camera becomes active
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((err) => {
        console.warn("[Juice Robo] Video play notice:", err);
      });
    }
  }, [cameraActive]);

  // Real-time frame analysis with jsQR for cross-browser QR detection
  useEffect(() => {
    if (!cameraActive || isProcessingScan || isSwitchingCamera) return;
    let animId = null;
    let cancelled = false;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    function analyzeFrame() {
      if (cancelled || isProcessingScan || isSwitchingCamera) return;

      const now = Date.now();
      // Enforce 1.5s cooldown after an invalid scan attempt
      if (now - lastScanTimestampRef.current < 1500) {
        animId = setTimeout(analyzeFrame, 200);
        return;
      }

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

      animId = setTimeout(analyzeFrame, 200);
    }

    animId = setTimeout(analyzeFrame, 250);

    return () => {
      cancelled = true;
      if (animId) clearTimeout(animId);
    };
  }, [cameraActive, isProcessingScan, isSwitchingCamera]);

  // Process and validate scanned QR code
  async function handleTriggerScan(data) {
    if (isProcessingScan) return;
    const rawData = String(data || "").trim();
    if (!rawData) return;

    lastScanTimestampRef.current = Date.now();
    setIsProcessingScan(true);
    setCameraError("");
    setScanFeedback("Verifying QR code...");

    try {
      if (typeof onScanSuccess === "function") {
        const result = await onScanSuccess(rawData);
        // If handler explicitly returned false, treat as unverified
        if (result === false) {
          setCameraError("Invalid or unrecognised QR code. Please scan the QR code displayed on the machine.");
          setScanFeedback("");
          setIsProcessingScan(false);
          return;
        }
      }
      // On success, stop camera and clear feedback
      setScanFeedback("Machine verified! Loading menu...");
      stopCamera();
    } catch (err) {
      console.warn("[Juice Robo] Scan processing error:", err);
      setCameraError("Invalid or unrecognised QR code. Please scan the QR code displayed on the machine.");
      setScanFeedback("");
      setIsProcessingScan(false);
    }
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
          <span className="jr-scanner-eyebrow">JUICE ROBO</span>
          <h1>Scan Machine QR</h1>
          <p className="jr-scanner-subtitle">
            Scan the QR code displayed on the Juice Robo machine
          </p>
        </div>
      </header>

      {/* VIEWFINDER AREA */}
      <div className="jr-scanner-viewport">
        <div className="jr-scanner-frame-overlay">
          <div className="jr-scanner-target-box">
            <video
              ref={videoRef}
              className={`jr-scanner-video ${cameraActive ? "active" : "hidden"}`}
              autoPlay
              playsInline
              muted
            />

            <span className="corner top-left" />
            <span className="corner top-right" />
            <span className="corner bottom-left" />
            <span className="corner bottom-right" />

            {cameraActive ? (
              <div className="jr-scanner-laser-line" />
            ) : (
              /* PERMISSION PROMPT / STATE BOX INSIDE VIEWFINDER */
              <div className="jr-scanner-permission-box">
                {permissionStatus === "unsupported" ? (
                  <>
                    <div className="jr-scanner-permission-icon">📷</div>
                    <h3 className="jr-scanner-permission-title">Camera Unavailable</h3>
                    <p className="jr-scanner-permission-desc">
                      Camera streaming is not available on this browser. Please select your location manually.
                    </p>
                  </>
                ) : permissionStatus === "denied" ? (
                  <>
                    <div className="jr-scanner-permission-icon denied">🚫</div>
                    <h3 className="jr-scanner-permission-title">Camera Blocked</h3>
                    <p className="jr-scanner-permission-desc">
                      Camera permission was denied. Please allow camera access in your browser settings, or select your location manually.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="jr-scanner-permission-icon">📷</div>
                    <h3 className="jr-scanner-permission-title">Camera Permission</h3>
                    <p className="jr-scanner-permission-desc">
                      Juice Robo needs camera permission to scan machine QR codes. Tap Allow Camera below.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <p className="jr-scanner-instruction">
            {isProcessingScan
              ? scanFeedback || "Processing scan..."
              : cameraActive
              ? "Align machine QR code inside the frame"
              : "Allow camera permission to scan machine QR"}
          </p>

          {/* CAMERA SWITCH BUTTON */}
          {cameraActive && (
            <div className="jr-scanner-switch-container">
              <button
                type="button"
                className="jr-scanner-switch-btn"
                onClick={handleToggleCamera}
                disabled={isSwitchingCamera || isProcessingScan}
                aria-label={`Switch camera. Current: ${cameraFacing === "environment" ? "Rear" : "Front"}`}
                title={
                  hasMultipleCameras === false
                    ? "Only one camera is available on this device"
                    : "Switch between rear and front camera"
                }
              >
                <CameraFlipIcon className={isSwitchingCamera ? "jr-spin" : ""} />
                <span>{isSwitchingCamera ? "Switching..." : "Switch Camera"}</span>
                <span className="jr-scanner-camera-mode-tag">
                  {cameraFacing === "environment" ? "Rear" : "Front"}
                </span>
              </button>

              {cameraNotice && (
                <div className="jr-scanner-camera-notice" role="status">
                  <span>ℹ️ {cameraNotice}</span>
                </div>
              )}
            </div>
          )}

          {/* SCAN ERROR BANNER (e.g. Invalid QR Code) */}
          {cameraError && (
            <div className="jr-scanner-error-banner" role="alert">
              <span>⚠️ {cameraError}</span>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <footer className="jr-scanner-actions">
        {/* CAMERA PERMISSION BUTTONS WHEN NOT ACTIVE */}
        {!cameraActive && (
          permissionStatus === "denied" ? (
            <button
              type="button"
              className="jr-scanner-scan-cta"
              onClick={() => requestCameraAccess(true)}
              disabled={isRequestingPermission}
            >
              <span>{isRequestingPermission ? "CHECKING PERMISSION..." : "🔄 TRY CAMERA AGAIN"}</span>
            </button>
          ) : permissionStatus === "prompt" ? (
            <button
              type="button"
              className="jr-scanner-scan-cta"
              onClick={() => requestCameraAccess(true)}
              disabled={isRequestingPermission}
            >
              <span>{isRequestingPermission ? "REQUESTING PERMISSION..." : "📷 ALLOW CAMERA"}</span>
            </button>
          ) : null
        )}

        {/* OR DIVIDER */}
        <div className="jr-scanner-or-divider" aria-hidden="true">
          <span>OR</span>
        </div>

        {/* SELECT LOCATION MANUALLY (ALWAYS ACCESSIBLE ALTERNATIVE) */}
        <button
          type="button"
          className="jr-scanner-manual-btn"
          onClick={onManualSelect}
          disabled={isProcessingScan}
        >
          <span>📍 Select Location Manually</span>
        </button>
      </footer>
    </main>
  );
}

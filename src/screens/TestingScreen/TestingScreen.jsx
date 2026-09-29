import React, { useState, useEffect } from "react";
import api, { API_BASE, ORDER_API_BASE } from "../../api";
import "./TestingScreen.css";

/* =========================================================
   JUICE ROBO — DEVELOPER TEST SUITE
   A comprehensive diagnostic & verification testing screen.
   ========================================================= */

export default function TestingScreen({
  onBack,
  cart = [],
  onAddToCart,
  user = {},
  loggedIn = false,
  selectedLocation,
  selectedMachine,
}) {
  const [activeTab, setActiveTab] = useState("api");
  const [logs, setLogs] = useState([]);

  // Test states
  const [healthStatus, setHealthStatus] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const [productsData, setProductsData] = useState(null);
  const [productsLoading, setProductsLoading] = useState(false);

  const [locationsData, setLocationsData] = useState(null);
  const [machinesData, setMachinesData] = useState(null);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [authProfile, setAuthProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [testCartId, setTestCartId] = useState("");
  const [testOrderId, setTestOrderId] = useState("");
  const [orderStatusResult, setOrderStatusResult] = useState(null);
  const [orderStatusLoading, setOrderStatusLoading] = useState(false);

  const [historyResult, setHistoryResult] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const addLog = (msg, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [{ timestamp, msg, type }, ...prev.slice(0, 49)]);
  };

  // 1. Check API Health
  const runHealthCheck = async () => {
    setHealthLoading(true);
    addLog("Checking API Health...", "info");
    try {
      const endpoints = [
        { name: "Locations Ping", fn: () => api.locations() },
      ];
      const results = {};
      for (const ep of endpoints) {
        try {
          const res = await ep.fn();
          results[ep.name] = { ok: true, count: Array.isArray(res) ? res.length : "OK" };
        } catch (err) {
          results[ep.name] = { ok: false, error: err.message };
        }
      }
      setHealthStatus(results);
      addLog("Health check completed successfully.", "success");
    } catch (e) {
      addLog(`Health check failed: ${e.message}`, "error");
      setHealthStatus({ error: e.message });
    } finally {
      setHealthLoading(false);
    }
  };

  // 2. Fetch Products
  const runFetchProducts = async () => {
    setProductsLoading(true);
    addLog("Fetching products from backend...", "info");
    try {
      const storeId = selectedLocation?.storeId || selectedLocation?.id || "200";
      const res = await api.products(storeId);
      setProductsData(res);
      addLog(`Products loaded: ${Array.isArray(res) ? res.length : 0} items found.`, "success");
    } catch (e) {
      addLog(`Failed to fetch products: ${e.message}`, "error");
      setProductsData({ error: e.message });
    } finally {
      setProductsLoading(false);
    }
  };

  // 3. Fetch Locations & Machines
  const runFetchLocations = async () => {
    setLocationsLoading(true);
    addLog("Fetching locations and machines...", "info");
    try {
      const locs = await api.locations();
      setLocationsData(locs);
      addLog(`Found ${locs.length} locations.`, "success");

      if (locs.length > 0) {
        const machs = await api.machines(locs);
        setMachinesData(machs);
        addLog(`Found ${machs.length} machines.`, "success");
      }
    } catch (e) {
      addLog(`Locations/Machines fetch error: ${e.message}`, "error");
    } finally {
      setLocationsLoading(false);
    }
  };

  // 4. Check Auth Profile
  const runCheckAuth = async () => {
    setAuthLoading(true);
    addLog("Checking authentication state...", "info");
    try {
      const token = localStorage.getItem("access_token") || localStorage.getItem("_token");
      let profile = null;
      if (typeof api.me === "function") {
        try {
          profile = await api.me();
        } catch (err) {
          profile = { note: "api.me() request error", error: err.message };
        }
      }
      setAuthProfile({
        isLoggedIn: loggedIn,
        hasToken: Boolean(token),
        tokenPreview: token ? `${token.slice(0, 12)}...${token.slice(-6)}` : "None",
        userState: user,
        backendProfile: profile,
      });
      addLog("Auth check complete.", "success");
    } catch (e) {
      addLog(`Auth check failed: ${e.message}`, "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // 5. Test Cart Limits
  const runTestCartLimit = () => {
    addLog("Simulating 9-item cart limit test...", "info");
    const totalQty = (cart || []).reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    addLog(`Current Cart Total Quantity: ${totalQty} / 9`, totalQty <= 9 ? "info" : "error");

    if (typeof onAddToCart === "function") {
      addLog("Attempting to add a test product (qty 1)...", "info");
      onAddToCart(
        { id: "test-product-1", name: "Sugarcane Classic (Test)", price: 60 },
        { id: "v-test-1", name: "Regular", price: 60 },
        1
      );
    }
  };

  // 6. Test Order Status & Verification
  const runCheckOrderStatus = async () => {
    if (!testCartId.trim() || !testOrderId.trim()) {
      addLog("Please enter both Cart ID and Order ID to check status.", "error");
      return;
    }
    setOrderStatusLoading(true);
    addLog(`Checking order status for Cart: ${testCartId}, Order: ${testOrderId}...`, "info");
    try {
      const res = await api.orderStatus(testCartId.trim(), testOrderId.trim());
      setOrderStatusResult(res);
      addLog(
        `Order Status: ${res?.status || "UNKNOWN"}, Paid: ${res?.isPaid ? "YES" : "NO"}, Code: ${res?.collectionCode || "None"}`,
        res?.isPaid ? "success" : "info"
      );
    } catch (e) {
      addLog(`Order status check failed: ${e.message}`, "error");
      setOrderStatusResult({ error: e.message });
    } finally {
      setOrderStatusLoading(false);
    }
  };

  // 7. Test Order History
  const runFetchHistory = async () => {
    setHistoryLoading(true);
    addLog("Querying backend orders history (api.orders())...", "info");
    try {
      const res = await api.orders();
      setHistoryResult(res);
      addLog(`Loaded ${Array.isArray(res) ? res.length : 0} orders from backend.`, "success");
    } catch (e) {
      addLog(`History fetch failed: ${e.message}`, "error");
      setHistoryResult({ error: e.message });
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <main className="jr-testing-screen">
      {/* Header */}
      <header className="jr-testing-header">
        <div className="jr-testing-header-top">
          <button type="button" className="jr-testing-back-btn" onClick={onBack}>
            ← Back to App
          </button>
          <span className="jr-testing-badge">DEV DIAGNOSTICS</span>
        </div>
        <h1 className="jr-testing-title">Juice Robo Test Suite</h1>
        <p className="jr-testing-subtitle">
          Verify API connections, cart rules, products, auth state, and payment verification.
        </p>
      </header>

      {/* Tabs */}
      <nav className="jr-testing-tabs" aria-label="Testing categories">
        {[
          { id: "api", label: "1. API & Health" },
          { id: "products", label: "2. Products" },
          { id: "locations", label: "3. Locations" },
          { id: "auth", label: "4. Auth State" },
          { id: "cart", label: "5. Cart (Max 9)" },
          { id: "verification", label: "6. Verification" },
          { id: "history", label: "7. Order History" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`jr-testing-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Panels */}
      <div className="jr-testing-body">
        {/* Tab 1: API & Health */}
        {activeTab === "api" && (
          <section className="jr-testing-panel">
            <h2>Backend Configuration &amp; Health</h2>
            <div className="jr-testing-info-grid">
              <div className="jr-testing-card">
                <strong>API Base URL</strong>
                <code>{API_BASE || "Default / Same Origin"}</code>
              </div>
              <div className="jr-testing-card">
                <strong>Order API Base</strong>
                <code>{ORDER_API_BASE || "Default / Same Origin"}</code>
              </div>
              <div className="jr-testing-card">
                <strong>API Key Status</strong>
                <code>{api.config?.hasApiKey ? "Configured" : "Not Provided"}</code>
              </div>
            </div>

            <button
              type="button"
              className="jr-testing-btn"
              onClick={runHealthCheck}
              disabled={healthLoading}
            >
              {healthLoading ? "Checking..." : "Ping Backend Health"}
            </button>

            {healthStatus && (
              <pre className="jr-testing-pre">
                {JSON.stringify(healthStatus, null, 2)}
              </pre>
            )}
          </section>
        )}

        {/* Tab 2: Products */}
        {activeTab === "products" && (
          <section className="jr-testing-panel">
            <h2>Product Catalog Verification</h2>
            <p>Fetches dynamic products from backend for currently active outlet.</p>

            <button
              type="button"
              className="jr-testing-btn"
              onClick={runFetchProducts}
              disabled={productsLoading}
            >
              {productsLoading ? "Fetching..." : "Fetch Products Catalog"}
            </button>

            {productsData && (
              <div>
                <span className="jr-testing-count-badge">
                  {Array.isArray(productsData) ? `${productsData.length} items loaded` : "Error"}
                </span>
                <pre className="jr-testing-pre">
                  {JSON.stringify(productsData, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Locations */}
        {activeTab === "locations" && (
          <section className="jr-testing-panel">
            <h2>Locations &amp; Dispensing Machines</h2>
            <p>Active Location: <strong>{selectedLocation?.name || "None"}</strong> | Machine: <strong>{selectedMachine?.name || "None"}</strong></p>

            <button
              type="button"
              className="jr-testing-btn"
              onClick={runFetchLocations}
              disabled={locationsLoading}
            >
              {locationsLoading ? "Loading..." : "Fetch Locations & Machines"}
            </button>

            {locationsData && (
              <div>
                <h3>Locations ({locationsData.length})</h3>
                <pre className="jr-testing-pre">
                  {JSON.stringify(locationsData, null, 2)}
                </pre>
              </div>
            )}

            {machinesData && (
              <div>
                <h3>Machines ({machinesData.length})</h3>
                <pre className="jr-testing-pre">
                  {JSON.stringify(machinesData, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* Tab 4: Auth */}
        {activeTab === "auth" && (
          <section className="jr-testing-panel">
            <h2>Authentication State</h2>
            <div className="jr-testing-info-grid">
              <div className="jr-testing-card">
                <strong>Logged In</strong>
                <code>{loggedIn ? "YES" : "NO"}</code>
              </div>
              <div className="jr-testing-card">
                <strong>User Phone</strong>
                <code>{user?.phone || "—"}</code>
              </div>
              <div className="jr-testing-card">
                <strong>User Name</strong>
                <code>{user?.name || "Guest"}</code>
              </div>
            </div>

            <button
              type="button"
              className="jr-testing-btn"
              onClick={runCheckAuth}
              disabled={authLoading}
            >
              {authLoading ? "Checking..." : "Inspect Auth Details"}
            </button>

            {authProfile && (
              <pre className="jr-testing-pre">
                {JSON.stringify(authProfile, null, 2)}
              </pre>
            )}
          </section>
        )}

        {/* Tab 5: Cart (Max 9) */}
        {activeTab === "cart" && (
          <section className="jr-testing-panel">
            <h2>Cart &amp; 9-Item Maximum Rule</h2>
            <div className="jr-testing-card" style={{ marginBottom: "14px" }}>
              <strong>Current Cart State:</strong>
              <div>
                Total Items:{" "}
                <b style={{ color: cart.length > 9 ? "red" : "green" }}>
                  {cart.reduce((s, i) => s + (Number(i.quantity) || 1), 0)}
                </b>{" "}
                / 9 units allowed
              </div>
            </div>

            <div className="jr-testing-btn-group">
              <button
                type="button"
                className="jr-testing-btn"
                onClick={runTestCartLimit}
              >
                + Add Test Item (Checks 9 Limit)
              </button>
            </div>

            <pre className="jr-testing-pre">
              {JSON.stringify(cart, null, 2)}
            </pre>
          </section>
        )}

        {/* Tab 6: Verification */}
        {activeTab === "verification" && (
          <section className="jr-testing-panel">
            <h2>Backend Payment Verification</h2>
            <p>
              Test authoritative backend status verification without fake triggers.
            </p>

            <div className="jr-testing-form-row">
              <label>
                Cart ID / Session ID:
                <input
                  type="text"
                  placeholder="e.g. 100 or UUID"
                  value={testCartId}
                  onChange={(e) => setTestCartId(e.target.value)}
                  className="jr-testing-input"
                />
              </label>

              <label>
                Order ID / Reference:
                <input
                  type="text"
                  placeholder="e.g. JR-123456"
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  className="jr-testing-input"
                />
              </label>
            </div>

            <button
              type="button"
              className="jr-testing-btn"
              onClick={runCheckOrderStatus}
              disabled={orderStatusLoading}
            >
              {orderStatusLoading ? "Checking..." : "Verify Order Status"}
            </button>

            {orderStatusResult && (
              <pre className="jr-testing-pre">
                {JSON.stringify(orderStatusResult, null, 2)}
              </pre>
            )}
          </section>
        )}

        {/* Tab 7: History */}
        {activeTab === "history" && (
          <section className="jr-testing-panel">
            <h2>Order History API Inspection</h2>
            <p>
              Queries <code>api.orders()</code> directly to inspect raw backend payload.
            </p>

            <button
              type="button"
              className="jr-testing-btn"
              onClick={runFetchHistory}
              disabled={historyLoading}
            >
              {historyLoading ? "Loading..." : "Fetch Backend Orders"}
            </button>

            {historyResult && (
              <div>
                <span className="jr-testing-count-badge">
                  {Array.isArray(historyResult)
                    ? `${historyResult.length} orders found`
                    : "No orders"}
                </span>
                <pre className="jr-testing-pre">
                  {JSON.stringify(historyResult, null, 2)}
                </pre>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Live Log Console */}
      <section className="jr-testing-console">
        <div className="jr-testing-console-head">
          <span>DIAGNOSTIC EVENT LOG</span>
          <button type="button" onClick={() => setLogs([])}>Clear Log</button>
        </div>
        <div className="jr-testing-console-body">
          {logs.length === 0 ? (
            <div className="jr-testing-log-empty">No events recorded yet. Run a test above.</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`jr-testing-log-item jr-testing-log-item--${log.type}`}>
                <span className="jr-testing-log-time">[{log.timestamp}]</span>
                <span className="jr-testing-log-msg">{log.msg}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

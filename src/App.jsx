import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import "./App.css";

/* =========================================================
   JUICE ROBO — CUSTOMER WEBSITE
   Auth + account + machine + menu + cart + checkout
   ========================================================= */

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;

const PRODUCT_IMAGES = {
  plain: `${ASSET_BASE}plain-juice.jpg`,
  lemon: `${ASSET_BASE}lemon-juice.jpg`,
  ginger: `${ASSET_BASE}ginger-juice.jpg`,
  "ginger-lemon": `${ASSET_BASE}ginger-lemon-juice.jpg`,
};

const STORAGE = {
  token: "juice_robo_token",
  user: "juice_robo_user",
  legacyUser: "user",
  customer: "juice_robo_customer",
  loggedIn: "juice_robo_logged_in",
  location: "juice_robo_location",
  machine: "juice_robo_machine",
};

function productText(product = {}) {
  return [
    product?.name,
    product?.description,
    product?.productName,
    product?.productType,
    product?.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function productImage(product = {}) {
  const text = productText(product);

  if (text.includes("ginger") && text.includes("lemon")) {
    return PRODUCT_IMAGES["ginger-lemon"];
  }

  if (text.includes("ginger")) return PRODUCT_IMAGES.ginger;
  if (text.includes("lemon")) return PRODUCT_IMAGES.lemon;
  return PRODUCT_IMAGES.plain;
}

function displayProductName(product = {}) {
  const text = productText(product);

  if (text.includes("ginger") && text.includes("lemon")) {
    return "Sugarcane Juice with Ginger + Lemon";
  }

  if (text.includes("ginger")) {
    return "Sugarcane Juice with Ginger";
  }

  if (text.includes("lemon")) {
    return "Sugarcane Juice with Lemon";
  }

  return "Plain Sugarcane Juice";
}

function displayDescription(product = {}) {
  const text = productText(product);

  if (text.includes("ginger") && text.includes("lemon")) {
    return "A refreshing blend of ginger, lemon and fresh sugarcane.";
  }

  if (text.includes("ginger")) {
    return "Fresh sugarcane juice with a zing of ginger.";
  }

  if (text.includes("lemon")) {
    return "Fresh sugarcane juice with a refreshing lemon twist.";
  }

  return "Freshly prepared plain sugarcane juice.";
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function getLocationId(location) {
  return String(location?.storeId || location?.id || "");
}

function readJSON(key, fallback = {}) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredUser() {
  return (
    readJSON(STORAGE.user, null) ||
    readJSON(STORAGE.legacyUser, null) ||
    {}
  );
}

function getUserKey(user) {
  return String(
    user?.id ||
      user?.userId ||
      user?.user_id ||
      user?.email ||
      user?.userEmail ||
      user?.phone ||
      user?.userName ||
      "guest"
  );
}

function cartStorageKey(user) {
  return `juice_robo_cart_${getUserKey(user)}`;
}

function orderStorageKey(user) {
  return `juice_robo_orders_${getUserKey(user)}`;
}

function normalizeCart(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      quantity: Math.max(1, Number(item.quantity || 1)),
    }));
}

function readUserCart(user) {
  try {
    return normalizeCart(
      JSON.parse(
        localStorage.getItem(cartStorageKey(user)) || "[]"
      )
    );
  } catch {
    return [];
  }
}

function readUserOrders(user) {
  try {
    const orders = JSON.parse(
      localStorage.getItem(orderStorageKey(user)) || "[]"
    );

    return Array.isArray(orders) ? orders : [];
  } catch {
    return [];
  }
}

function saveUserOrders(user, orders) {
  localStorage.setItem(
    orderStorageKey(user),
    JSON.stringify(orders)
  );
}

export default function App() {
  /*
   * Juice Robo is a mobile-only customer website.
   * Desktop browsers are intentionally blocked from the app UI.
   * Use Chrome DevTools device emulation or a real phone to test it.
   */
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => window.matchMedia("(max-width: 768px)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const updateViewport = () => {
      setIsMobileViewport(mediaQuery.matches);
    };

    updateViewport();
    mediaQuery.addEventListener?.("change", updateViewport);

    return () => {
      mediaQuery.removeEventListener?.("change", updateViewport);
    };
  }, []);

  if (!isMobileViewport) {
    return <MobileOnlyScreen />;
  }

  const storedUser = getStoredUser();
  const hasToken = Boolean(
    localStorage.getItem(STORAGE.token)
  );

  const [screen, setScreen] = useState(() =>
    hasToken ? "menu" : "login"
  );

  const [authMode, setAuthMode] = useState("login");

  const [user, setUser] = useState(storedUser);
  const [customer, setCustomer] = useState({
    name:
      storedUser?.name ||
      storedUser?.firstname ||
      storedUser?.firstName ||
      "",
    phone:
      storedUser?.phone ||
      storedUser?.userName ||
      "",
    email:
      storedUser?.email ||
      storedUser?.userEmail ||
      "",
  });

  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [machines, setMachines] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");

  const [selectedLocationId, setSelectedLocationId] = useState(
    () => localStorage.getItem(STORAGE.location) || ""
  );

  const [selectedMachineId, setSelectedMachineId] = useState(
    () => localStorage.getItem(STORAGE.machine) || ""
  );

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [cart, setCart] = useState(() =>
    hasToken ? readUserCart(storedUser) : []
  );

  const [orders, setOrders] = useState(() =>
    hasToken ? readUserOrders(storedUser) : []
  );

  const [toast, setToast] = useState("");

  /*
   * Frontend-only payment state.
   *
   * The current legacy API adapter exposes order/cart APIs but
   * intentionally does not expose the Razorpay create/verify APIs.
   * Therefore the redesigned frontend uses a clearly labelled
   * demo payment flow for UI testing only. No real payment is taken.
   */
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [completedOrder, setCompletedOrder] = useState(null);

  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) =>
          getLocationId(location) === String(selectedLocationId)
      ),
    [locations, selectedLocationId]
  );

  const selectedMachine = useMemo(
    () =>
      machines.find(
        (machine) =>
          String(machine?.id) === String(selectedMachineId)
      ),
    [machines, selectedMachineId]
  );

  const cartCount = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          Number(item.price || 0) *
            Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [productResponse, locationResponse, machineResponse] =
          await Promise.all([
            api.products(),
            api.locations(),
            api.machines(),
          ]);

        if (cancelled) return;

        setProducts(
          (Array.isArray(productResponse)
            ? productResponse
            : []
          ).map((product) => {
            const image = productImage(product);

            return {
              ...product,
              image,
              image_url: image,
              displayName: displayProductName(product),
              displayDescription: displayDescription(product),
            };
          })
        );

        setLocations(
          Array.isArray(locationResponse)
            ? locationResponse
            : []
        );

        setMachines(
          Array.isArray(machineResponse)
            ? machineResponse
            : []
        );
      } catch (e) {
        if (!cancelled) {
          console.error("Juice Robo load error:", e);
          setError(
            e?.message || "Unable to load Juice Robo."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || !getUserKey(user)) return;

    localStorage.setItem(
      cartStorageKey(user),
      JSON.stringify(normalizeCart(cart))
    );
  }, [cart, user]);

  useEffect(() => {
    if (!user) return;

    localStorage.setItem(
      STORAGE.user,
      JSON.stringify(user)
    );

    localStorage.setItem(
      STORAGE.legacyUser,
      JSON.stringify(user)
    );

    localStorage.setItem(
      STORAGE.customer,
      JSON.stringify({
        ...customer,
        name:
          user?.name ||
          customer?.name ||
          "",
        phone:
          user?.phone ||
          customer?.phone ||
          "",
        email:
          user?.email ||
          customer?.email ||
          "",
      })
    );
  }, [user, customer]);

  useEffect(() => {
    if (selectedLocationId) {
      localStorage.setItem(
        STORAGE.location,
        selectedLocationId
      );
    }
  }, [selectedLocationId]);

  useEffect(() => {
    if (selectedMachineId) {
      localStorage.setItem(
        STORAGE.machine,
        selectedMachineId
      );
    }
  }, [selectedMachineId]);

  function showToast(message) {
    setToast(message);

    window.clearTimeout(window.__juiceRoboToast);

    window.__juiceRoboToast = window.setTimeout(() => {
      setToast("");
    }, 2400);
  }

  function applyAuthenticatedUser(authResponse) {
    const nextUser =
      authResponse?.user ||
      authResponse?.data?.user ||
      authResponse?.data ||
      authResponse;

    const normalized = {
      ...user,
      ...(nextUser || {}),
      name:
        nextUser?.name ||
        [
          nextUser?.firstName,
          nextUser?.lastName,
        ]
          .filter(Boolean)
          .join(" ") ||
        customer?.name ||
        "Juice Lover",
      email:
        nextUser?.email ||
        nextUser?.userEmail ||
        customer?.email ||
        "",
      phone:
        nextUser?.phone ||
        nextUser?.userName ||
        customer?.phone ||
        "",
    };

    setUser(normalized);
    setCustomer((current) => ({
      ...current,
      ...normalized,
    }));

    localStorage.setItem(
      STORAGE.loggedIn,
      "true"
    );

    return normalized;
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError("");

    const identifier = String(
      customer?.email ||
        customer?.phone ||
        ""
    ).trim();

    const password = String(
      customer?.password || ""
    );

    if (!identifier) {
      setAuthError(
        "Enter your email address or phone number."
      );
      return;
    }

    if (!password) {
      setAuthError("Enter your password.");
      return;
    }

    try {
      setBusy(true);

      const response = await api.login({
        userName: identifier,
        password,
      });

      const token =
        response?.accessToken ||
        response?.access_token ||
        localStorage.getItem(STORAGE.token);

      if (!token) {
        throw new Error(
          "Login succeeded without an access token. Please check the API response."
        );
      }

      const nextUser = applyAuthenticatedUser(response);

      setCustomer((current) => ({
        ...current,
        password: "",
        name:
          nextUser?.name ||
          current.name ||
          "",
      }));

      setCart(readUserCart(nextUser));
      setOrders(readUserOrders(nextUser));
      setScreen("menu");

      showToast(
        `Welcome, ${nextUser?.name || "Juice Lover"}`
      );
    } catch (e) {
      console.error("Juice Robo login error:", e);
      setAuthError(
        e?.message ||
          "Unable to sign in. Please check your details."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setAuthError("");

    const name = String(
      customer?.name || ""
    ).trim();

    const phone = String(
      customer?.phone || ""
    ).trim();

    const email = String(
      customer?.email || ""
    ).trim();

    const password = String(
      customer?.password || ""
    );

    const confirmPassword = String(
      customer?.confirmPassword || ""
    );

    if (!name) {
      setAuthError("Enter your full name.");
      return;
    }

    if (!phone && !email) {
      setAuthError(
        "Enter a phone number or email address."
      );
      return;
    }

    if (password.length < 6) {
      setAuthError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    try {
      setBusy(true);

      const response = await api.register({
        name,
        phone,
        email,
        userName: phone || email,
        userEmail: email,
        password,
        confirmPassword,
      });

      const token =
        response?.accessToken ||
        response?.access_token ||
        localStorage.getItem(STORAGE.token);

      let authResponse = response;

      /*
       * Some register implementations create the user but do not
       * return a token. In that case, sign in immediately with the
       * credentials just created.
       */
      if (!token) {
        authResponse = await api.login({
          userName: phone || email,
          password,
        });
      }

      const nextUser = applyAuthenticatedUser(authResponse);

      setCustomer((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));

      setCart(readUserCart(nextUser));
      setOrders(readUserOrders(nextUser));
      setScreen("menu");

      showToast(
        `Account created. Welcome, ${nextUser?.name || name}.`
      );
    } catch (e) {
      console.error("Juice Robo signup error:", e);
      setAuthError(
        e?.message ||
          "Unable to create your account."
      );
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem("_token");
    localStorage.removeItem(STORAGE.loggedIn);
    localStorage.removeItem(STORAGE.user);
    localStorage.removeItem(STORAGE.legacyUser);
    localStorage.removeItem(STORAGE.customer);

    setUser({});
    setCustomer({
      name: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    });

    setCart([]);
    setOrders([]);
    setAuthError("");
    setAuthMode("login");
    setScreen("login");

    showToast("You have been signed out.");
  }

  async function openProfile() {
    setScreen("profile");

    if (!user?.id) return;

    try {
      const profile = await api.profile();

      if (profile && typeof profile === "object") {
        const nextUser = {
          ...user,
          ...profile,
        };

        setUser(nextUser);
        setCustomer((current) => ({
          ...current,
          ...nextUser,
        }));
      }
    } catch (e) {
      console.warn("Profile refresh unavailable:", e);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setAuthError("");

    try {
      setBusy(true);

      const payload = {
        name: String(
          customer?.name || ""
        ).trim(),
        phone: String(
          customer?.phone || ""
        ).trim(),
        email: String(
          customer?.email || ""
        ).trim(),
      };

      const updated = await api.updateProfile(payload);

      const nextUser = {
        ...user,
        ...(updated || {}),
        ...payload,
      };

      setUser(nextUser);

      localStorage.setItem(
        STORAGE.user,
        JSON.stringify(nextUser)
      );

      localStorage.setItem(
        STORAGE.legacyUser,
        JSON.stringify(nextUser)
      );

      showToast("Profile updated.");
    } catch (e) {
      console.error("Profile update error:", e);
      setAuthError(
        e?.message || "Unable to update your profile."
      );
    } finally {
      setBusy(false);
    }
  }

  function selectLocation(location) {
    const id = getLocationId(location);

    setSelectedLocationId(id);
    setSelectedMachineId("");

    localStorage.setItem(
      STORAGE.location,
      id
    );

    localStorage.removeItem(
      STORAGE.machine
    );

    showToast(
      location?.name || "Location selected"
    );
  }

  function selectMachine(machine) {
    const id = String(machine?.id || "");

    setSelectedMachineId(id);

    localStorage.setItem(
      STORAGE.machine,
      id
    );

    showToast(
      `${machine?.name || "Machine"} selected`
    );
  }

  function openProduct(product) {
    setSelectedProduct(product);

    const existing = cart.find(
      (item) =>
        String(item.id) ===
        String(product.id)
    );

    setQuantity(
      existing
        ? Number(existing.quantity || 1)
        : 1
    );
  }

  function closeProduct() {
    setSelectedProduct(null);
    setQuantity(1);
  }

  function addProduct(product, nextQuantity) {
    const qty = Math.max(
      1,
      Number(nextQuantity || 1)
    );

    setCart((current) => {
      const exists = current.find(
        (item) =>
          String(item.id) ===
          String(product.id)
      );

      if (exists) {
        return current.map((item) =>
          String(item.id) ===
          String(product.id)
            ? {
                ...item,
                quantity: qty,
              }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: qty,
        },
      ];
    });
  }

  function confirmProduct() {
    if (!selectedProduct) return;

    addProduct(
      selectedProduct,
      quantity
    );

    showToast(
      `${displayProductName(
        selectedProduct
      )} added`
    );

    closeProduct();
  }

  function removeProduct(productId) {
    setCart((current) =>
      current.filter(
        (item) =>
          String(item.id) !==
          String(productId)
      )
    );
  }

  function updateQuantity(productId, nextQuantity) {
    const qty = Number(nextQuantity);

    if (qty <= 0) {
      removeProduct(productId);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        String(item.id) ===
        String(productId)
          ? {
              ...item,
              quantity: qty,
            }
          : item
      )
    );
  }

  function startCheckout() {
    if (!cart.length) {
      showToast("Your cart is empty.");
      setScreen("menu");
      return;
    }

    if (!selectedLocationId) {
      showToast("Select a collection location.");
      setScreen("machine");
      return;
    }

    if (!selectedMachineId) {
      showToast("Select a Juice Robo machine.");
      setScreen("machine");
      return;
    }

    setPaymentMethod("upi");
    setPaymentStatus("idle");
    setCompletedOrder(null);
    setScreen("payment");
  }

  /* =========================================================
     FRONTEND PAYMENT TEST FLOW
     ========================================================= */

  function completeDemoPayment() {
    if (!cart.length) {
      showToast("Your cart is empty.");
      setScreen("menu");
      return;
    }

    if (paymentStatus === "processing") return;

    setPaymentStatus("processing");

    /*
     * This timeout intentionally simulates the visual payment
     * lifecycle for the frontend final test. It does NOT charge
     * money and must be replaced by the real Razorpay flow when
     * createPaymentOrder()/verifyPayment() are supplied.
     */
    window.setTimeout(() => {
      const collectionCode = String(
        Math.floor(1000 + Math.random() * 9000)
      );

      const orderId = `JR-${Date.now()}`;

      const order = {
        id: orderId,
        order_number: orderId,
        status: "READY_FOR_COLLECTION",
        payment_status: "PAID",
        total_amount: cartTotal,
        collection_code: collectionCode,
        collectionCode,
        location_id: selectedLocationId,
        machine_id: selectedMachineId,
        location_name: selectedLocation?.name || "Juice Robo",
        machine_name: selectedMachine?.name || "Juice Robo Machine",
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          product_id: item.id,
          product_name:
            item.displayName || displayProductName(item),
          quantity: Number(item.quantity || 1),
          unit_price: Number(item.price || 0),
          subtotal:
            Number(item.price || 0) *
            Number(item.quantity || 0),
        })),
        created_at: new Date().toISOString(),
      };

      setCompletedOrder(order);
      setOrders((current) => {
        const next = [order, ...current].slice(0, 40);
        saveUserOrders(user, next);
        return next;
      });

      setCart([]);
      setPaymentStatus("success");
      setScreen("confirmation");

      showToast("Payment successful.");
    }, 1200);
  }

  function retryPayment() {
    setPaymentStatus("idle");
    setScreen("payment");
  }

  function paymentPlaceholder() {
    return (
      <PaymentScreen
        cart={cart}
        total={cartTotal}
        location={selectedLocation}
        machine={selectedMachine}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentStatus={paymentStatus}
        onBack={() => {
          if (paymentStatus !== "processing") {
            setPaymentStatus("idle");
            setScreen("cart");
          }
        }}
        onPay={completeDemoPayment}
      />
    );
  }

  if (loading) return <LoadingScreen />;

  if (
    error &&
    !products.length &&
    !locations.length
  ) {
    return (
      <div className="jr-app">
        <div className="jr-error-screen">
          <div className="jr-error-icon">!</div>

          <h1>Something went wrong</h1>

          <p>{error}</p>

          <button
            className="jr-button jr-button-primary"
            onClick={() => window.location.reload()}
            type="button"
          >
            TRY AGAIN
          </button>
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="jr-app">
        <div className="jr-mobile-frame">
          <AuthScreen
            mode={authMode}
            setMode={(mode) => {
              setAuthMode(mode);
              setAuthError("");
            }}
            customer={customer}
            setCustomer={setCustomer}
            onLogin={handleLogin}
            onSignup={handleSignup}
            busy={busy}
            error={authError}
          />

          {toast && (
            <Toast message={toast} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="jr-app">
      <div className="jr-mobile-frame">
        <Header
          cartCount={cartCount}
          location={selectedLocation}
          machine={selectedMachine}
          user={user}
          onCart={() => setScreen("cart")}
          onAccount={openProfile}
          onLocation={() => setScreen("machine")}
        />

        {screen === "menu" && (
          <MenuScreen
            products={products}
            selectedLocation={selectedLocation}
            selectedMachine={selectedMachine}
            user={user}
            onProduct={openProduct}
          />
        )}

        {screen === "machine" && (
          <MachineScreen
            locations={locations}
            machines={machines}
            selectedLocationId={selectedLocationId}
            selectedMachineId={selectedMachineId}
            onLocation={selectLocation}
            onMachine={selectMachine}
            onContinue={() => setScreen("menu")}
          />
        )}

        {screen === "cart" && (
          <CartScreen
            cart={cart}
            total={cartTotal}
            location={selectedLocation}
            machine={selectedMachine}
            onBack={() => setScreen("menu")}
            onUpdate={updateQuantity}
            onRemove={removeProduct}
            onLocation={() => setScreen("machine")}
            onCheckout={startCheckout}
          />
        )}

        {screen === "payment" &&
          paymentPlaceholder()}

        {screen === "confirmation" && (
          <ConfirmationScreen
            order={completedOrder}
            location={selectedLocation}
            machine={selectedMachine}
            onHome={() => {
              setCompletedOrder(null);
              setPaymentStatus("idle");
              setScreen("menu");
            }}
          />
        )}

        {screen === "profile" && (
          <ProfileScreen
            user={user}
            customer={customer}
            setCustomer={setCustomer}
            orders={orders}
            onSave={saveProfile}
            onLogout={logout}
            onBack={() => setScreen("menu")}
            busy={busy}
            error={authError}
            onOrders={() => setScreen("history")}
          />
        )}

        {screen === "history" && (
          <HistoryScreen
            orders={orders}
            onBack={() => setScreen("profile")}
          />
        )}

        <BottomBar
          screen={screen}
          cartCount={cartCount}
          onMenu={() => setScreen("menu")}
          onMachine={() => setScreen("machine")}
          onCart={() => setScreen("cart")}
          onAccount={openProfile}
        />

        {selectedProduct && (
          <ProductSheet
            product={selectedProduct}
            quantity={quantity}
            setQuantity={setQuantity}
            onClose={closeProduct}
            onConfirm={confirmProduct}
          />
        )}

        {toast && (
          <Toast message={toast} />
        )}
      </div>
    </div>
  );
}

function MobileOnlyScreen() {
  return (
    <div className="jr-mobile-only-screen">
      <div className="jr-mobile-only-card">
        <div className="jr-mobile-only-logo">JR</div>

        <span className="jr-mobile-only-eyebrow">
          JUICE ROBO
        </span>

        <h1>Mobile Only</h1>

        <p>
          This website is optimized for mobile devices.
          Please access it on your mobile phone.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   AUTH
   ========================================================= */

function AuthScreen({
  mode,
  setMode,
  customer,
  setCustomer,
  onLogin,
  onSignup,
  busy,
  error,
}) {
  const signup = mode === "signup";

  function update(field, value) {
    setCustomer((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="jr-login-screen">
      <div className="jr-login-brand">
        <div className="jr-login-logo">JR</div>
        <span>JUICE ROBO</span>
      </div>

      <div className="jr-login-copy">
        <span className="jr-eyebrow">
          {signup
            ? "CREATE YOUR JUICE ROBO ACCOUNT"
            : "FRESH JUICE · READY WHEN YOU ARE"}
        </span>

        <h1>
          {signup ? (
            <>
              Fresh juice,
              <br />
              <em>made personal.</em>
            </>
          ) : (
            <>
              Your favourite
              <br />
              <em>juice awaits.</em>
            </>
          )}
        </h1>

        <p>
          {signup
            ? "Create an account to keep your orders, profile and Juice Robo activity together."
            : "Sign in to access your account and order from Juice Robo."}
        </p>
      </div>

      <form
        className="jr-login-form"
        onSubmit={signup ? onSignup : onLogin}
      >
        {signup && (
          <label>
            FULL NAME
            <input
              type="text"
              value={customer?.name || ""}
              onChange={(event) =>
                update("name", event.target.value)
              }
              placeholder="Enter your full name"
              autoComplete="name"
            />
          </label>
        )}

        <label>
          {signup
            ? "PHONE NUMBER"
            : "EMAIL OR PHONE NUMBER"}
          <input
            type={signup ? "tel" : "text"}
            value={
              signup
                ? customer?.phone || ""
                : customer?.email ||
                  customer?.phone ||
                  ""
            }
            onChange={(event) => {
              const value = event.target.value;

              if (signup) {
                update("phone", value);
              } else {
                update(
                  value.includes("@")
                    ? "email"
                    : "phone",
                  value
                );
              }
            }}
            placeholder={
              signup
                ? "Enter phone number"
                : "Email or phone number"
            }
            autoComplete={
              signup
                ? "tel"
                : "username"
            }
          />
        </label>

        {signup && (
          <label>
            EMAIL
            <input
              type="email"
              value={customer?.email || ""}
              onChange={(event) =>
                update("email", event.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
            />
          </label>
        )}

        <label>
          PASSWORD
          <input
            type="password"
            value={customer?.password || ""}
            onChange={(event) =>
              update("password", event.target.value)
            }
            placeholder={
              signup
                ? "Create a password"
                : "Enter your password"
            }
            autoComplete={
              signup
                ? "new-password"
                : "current-password"
            }
          />
        </label>

        {signup && (
          <label>
            CONFIRM PASSWORD
            <input
              type="password"
              value={customer?.confirmPassword || ""}
              onChange={(event) =>
                update(
                  "confirmPassword",
                  event.target.value
                )
              }
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
          </label>
        )}

        {error && (
          <div className="jr-form-error">
            {error}
          </div>
        )}

        <button
          className="jr-button jr-button-primary jr-full"
          type="submit"
          disabled={busy}
        >
          {busy
            ? "PLEASE WAIT..."
            : signup
            ? "CREATE ACCOUNT"
            : "SIGN IN"}
          {!busy && <span>→</span>}
        </button>
      </form>

      <div className="jr-auth-switch">
        {signup
          ? "Already have an account?"
          : "New to Juice Robo?"}

        <button
          type="button"
          onClick={() =>
            setMode(
              signup
                ? "login"
                : "signup"
            )
          }
        >
          {signup
            ? "SIGN IN"
            : "CREATE ACCOUNT"}
        </button>
      </div>

      <div className="jr-login-note">
        Your account keeps your Juice Robo
        experience personal to you.
      </div>
    </main>
  );
}

/* =========================================================
   HEADER
   ========================================================= */

function Header({
  cartCount,
  location,
  machine,
  user,
  onCart,
  onAccount,
  onLocation,
}) {
  const initials =
    String(user?.name || "J")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <header className="jr-header">
      <button
        className="jr-header-location"
        onClick={onLocation}
        type="button"
      >
        <span className="jr-location-pin">⌖</span>

        <span>
          <small>COLLECT FROM</small>

          <strong>
            {location?.name || "Choose location"}
          </strong>

          {machine?.name && (
            <small className="jr-header-machine">
              {machine.name}
            </small>
          )}
        </span>

        <span className="jr-chevron">˅</span>
      </button>

      <div className="jr-header-actions">
        <button
          className="jr-account-button"
          onClick={onAccount}
          type="button"
          aria-label="Open account"
        >
          {initials}
        </button>

        <button
          className="jr-cart-button"
          onClick={onCart}
          type="button"
          aria-label="Open cart"
        >
          🛒

          {cartCount > 0 && (
            <b>{cartCount}</b>
          )}
        </button>
      </div>
    </header>
  );
}

/* =========================================================
   MENU
   ========================================================= */

function MenuScreen({
  products,
  selectedLocation,
  selectedMachine,
  user,
  onProduct,
}) {
  const firstName =
    String(user?.name || "there")
      .trim()
      .split(/\s+/)[0];

  return (
    <main className="jr-content">
      <section className="jr-welcome">
        <div>
          <span className="jr-eyebrow">
            WELCOME BACK, {firstName.toUpperCase()}
          </span>

          <h1>
            Your favourite
            <br />
            <em>juice, your way.</em>
          </h1>

          <p>
            Pick your juice, choose your quantity
            and collect it fresh from your Juice Robo
            machine.
          </p>
        </div>

        <div className="jr-welcome-icon">
          🧃
        </div>
      </section>

      <button
        className="jr-selected-machine-banner"
        type="button"
      >
        <span>⌖</span>

        <div>
          <small>COLLECTING FROM</small>

          <strong>
            {selectedLocation?.name ||
              "Choose a location"}
          </strong>

          <small>
            {selectedMachine?.name ||
              "Choose a machine"}
          </small>
        </div>
      </button>

      <section className="jr-menu-section">
        <div className="jr-section-heading">
          <div>
            <span className="jr-eyebrow">
              AVAILABLE JUICES
            </span>

            <h2>What are you craving?</h2>
          </div>

          <span className="jr-count">
            {products.length}
          </span>
        </div>

        <p className="jr-section-subtitle">
          Choose your favourite fresh juice.
        </p>

        <div className="jr-products">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onProduct}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   MACHINE / LOCATION
   ========================================================= */

function MachineScreen({
  locations,
  machines,
  selectedLocationId,
  selectedMachineId,
  onLocation,
  onMachine,
  onContinue,
}) {
  return (
    <main className="jr-content jr-page jr-location-page">
      <span className="jr-eyebrow">
        COLLECTION POINT
      </span>

      <h1 className="jr-page-title">
        Choose your
        <br />
        <em>Juice Robo.</em>
      </h1>

      <p className="jr-page-description">
        Select where you want to collect your
        juice and then choose the available machine.
      </p>

      <section className="jr-flow-section">
        <div className="jr-flow-heading">
          <span>01</span>

          <div>
            <strong>SELECT LOCATION</strong>
            <small>
              Where will you collect your juice?
            </small>
          </div>
        </div>

        <div className="jr-choice-list">
          {locations.map((location) => {
            const id = getLocationId(location);
            const active =
              String(id) ===
              String(selectedLocationId);

            return (
              <button
                className={
                  active
                    ? "jr-choice active"
                    : "jr-choice"
                }
                key={id}
                type="button"
                onClick={() => onLocation(location)}
              >
                <span className="jr-choice-icon">
                  ⌖
                </span>

                <span className="jr-choice-copy">
                  <strong>
                    {location?.name ||
                      "Juice Robo"}
                  </strong>

                  <small>
                    {location?.address ||
                      "Collection point"}
                  </small>
                </span>

                <span className="jr-choice-check">
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="jr-flow-section">
        <div className="jr-flow-heading">
          <span>02</span>

          <div>
            <strong>SELECT MACHINE</strong>
            <small>
              Choose your Juice Robo machine.
            </small>
          </div>
        </div>

        <div className="jr-machine-list">
          {machines.map((machine) => {
            const id = String(machine?.id || "");
            const active =
              id === String(selectedMachineId);

            return (
              <button
                className={
                  active
                    ? "jr-machine-card active"
                    : "jr-machine-card"
                }
                key={id}
                type="button"
                onClick={() => onMachine(machine)}
              >
                <span className="jr-machine-icon">
                  🧃
                </span>

                <span className="jr-machine-copy">
                  <strong>
                    {machine?.name ||
                      "Juice Robo Machine"}
                  </strong>

                  <small>
                    {machine?.status ||
                      "ONLINE"}
                  </small>
                </span>

                <span className="jr-machine-status">
                  <i />
                  {active
                    ? "SELECTED"
                    : "AVAILABLE"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <button
        className="jr-button jr-button-primary jr-full jr-location-continue"
        type="button"
        onClick={onContinue}
        disabled={
          !selectedLocationId ||
          !selectedMachineId
        }
      >
        CONTINUE TO MENU
        <span>→</span>
      </button>
    </main>
  );
}

/* =========================================================
   PRODUCT CARD
   ========================================================= */

function ProductCard({ product, onSelect }) {
  const name =
    product.displayName ||
    displayProductName(product);

  const description =
    product.displayDescription ||
    displayDescription(product);

  return (
    <button
      className="jr-product-card"
      type="button"
      onClick={() => onSelect(product)}
    >
      <div className="jr-product-image-wrap">
        <img
          src={
            product.image ||
            productImage(product)
          }
          alt={name}
          className="jr-product-image"
          onError={(event) => {
            event.currentTarget.src =
              productImage(product);
          }}
        />

        <span className="jr-fresh-badge">
          ● FRESH
        </span>
      </div>

      <div className="jr-product-info">
        <div>
          <span className="jr-product-type">
            SUGARCANE JUICE
          </span>

          <h3>{name}</h3>

          <p>{description}</p>
        </div>

        <div className="jr-product-footer">
          <strong>
            {money(product.price)}
          </strong>

          <span className="jr-select-circle">
            +
          </span>
        </div>
      </div>
    </button>
  );
}

/* =========================================================
   PRODUCT SHEET
   ========================================================= */

function ProductSheet({
  product,
  quantity,
  setQuantity,
  onClose,
  onConfirm,
}) {
  const name =
    product.displayName ||
    displayProductName(product);

  const description =
    product.displayDescription ||
    displayDescription(product);

  const total =
    Number(product.price || 0) *
    Number(quantity || 1);

  return (
    <div
      className="jr-sheet-backdrop"
      onClick={onClose}
    >
      <section
        className="jr-product-sheet"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="jr-sheet-image-wrap">
          <img
            src={
              product.image ||
              productImage(product)
            }
            alt={name}
          />

          <button
            className="jr-sheet-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="jr-sheet-body">
          <span className="jr-eyebrow">
            FRESH SUGARCANE JUICE
          </span>

          <h2>{name}</h2>

          <p>{description}</p>

          <div className="jr-sheet-price">
            <span>Price per juice</span>
            <strong>
              {money(product.price)}
            </strong>
          </div>

          <div className="jr-quantity-row">
            <div>
              <span>QUANTITY</span>
              <small>
                How many would you like?
              </small>
            </div>

            <QuantityControl
              value={quantity}
              onChange={setQuantity}
            />
          </div>

          <div className="jr-sheet-total">
            <span>TOTAL</span>
            <strong>{money(total)}</strong>
          </div>

          <button
            className="jr-button jr-button-primary jr-full"
            type="button"
            onClick={onConfirm}
          >
            ADD TO CART
            <span>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   QUANTITY
   ========================================================= */

function QuantityControl({ value, onChange }) {
  return (
    <div className="jr-quantity-control">
      <button
        type="button"
        onClick={() =>
          onChange(
            Math.max(
              1,
              Number(value) - 1
            )
          )
        }
        aria-label="Decrease quantity"
      >
        −
      </button>

      <strong>{value}</strong>

      <button
        type="button"
        onClick={() =>
          onChange(Number(value) + 1)
        }
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

/* =========================================================
   CART QUANTITY
   ========================================================= */

function CartQuantityControl({
  value,
  onUpdate,
  onRemove,
}) {
  const quantity = Math.max(
    1,
    Number(value) || 1
  );

  function decrease() {
    // Quantity 1 + minus = remove the complete item.
    if (quantity === 1) {
      onRemove();
      return;
    }

    onUpdate(quantity - 1);
  }

  return (
    <div className="jr-quantity-control">
      <button
        type="button"
        onClick={decrease}
        aria-label={
          quantity === 1
            ? "Remove item from cart"
            : "Decrease quantity"
        }
      >
        −
      </button>

      <strong>{quantity}</strong>

      <button
        type="button"
        onClick={() =>
          onUpdate(quantity + 1)
        }
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

/* =========================================================
   CART
   ========================================================= */

function CartScreen({
  cart,
  total,
  location,
  machine,
  onBack,
  onUpdate,
  onRemove,
  onLocation,
  onCheckout,
}) {
  return (
    <main className="jr-content jr-page">
      <div className="jr-cart-topline">
        <button
          className="jr-back-link"
          onClick={onBack}
          type="button"
        >
          ← Continue shopping
        </button>

        <span className="jr-eyebrow">
          REVIEW ORDER
        </span>
      </div>

      <h1 className="jr-page-title">
        Your
        <br />
        <em>order.</em>
      </h1>

      {!cart.length ? (
        <div className="jr-empty">
          <span>🧃</span>

          <h3>Your cart is empty</h3>

          <p>
            Choose a juice from the menu.
          </p>

          <button
            className="jr-button jr-button-primary"
            onClick={onBack}
            type="button"
          >
            BROWSE JUICES
          </button>
        </div>
      ) : (
        <>
          <div className="jr-cart-list">
            {cart.map((item) => (
              <div
                className="jr-cart-item"
                key={item.id}
              >
                <img
                  src={
                    item.image ||
                    productImage(item)
                  }
                  alt={
                    item.displayName ||
                    displayProductName(item)
                  }
                />

                <div className="jr-cart-info">
                  <span>
                    {item.displayName ||
                      displayProductName(item)}
                  </span>

                  <strong>
                    {money(item.price)}
                  </strong>

                  <CartQuantityControl
                    value={item.quantity}
                    onUpdate={(value) =>
                      onUpdate(
                        item.id,
                        value
                      )
                    }
                    onRemove={() =>
                      onRemove(item.id)
                    }
                  />
                </div>

                <button
                  className="jr-remove"
                  type="button"
                  onClick={() =>
                    onRemove(item.id)
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            className="jr-venue-selected"
            onClick={onLocation}
            type="button"
          >
            <span className="jr-venue-selected-icon">
              ⌖
            </span>

            <span>
              <small>COLLECTION</small>

              <strong>
                {location?.name ||
                  "Choose location"}
              </strong>

              <small>
                {machine?.name ||
                  "Choose machine"}
              </small>
            </span>

            <b>→</b>
          </button>

          <div className="jr-order-summary">
            <div>
              <span>Items</span>
              <strong>
                {cart.reduce(
                  (sum, item) =>
                    sum +
                    Number(item.quantity || 0),
                  0
                )}
              </strong>
            </div>

            <div className="jr-summary-total">
              <span>TOTAL TO PAY</span>
              <strong>{money(total)}</strong>
            </div>
          </div>

          <button
            className="jr-button jr-button-primary jr-full"
            onClick={onCheckout}
            type="button"
          >
            PLACE ORDER
            <span>→</span>
          </button>
        </>
      )}
    </main>
  );
}

/* =========================================================
   PROFILE
   ========================================================= */

function ProfileScreen({
  user,
  customer,
  setCustomer,
  orders,
  onSave,
  onLogout,
  onBack,
  busy,
  error,
  onOrders,
}) {
  const name =
    user?.name ||
    user?.firstname ||
    "Juice Lover";

  const initial =
    String(name)
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  function update(field, value) {
    setCustomer((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="jr-content jr-page jr-profile-page">
      <button
        className="jr-back-link"
        onClick={onBack}
        type="button"
      >
        ← Back to menu
      </button>

      <span className="jr-eyebrow">
        YOUR ACCOUNT
      </span>

      <h1 className="jr-page-title">
        Hello,
        <br />
        <em>{name.split(" ")[0]}.</em>
      </h1>

      <section className="jr-profile-hero">
        <div className="jr-profile-avatar">
          {initial}
        </div>

        <div>
          <strong>{name}</strong>

          <small>
            {user?.email ||
              user?.phone ||
              "Juice Robo member"}
          </small>
        </div>
      </section>

      <section className="jr-account-card">
        <div className="jr-account-card-heading">
          <div>
            <span className="jr-eyebrow">
              PROFILE
            </span>

            <strong>Your details</strong>
          </div>
        </div>

        <form
          className="jr-form"
          onSubmit={onSave}
        >
          <label>
            FULL NAME
            <input
              type="text"
              value={customer?.name || ""}
              onChange={(event) =>
                update(
                  "name",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            PHONE NUMBER
            <input
              type="tel"
              value={customer?.phone || ""}
              onChange={(event) =>
                update(
                  "phone",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            EMAIL
            <input
              type="email"
              value={customer?.email || ""}
              onChange={(event) =>
                update(
                  "email",
                  event.target.value
                )
              }
            />
          </label>

          {error && (
            <div className="jr-form-error">
              {error}
            </div>
          )}

          <button
            className="jr-button jr-button-primary jr-full"
            type="submit"
            disabled={busy}
          >
            {busy
              ? "SAVING..."
              : "SAVE PROFILE"}
            {!busy && <span>→</span>}
          </button>
        </form>
      </section>

      <button
        className="jr-account-action"
        type="button"
        onClick={onOrders}
      >
        <span>▣</span>

        <div>
          <strong>My orders</strong>
          <small>
            {orders.length} saved order
            {orders.length === 1 ? "" : "s"}
          </small>
        </div>

        <b>→</b>
      </button>

      <button
        className="jr-account-action jr-account-action-danger"
        type="button"
        onClick={onLogout}
      >
        <span>↪</span>

        <div>
          <strong>Sign out</strong>
          <small>
            Sign out of this Juice Robo account
          </small>
        </div>

        <b>→</b>
      </button>
    </main>
  );
}

/* =========================================================
   HISTORY
   ========================================================= */

function HistoryScreen({ orders, onBack }) {
  return (
    <main className="jr-content jr-page">
      <div className="jr-history-header">
      <button
        className="jr-back-link"
        onClick={onBack}
        type="button"
      >
        ← Account
      </button>

      <span className="jr-eyebrow">
        ORDER HISTORY
      </span>
    </div>

      <h1 className="jr-page-title">
        My
        <br />
        <em>orders.</em>
      </h1>

      {!orders.length ? (
        <div className="jr-empty">
          <span>🧃</span>
          <h3>No orders yet</h3>
          <p>
            Your completed Juice Robo orders
            will appear here.
          </p>
        </div>
      ) : (
        <div className="jr-history-list">
          {orders.map((order, index) => (
            <section
              className="jr-history-card"
              key={
                order?.id ||
                order?.order_id ||
                index
              }
            >
              <div>
                <small>ORDER</small>
                <strong>
                  {order?.order_number ||
                    order?.orderId ||
                    order?.id ||
                    "Juice Robo order"}
                </strong>
              </div>

              <div>
                <small>STATUS</small>
                <strong>
                  {order?.status ||
                    "CONFIRMED"}
                </strong>
              </div>

              <div>
                <small>TOTAL</small>
                <strong>
                  {money(
                    order?.total_amount ||
                      order?.totalAmount
                  )}
                </strong>
              </div>

              {(order?.collection_code ||
                order?.collectionCode) && (
                <div className="jr-history-code">
                  <small>
                    COLLECTION CODE
                  </small>

                  <strong>
                    {String(
                      order.collection_code ||
                        order.collectionCode
                    )}
                  </strong>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

/* =========================================================
   PAYMENT SCREEN
   ========================================================= */

function PaymentScreen({
  cart,
  total,
  location,
  machine,
  paymentMethod,
  setPaymentMethod,
  paymentStatus,
  onBack,
  onPay,
}) {
  const isProcessing = paymentStatus === "processing";

  const methods = [
    {
      id: "upi",
      icon: "↗",
      title: "UPI",
      subtitle: "Google Pay · PhonePe · Paytm",
    },
    {
      id: "card",
      icon: "▣",
      title: "Cards",
      subtitle: "Credit or debit card",
    },
    {
      id: "netbanking",
      icon: "⌂",
      title: "Netbanking",
      subtitle: "Pay directly from your bank",
    },
    {
      id: "wallet",
      icon: "◈",
      title: "Wallets",
      subtitle: "Available supported wallets",
    },
  ];

  return (
    <main className="jr-content jr-page jr-payment-page">
      <button
        className="jr-back-link"
        onClick={onBack}
        type="button"
        disabled={isProcessing}
      >
        ← Review order
      </button>

      <span className="jr-eyebrow">PAYMENT</span>

      <h1 className="jr-page-title">
        Almost
        <br />
        <em>there.</em>
      </h1>

      <section className="jr-payment-placeholder">
        <div className="jr-payment-icon">
          {isProcessing ? "…" : "₹"}
        </div>

        <h2>
          {isProcessing ? "Processing payment" : "Secure payment"}
        </h2>

        <p>
          {isProcessing
            ? "Please wait while we complete your payment."
            : "Choose a payment method and complete your Juice Robo order."}
        </p>

        {!isProcessing && (
          <div className="jr-payment-methods">
            {methods.map((method) => {
              const active = paymentMethod === method.id;

              return (
                <button
                  key={method.id}
                  type="button"
                  className={
                    active
                      ? "jr-payment-method active"
                      : "jr-payment-method"
                  }
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <span className="jr-payment-method-icon">
                    {method.icon}
                  </span>

                  <span className="jr-payment-method-copy">
                    <strong>{method.title}</strong>
                    <small>{method.subtitle}</small>
                  </span>

                  <span className="jr-payment-method-check">
                    {active ? "✓" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="jr-payment-collection">
          <span>
            <small>COLLECT FROM</small>
            <strong>{location?.name || "Selected location"}</strong>
          </span>

          <span>
            <small>MACHINE</small>
            <strong>{machine?.name || "Selected machine"}</strong>
          </span>
        </div>

        <div className="jr-payment-total">
          <span>AMOUNT TO PAY</span>
          <strong>{money(total)}</strong>
        </div>

        <button
          className="jr-button jr-button-primary jr-full"
          type="button"
          onClick={onPay}
          disabled={!cart.length || isProcessing}
        >
          {isProcessing
            ? "PROCESSING PAYMENT..."
            : `PAY ${money(total)}`}
          {!isProcessing && <span>→</span>}
        </button>

        <div className="jr-payment-demo-note">
          <strong>FRONTEND TEST MODE</strong>
          <span>
            This button simulates a successful payment for UI testing only.
            No real money is charged.
          </span>
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   CONFIRMATION
   ========================================================= */

function ConfirmationScreen({
  order,
  location,
  machine,
  onHome,
}) {
  const rawCode =
    order?.collection_code ||
    order?.collectionCode ||
    "";

  const code = String(rawCode)
    .replace(/\D/g, "")
    .slice(-4)
    .padStart(4, "0");

  return (
    <main className="jr-content jr-page jr-confirmation">
      <div className="jr-success-icon">✓</div>

      <span className="jr-eyebrow">PAYMENT SUCCESSFUL</span>

      <h1 className="jr-page-title">
        Your juice is
        <br />
        <em>booked!</em>
      </h1>

      <p className="jr-page-description">
        Your payment was completed and your order is ready for collection.
      </p>

      <section className="jr-code-card">
        <span>YOUR COLLECTION CODE</span>

        <div className="jr-code-digits">
          {code.split("").map((digit, index) => (
            <span className="jr-code-digit" key={`${digit}-${index}`}>
              {digit}
            </span>
          ))}
        </div>

        <small>
          Enter this 4-digit code on {machine?.name || "your Juice Robo machine"} to begin preparation.
        </small>
      </section>

      <section className="jr-confirmation-card">
        <div>
          <small>COLLECT FROM</small>
          <strong>{location?.name || "Juice Robo"}</strong>
          <span>{machine?.name || "Selected machine"}</span>
        </div>
      </section>

      <section className="jr-confirmation-card">
        <div>
          <small>PAYMENT</small>
          <strong>{money(order?.total_amount)}</strong>
          <span>Paid successfully · {String(order?.payment_method || "UPI").toUpperCase()}</span>
        </div>
      </section>

      <button
        className="jr-button jr-button-primary jr-full"
        onClick={onHome}
        type="button"
      >
        ORDER AGAIN
        <span>→</span>
      </button>
    </main>
  );
}

/* =========================================================
   BOTTOM NAV
   ========================================================= */

function BottomBar({
  screen,
  cartCount,
  onMenu,
  onMachine,
  onCart,
  onAccount,
}) {
  return (
    <nav className="jr-bottom-bar">
      <button
        className={
          screen === "menu"
            ? "active"
            : ""
        }
        onClick={onMenu}
        type="button"
      >
        <span>⌂</span>
        <small>Home</small>
      </button>

      <button
        className={
          screen === "machine"
            ? "active"
            : ""
        }
        onClick={onMachine}
        type="button"
      >
        <span>⌖</span>
        <small>Machine</small>
      </button>

      <button
        className={
          screen === "cart"
            ? "active"
            : ""
        }
        onClick={onCart}
        type="button"
      >
        <span className="jr-nav-cart">
          🛒
          {cartCount > 0 && (
            <b>{cartCount}</b>
          )}
        </span>
        <small>Order</small>
      </button>

      <button
        className={
          screen === "profile" ||
          screen === "history"
            ? "active"
            : ""
        }
        onClick={onAccount}
        type="button"
      >
        <span>●</span>
        <small>Account</small>
      </button>
    </nav>
  );
}

/* =========================================================
   TOAST
   ========================================================= */

function Toast({ message }) {
  return (
    <div className="jr-toast">
      <span className="jr-toast-check">
        ✓
      </span>
      {message}
    </div>
  );
}

/* =========================================================
   LOADING
   ========================================================= */

function LoadingScreen() {
  return (
    <div className="jr-app">
      <div className="jr-loading">
        <div className="jr-loading-logo">
          JR
        </div>

        <strong>JUICE ROBO</strong>

        <span>
          Loading fresh picks...
        </span>

        <div className="jr-loader" />
      </div>
    </div>
  );
}

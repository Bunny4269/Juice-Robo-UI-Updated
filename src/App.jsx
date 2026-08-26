import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

/* =========================================================
   RAZORPAY
   ========================================================= */

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

function paymentOrderValue(paymentOrder, key, fallback = null) {
  if (!paymentOrder) return fallback;

  return (
    paymentOrder[key] ??
    paymentOrder.data?.[key] ??
    paymentOrder.payment_order?.[key] ??
    fallback
  );
}

/* =========================================================
   PRODUCT IMAGE HANDLING
   ========================================================= */

const PRODUCT_IMAGES = {
  plain: "/assets/plain-juice.jpg",
  lemon: "/assets/lemon-juice.jpg",
  ginger: "/assets/ginger-juice.jpg",
  "ginger-lemon": "/assets/ginger-lemon-juice.jpg",
};

function normalizeProductName(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[+&]/g, " ")
    .replace(/sugarcane/g, "")
    .replace(/juice/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function productImage(product) {
  /*
   * 1. Prefer the image_url supplied by FastAPI.
   */
  if (product?.image_url) {
    return product.image_url;
  }

  /*
   * 2. Fallback based on product name.
   *    This protects the UI if image_url is missing.
   */
  const name = normalizeProductName(product?.name);

  if (
    name.includes("ginger") &&
    name.includes("lemon")
  ) {
    return PRODUCT_IMAGES["ginger-lemon"];
  }

  if (name.includes("ginger")) {
    return PRODUCT_IMAGES.ginger;
  }

  if (name.includes("lemon")) {
    return PRODUCT_IMAGES.lemon;
  }

  return PRODUCT_IMAGES.plain;
}

/* =========================================================
   HELPERS
   ========================================================= */

function money(value) {
  return `₹${Number(value || 0).toFixed(0)}`;
}

function statusLabel(status) {
  return String(status || "confirmed").replace(/_/g, " ");
}

/* =========================================================
   MAIN APP
   ========================================================= */

function App() {
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [machines, setMachines] = useState([]);

  const [profile, setProfile] = useState(null);

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("juice_robo_cart") || "{}"
      );
    } catch {
      return {};
    }
  });

  const [locationId, setLocationId] = useState(
    () =>
      localStorage.getItem("juice_robo_location") || ""
  );

  const [machineId, setMachineId] = useState(
    () =>
      localStorage.getItem("juice_robo_machine") || ""
  );

  const [screen, setScreen] = useState(() =>
    localStorage.getItem("juice_robo_token")
      ? "home"
      : "auth"
  );

  const [authMode, setAuthMode] = useState("login");

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [orders, setOrders] = useState([]);

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("All");

  const [toast, setToast] = useState("");

  const [paymentBusy, setPaymentBusy] = useState(false);

  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(message) {
    setToast(message);

    window.clearTimeout(window.__jrToast);

    window.__jrToast = window.setTimeout(() => {
      setToast("");
    }, 2200);
  }

  /* =======================================================
     LOAD INITIAL DATA
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
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

        const normalizedProducts = (
          Array.isArray(productResponse)
            ? productResponse
            : []
        ).map((product) => ({
          ...product,
          image: productImage(product),
        }));

        const normalizedLocations = Array.isArray(
          locationResponse
        )
          ? locationResponse
          : [];

        const normalizedMachines = Array.isArray(
          machineResponse
        )
          ? machineResponse
          : [];

        setProducts(normalizedProducts);

        setLocations(normalizedLocations);

        setMachines(normalizedMachines);

        /*
         * Automatically select the first location
         * when the user has not selected one yet.
         */
        if (
          !locationId &&
          normalizedLocations.length > 0
        ) {
          setLocationId(
            String(normalizedLocations[0].id)
          );
        }
      } catch (e) {
        if (!cancelled) {
          console.error(
            "Juice Robo initial load error:",
            e
          );

          setError(
            e?.message ||
              "Unable to connect to Juice Robo."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     LOCAL STORAGE
     ======================================================= */

  useEffect(() => {
    localStorage.setItem(
      "juice_robo_cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  useEffect(() => {
    if (locationId) {
      localStorage.setItem(
        "juice_robo_location",
        locationId
      );
    }
  }, [locationId]);

  useEffect(() => {
    if (machineId) {
      localStorage.setItem(
        "juice_robo_machine",
        machineId
      );
    }
  }, [machineId]);

  /* =======================================================
     LOAD PROFILE / ORDERS
     ======================================================= */

  useEffect(() => {
    if (
      screen === "profile" &&
      localStorage.getItem("juice_robo_token")
    ) {
      api
        .profile()
        .then((data) => {
          setProfile(data);
        })
        .catch(() => {
          logout();
        });
    }

    if (
      screen === "history" &&
      localStorage.getItem("juice_robo_token")
    ) {
      api
        .orders()
        .then((data) => {
          setOrders(
            Array.isArray(data) ? data : []
          );
        })
        .catch((e) => {
          console.error(
            "Order history error:",
            e
          );
        });
    }
  }, [screen]);

  /* =======================================================
     DERIVED DATA
     ======================================================= */

  const selectedLocation = useMemo(() => {
    return locations.find(
      (location) =>
        String(location.id) ===
        String(locationId)
    );
  }, [locations, locationId]);

  const availableMachines = useMemo(() => {
    return machines.filter((machine) => {
      const machineLocation =
        machine.location_id ??
        machine.locationId;

      return (
        String(machineLocation) ===
        String(locationId)
      );
    });
  }, [machines, locationId]);

  const selectedMachine = useMemo(() => {
    return availableMachines.find(
      (machine) =>
        String(machine.id) ===
        String(machineId)
    );
  }, [availableMachines, machineId]);

  const cartItems = useMemo(() => {
    return products
      .filter((product) => cart[product.id])
      .map((product) => ({
        ...product,
        quantity: cart[product.id],
      }));
  }, [products, cart]);

  const cartCount = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total + Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(item.price || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [cartItems]);

  /*
   * Product categories.
   *
   * Keep the actual product names available for
   * filtering, but display cleaner category labels.
   */
  const categories = useMemo(() => {
    const result = ["All"];

    products.forEach((product) => {
      const name = String(
        product.name || ""
      ).toLowerCase();

      let categoryName = "Plain";

      if (
        name.includes("ginger") &&
        name.includes("lemon")
      ) {
        categoryName = "Ginger + Lemon";
      } else if (name.includes("ginger")) {
        categoryName = "Ginger";
      } else if (name.includes("lemon")) {
        categoryName = "Lemon";
      } else {
        categoryName = "Plain";
      }

      if (!result.includes(categoryName)) {
        result.push(categoryName);
      }
    });

    return result;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    return products.filter((product) => {
      const name = String(
        product.name || ""
      ).toLowerCase();

      const description = String(
        product.description || ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        `${name} ${description}`.includes(
          query
        );

      if (category === "All") {
        return matchesSearch;
      }

      let productCategory = "Plain";

      if (
        name.includes("ginger") &&
        name.includes("lemon")
      ) {
        productCategory =
          "Ginger + Lemon";
      } else if (name.includes("ginger")) {
        productCategory = "Ginger";
      } else if (name.includes("lemon")) {
        productCategory = "Lemon";
      }

      return (
        matchesSearch &&
        productCategory === category
      );
    });
  }, [
    products,
    search,
    category,
  ]);

  /* =======================================================
     CART
     ======================================================= */

  function add(product, quantity = 1) {
    setCart((currentCart) => ({
      ...currentCart,
      [product.id]: Math.max(
        0,
        Number(currentCart[product.id] || 0) +
          quantity
      ),
    }));

    showToast(
      `${product.name} added to cart`
    );
  }

  function setQty(id, quantity) {
    setCart((currentCart) => {
      const next = {
        ...currentCart,
      };

      if (quantity <= 0) {
        delete next[id];
      } else {
        next[id] = quantity;
      }

      return next;
    });
  }

  /* =======================================================
     LOGOUT
     ======================================================= */

  function logout() {
    localStorage.removeItem(
      "juice_robo_token"
    );

    localStorage.removeItem(
      "juice_robo_user"
    );

    setProfile(null);

    setOrders([]);

    setScreen("auth");
  }

  /* =======================================================
     AUTH
     ======================================================= */

  async function submitAuth(payload) {
    try {
      setError("");

      const result =
        authMode === "login"
          ? await api.login(payload)
          : await api.register(payload);

      if (!result?.access_token) {
        throw new Error(
          "Authentication failed. No access token received."
        );
      }

      localStorage.setItem(
        "juice_robo_token",
        result.access_token
      );

      setScreen("home");

      showToast(
        authMode === "login"
          ? "Welcome back"
          : "Account created"
      );
    } catch (e) {
      console.error(
        "Authentication error:",
        e
      );

      setError(
        e?.message ||
          "Unable to complete authentication."
      );
    }
  }

  /* =======================================================
     PLACE ORDER + PAYMENT
     ======================================================= */

  async function placeOrder(customer) {
    if (!selectedLocation || !selectedMachine) {
      showToast(
        "Choose a location and machine first"
      );

      setScreen("location");
      return;
    }

    if (!cartItems.length) {
      showToast("Your cart is empty");
      setScreen("home");
      return;
    }

    if (paymentBusy) {
      return;
    }

    try {
      setLoading(true);
      setPaymentBusy(true);
      setError("");

      /*
       * STEP 1
       * Create the Juice Robo order.
       *
       * The backend should keep this order in
       * PENDING_PAYMENT until Razorpay succeeds.
       */
      const result = await api.createOrder({
        location_id: Number(locationId),
        machine_id: Number(machineId),
        items: cartItems.map((item) => ({
          product_id: Number(item.id),
          quantity: Number(item.quantity),
        })),
      });

      if (!result?.id) {
        throw new Error(
          "The order was not created correctly."
        );
      }

      /*
       * STEP 2
       * Ask the backend to create the Razorpay
       * payment order. The backend calculates the
       * amount from the Juice Robo order.
       */
      const paymentOrder =
        await api.createPaymentOrder(result.id);

      const razorpayOrderId =
        paymentOrderValue(
          paymentOrder,
          "razorpay_order_id"
        );

      const keyId =
        paymentOrderValue(
          paymentOrder,
          "key_id"
        );

      const amount =
        paymentOrderValue(
          paymentOrder,
          "amount"
        );

      const currency =
        paymentOrderValue(
          paymentOrder,
          "currency",
          "INR"
        );

      if (!razorpayOrderId) {
        throw new Error(
          "Razorpay order ID was not returned by the server."
        );
      }

      if (!keyId) {
        throw new Error(
          "Razorpay key was not returned by the server."
        );
      }

      if (!amount) {
        throw new Error(
          "Payment amount was not returned by the server."
        );
      }

      /*
       * STEP 3
       * Load Razorpay Checkout.
       */
      const razorpayLoaded =
        await loadRazorpayScript();

      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error(
          "Unable to load Razorpay Checkout. Check your internet connection and try again."
        );
      }

      /*
       * Keep a snapshot of the customer details
       * entered at checkout.
       */
      const customerSnapshot = {
        name: customer?.name || "",
        phone: customer?.phone || "",
        email: customer?.email || "",
      };

      /*
       * STEP 4
       * Open Razorpay.
       */
      const razorpayOptions = {
        key: keyId,
        amount: Number(amount),
        currency: currency,
        name: "Juice Robo",
        description:
          `Juice Robo Order ${
            result.order_number ||
            result.order_code ||
            result.id
          }`,
        order_id: razorpayOrderId,

        prefill: {
          name: customerSnapshot.name,
          contact: customerSnapshot.phone,
          email: customerSnapshot.email,
        },

        notes: {
          juice_robo_order_id: String(result.id),
        },

        /*
         * Mobile-first payment order:
         * 1. UPI
         * 2. Cards
         * 3. Netbanking
         * 4. Wallet
         * 5. Pay Later
         */
        config: {
          display: {
            blocks: {
              juice_robo_payment_methods: {
                name: "All Payment Options",
                instruments: [
                  { method: "upi" },
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" },
                  { method: "paylater" },
                ],
              },
            },
            sequence: [
              "block.juice_robo_payment_methods",
            ],
            preferences: {
              show_default_blocks: false,
            },
          },
        },

        theme: {
          color: "#f97316",
        },

        modal: {
          confirm_close: true,

          ondismiss: () => {
            setPaymentBusy(false);
            setLoading(false);

            showToast(
              "Payment cancelled. Your cart is still saved."
            );
          },
        },

        handler: async (response) => {
          /*
           * STEP 5
           * Send the Razorpay success response to
           * the backend. The backend verifies the
           * signature using the secret key.
           */
          try {
            const verifiedResponse =
              await api.verifyPayment({
                orderId: result.id,
                razorpayPaymentId:
                  response.razorpay_payment_id,
                razorpayOrderId:
                  response.razorpay_order_id,
                razorpaySignature:
                  response.razorpay_signature,
              });

            const verifiedOrder =
              verifiedResponse?.order ||
              verifiedResponse?.data ||
              verifiedResponse;

            const paymentStatus =
              String(
                verifiedOrder?.payment_status ||
                  verifiedOrder?.paymentStatus ||
                  ""
              ).toUpperCase();

            /*
             * We require an explicit PAID response
             * before treating the order as confirmed.
             */
            if (
              paymentStatus &&
              paymentStatus !== "PAID"
            ) {
              throw new Error(
                "Payment was received, but the server could not confirm the payment."
              );
            }

            /*
             * IMPORTANT:
             * Clear the cart ONLY after backend
             * verification succeeds.
             */
            setCart({});

            setSelectedOrder({
              ...verifiedOrder,
              customer: customerSnapshot,
            });

            setPaymentBusy(false);
            setLoading(false);

            setScreen("confirmation");

            showToast(
              "Payment successful"
            );
          } catch (verificationError) {
            console.error(
              "Juice Robo payment verification error:",
              verificationError
            );

            setPaymentBusy(false);
            setLoading(false);

            showToast(
              verificationError?.message ||
                "Payment verification failed. Please contact Juice Robo support."
            );
          }
        },
      };

      const razorpay =
        new window.Razorpay(
          razorpayOptions
        );

      razorpay.on(
        "payment.failed",
        (response) => {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setPaymentBusy(false);
          setLoading(false);

          showToast(
            response?.error?.description ||
              "Payment failed. Your cart is still saved."
          );
        }
      );

      razorpay.open();
    } catch (e) {
      console.error(
        "Juice Robo payment flow error:",
        e
      );

      setPaymentBusy(false);
      setLoading(false);

      showToast(
        e?.message ||
          "Unable to start payment."
      );
    }
  }

  /* =======================================================
     AUTH SCREEN
     ======================================================= */

  if (screen === "auth") {
    return (
      <Auth
        mode={authMode}
        setMode={setAuthMode}
        onSubmit={submitAuth}
        error={error}
      />
    );
  }

  /* =======================================================
     SPLASH
     ======================================================= */

  if (
    loading &&
    products.length === 0
  ) {
    return <Splash />;
  }

  /* =======================================================
     MAIN APP
     ======================================================= */

  return (
    <div className="app-shell">
      {/* =================================================
          TOP BAR
          ================================================= */}

      <header className="topbar">
        <button
          className="icon-btn"
          onClick={() =>
            setScreen("location")
          }
          aria-label="Choose collection location"
        >
          ⌖
        </button>

        <div className="brand">
          <img
            src="/assets/juice-robo-logo.jpg"
            alt="Juice Robo"
          />

          <div>
            <strong>
              JUICE ROBO
            </strong>

            <span>
              {selectedLocation?.name ||
                "Choose location"}
            </span>
          </div>
        </div>

        <button
          className="cart-button"
          onClick={() =>
            setScreen("cart")
          }
          aria-label="Shopping cart"
        >
          <span>🛒</span>

          {cartCount > 0 && (
            <b>{cartCount}</b>
          )}
        </button>
      </header>

      {/* =================================================
          HOME
          ================================================= */}

      {screen === "home" && (
        <Home
          products={filteredProducts}
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          categories={categories}
          add={add}
          open={setSelectedProduct}
        />
      )}

      {/* =================================================
          LOCATION
          ================================================= */}

      {screen === "location" && (
        <Location
          locations={locations}
          machines={availableMachines}
          locationId={locationId}
          machineId={machineId}
          setLocationId={(id) => {
            setLocationId(id);
            setMachineId("");
          }}
          setMachineId={setMachineId}
          onContinue={() => {
            if (
              selectedLocation &&
              selectedMachine
            ) {
              setScreen("home");
            } else {
              showToast(
                "Select a location and machine"
              );
            }
          }}
        />
      )}

      {/* =================================================
          CART
          ================================================= */}

      {screen === "cart" && (
        <Cart
          items={cartItems}
          subtotal={subtotal}
          setQty={setQty}
          onCheckout={() =>
            setScreen("checkout")
          }
          onBack={() =>
            setScreen("home")
          }
        />
      )}

      {/* =================================================
          CHECKOUT
          ================================================= */}

      {screen === "checkout" && (
        <Checkout
          profile={profile}
          onBack={() =>
            setScreen("cart")
          }
          onPlace={placeOrder}
          paymentBusy={paymentBusy}
        />
      )}

      {/* =================================================
          CONFIRMATION
          ================================================= */}

      {screen === "confirmation" && (
        <Confirmation
          order={selectedOrder}
          location={selectedLocation}
          machine={selectedMachine}
          onHome={() =>
            setScreen("home")
          }
          onHistory={() =>
            setScreen("history")
          }
        />
      )}

      {/* =================================================
          HISTORY
          ================================================= */}

      {screen === "history" && (
        <History
          orders={orders}
          onOpen={(order) => {
            setSelectedOrder(order);
            setScreen("order");
          }}
        />
      )}

      {/* =================================================
          ORDER DETAIL
          ================================================= */}

      {screen === "order" && (
        <OrderDetail
          order={selectedOrder}
          onBack={() =>
            setScreen("history")
          }
        />
      )}

      {/* =================================================
          PROFILE
          ================================================= */}

      {screen === "profile" && (
        <Profile
          profile={profile}
          onLogout={logout}
        />
      )}

      {/* =================================================
          BOTTOM NAVIGATION
          ================================================= */}

      {screen !== "confirmation" &&
        screen !== "order" && (
          <BottomNav
            screen={screen}
            setScreen={setScreen}
            cartCount={cartCount}
          />
        )}

      {/* =================================================
          PRODUCT SHEET
          ================================================= */}

      {selectedProduct && (
        <ProductSheet
          product={selectedProduct}
          quantity={
            cart[selectedProduct.id] || 0
          }
          add={add}
          setQty={setQty}
          close={() =>
            setSelectedProduct(null)
          }
        />
      )}

      {/* =================================================
          TOAST
          ================================================= */}

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* =================================================
          GLOBAL ERROR
          ================================================= */}

      {error && screen !== "auth" && (
        <div className="app-error">
          {error}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SPLASH
   ========================================================= */

function Splash() {
  return (
    <div className="splash">
      <img
        src="/assets/juice-robo-logo.jpg"
        alt="Juice Robo"
      />

      <div className="loader" />

      <p>
        Fresh juice. Ready when you are.
      </p>
    </div>
  );
}

/* =========================================================
   AUTH
   ========================================================= */

function Auth({
  mode,
  setMode,
  onSubmit,
  error,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function submit(event) {
    event.preventDefault();

    onSubmit(form);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img
          src="/assets/juice-robo-logo.jpg"
          className="auth-logo"
          alt="Juice Robo"
        />

        <span className="eyebrow">
          FRESH • FAST • SIMPLE
        </span>

        <h1>
          {mode === "login"
            ? "Welcome back."
            : "Create your account."}
        </h1>

        <p>
          {mode === "login"
            ? "Sign in to order your favourite juice."
            : "Order ahead and collect fresh juice at the Robo."}
        </p>

        <form onSubmit={submit}>
          {mode === "register" && (
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value
                )
              }
              required
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={(event) =>
              updateField(
                "email",
                event.target.value
              )
            }
            required
          />

          {mode === "register" && (
            <input
              inputMode="tel"
              placeholder="Phone number"
              value={form.phone}
              onChange={(event) =>
                updateField(
                  "phone",
                  event.target.value
                )
              }
              required
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(event) =>
              updateField(
                "password",
                event.target.value
              )
            }
            required
          />

          <button
            className="primary full"
            type="submit"
          >
            {mode === "login"
              ? "SIGN IN"
              : "CREATE ACCOUNT"}
          </button>
        </form>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <button
          className="text-btn"
          onClick={() =>
            setMode(
              mode === "login"
                ? "register"
                : "login"
            )
          }
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   HOME
   ========================================================= */

function Home({
  products,
  search,
  setSearch,
  category,
  setCategory,
  categories,
  add,
  open,
}) {
  return (
    <main className="content home">
      <div className="hero">
        <div>
          <span className="eyebrow">
            MADE FRESH
          </span>

          <h1>
            Your juice.
            <br />

            <em>
              On your schedule.
            </em>
          </h1>

          <p>
            Pick your flavour, choose a
            Robo and collect when it’s
            ready.
          </p>
        </div>

        <div className="hero-orb">
          🥤
        </div>
      </div>

      <div className="search">
        <span>⌕</span>

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search juices"
        />
      </div>

      <div className="chips">
        {categories.map((item) => (
          <button
            className={
              category === item
                ? "active"
                : ""
            }
            key={item}
            onClick={() =>
              setCategory(item)
            }
          >
            {item}
          </button>
        ))}
      </div>

      <div className="section-head">
        <div>
          <span className="eyebrow">
            TODAY'S MENU
          </span>

          <h2>
            Choose your juice
          </h2>
        </div>

        <span>
          {products.length} flavours
        </span>
      </div>

      {products.length === 0 ? (
        <div className="empty">
          <div>🥤</div>

          <h3>
            No juices found
          </h3>

          <p>
            Try another search or
            category.
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              add={add}
              open={open}
            />
          ))}
        </div>
      )}
    </main>
  );
}

/* =========================================================
   PRODUCT CARD
   ========================================================= */

function ProductCard({
  product,
  add,
  open,
}) {
  return (
    <article
      className="product-card"
      onClick={() =>
        open(product)
      }
    >
      <div className="product-image">
        <img
          src={
            product.image ||
            productImage(product)
          }
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            /*
             * If an asset fails, use the
             * intelligent fallback.
             */
            if (
              event.currentTarget.src.endsWith(
                "plain-juice.jpg"
              )
            ) {
              return;
            }

            event.currentTarget.src =
              productImage({
                ...product,
                image_url: "",
              });
          }}
        />

        <span className="fresh-dot">
          ● Fresh
        </span>
      </div>

      <div className="product-copy">
        <div>
          <span className="product-kicker">
            {product.description ||
              "Fresh & natural"}
          </span>

          <h3>
            {product.name}
          </h3>
        </div>

        <div className="product-bottom">
          <strong>
            {money(product.price)}
          </strong>

          <button
            className="add-btn"
            onClick={(event) => {
              event.stopPropagation();
              add(product);
            }}
            aria-label={`Add ${product.name} to cart`}
          >
            +
          </button>
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   PRODUCT SHEET
   ========================================================= */

function ProductSheet({
  product,
  quantity,
  add,
  setQty,
  close,
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={close}
    >
      <div
        className="sheet"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sheet-image">
          <img
            src={
              product.image ||
              productImage(product)
            }
            alt={product.name}
          />

          <button
            className="close"
            onClick={close}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="sheet-body">
          <span className="eyebrow">
            {product.description ||
              "FRESH & NATURAL"}
          </span>

          <h2>
            {product.name}
          </h2>

          <p>
            Freshly prepared sugarcane
            juice made for quick, easy
            collection.
          </p>

          <div className="sheet-row">
            <strong>
              {money(product.price)}
            </strong>

            <div className="qty">
              <button
                onClick={() =>
                  setQty(
                    product.id,
                    Math.max(
                      0,
                      quantity - 1
                    )
                  )
                }
              >
                −
              </button>

              <b>
                {quantity}
              </b>

              <button
                onClick={() =>
                  add(product)
                }
              >
                +
              </button>
            </div>
          </div>

          <button
            className="primary full"
            onClick={() => {
              if (!quantity) {
                add(product);
              }

              close();
            }}
          >
            {quantity
              ? "UPDATE CART"
              : "ADD TO CART"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LOCATION
   ========================================================= */

function Location({
  locations,
  machines,
  locationId,
  machineId,
  setLocationId,
  setMachineId,
  onContinue,
}) {
  return (
    <main className="content location-page">
      <span className="eyebrow">
        COLLECTION POINT
      </span>

      <h1>
        Where should we
        <br />

        <em>
          make your juice?
        </em>
      </h1>

      <p className="muted">
        Choose the Robo you’ll collect
        from.
      </p>

      <h3>
        1. Select location
      </h3>

      <div className="choice-list">
        {locations.map((location) => (
          <button
            className={
              String(location.id) ===
              String(locationId)
                ? "choice active"
                : "choice"
            }
            key={location.id}
            onClick={() =>
              setLocationId(
                String(location.id)
              )
            }
          >
            <span className="choice-icon">
              ⌖
            </span>

            <span>
              <b>
                {location.name}
              </b>

              <small>
                {location.address ||
                  "Juice Robo collection point"}
              </small>
            </span>

            <span>›</span>
          </button>
        ))}
      </div>

      <h3>
        2. Select machine
      </h3>

      <div className="choice-list">
        {machines.map((machine) => (
          <button
            className={
              String(machine.id) ===
              String(machineId)
                ? "choice active"
                : "choice"
            }
            key={machine.id}
            onClick={() =>
              setMachineId(
                String(machine.id)
              )
            }
          >
            <span className="machine-icon">
              JR
            </span>

            <span>
              <b>
                {machine.name}
              </b>

              <small>
                {machine.machine_code ||
                  machine.machineCode ||
                  "Juice Robo"}
                {" · "}
                {machine.status ||
                  "OFFLINE"}
              </small>
            </span>

            <span
              className={
                String(
                  machine.status
                ).toUpperCase() ===
                "ONLINE"
                  ? "online"
                  : "offline"
              }
            >
              ●
            </span>
          </button>
        ))}
      </div>

      <button
        className="primary full sticky-action"
        onClick={onContinue}
      >
        CONTINUE
      </button>
    </main>
  );
}

/* =========================================================
   CART
   ========================================================= */

function Cart({
  items,
  subtotal,
  setQty,
  onCheckout,
  onBack,
}) {
  return (
    <main className="content cart-page">
      <button
        className="back"
        onClick={onBack}
      >
        ← Back
      </button>

      <div className="section-head">
        <div>
          <span className="eyebrow">
            YOUR ORDER
          </span>

          <h2>
            Cart
          </h2>
        </div>

        <span>
          {items.length} items
        </span>
      </div>

      {!items.length ? (
        <div className="empty">
          <div>🛒</div>

          <h3>
            Your cart is empty
          </h3>

          <p>
            Add a fresh juice from
            today's menu.
          </p>

          <button
            className="primary"
            onClick={onBack}
          >
            BROWSE JUICES
          </button>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {items.map((item) => (
              <div
                className="cart-item"
                key={item.id}
              >
                <img
                  src={
                    item.image ||
                    productImage(item)
                  }
                  alt={item.name}
                />

                <div className="cart-info">
                  <span>
                    {item.description}
                  </span>

                  <b>
                    {item.name}
                  </b>

                  <strong>
                    {money(
                      Number(item.price) *
                        Number(
                          item.quantity
                        )
                    )}
                  </strong>
                </div>

                <div className="qty">
                  <button
                    onClick={() =>
                      setQty(
                        item.id,
                        item.quantity - 1
                      )
                    }
                  >
                    −
                  </button>

                  <b>
                    {item.quantity}
                  </b>

                  <button
                    onClick={() =>
                      setQty(
                        item.id,
                        item.quantity + 1
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="summary">
            <div>
              <span>
                Subtotal
              </span>

              <b>
                {money(subtotal)}
              </b>
            </div>

            <div>
              <span>
                Collection
              </span>

              <b>
                Free
              </b>
            </div>

            <hr />

            <div className="total">
              <span>
                Total
              </span>

              <b>
                {money(subtotal)}
              </b>
            </div>
          </div>

          <button
            className="primary full"
            onClick={onCheckout}
          >
            CONTINUE TO CHECKOUT
          </button>
        </>
      )}
    </main>
  );
}

/* =========================================================
   CHECKOUT
   ========================================================= */

function Checkout({
  profile,
  onBack,
  onPlace,
  paymentBusy = false,
}) {
  const [form, setForm] = useState({
    name: profile?.name || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
  });

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <main className="content checkout">
      <button
        className="back"
        onClick={onBack}
      >
        ← Cart
      </button>

      <span className="eyebrow">
        FINAL STEP
      </span>

      <h1>
        Who’s collecting?
      </h1>

      <p className="muted">
        We’ll use these details for
        your order.
      </p>

      <div className="form-card">
        <label>
          Name

          <input
            value={form.name}
            onChange={(event) =>
              update(
                "name",
                event.target.value
              )
            }
            required
          />
        </label>

        <label>
          Phone

          <input
            inputMode="tel"
            value={form.phone}
            onChange={(event) =>
              update(
                "phone",
                event.target.value
              )
            }
            required
          />
        </label>

        <label>
          Email

          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              update(
                "email",
                event.target.value
              )
            }
            required
          />
        </label>
      </div>

      <button
        className="primary full"
        type="button"
        disabled={paymentBusy}
        onClick={() => {
          if (!form.name.trim()) {
            showToast("Enter your name");
            return;
          }

          if (!form.phone.trim()) {
            showToast("Enter your phone number");
            return;
          }

          if (!form.email.trim()) {
            showToast("Enter your email address");
            return;
          }

          onPlace(form);
        }}
      >
        {paymentBusy
          ? "OPENING PAYMENT..."
          : "PROCEED TO PAYMENT"}
      </button>
    </main>
  );
}

/* =========================================================
   CONFIRMATION
   ========================================================= */

function Confirmation({
  order,
  location,
  machine,
  onHome,
  onHistory,
}) {
  return (
    <main className="content confirmation">
      <div className="success-icon">
        ✓
      </div>

      <span className="eyebrow">
        PAYMENT CONFIRMED
      </span>

      <h1>
        Fresh juice is
        <br />

        <em>
          on its way.
        </em>
      </h1>

      <p className="muted">
        Your payment is verified.
        Show this collection code at
        the selected Robo.
      </p>

      <div className="code-card">
        <span>
          COLLECTION CODE
        </span>

        <strong>
          {order?.collection_code ||
            "----"}
        </strong>

        <small>
          {location?.name ||
            "Collection point"}
          {" · "}
          {machine?.name ||
            "Juice Robo"}
        </small>
      </div>

      <div className="order-mini">
        <div>
          <span>
            Order
          </span>

          <b>
            {order?.order_number ||
              `#${order?.id || "—"}`}
          </b>
        </div>

        <div>
          <span>
            Total
          </span>

          <b>
            {money(
              order?.total_amount
            )}
          </b>
        </div>
      </div>

      <button
        className="primary full"
        onClick={onHome}
      >
        BACK TO MENU
      </button>

      <button
        className="secondary full"
        onClick={onHistory}
      >
        VIEW ORDER HISTORY
      </button>
    </main>
  );
}

/* =========================================================
   HISTORY
   ========================================================= */

function History({
  orders,
  onOpen,
}) {
  return (
    <main className="content">
      <div className="section-head">
        <div>
          <span className="eyebrow">
            YOUR ORDERS
          </span>

          <h2>
            History
          </h2>
        </div>
      </div>

      {!orders.length ? (
        <div className="empty">
          <div>◷</div>

          <h3>
            No orders yet
          </h3>

          <p>
            Your completed orders will
            appear here.
          </p>
        </div>
      ) : (
        <div className="history-list">
          {orders.map((order) => (
            <button
              className="history-card"
              key={order.id}
              onClick={() =>
                onOpen(order)
              }
            >
              <div className="history-top">
                <b>
                  {order.order_number}
                </b>

                <span
                  className={`status ${order.status}`}
                >
                  {statusLabel(
                    order.status
                  )}
                </span>
              </div>

              <p>
                {order.items
                  ?.map(
                    (item) =>
                      `${item.product_name} ×${item.quantity}`
                  )
                  .join(" · ")}
              </p>

              <div>
                <span>
                  {order.created_at
                    ? new Date(
                        order.created_at
                      ).toLocaleDateString()
                    : "—"}
                </span>

                <strong>
                  {money(
                    order.total_amount
                  )}
                </strong>
              </div>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

/* =========================================================
   ORDER DETAIL
   ========================================================= */

function OrderDetail({
  order,
  onBack,
}) {
  return (
    <main className="content">
      <button
        className="back"
        onClick={onBack}
      >
        ← History
      </button>

      <span className="eyebrow">
        ORDER DETAILS
      </span>

      <h1>
        {order?.order_number}
      </h1>

      <div className="detail-card">
        <div className="code-card small-code">
          <span>
            COLLECTION CODE
          </span>

          <strong>
            {order?.collection_code ||
              "----"}
          </strong>
        </div>

        <div className="summary">
          {order?.items?.map(
            (item) => (
              <div
                key={item.product_id}
              >
                <span>
                  {item.product_name} ×{" "}
                  {item.quantity}
                </span>

                <b>
                  {money(
                    item.subtotal
                  )}
                </b>
              </div>
            )
          )}

          <hr />

          <div className="total">
            <span>
              Total
            </span>

            <b>
              {money(
                order?.total_amount
              )}
            </b>
          </div>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   PROFILE
   ========================================================= */

function Profile({
  profile,
  onLogout,
}) {
  const firstLetter =
    profile?.name
      ?.slice(0, 1)
      ?.toUpperCase() || "J";

  return (
    <main className="content profile">
      <div className="profile-head">
        <div className="avatar">
          {firstLetter}
        </div>

        <div>
          <span className="eyebrow">
            YOUR ACCOUNT
          </span>

          <h2>
            {profile?.name ||
              "Juice Lover"}
          </h2>

          <p>
            {profile?.email || ""}
          </p>
        </div>
      </div>

      <div className="profile-card">
        <div>
          <span>
            Phone
          </span>

          <b>
            {profile?.phone || "—"}
          </b>
        </div>

        <div>
          <span>
            Email
          </span>

          <b>
            {profile?.email || "—"}
          </b>
        </div>
      </div>

      <button
        className="secondary full"
        onClick={onLogout}
      >
        SIGN OUT
      </button>
    </main>
  );
}

/* =========================================================
   BOTTOM NAV
   ========================================================= */

function BottomNav({
  screen,
  setScreen,
  cartCount,
}) {
  return (
    <nav className="bottom-nav">
      <button
        className={
          screen === "home"
            ? "active"
            : ""
        }
        onClick={() =>
          setScreen("home")
        }
      >
        ⌂
        <span>
          Home
        </span>
      </button>

      <button
        className={
          screen === "history"
            ? "active"
            : ""
        }
        onClick={() =>
          setScreen("history")
        }
      >
        ◷
        <span>
          Orders
        </span>
      </button>

      <button
        className={
          screen === "cart"
            ? "active"
            : ""
        }
        onClick={() =>
          setScreen("cart")
        }
      >
        🛒

        {cartCount > 0 && (
          <i>
            {cartCount}
          </i>
        )}

        <span>
          Cart
        </span>
      </button>

      <button
        className={
          screen === "profile"
            ? "active"
            : ""
        }
        onClick={() =>
          setScreen("profile")
        }
      >
        ●

        <span>
          Profile
        </span>
      </button>
    </nav>
  );
}

export default App;
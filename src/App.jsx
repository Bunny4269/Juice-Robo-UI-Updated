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
      existingScript.addEventListener(
        "load",
        () => resolve(true),
        { once: true }
      );

      existingScript.addEventListener(
        "error",
        () => resolve(false),
        { once: true }
      );

      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.onload = () => resolve(true);

    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

function paymentOrderValue(
  paymentOrder,
  key,
  fallback = null
) {
  if (!paymentOrder) {
    return fallback;
  }

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
  "ginger-lemon":
    "/assets/ginger-lemon-juice.jpg",
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
   * Prefer the image URL supplied by FastAPI.
   */
  if (product?.image_url) {
    return product.image_url;
  }

  /*
   * Intelligent fallback based on product name.
   */
  const name = normalizeProductName(
    product?.name
  );

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
  return String(
    status || "confirmed"
  ).replace(/_/g, " ");
}

function orderStatusClass(status) {
  const normalized = String(
    status || "confirmed"
  ).toLowerCase();

  if (normalized === "collected") {
    return "collected";
  }

  if (
    normalized === "cancelled" ||
    normalized === "failed"
  ) {
    return "cancelled";
  }

  return "confirmed";
}

/* =========================================================
   MAIN APP
   ========================================================= */

function App() {
  const [products, setProducts] =
    useState([]);

  const [locations, setLocations] =
    useState([]);

  const [machines, setMachines] =
    useState([]);

  const [profile, setProfile] =
    useState(null);

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(
          "juice_robo_cart"
        ) || "{}"
      );
    } catch {
      return {};
    }
  });

  const [locationId, setLocationId] =
    useState(
      () =>
        localStorage.getItem(
          "juice_robo_location"
        ) || ""
    );

  const [machineId, setMachineId] =
    useState(
      () =>
        localStorage.getItem(
          "juice_robo_machine"
        ) || ""
    );

  const [screen, setScreen] =
    useState(() =>
      localStorage.getItem(
        "juice_robo_token"
      )
        ? "home"
        : "auth"
    );

  const [authMode, setAuthMode] =
    useState("login");

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [orders, setOrders] = useState([]);

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [toast, setToast] =
    useState("");

  const [paymentBusy, setPaymentBusy] =
    useState(false);

  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(message) {
    setToast(message);

    window.clearTimeout(
      window.__jrToast
    );

    window.__jrToast =
      window.setTimeout(() => {
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

        const [
          productResponse,
          locationResponse,
          machineResponse,
        ] = await Promise.all([
          api.products(),
          api.locations(),
          api.machines(),
        ]);

        if (cancelled) {
          return;
        }

        const normalizedProducts = (
          Array.isArray(productResponse)
            ? productResponse
            : []
        ).map((product) => ({
          ...product,
          image: productImage(product),
        }));

        const normalizedLocations =
          Array.isArray(
            locationResponse
          )
            ? locationResponse
            : [];

        const normalizedMachines =
          Array.isArray(
            machineResponse
          )
            ? machineResponse
            : [];

        setProducts(
          normalizedProducts
        );

        setLocations(
          normalizedLocations
        );

        setMachines(
          normalizedMachines
        );

        /*
         * Automatically select the first
         * location when none exists.
         */
        if (
          !locationId &&
          normalizedLocations.length
        ) {
          setLocationId(
            String(
              normalizedLocations[0].id
            )
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
    const token =
      localStorage.getItem(
        "juice_robo_token"
      );

    if (
      screen === "profile" &&
      token
    ) {
      api
        .profile()
        .then((data) => {
          setProfile(data);
        })
        .catch((e) => {
          console.error(
            "Profile loading error:",
            e
          );

          logout();
        });
    }

    if (
      screen === "history" &&
      token
    ) {
      api
        .orders()
        .then((data) => {
          setOrders(
            Array.isArray(data)
              ? data
              : []
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

  const selectedLocation =
    useMemo(() => {
      return locations.find(
        (location) =>
          String(location.id) ===
          String(locationId)
      );
    }, [
      locations,
      locationId,
    ]);

  const availableMachines =
    useMemo(() => {
      return machines.filter(
        (machine) => {
          const machineLocation =
            machine.location_id ??
            machine.locationId;

          return (
            String(machineLocation) ===
            String(locationId)
          );
        }
      );
    }, [
      machines,
      locationId,
    ]);

  const selectedMachine =
    useMemo(() => {
      return availableMachines.find(
        (machine) =>
          String(machine.id) ===
          String(machineId)
      );
    }, [
      availableMachines,
      machineId,
    ]);

  const cartItems = useMemo(() => {
    return products
      .filter(
        (product) =>
          Number(cart[product.id]) > 0
      )
      .map((product) => ({
        ...product,
        quantity:
          Number(cart[product.id]) || 0,
      }));
  }, [
    products,
    cart,
  ]);

  const cartCount = useMemo(() => {
    return cartItems.reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
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

  /* =======================================================
     CATEGORIES
     ======================================================= */

  const categories =
    useMemo(() => {
      const result = ["All"];

      products.forEach(
        (product) => {
          const name =
            String(
              product.name || ""
            ).toLowerCase();

          let categoryName =
            "Plain";

          if (
            name.includes("ginger") &&
            name.includes("lemon")
          ) {
            categoryName =
              "Ginger + Lemon";
          } else if (
            name.includes("ginger")
          ) {
            categoryName =
              "Ginger";
          } else if (
            name.includes("lemon")
          ) {
            categoryName =
              "Lemon";
          }

          if (
            !result.includes(
              categoryName
            )
          ) {
            result.push(
              categoryName
            );
          }
        }
      );

      return result;
    }, [products]);

  /* =======================================================
     FILTERED PRODUCTS
     ======================================================= */

  const filteredProducts =
    useMemo(() => {
      const query =
        search
          .toLowerCase()
          .trim();

      return products.filter(
        (product) => {
          const name =
            String(
              product.name || ""
            ).toLowerCase();

          const description =
            String(
              product.description ||
                ""
            ).toLowerCase();

          const matchesSearch =
            !query ||
            `${name} ${description}`.includes(
              query
            );

          if (
            category === "All"
          ) {
            return matchesSearch;
          }

          let productCategory =
            "Plain";

          if (
            name.includes("ginger") &&
            name.includes("lemon")
          ) {
            productCategory =
              "Ginger + Lemon";
          } else if (
            name.includes("ginger")
          ) {
            productCategory =
              "Ginger";
          } else if (
            name.includes("lemon")
          ) {
            productCategory =
              "Lemon";
          }

          return (
            matchesSearch &&
            productCategory ===
              category
          );
        }
      );
    }, [
      products,
      search,
      category,
    ]);

  /* =======================================================
     CART
     ======================================================= */

  function add(
    product,
    quantity = 1
  ) {
    setCart(
      (currentCart) => ({
        ...currentCart,
        [product.id]:
          Math.max(
            0,
            Number(
              currentCart[
                product.id
              ] || 0
            ) + quantity
          ),
      })
    );

    showToast(
      `${product.name} added to cart`
    );
  }

  function setQty(
    id,
    quantity
  ) {
    setCart(
      (currentCart) => {
        const next = {
          ...currentCart,
        };

        if (
          Number(quantity) <= 0
        ) {
          delete next[id];
        } else {
          next[id] =
            Number(quantity);
        }

        return next;
      }
    );
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
    setSelectedOrder(null);
    setScreen("auth");
  }

  /* =======================================================
     AUTH
     ======================================================= */

  async function submitAuth(
    payload
  ) {
    try {
      setError("");

      const result =
        authMode === "login"
          ? await api.login(
              payload
            )
          : await api.register(
              payload
            );

      if (
        !result?.access_token
      ) {
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

  async function placeOrder(
    customer
  ) {
    if (
      !selectedLocation ||
      !selectedMachine
    ) {
      showToast(
        "Choose a location and machine first"
      );

      setScreen("location");

      return;
    }

    if (!cartItems.length) {
      showToast(
        "Your cart is empty"
      );

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
       * STEP 1:
       * Create internal Juice Robo order.
       */
      const result =
        await api.createOrder({
          location_id:
            Number(locationId),

          machine_id:
            Number(machineId),

          items:
            cartItems.map(
              (item) => ({
                product_id:
                  Number(
                    item.id
                  ),

                quantity:
                  Number(
                    item.quantity
                  ),
              })
            ),
        });

      if (!result?.id) {
        throw new Error(
          "The order was not created correctly."
        );
      }

      /*
       * STEP 2:
       * Create Razorpay order.
       */
      const paymentOrder =
        await api.createPaymentOrder(
          result.id
        );

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
       * STEP 3:
       * Load Razorpay Checkout.
       */
      const razorpayLoaded =
        await loadRazorpayScript();

      if (
        !razorpayLoaded ||
        !window.Razorpay
      ) {
        throw new Error(
          "Unable to load Razorpay Checkout. Check your internet connection and try again."
        );
      }

      const customerSnapshot = {
        name:
          customer?.name || "",

        phone:
          customer?.phone || "",

        email:
          customer?.email || "",
      };

      /*
       * STEP 4:
       * Razorpay configuration.
       */
      const razorpayOptions = {
        key: keyId,

        amount:
          Number(amount),

        currency,

        name: "Juice Robo",

        description:
          `Juice Robo Order ${
            result.order_number ||
            result.order_code ||
            result.id
          }`,

        order_id:
          razorpayOrderId,

        prefill: {
          name:
            customerSnapshot.name,

          contact:
            customerSnapshot.phone,

          email:
            customerSnapshot.email,
        },

        notes: {
          juice_robo_order_id:
            String(result.id),
        },

        config: {
          display: {
            blocks: {
              juice_robo_payment_methods:
                {
                  name:
                    "All Payment Options",

                  instruments: [
                    {
                      method:
                        "upi",
                    },
                    {
                      method:
                        "card",
                    },
                    {
                      method:
                        "netbanking",
                    },
                    {
                      method:
                        "wallet",
                    },
                    {
                      method:
                        "paylater",
                    },
                  ],
                },
            },

            sequence: [
              "block.juice_robo_payment_methods",
            ],

            preferences: {
              show_default_blocks:
                false,
            },
          },
        },

        theme: {
          color: "#f97316",
        },

        modal: {
          confirm_close: true,

          ondismiss: () => {
            setPaymentBusy(
              false
            );

            setLoading(false);

            showToast(
              "Payment cancelled. Your cart is still saved."
            );
          },
        },

        /*
         * Razorpay successful payment.
         */
        handler: async (
          response
        ) => {
          try {
            const verifiedResponse =
              await api.verifyPayment(
                {
                  orderId:
                    result.id,

                  razorpayPaymentId:
                    response.razorpay_payment_id,

                  razorpayOrderId:
                    response.razorpay_order_id,

                  razorpaySignature:
                    response.razorpay_signature,
                }
              );

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
             * Backend must confirm PAID.
             */
            if (
              paymentStatus &&
              paymentStatus !==
                "PAID"
            ) {
              throw new Error(
                "Payment was received, but the server could not confirm the payment."
              );
            }

            /*
             * Clear cart only after
             * successful backend verification.
             */
            setCart({});

            setSelectedOrder({
              ...verifiedOrder,
              customer:
                customerSnapshot,
            });

            setPaymentBusy(
              false
            );

            setLoading(false);

            setScreen(
              "confirmation"
            );

            showToast(
              "Payment successful"
            );
          } catch (
            verificationError
          ) {
            console.error(
              "Juice Robo payment verification error:",
              verificationError
            );

            setPaymentBusy(
              false
            );

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

          setPaymentBusy(
            false
          );

          setLoading(false);

          showToast(
            response?.error
              ?.description ||
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

      setPaymentBusy(
        false
      );

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
      {/* TOP BAR */}

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
          <span>
            🛒
          </span>

          {cartCount > 0 && (
            <b>
              {cartCount}
            </b>
          )}
        </button>
      </header>

      {/* HOME */}

      {screen === "home" && (
        <Home
          products={
            filteredProducts
          }
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={
            setCategory
          }
          categories={categories}
          add={add}
          open={
            setSelectedProduct
          }
        />
      )}

      {/* LOCATION */}

      {screen === "location" && (
        <Location
          locations={locations}
          machines={
            availableMachines
          }
          locationId={
            locationId
          }
          machineId={
            machineId
          }
          setLocationId={(
            id
          ) => {
            setLocationId(id);
            setMachineId("");
          }}
          setMachineId={
            setMachineId
          }
          onContinue={() => {
            if (
              selectedLocation &&
              selectedMachine
            ) {
              setScreen(
                "home"
              );
            } else {
              showToast(
                "Select a location and machine"
              );
            }
          }}
        />
      )}

      {/* CART */}

      {screen === "cart" && (
        <Cart
          items={cartItems}
          subtotal={subtotal}
          setQty={setQty}
          onCheckout={() =>
            setScreen(
              "checkout"
            )
          }
          onBack={() =>
            setScreen("home")
          }
        />
      )}

      {/* CHECKOUT */}

      {screen === "checkout" && (
        <Checkout
          profile={profile}
          onBack={() =>
            setScreen("cart")
          }
          onPlace={
            placeOrder
          }
          paymentBusy={
            paymentBusy
          }
          showToast={
            showToast
          }
        />
      )}

      {/* CONFIRMATION */}

      {screen === "confirmation" && (
        <Confirmation
          order={
            selectedOrder
          }
          location={
            selectedLocation
          }
          machine={
            selectedMachine
          }
          onHome={() =>
            setScreen("home")
          }
          onHistory={() =>
            setScreen(
              "history"
            )
          }
        />
      )}

      {/* HISTORY */}

      {screen === "history" && (
        <History
          orders={orders}
          onOpen={(order) => {
            setSelectedOrder(
              order
            );

            setScreen(
              "order"
            );
          }}
        />
      )}

      {/* ORDER DETAIL */}

      {screen === "order" && (
        <OrderDetail
          order={
            selectedOrder
          }
          onBack={() =>
            setScreen(
              "history"
            )
          }
        />
      )}

      {/* PROFILE */}

      {screen === "profile" && (
        <Profile
          profile={profile}
          onLogout={logout}
        />
      )}

      {/* BOTTOM NAVIGATION */}

      {screen !==
        "confirmation" &&
        screen !== "order" && (
          <BottomNav
            screen={screen}
            setScreen={
              setScreen
            }
            cartCount={
              cartCount
            }
          />
        )}

      {/* PRODUCT SHEET */}

      {selectedProduct && (
        <ProductSheet
          product={
            selectedProduct
          }
          quantity={
            cart[
              selectedProduct.id
            ] || 0
          }
          add={add}
          setQty={setQty}
          close={() =>
            setSelectedProduct(
              null
            )
          }
        />
      )}

      {/* TOAST */}

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      {/* GLOBAL ERROR */}

      {error &&
        screen !== "auth" && (
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
    <main className="splash">
      <div>
        <img
          src="/assets/juice-robo-logo.jpg"
          alt="Juice Robo"
        />

        <h1>
          JUICE ROBO
        </h1>

        <p>
          Fresh juice.
          <br />
          Made instantly.
        </p>

        <div className="loader" />
      </div>
    </main>
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
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  async function submit(
    event
  ) {
    event.preventDefault();

    setBusy(true);

    try {
      if (mode === "login") {
        await onSubmit({
          email,
          password,
        });
      } else {
        await onSubmit({
          name,
          email,
          phone,
          password,
        });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <img
          className="auth-logo"
          src="/assets/juice-robo-logo.jpg"
          alt="Juice Robo"
        />

        <span className="eyebrow">
          JUICE ROBO
        </span>

        <h1>
          {mode === "login"
            ? "Welcome back."
            : "Let's get started."}
        </h1>

        <p>
          {mode === "login"
            ? "Sign in to order fresh juice and manage your collections."
            : "Create your Juice Robo account and order fresh juice in seconds."}
        </p>

        <form
          onSubmit={submit}
        >
          {mode === "register" && (
            <>
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                required
              />

              <input
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
                required
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            required
          />

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <button
            className="primary full"
            type="submit"
            disabled={busy}
          >
            {busy
              ? "PLEASE WAIT..."
              : mode === "login"
              ? "SIGN IN"
              : "CREATE ACCOUNT"}
          </button>
        </form>

        <button
          className="text-btn"
          type="button"
          onClick={() => {
            setMode(
              mode === "login"
                ? "register"
                : "login"
            );
          }}
        >
          {mode === "login"
            ? "CREATE A NEW ACCOUNT"
            : "ALREADY HAVE AN ACCOUNT? SIGN IN"}
        </button>
      </div>
    </main>
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
    <main className="content">
      <section className="hero">
        <div>
          <span className="eyebrow">
            FRESH. FAST. AUTOMATED.
          </span>

          <h1>
            Your juice,
            <br />
            <em>your way.</em>
          </h1>

          <p>
            Pick your favourite
            sugarcane juice, choose
            your Robo and collect it
            fresh.
          </p>
        </div>

        <div className="hero-orb">
          🥤
        </div>
      </section>

      <div className="search">
        <span>
          ⌕
        </span>

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Search your juice..."
          type="search"
        />
      </div>

      <div className="chips">
        {categories.map(
          (item) => (
            <button
              key={item}
              className={
                category === item
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory(
                  item
                )
              }
            >
              {item}
            </button>
          )
        )}
      </div>

      <div className="section-head">
        <div>
          <span className="eyebrow">
            OUR MENU
          </span>

          <h2>
            Fresh picks
          </h2>
        </div>

        <span>
          {products.length}{" "}
          {products.length === 1
            ? "juice"
            : "juices"}
        </span>
      </div>

      {!products.length ? (
        <div className="empty">
          <div>
            🔎
          </div>

          <h3>
            No juice found
          </h3>

          <p>
            Try another search or
            category.
          </p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map(
            (product) => (
              <ProductCard
                key={product.id}
                product={product}
                add={add}
                open={open}
              />
            )
          )}
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
          onError={(
            event
          ) => {
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
            Freshly prepared
            sugarcane juice made for
            quick, easy collection.
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
                aria-label="Decrease quantity"
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
                aria-label="Increase quantity"
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
        Choose the Robo you'll
        collect from.
      </p>

      <h3>
        1. Select location
      </h3>

      <div className="choice-list">
        {locations.map(
          (location) => (
            <button
              className={
                String(
                  location.id
                ) ===
                String(
                  locationId
                )
                  ? "choice active"
                  : "choice"
              }
              key={location.id}
              onClick={() =>
                setLocationId(
                  String(
                    location.id
                  )
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

              <span>
                ›
              </span>
            </button>
          )
        )}
      </div>

      <h3>
        2. Select machine
      </h3>

      {!machines.length ? (
        <div className="empty">
          <div>
            ⚙
          </div>

          <h3>
            No Robo available
          </h3>

          <p>
            Select another collection
            location.
          </p>
        </div>
      ) : (
        <div className="choice-list">
          {machines.map(
            (machine) => (
              <button
                className={
                  String(
                    machine.id
                  ) ===
                  String(
                    machineId
                  )
                    ? "choice active"
                    : "choice"
                }
                key={machine.id}
                onClick={() =>
                  setMachineId(
                    String(
                      machine.id
                    )
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
            )
          )}
        </div>
      )}

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

      <span className="eyebrow">
        YOUR CART
      </span>

      <h1 className="location-page h1">
        Your
        <br />
        <em>fresh picks.</em>
      </h1>

      {!items.length ? (
        <div className="empty">
          <div>
            🛒
          </div>

          <h3>
            Your cart is empty
          </h3>

          <p>
            Add some fresh juice to
            continue.
          </p>

          <button
            className="primary"
            style={{
              marginTop:
                "18px",
            }}
            onClick={onBack}
          >
            BROWSE JUICES
          </button>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {items.map(
              (item) => (
                <div
                  className="cart-item"
                  key={item.id}
                >
                  <img
                    src={
                      item.image ||
                      productImage(
                        item
                      )
                    }
                    alt={item.name}
                  />

                  <div className="cart-info">
                    <span>
                      {item.description ||
                        "Fresh & natural"}
                    </span>

                    <b>
                      {item.name}
                    </b>

                    <strong>
                      {money(
                        item.price
                      )}
                    </strong>
                  </div>

                  <div className="qty">
                    <button
                      onClick={() =>
                        setQty(
                          item.id,
                          item.quantity -
                            1
                        )
                      }
                      aria-label="Decrease quantity"
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
                          item.quantity +
                            1
                        )
                      }
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            )}
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
            PROCEED TO CHECKOUT
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
  paymentBusy,
}) {
  const [name, setName] =
    useState(
      profile?.name || ""
    );

  const [phone, setPhone] =
    useState(
      profile?.phone || ""
    );

  const [email, setEmail] =
    useState(
      profile?.email || ""
    );

  function submit(event) {
    event.preventDefault();

    onPlace({
      name,
      phone,
      email,
    });
  }

  return (
    <main className="content checkout">
      <button
        className="back"
        onClick={onBack}
        disabled={paymentBusy}
      >
        ← Cart
      </button>

      <span className="eyebrow">
        CHECKOUT
      </span>

      <h1>
        Almost
        <br />
        <em>fresh.</em>
      </h1>

      <p className="muted">
        Confirm your details before
        proceeding to secure payment.
      </p>

      <form
        className="form-card"
        onSubmit={submit}
      >
        <label>
          NAME

          <input
            type="text"
            value={name}
            onChange={(event) =>
              setName(
                event.target.value
              )
            }
            placeholder="Your name"
            required
            disabled={
              paymentBusy
            }
          />
        </label>

        <label>
          PHONE

          <input
            type="tel"
            value={phone}
            onChange={(event) =>
              setPhone(
                event.target.value
              )
            }
            placeholder="10-digit mobile number"
            required
            disabled={
              paymentBusy
            }
          />
        </label>

        <label>
          EMAIL

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value
              )
            }
            placeholder="you@example.com"
            required
            disabled={
              paymentBusy
            }
          />
        </label>

        <div className="payment-info">
          <strong>
            Secure payment
          </strong>

          <span>
            UPI · Cards · Netbanking ·
            Wallets
          </span>
        </div>

        <button
          className="primary full"
          type="submit"
          disabled={
            paymentBusy
          }
        >
          {paymentBusy
            ? "OPENING PAYMENT..."
            : "PROCEED TO PAYMENT"}
        </button>
      </form>
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
        PAYMENT SUCCESSFUL
      </span>

      <h1>
        Your juice is
        <br />
        <em>on its way.</em>
      </h1>

      <p className="muted">
        Your order has been confirmed.
        Show the collection code at
        your selected Juice Robo.
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
          Keep this code safe until
          collection.
        </small>
      </div>

      <div className="order-mini">
        <div>
          <span>
            ORDER
          </span>

          <b>
            {order?.order_number ||
              `#${order?.id || "—"}`}
          </b>
        </div>

        <div>
          <span>
            TOTAL
          </span>

          <b>
            {money(
              order?.total_amount
            )}
          </b>
        </div>
      </div>

      <div className="detail-card">
        <div>
          <span className="eyebrow">
            COLLECTION POINT
          </span>

          <h3>
            {location?.name ||
              "Juice Robo"}
          </h3>

          <p className="muted">
            {location?.address ||
              "Selected collection point"}
          </p>
        </div>

        <hr />

        <div>
          <span className="eyebrow">
            MACHINE
          </span>

          <h3>
            {machine?.name ||
              "Juice Robo"}
          </h3>

          <p className="muted">
            {machine?.machine_code ||
              "Collection machine"}
          </p>
        </div>
      </div>

      <button
        className="primary full"
        onClick={onHistory}
      >
        VIEW ORDER HISTORY
      </button>

      <button
        className="secondary full"
        onClick={onHome}
      >
        BACK TO HOME
      </button>
    </main>
  );
}
/* =========================================================
   ORDER HISTORY
   ========================================================= */

function History({
  orders,
  onOpen,
}) {
  function formatDate(value) {
    if (!value) return "Date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getStatus(order) {
    const status = String(
      order?.status ||
        order?.payment_status ||
        "confirmed"
    ).toLowerCase();

    if (
      status === "pending_payment" ||
      status === "pending"
    ) {
      return {
        label: "PENDING PAYMENT",
        className: "pending",
      };
    }

    if (
      status === "collected"
    ) {
      return {
        label: "COLLECTED",
        className: "collected",
      };
    }

    if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      return {
        label: "CANCELLED",
        className: "cancelled",
      };
    }

    return {
      label: "CONFIRMED",
      className: "confirmed",
    };
  }

  function getItems(order) {
    if (
      Array.isArray(order?.items) &&
      order.items.length
    ) {
      return order.items;
    }

    return [];
  }

  function getItemSummary(order) {
    const items = getItems(order);

    if (!items.length) {
      return "Order details unavailable";
    }

    const first = items[0];

    const firstName =
      first?.product_name ||
      first?.name ||
      "Juice";

    const firstQuantity =
      Number(
        first?.quantity || 1
      );

    if (items.length === 1) {
      return `${firstName} ×${firstQuantity}`;
    }

    return `${firstName} ×${firstQuantity} + ${
      items.length - 1
    } more`;
  }

  return (
    <main className="content history-page">

      {/* ---------------------------------------------------
          PAGE HEADER
          --------------------------------------------------- */}

      <div className="history-header">
        <div>
          <span className="eyebrow">
            YOUR ORDERS
          </span>

          <h1>
            Order History
          </h1>

          <p>
            Track your Juice Robo orders
            and collection details.
          </p>
        </div>

        <div className="history-count">
          <strong>
            {orders.length}
          </strong>

          <span>
            {orders.length === 1
              ? "ORDER"
              : "ORDERS"}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------
          EMPTY STATE
          --------------------------------------------------- */}

      {!orders.length ? (
        <div className="history-empty">

          <div className="history-empty-icon">
            🧃
          </div>

          <span className="eyebrow">
            NO ORDERS YET
          </span>

          <h3>
            Your juice history
            <br />
            starts here.
          </h3>

          <p>
            Once you place an order,
            your Juice Robo purchases
            will appear here.
          </p>

        </div>
      ) : (

        /* -------------------------------------------------
           ORDER LIST
           ------------------------------------------------- */

        <div className="history-list">

          {orders.map((order) => {
            const status =
              getStatus(order);

            const items =
              getItems(order);

            const firstItem =
              items[0];

            const image =
              firstItem?.image_url ||
              firstItem?.image ||
              productImage({
                name:
                  firstItem?.product_name ||
                  firstItem?.name ||
                  "",
                image_url:
                  firstItem?.image_url || "",
              });

            return (
              <button
                type="button"
                className="history-card"
                key={order.id}
                onClick={() =>
                  onOpen(order)
                }
              >

                {/* -----------------------------------------
                    TOP ROW
                   ----------------------------------------- */}

                <div className="history-card-top">

                  <div className="history-order-info">

                    <span className="history-order-label">
                      ORDER
                    </span>

                    <strong>
                      {order.order_number ||
                        `#${order.id}`}
                    </strong>

                  </div>

                  <span
                    className={`status ${status.className}`}
                  >
                    {status.label}
                  </span>

                </div>

                {/* -----------------------------------------
                    PRODUCT
                   ----------------------------------------- */}

                <div className="history-product">

                  <div className="history-product-image">
                    <img
                      src={image}
                      alt={
                        firstItem?.product_name ||
                        "Juice"
                      }
                      onError={(event) => {
                        event.currentTarget.src =
                          productImage({
                            name:
                              firstItem?.product_name ||
                              "",
                            image_url: "",
                          });
                      }}
                    />
                  </div>

                  <div className="history-product-info">

                    <strong>
                      {getItemSummary(order)}
                    </strong>

                    <span>
                      {formatDate(
                        order.created_at
                      )}

                      {formatTime(
                        order.created_at
                      ) && (
                        <>
                          {" · "}
                          {formatTime(
                            order.created_at
                          )}
                        </>
                      )}
                    </span>

                  </div>

                  <div className="history-total">
                    <span>
                      TOTAL
                    </span>

                    <strong>
                      {money(
                        order.total_amount
                      )}
                    </strong>
                  </div>

                </div>

                {/* -----------------------------------------
                    COLLECTION CODE
                   ----------------------------------------- */}

                {order.collection_code && (
                  <div className="history-collection">

                    <div>
                      <span>
                        COLLECTION CODE
                      </span>

                      <strong>
                        {order.collection_code}
                      </strong>
                    </div>

                    <span className="history-arrow">
                      →
                    </span>

                  </div>
                )}

                {/* -----------------------------------------
                    PENDING PAYMENT
                   ----------------------------------------- */}

                {!order.collection_code &&
                  status.className ===
                    "pending" && (
                    <div className="history-pending">

                      <span>
                        Payment required
                        to confirm this order.
                      </span>

                      <span>
                        →
                      </span>

                    </div>
                  )}

              </button>
            );
          })}

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
  if (!order) {
    return (
      <main className="content">
        <button
          className="back"
          onClick={onBack}
        >
          ← History
        </button>

        <div className="empty">
          <div>
            ⚠
          </div>

          <h3>
            Order not found
          </h3>

          <p>
            We could not load this
            order.
          </p>
        </div>
      </main>
    );
  }

  const status =
    String(
      order.status ||
        "confirmed"
    ).toLowerCase();

  const paymentStatus =
    String(
      order.payment_status ||
        order.paymentStatus ||
        "PAID"
    ).toUpperCase();

  return (
    <main className="content order-detail">
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
        {order.order_number ||
          `#${order.id}`}
      </h1>

      <div className="order-status-row">
        <span
          className={`status ${status}`}
        >
          {statusLabel(
            order.status
          )}
        </span>

        <span className="payment-paid">
          ● {paymentStatus}
        </span>
      </div>

      {/* COLLECTION CODE */}

      <div className="code-card">
        <span>
          COLLECTION CODE
        </span>

        <strong>
          {order.collection_code ||
            "----"}
        </strong>

        <small>
          Show this code at the
          selected Juice Robo.
        </small>
      </div>

      {/* ORDER ITEMS */}

      <div className="detail-card">
        <span className="eyebrow">
          YOUR JUICE
        </span>

        <div className="detail-items">
          {order.items?.map(
            (item, index) => (
              <div
                className="detail-item"
                key={
                  item.product_id ||
                  index
                }
              >
                <div>
                  <b>
                    {item.product_name}
                  </b>

                  <span>
                    Qty {item.quantity} ×{" "}
                    {money(
                      item.unit_price
                    )}
                  </span>
                </div>

                <strong>
                  {money(
                    item.subtotal
                  )}
                </strong>
              </div>
            )
          )}
        </div>

        <hr />

        <div className="summary-total">
          <span>
            Total paid
          </span>

          <strong>
            {money(
              order.total_amount
            )}
          </strong>
        </div>
      </div>

      {/* COLLECTION INFORMATION */}

      <div className="detail-card">
        <span className="eyebrow">
          COLLECTION
        </span>

        <div className="collection-detail">
          <div>
            <span>
              Collection point
            </span>

            <b>
              {order.location_name ||
                order.location?.name ||
                "Selected Juice Robo"}
            </b>
          </div>

          <div>
            <span>
              Machine
            </span>

            <b>
              {order.machine_name ||
                order.machine?.name ||
                "Juice Robo"}
            </b>
          </div>

          <div>
            <span>
              Order date
            </span>

            <b>
              {order.created_at
                ? new Date(
                    order.created_at
                  ).toLocaleString(
                    undefined,
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )
                : "—"}
            </b>
          </div>
        </div>
      </div>

      {/* PAYMENT INFORMATION */}

      <div className="detail-card">
        <span className="eyebrow">
          PAYMENT
        </span>

        <div className="collection-detail">
          <div>
            <span>
              Status
            </span>

            <b className="paid-text">
              Payment successful
            </b>
          </div>

          {order.razorpay_payment_id && (
            <div>
              <span>
                Payment ID
              </span>

              <b className="mono">
                {
                  order.razorpay_payment_id
                }
              </b>
            </div>
          )}
        </div>
      </div>

      <button
        className="secondary full"
        onClick={onBack}
      >
        BACK TO ORDER HISTORY
      </button>
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
      ?.toUpperCase() ||
    "J";

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
            {profile?.email ||
              "Welcome to Juice Robo"}
          </p>
        </div>
      </div>

      <div className="profile-card">
        <div>
          <span>
            NAME
          </span>

          <b>
            {profile?.name ||
              "—"}
          </b>
        </div>

        <div>
          <span>
            PHONE
          </span>

          <b>
            {profile?.phone ||
              "—"}
          </b>
        </div>

        <div>
          <span>
            EMAIL
          </span>

          <b>
            {profile?.email ||
              "—"}
          </b>
        </div>
      </div>

      <div className="detail-card">
        <span className="eyebrow">
          JUICE ROBO
        </span>

        <p className="muted">
          Order fresh sugarcane
          juice, pay securely and
          collect it from your
          selected Robo.
        </p>
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
   BOTTOM NAVIGATION
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
        <span className="nav-icon">
          ⌂
        </span>

        <span>
          Home
        </span>
      </button>

      <button
        className={
          screen === "history" ||
          screen === "order"
            ? "active"
            : ""
        }
        onClick={() =>
          setScreen("history")
        }
      >
        <span className="nav-icon">
          ◷
        </span>

        <span>
          Orders
        </span>
      </button>

      <button
        className={
          screen === "cart" ||
          screen === "checkout"
            ? "active"
            : ""
        }
        onClick={() =>
          setScreen("cart")
        }
      >
        <span className="nav-icon">
          🛒
        </span>

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
        <span className="nav-icon">
          ●
        </span>

        <span>
          Profile
        </span>
      </button>
    </nav>
  );
}


/* =========================================================
   EXPORT
   ========================================================= */

export default App;
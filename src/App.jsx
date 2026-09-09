import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import "./App.css";

import LoginScreen from "./screens/LoginScreen/LoginScreen";

import HomeScreen from "./screens/HomeScreen/HomeScreen";
import MenuScreen from "./screens/MenuScreen/MenuScreen";
import CartScreen from "./screens/CartScreen/CartScreen";
import LocationMachineScreen from "./screens/LocationMachineScreen/LocationMachineScreen";
import LocationConfirmationScreen from "./screens/LocationConfirmationScreen/LocationConfirmationScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen/ProductDetailScreen";
import PaymentScreen from "./screens/PaymentScreen/PaymentScreen";
import ConfirmationScreen from "./screens/ConfirmationScreen/ConfirmationScreen";
import PaymentSuccessScreen from "./screens/PaymentSuccessScreen/PaymentSuccessScreen";
import HistoryScreen from "./screens/HistoryScreen/HistoryScreen";
import ProfileScreen from "./screens/ProfileScreen/ProfileScreen";

const ASSET_BASE =
  `${import.meta.env.BASE_URL}assets/`;

const PRODUCT_IMAGES = {
  plain: `${ASSET_BASE}plain-juice.jpg`,
  lemon: `${ASSET_BASE}lemon-juice.jpg`,
  ginger: `${ASSET_BASE}ginger-juice.jpg`,
  "ginger-lemon":
    `${ASSET_BASE}ginger-lemon-juice.jpg`,
};

const STORAGE = {
  loggedIn: "juice_robo_logged_in",
  token: "juice_robo_token",
  accessToken: "juice_robo_access_token",
  user: "juice_robo_user",
  legacyUser: "user",
  customer: "juice_robo_customer",
  location: "juice_robo_location",
  machine: "juice_robo_machine",
  orders: "juice_robo_orders",
  screen: "juice_robo_current_screen",
};

const GST_RATE = 0.05;

const EMPTY_CUSTOMER = {
  name: "",
  phone: "",
  email: "",
  loginIdentifier: "",
  password: "",
  confirmPassword: "",
};

/* =========================================================
   STORAGE HELPERS
   ========================================================= */

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);

    return raw
      ? JSON.parse(raw)
      : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    // Ignore storage errors.
  }
}

function getStoredUser() {
  return (
    readJSON(STORAGE.user, null) ||
    readJSON(STORAGE.legacyUser, null) ||
    {}
  );
}

function userKey(user = {}) {
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

function cartKey(user) {
  return `juice_robo_cart_${userKey(user)}`;
}

function ordersKey(user) {
  return `juice_robo_orders_${userKey(user)}`;
}

function normalizeCart(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item === "object"
    )
    .map((item) => {
      const parsedQuantity = Number(
        item?.quantity ??
          item?.qty ??
          item?.count ??
          1
      );

      return {
        ...item,
        quantity:
          Number.isFinite(parsedQuantity) &&
          parsedQuantity > 0
            ? Math.floor(parsedQuantity)
            : 1,
      };
    });
}

function readCart(user) {
  const scoped =
    readJSON(
      cartKey(user),
      null
    );

  if (Array.isArray(scoped)) {
    return normalizeCart(scoped);
  }

  return normalizeCart(
    readJSON(
      "juice_robo_cart",
      []
    )
  );
}

function readOrders(user) {
  const scoped =
    readJSON(
      ordersKey(user),
      null
    );

  if (Array.isArray(scoped)) {
    return scoped;
  }

  const legacy =
    readJSON(
      STORAGE.orders,
      []
    );

  return Array.isArray(legacy)
    ? legacy
    : [];
}

/* =========================================================
   PRODUCT PRESENTATION HELPERS
   ========================================================= */

function productText(product = {}) {
  const variants =
    Array.isArray(
      product?.lstVariants
    )
      ? product.lstVariants
      : Array.isArray(
          product?.variants
        )
        ? product.variants
        : [];

  return String(
    [
      product?.name,
      product?.desc,
      product?.description,
      product?.itemName,
      product?.productName,
      product?.product_name,
      product?.productType,
      product?.product_type,

      ...variants.flatMap(
        (variant) => [
          variant?.itemName,
          variant?.variantName,
          variant?.variantDesc,
        ]
      ),
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          String(value).trim() !== ""
      )
      .join(" ")
  ).toLowerCase();
}

function resolveProductImage(
  product = {}
) {
  const variants =
    Array.isArray(
      product?.lstVariants
    )
      ? product.lstVariants
      : Array.isArray(
          product?.variants
        )
        ? product.variants
        : [];

  const variant =
    variants[0];

  const apiImage =
    product?.image_url ||
    product?.imageUrl ||
    product?.image ||
    product?.itemPhoto ||
    variant?.variantPhoto ||
    "";

  if (apiImage) {
    const value =
      String(apiImage).trim();

    if (
      value.startsWith(
        "http://"
      ) ||
      value.startsWith(
        "https://"
      ) ||
      value.startsWith(
        "data:"
      ) ||
      value.startsWith(
        "blob:"
      )
    ) {
      return value;
    }

    if (
      value.startsWith("/")
    ) {
      return value;
    }

    return `${ASSET_BASE}${value.replace(
      /^\.?\//,
      ""
    )}`;
  }

  const text =
    productText(product);

  if (
    text.includes("ginger") &&
    text.includes("lemon")
  ) {
    return PRODUCT_IMAGES[
      "ginger-lemon"
    ];
  }

  if (text.includes("ginger")) {
    return PRODUCT_IMAGES.ginger;
  }

  if (text.includes("lemon")) {
    return PRODUCT_IMAGES.lemon;
  }

  return PRODUCT_IMAGES.plain;
}

function displayProductName(
  product = {}
) {
  const name =
    product?.name ||
    product?.itemName ||
    product?.productName ||
    product?.product_name ||
    product?.title ||
    "";

  return String(name)
    .replace(
      /\bundefined\b/gi,
      ""
    )
    .replace(
      /\bnull\b/gi,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function displayDescription(
  product = {}
) {
  const variants =
    Array.isArray(
      product?.lstVariants
    )
      ? product.lstVariants
      : Array.isArray(
          product?.variants
        )
        ? product.variants
        : [];

  const variant =
    variants[0];

  return String(
    product?.desc ||
      product?.description ||
      variant?.variantDesc ||
      ""
  )
    .replace(
      /\bundefined\b/gi,
      ""
    )
    .replace(
      /\bnull\b/gi,
      ""
    )
    .trim();
}

function productPrice(
  product = {}
) {
  const variants =
    Array.isArray(
      product?.lstVariants
    )
      ? product.lstVariants
      : Array.isArray(
          product?.variants
        )
        ? product.variants
        : [];

  const variant =
    variants.find(
      (item) =>
        Number(
          item?.unitPrice ??
            item?.unit_price ??
            item?.price ??
            0
        ) >= 0
    ) ||
    variants[0];

  return Number(
    variant?.unitPrice ??
      variant?.unit_price ??
      variant?.price ??
      product?.price ??
      product?.unitPrice ??
      0
  );
}

function getProductId(
  product = {}
) {
  return String(
    product?.id ??
      product?.itemId ??
      product?.item_id ??
      product?.productId ??
      ""
  );
}

function getVariantId(
  product = {},
  variant = null
) {
  return Number(
    variant?.variantId ??
      variant?.id ??
      variant?.variant_id ??
      product?.variantId ??
      product?.id ??
      0
  );
}

function money(value) {
  const amount = Number(value || 0);

  /*
   * Item prices are GST-inclusive.
   * Keep whole-rupee product prices compact, but retain paise
   * for extracted GST amounts such as ₹0.0476 from a ₹1 item.
   */
  const decimals =
    Math.abs(amount - Math.round(amount)) > 0.000001
      ? 2
      : 0;

  return `₹${amount.toFixed(decimals)}`;
}

function errorText(error) {
  return (
    error?.message ||
    error?.data?.message ||
    "Something went wrong."
  );
}

/* =========================================================
   PRODUCT -> CART ITEM
   ========================================================= */

function makeCartItem(
  product,
  variant,
  quantity
) {
  const selectedVariant =
    variant ||
    (
      Array.isArray(
        product?.lstVariants
      )
        ? product.lstVariants[0]
        : null
    );

  const variantId =
    getVariantId(
      product,
      selectedVariant
    );

  const price =
    Number(
      selectedVariant?.unitPrice ??
        selectedVariant?.unit_price ??
        selectedVariant?.price ??
        product?.price ??
        0
    );

  if (!variantId) {
    throw new Error(
      "This juice does not have a valid variant."
    );
  }

  return {
    ...product,

    id: variantId,
    variantId,

    productId:
      product?.id,

    itemId:
      product?.id,

    name:
      displayProductName(product),

    description:
      selectedVariant?.variantDesc ||
      product?.desc ||
      product?.description ||
      "",

    price,
    unitPrice: price,

    variantName:
      selectedVariant?.variantName ||
      "",

    sizeML:
      selectedVariant?.sizeML ||
      selectedVariant?.sizeM ||
      "",

    variantDesc:
      selectedVariant?.variantDesc ||
      "",

    variantPhoto:
      selectedVariant?.variantPhoto ||
      null,

    _variant:
      selectedVariant,

    quantity:
      Math.max(
        1,
        Number(quantity || 1)
      ),
  };
}

/* =========================================================
   APP
   ========================================================= */


function StaticPaymentSuccessScreen({
  order = {},
  location,
  machine,
  onHome,
  onHistory,
  money,
}) {
  const code = String(
    order?.orderPin ||
    order?.order_pin ||
    order?.collection_code ||
    order?.collectionCode ||
    "----"
  ).replace(/\D/g, "").slice(-4).padStart(4, "0");

  const orderNo =
    order?.orderNumber ||
    order?.order_number ||
    order?.orderId ||
    order?.order_id ||
    "—";

  const total = Number(
    order?.totalAmount ??
    order?.total_amount ??
    order?.netBill ??
    order?.grossBill ??
    0
  );

  const locationName =
    location?.name ||
    location?.locationName ||
    order?.locName ||
    order?.locationName ||
    "Juice Robo";

  const machineName =
    machine?.name ||
    machine?.machineName ||
    order?.machineName ||
    "Juice Robo Machine";

  return (
    <main className="jr-content jr-page jr-payment-success-page">
      <section className="jr-payment-success-heading">
        <div className="jr-payment-success-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m9 16 4.5 4.5L23 11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <span className="jr-payment-success-eyebrow">
          PAYMENT SUCCESSFUL
        </span>

        <h1>
          Your juice is
          <br />
          <em>booked!</em>
        </h1>

        <p>
          Your payment was completed and your order is ready for collection.
        </p>
      </section>

      <section className="jr-payment-success-code-card">
        <div className="jr-payment-success-code-header">
          <div>
            <span>YOUR COLLECTION CODE</span>
            <strong>Enter this 4-digit code on your Juice Robo machine</strong>
          </div>
          <small>4 DIGITS</small>
        </div>

        <div className="jr-payment-success-code-digits">
          {code.split("").map((digit, index) => (
            <span className="jr-payment-success-digit" key={`${digit}-${index}`}>
              {digit}
            </span>
          ))}
        </div>

        <p>
          Enter this 4-digit code on {machineName} to begin preparation.
        </p>
      </section>

      <section className="jr-payment-success-details">
        <div className="jr-payment-success-detail">
          <div className="jr-payment-success-detail-icon">📍</div>
          <div className="jr-payment-success-detail-copy">
            <span>COLLECT FROM</span>
            <strong>{locationName}</strong>
            <p>{location?.address || location?.locationAddress || "Selected collection point"}</p>
          </div>
        </div>

        <div className="jr-payment-success-divider" />

        <div className="jr-payment-success-detail">
          <div className="jr-payment-success-detail-icon">▣</div>
          <div className="jr-payment-success-detail-copy">
            <span>MACHINE</span>
            <strong>{machineName}</strong>
            <p>{machine?.machineCode || machine?.machine_code || "Collection machine"}</p>
          </div>
        </div>
      </section>

      <section className="jr-payment-success-payment-card">
        <div>
          <span>ORDER</span>
          <strong>{orderNo}</strong>
        </div>
        <div>
          <span>TOTAL</span>
          <strong>{typeof money === "function" ? money(total) : `₹${total}`}</strong>
        </div>
        <div>
          <span>PAYMENT</span>
          <strong className="jr-payment-success-paid">PAID</strong>
          <small>UPI</small>
        </div>
      </section>

      <button
        className="jr-payment-success-primary"
        type="button"
        onClick={onHistory}
      >
        <span>VIEW ORDER HISTORY</span>
        <strong>→</strong>
      </button>

      <button
        className="jr-payment-success-secondary"
        type="button"
        onClick={onHome}
      >
        BACK TO MENU
      </button>

      <p className="jr-payment-success-note">
        Keep your collection code safe until you collect your juice.
      </p>
    </main>
  );
}

export default function App() {
  const loggedIn =
    Boolean(
      localStorage.getItem(
        STORAGE.loggedIn
      )
    ) &&
    Boolean(
      localStorage.getItem(
        STORAGE.accessToken
      ) ||
        localStorage.getItem(
          STORAGE.token
        )
    );

  /*
   * Public browsing:
   * Logged-out users start on the Menu so they can browse
   * products before signing in.
   */
  const [screen, setScreenState] =
    useState(() => {
      const savedScreen =
        localStorage.getItem(
          STORAGE.screen
        );

      /*
       * Preserve the exact screen across browser refreshes.
       * Logged-out users may only resume on the public Menu;
       * authenticated users may resume any previously stored screen.
       */
      if (
        savedScreen &&
        (
          loggedIn ||
          savedScreen === "menu" ||
          savedScreen === "login"
        )
      ) {
        return savedScreen;
      }

      return loggedIn
        ? "location"
        : "menu";
    });

  function setScreen(nextScreen) {
    setScreenState(nextScreen);

    try {
      localStorage.setItem(
        STORAGE.screen,
        String(nextScreen)
      );
    } catch {
      // Ignore storage errors.
    }
  }

  useEffect(() => {
    /*
     * Keep the persisted screen synchronized with the current
     * React screen. This also covers screens changed by code paths
     * that run during authentication or logout.
     */
    try {
      localStorage.setItem(
        STORAGE.screen,
        String(screen)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [screen]);

  const [customer, setCustomer] =
    useState(() => {
      const stored =
        readJSON(
          STORAGE.customer,
          null
        );

      return {
        ...EMPTY_CUSTOMER,
        ...(stored || {}),
      };
    });

  const [user, setUser] =
    useState(
      getStoredUser
    );

  const [locations, setLocations] =
    useState([]);

  const [machines, setMachines] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [selectedLocationId, setSelectedLocationId] =
    useState(
      () =>
        localStorage.getItem(
          STORAGE.location
        ) || ""
    );

  const [selectedMachineId, setSelectedMachineId] =
    useState(
      () =>
        localStorage.getItem(
          STORAGE.machine
        ) || ""
    );

  const [cart, setCart] =
    useState(() =>
      readCart(
        getStoredUser()
      )
    );

  const [historyOrders, setHistoryOrders] =
    useState(() =>
      readOrders(
        getStoredUser()
      )
    );

  const [selectedProduct, setSelectedProduct] =
    useState(null);

  const [selectedVariant, setSelectedVariant] =
    useState(null);

  const [quantity, setQuantity] =
    useState(1);

  const [loading, setLoading] =
    useState(
      loggedIn
    );

  const [busy, setBusy] =
    useState(false);

  const [paymentChecking, setPaymentChecking] =
    useState(false);

  const [error, setError] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [order, setOrder] =
    useState(null);

  const [upiPaymentUrl, setUpiPaymentUrl] =
    useState(() => {
      try {
        return sessionStorage.getItem(
          "juice_robo_pending_upi_url"
        ) || "";
      } catch {
        return "";
      }
    });

  const [upiMerchantId, setUpiMerchantId] =
    useState(() => {
      try {
        return (
          sessionStorage.getItem(
            "juice_robo_pending_upi_id"
          ) ||
          (typeof api.getConfiguredUpiId === "function"
            ? api.getConfiguredUpiId()
            : "")
        );
      } catch {
        return "";
      }
    });

  /* =======================================================
     SELECTED LOCATION / MACHINE
     ======================================================= */

  const selectedLocation =
    useMemo(() => {
      const targetId =
        String(
          selectedLocationId ||
            ""
        );

      return (
        locations.find((location) => {
          const ids = [
            location?.id,
            location?.storeId,
            location?.store_id,
            location?.locId,
            location?.locationId,
            location?.location_id,
            location?.outletId,
            location?.outlet_id,
          ]
            .filter(
              (value) =>
                value !==
                  undefined &&
                value !== null &&
                value !== ""
            )
            .map((value) =>
              String(value)
            );

          return ids.includes(
            targetId
          );
        }) ||
        null
      );
    }, [
      locations,
      selectedLocationId,
    ]);

  const selectedMachine =
    useMemo(() => {
      const targetId =
        String(
          selectedMachineId ||
            ""
        );

      return (
        machines.find(
          (machine) =>
            String(
              machine?.id ??
                machine?.machineId ??
                machine?.machine_id ??
                ""
            ) === targetId
        ) || null
      );
    }, [
      machines,
      selectedMachineId,
    ]);

  /* =======================================================
     CART TOTALS
     ======================================================= */

  const safeCart =
    normalizeCart(cart);

  const cartCount =
    useMemo(
      () =>
        safeCart.reduce(
          (sum, item) => {
            const quantity = Number(
              item?.quantity || 0
            );

            return (
              sum +
              (
                Number.isFinite(quantity) &&
                quantity > 0
                  ? Math.floor(quantity)
                  : 0
              )
            );
          },
          0
        ),
      [safeCart]
    );

  /*
   * Product prices are GST-inclusive. Keep the customer-facing
   * total equal to the sum of API prices and extract the 5% GST
   * portion from that gross amount.
   */
  const grossTotal =
    useMemo(
      () =>
        safeCart.reduce(
          (sum, item) =>
            sum +
            Number(
              item.price ||
                item.unitPrice ||
                0
            ) *
              Number(
                item.quantity || 1
              ),
          0
        ),
      [safeCart]
    );

  const subtotal =
    grossTotal / (1 + GST_RATE);

  const gst =
    grossTotal - subtotal;

  const finalTotal =
    grossTotal;

  const cartTotal =
    finalTotal;

  /* =======================================================
     INITIAL DATA LOAD
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      /*
       * Locations, machines and products are loaded for public
       * browsing as well. Authentication is required only for
       * authenticated actions such as adding to cart/checkout.
       */
      setLoading(true);
      setError("");

      try {
        const loadedLocations =
          await api.locations();

        if (cancelled) return;

        setLocations(
          loadedLocations
        );

        setError("");

        let locationId =
          localStorage.getItem(
            STORAGE.location
          ) || "";

        const savedExists =
          locationId &&
          loadedLocations.some(
            (location) =>
              String(
                location.id
              ) ===
              String(
                locationId
              )
          );

        if (
          !savedExists &&
          loadedLocations.length
        ) {
          locationId =
            String(
              loadedLocations[0].id
            );

          setSelectedLocationId(
            locationId
          );

          localStorage.setItem(
            STORAGE.location,
            locationId
          );
        }

        const selectedInitialLocation =
          loadedLocations.find(
            (location) =>
              String(
                location.id
              ) ===
              String(
                locationId
              )
          );

        const storeId =
          selectedInitialLocation?.storeId ||
          selectedInitialLocation?.store_id ||
          selectedInitialLocation?.locId ||
          selectedInitialLocation?.id ||
          "";

        if (storeId) {
          const loadedProducts =
            await api.products(
              storeId
            );

          if (!cancelled) {
            setProducts(
              Array.isArray(
                loadedProducts
              )
                ? loadedProducts
                : []
            );

            setError("");
          }
        }

        const loadedMachines =
          await api.machines(
            loadedLocations
          );

        if (!cancelled) {
          setMachines(
            loadedMachines
          );

          const savedMachine =
            localStorage.getItem(
              STORAGE.machine
            );

          const getMachineId = (machine) =>
            String(
              machine?.id ??
                machine?.machineId ??
                machine?.machine_id ??
                ""
            );

          const getMachineLocationIds = (machine) =>
            [
              machine?.locationId,
              machine?.location_id,
              machine?.storeId,
              machine?.store_id,
              machine?.locId,
              machine?.outletId,
              machine?.outlet_id,
              machine?.location?.id,
              machine?.store?.id,
              machine?.outlet?.id,
            ]
              .filter(
                (value) =>
                  value !==
                    undefined &&
                  value !== null &&
                  value !== ""
              )
              .map((value) =>
                String(value)
              );

          const selectedLocationMachine =
            loadedMachines.find(
              (machine) =>
                getMachineLocationIds(
                  machine
                ).includes(
                  String(
                    locationId
                  )
                )
            );

          const savedMachineObject =
            loadedMachines.find(
              (machine) =>
                getMachineId(
                  machine
                ) ===
                String(
                  savedMachine ||
                    ""
                )
            );

          const initialMachine =
            selectedLocationMachine ||
            savedMachineObject ||
            loadedMachines[0] ||
            null;

          if (initialMachine) {
            const machineId =
              getMachineId(
                initialMachine
              );

            if (machineId) {
              setSelectedMachineId(
                machineId
              );

              localStorage.setItem(
                STORAGE.machine,
                machineId
              );
            }
          } else {
            setSelectedMachineId(
              ""
            );

            localStorage.removeItem(
              STORAGE.machine
            );
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(
            "[Juice Robo] Initial data load failed:",
            loadError
          );

          setError(
            errorText(loadError)
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
  }, [loggedIn]);

  /* =======================================================
     PERSISTENCE
     ======================================================= */

  useEffect(() => {
    if (!user) return;

    writeJSON(
      cartKey(user),
      safeCart
    );

    writeJSON(
      "juice_robo_cart",
      safeCart
    );
  }, [
    user,
    safeCart,
  ]);

  useEffect(() => {
    if (!user) return;

    writeJSON(
      ordersKey(user),
      historyOrders
    );

    writeJSON(
      STORAGE.orders,
      historyOrders
    );
  }, [
    user,
    historyOrders,
  ]);

  useEffect(() => {
    const safeCustomer = {
      ...customer,
    };

    delete safeCustomer.password;
    delete safeCustomer.confirmPassword;

    writeJSON(
      STORAGE.customer,
      safeCustomer
    );
  }, [customer]);

  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(message) {
    setToast(
      String(message || "")
    );

    window.clearTimeout(
      window.__juiceRoboToastTimer
    );

    window.__juiceRoboToastTimer =
      window.setTimeout(
        () => {
          setToast("");
        },
        2400
      );
  }

  /* =======================================================
     LOGIN
     ======================================================= */

  async function handleLogin(event) {
    if (
      event?.preventDefault
    ) {
      event.preventDefault();
    }

    const identifier =
      String(
        customer?.email ||
          customer?.loginIdentifier ||
          customer?.phone ||
          ""
      ).trim();

    const password =
      String(
        customer?.password ||
          ""
      );

    if (!identifier) {
      showToast(
        "Enter your email or phone number"
      );
      return;
    }

    if (!password) {
      showToast(
        "Enter your password"
      );
      return;
    }

    try {
      setBusy(true);
      setError("");

      const response =
        await api.login({
          userName:
            identifier,
          email:
            identifier,
          password,
        });

      const loggedUser =
        response?.user ||
        response ||
        {};

      setUser(
        loggedUser
      );

      setCustomer(
        (current) => ({
          ...current,

          name:
            loggedUser?.name ||
            loggedUser?.firstname ||
            loggedUser?.firstName ||
            current.name ||
            "",

          phone:
            loggedUser?.phone ||
            loggedUser?.userName ||
            current.phone ||
            "",

          email:
            loggedUser?.email ||
            loggedUser?.userEmail ||
            current.email ||
            identifier,

          password: "",
          confirmPassword:
            "",
        })
      );

      localStorage.setItem(
        STORAGE.loggedIn,
        "true"
      );

      setCart(
        readCart(
          loggedUser
        )
      );

      setHistoryOrders(
        readOrders(
          loggedUser
        )
      );

      const loadedLocations =
        await api.locations();

      setLocations(
        loadedLocations
      );

      let nextLocationId =
        localStorage.getItem(
          STORAGE.location
        ) || "";

      const validLocation =
        loadedLocations.find(
          (location) =>
            String(
              location.id
            ) ===
            String(
              nextLocationId
            )
        );

      if (!validLocation) {
        nextLocationId =
          String(
            loadedLocations[0]?.id ||
              ""
          );

        if (nextLocationId) {
          localStorage.setItem(
            STORAGE.location,
            nextLocationId
          );

          setSelectedLocationId(
            nextLocationId
          );
        }
      }

      const nextLocation =
        loadedLocations.find(
          (location) =>
            String(
              location.id
            ) ===
            String(
              nextLocationId
            )
        );

      const storeId =
        nextLocation?.storeId ||
        nextLocation?.store_id ||
        nextLocation?.locId ||
        nextLocation?.id;

      if (storeId) {
        const loadedProducts =
          await api.products(
            storeId
          );

        setProducts(
          loadedProducts
        );
      }

      const loadedMachines =
        await api.machines(
          loadedLocations
        );

      setMachines(
        loadedMachines
      );

      setScreen(
        "location"
      );

      showToast(
        `Welcome back, ${
          loggedUser?.name ||
          identifier
        }`
      );
    } catch (loginError) {
      console.error(
        "[Juice Robo] Login error:",
        loginError
      );

      if (
        loginError?.status ===
        401
      ) {
        showToast(
          "Invalid email or password"
        );
      } else {
        showToast(
          errorText(
            loginError
          ) ||
            "Unable to sign in."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     SIGN OUT
     ======================================================= */

  async function handleSignOut() {
    /*
     * The current legacy API adapter does not expose a backend
     * logout endpoint. Sign-out is therefore handled locally by
     * clearing the client authentication/session state.
     */
    localStorage.removeItem(
      STORAGE.loggedIn
    );

    localStorage.removeItem(
      STORAGE.accessToken
    );

    localStorage.removeItem(
      STORAGE.token
    );

    localStorage.removeItem(
      "_token"
    );

    localStorage.removeItem(
      STORAGE.user
    );

    localStorage.removeItem(
      STORAGE.legacyUser
    );

    localStorage.removeItem(
      STORAGE.location
    );

    localStorage.removeItem(
      STORAGE.machine
    );

    localStorage.removeItem(
      STORAGE.screen
    );

    setUser({});
    setLocations([]);
    setMachines([]);
    setProducts([]);

    setSelectedLocationId("");
    setSelectedMachineId("");

    setSelectedProduct(null);
    setSelectedVariant(null);

    setCart([]);
    setHistoryOrders([]);

    setCustomer(
      (current) => ({
        ...current,
        password: "",
        confirmPassword:
          "",
      })
    );

    setScreen(
      "menu"
    );

    showToast(
      "You have been signed out"
    );
  }

  /* =======================================================
     PROFILE
     ======================================================= */

  async function handleSaveProfile(event) {
    if (
      event?.preventDefault
    ) {
      event.preventDefault();
    }

    const name =
      String(
        customer?.name || ""
      ).trim();

    const email =
      String(
        customer?.email || ""
      ).trim();

    if (!name) {
      showToast(
        "Please enter your full name"
      );
      return;
    }

    if (!email) {
      showToast(
        "Please enter your email"
      );
      return;
    }

    try {
      setBusy(true);
      setError("");

      /*
       * Keep the profile data locally synchronized.
       *
       * If the current API implementation exposes a profile
       * update endpoint, it can be added here without changing
       * the ProfileScreen button wiring.
       */
      const updatedUser = {
        ...user,
        name,
        email,
      };

      setUser(
        updatedUser
      );

      writeJSON(
        STORAGE.user,
        updatedUser
      );

      writeJSON(
        STORAGE.legacyUser,
        updatedUser
      );

      const safeCustomer = {
        ...customer,
        name,
        email,
      };

      delete safeCustomer.password;
      delete safeCustomer.confirmPassword;

      setCustomer(
        safeCustomer
      );

      writeJSON(
        STORAGE.customer,
        safeCustomer
      );

      showToast(
        "Profile saved successfully"
      );
    } catch (profileError) {
      console.error(
        "[Juice Robo] Profile save failed:",
        profileError
      );

      setError(
        errorText(
          profileError
        )
      );

      showToast(
        errorText(
          profileError
        ) ||
          "Unable to save profile"
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     PRODUCTS API
     ======================================================= */

  async function loadProductsForLocation(
    location
  ) {
    const storeId =
      location?.storeId ||
      location?.store_id ||
      location?.locId ||
      location?.id ||
      "";

    if (!storeId) {
      setProducts([]);
      return;
    }

    try {
      setBusy(true);
      setError("");

      const loadedProducts =
        await api.products(
          storeId
        );

      setProducts(
        Array.isArray(
          loadedProducts
        )
          ? loadedProducts
          : []
      );
    } catch (productError) {
      console.error(
        "[Juice Robo] Product API failed:",
        productError
      );

      setProducts([]);

      setError(
        errorText(productError) ||
          "Unable to load available juices."
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     LOCATION
     ======================================================= */

  async function selectLocation(
    location
  ) {
    const id =
      String(
        location?.id ??
          location?.storeId ??
          location?.store_id ??
          location?.locId ??
          ""
      );

    if (!id) {
      return;
    }

    setSelectedLocationId(
      id
    );

    localStorage.setItem(
      STORAGE.location,
      id
    );

    /*
     * The current Juice Robo API adapter represents the physical
     * machine through the outlet/store record. Keep the complete
     * machine list in memory and immediately select the machine
     * belonging to the newly selected location.
     */
    const matchingMachine =
      machines.find(
        (machine) => {
          const machineLocationIds = [
            machine?.locationId,
            machine?.location_id,
            machine?.storeId,
            machine?.store_id,
            machine?.locId,
            machine?.outletId,
            machine?.outlet_id,
            machine?.location?.id,
            machine?.store?.id,
            machine?.outlet?.id,
          ]
            .filter(
              (value) =>
                value !==
                  undefined &&
                value !== null &&
                value !== ""
            )
            .map((value) =>
              String(value)
            );

          return machineLocationIds.includes(
            String(id)
          );
        }
      );

    if (matchingMachine) {
      const machineId =
        String(
          matchingMachine?.id ??
            ""
        );

      setSelectedMachineId(
        machineId
      );

      localStorage.setItem(
        STORAGE.machine,
        machineId
      );
    } else {
      /*
       * Do not keep a machine from the previous location.
       */
      setSelectedMachineId(
        ""
      );

      localStorage.removeItem(
        STORAGE.machine
      );
    }

    await loadProductsForLocation(
      location
    );

    showToast(
      location?.name ||
        "Location selected"
    );
  }

  /* =======================================================
     MACHINE
     ======================================================= */

  function selectMachine(
    machine
  ) {
    const id =
      String(
        machine?.id || ""
      );

    if (!id) {
      return;
    }

    setSelectedMachineId(
      id
    );

    localStorage.setItem(
      STORAGE.machine,
      id
    );

    showToast(
      `${machine?.name || "Machine"} selected`
    );
  }

  function continueToMenu() {
    if (!selectedLocationId) {
      showToast(
        "Select a collection location"
      );
      return;
    }

    if (!selectedMachineId) {
      showToast(
        "Select a Juice Robo machine"
      );
      return;
    }

    setScreen(
      "menu"
    );
  }

  /* =======================================================
     PRODUCT DETAIL
     ======================================================= */

  function openProduct(
    product
  ) {
    setSelectedProduct(
      product
    );

    const variants =
      Array.isArray(
        product?.lstVariants
      )
        ? product.lstVariants
        : [];

    const firstVariant =
      variants[0] || null;

    setSelectedVariant(
      firstVariant
    );

    const existing =
      safeCart.find(
        (item) =>
          String(
            item?.productId ??
              item?.itemId ??
              item?.id
          ) ===
          String(
            product?.id
          )
      );

    setQuantity(
      Math.max(
        1,
        Number(
          existing?.quantity ||
            1
        )
      )
    );

    setScreen(
      "product"
    );
  }

  function closeProduct() {
    setSelectedProduct(
      null
    );

    setSelectedVariant(
      null
    );

    setQuantity(
      1
    );
  }

  function addProductToCart(
    product,
    variant,
    nextQuantity = 1
  ) {
    const item =
      makeCartItem(
        product,
        variant,
        nextQuantity
      );

    setCart(
      (current) => {
        const exists =
          current.find(
            (entry) =>
              String(
                entry.id
              ) ===
              String(
                item.id
              )
          );

        if (exists) {
          return current.map(
            (entry) =>
              String(
                entry.id
              ) ===
              String(
                item.id
              )
                ? {
                    ...entry,
                    ...item,
                    quantity:
                      item.quantity,
                  }
                : entry
          );
        }

        return [
          ...current,
          item,
        ];
      }
    );

    showToast(
      `${displayProductName(
        product
      )} added to cart`
    );

    closeProduct();

    setScreen(
      "menu"
    );
  }

  function handleAddToCart(
    product,
    variant,
    nextQuantity
  ) {
    /*
     * Menu/product browsing is public, but adding an item to the
     * cart requires authentication. Send the user to Sign In
     * instead of adding the item while logged out.
     */
    if (!loggedIn) {
      showToast(
        "Please sign in to add items to your cart"
      );

      closeProduct();
      setScreen(
        "login"
      );
      return;
    }

    let actualVariant =
      variant;

    let actualQuantity =
      nextQuantity;

    if (
      typeof variant ===
      "number"
    ) {
      actualQuantity =
        variant;

      actualVariant =
        null;
    }

    if (
      actualQuantity ===
      undefined
    ) {
      actualQuantity =
        quantity;
    }

    if (
      !actualVariant &&
      selectedVariant
    ) {
      actualVariant =
        selectedVariant;
    }

    addProductToCart(
      product,
      actualVariant,
      actualQuantity
    );
  }

  /* =======================================================
     CART
     ======================================================= */

  function updateQuantity(
    productId,
    nextQuantity
  ) {
    const value =
      Number(
        nextQuantity
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {
      removeProduct(
        productId
      );
      return;
    }

    setCart(
      (current) =>
        current.map(
          (item) =>
            String(
              item.id
            ) ===
            String(
              productId
            )
              ? {
                  ...item,
                  quantity:
                    value,
                }
              : item
        )
    );
  }

  function removeProduct(
    productId
  ) {
    setCart(
      (current) =>
        current.filter(
          (item) =>
            String(
              item.id
            ) !==
            String(
              productId
            )
        )
    );

    showToast(
      "Item removed from cart"
    );
  }

  function clearCart() {
    setCart([]);
    showToast(
      "Cart cleared"
    );
  }

  /* =======================================================
     CHECKOUT
     ======================================================= */

  function startCheckout() {
    if (!loggedIn) {
      showToast(
        "Please sign in to proceed to checkout"
      );
      setScreen(
        "login"
      );
      return;
    }

    if (!safeCart.length) {
      showToast(
        "Your cart is empty"
      );

      setScreen(
        "menu"
      );

      return;
    }

    if (
      !selectedLocationId ||
      !selectedMachineId
    ) {
      showToast(
        "Select your collection location and machine first"
      );

      setScreen(
        "location"
      );

      return;
    }

    setScreen(
      "location-confirmation"
    );
  }

  function proceedToPayment() {
    if (!safeCart.length) {
      showToast(
        "Your cart is empty"
      );

      setScreen(
        "cart"
      );

      return;
    }

    setScreen(
      "payment"
    );
  }

  
function findPaymentQr(value, depth = 0) {
  if (depth > 12 || value == null) return "";

  /* Preserve the exact existing backend qrString value first. */
  if (typeof value === "object" && !Array.isArray(value)) {
    for (const key of ["qrString", "qr_string"]) {
      const candidate = value[key];
      if (typeof candidate === "string" && candidate.trim()) {
        let exact = candidate.trim();
        try {
          if (/%3A|%2F|%3F|%3D|%26/i.test(exact)) {
            const decoded = decodeURIComponent(exact);
            if (decoded.trim()) exact = decoded.trim();
          }
        } catch {}
        return exact;
      }
    }
  }

  if (typeof value === "string") {
    let text = value.trim();
    try {
      if (!/^upi:\/\//i.test(text) && /%3A|%2F|%3F|%3D|%26/i.test(text)) {
        const decoded = decodeURIComponent(text);
        if (decoded) text = decoded.trim();
      }
    } catch {}
    if (/^upi:\/\/(pay|collect)\?/i.test(text)) return text;
    if (text.startsWith("{") || text.startsWith("[")) {
      try { return findPaymentQr(JSON.parse(text), depth + 1); } catch {}
    }
    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPaymentQr(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value !== "object") return "";

  const qrKeys = [
    "qrCode", "qr_code", "qrcode", "qr",
    "paymentQr", "payment_qr", "paymentQrString", "payment_qr_string",
  ];

  for (const key of qrKeys) {
    const found = findPaymentQr(value[key], depth + 1);
    if (found) return found;
  }

  for (const [key, child] of Object.entries(value)) {
    if (["qrString", "qr_string", ...qrKeys].includes(key)) continue;
    const found = findPaymentQr(child, depth + 1);
    if (found) return found;
  }

  return "";
}

/* =======================================================
     PAYMENT / ORDER
     -------------------------------------------------------
     Creates the Juice Robo order first, then hands a UPI
     deep-link to the device. Opening the UPI app does NOT
     mean that payment succeeded; the order remains PENDING
     until the backend confirms payment.
     ======================================================= */

  async function handlePayment() {
    if (!safeCart.length) {
      showToast(
        "Your cart is empty"
      );

      setScreen(
        "cart"
      );

      return;
    }

    if (!selectedLocationId) {
      showToast(
        "Please select a collection location"
      );

      setScreen(
        "location"
      );

      return;
    }

    if (!selectedMachineId) {
      showToast(
        "Please select a Juice Robo machine"
      );

      setScreen(
        "location"
      );

      return;
    }

    try {
      setBusy(true);
      setError(
        ""
      );

      try {
        sessionStorage.removeItem("juice_robo_payment_confirmed");
      } catch {}

      /* =====================================================
         1. CREATE JUICE ROBO ORDER
         ===================================================== */

      const created =
        await api.createOrder({
          storeId:
            selectedLocation?.storeId ||
            selectedLocation?.store_id ||
            selectedLocation?.locId ||
            selectedLocation?.id,

          locationId:
            selectedLocation?.id,

          machineId:
            selectedMachine?.id ||
            selectedMachine?.machineId ||
            selectedMachine?.machine_id,

          cartItems:
            safeCart,

          customer: {
            name:
              customer?.name ||
              user?.name ||
              "",

            phone:
              customer?.phone ||
              user?.phone ||
              "",

            email:
              customer?.email ||
              user?.email ||
              "",
          },

          updatedBy:
            customer?.name ||
            user?.name ||
            user?.email ||
            "Juice Robo Customer",
        });

      if (!created) {
        throw new Error(
          "Unable to create the Juice Robo order."
        );
      }

      /* =====================================================
         2. NORMALIZE LOCAL ORDER STATE
         ===================================================== */

      const cartId =
        String(
          created?.cartId ||
          created?.cart_id ||
          ""
        ).trim();

      const orderId =
        String(
          created?.orderId ||
          created?.order_id ||
          created?.orderNumber ||
          created?.order_number ||
          created?.id ||
          ""
        ).trim();

      const transactionId = String(
        created?.transactionId ||
        created?.transaction_id ||
        ""
      ).trim();

      const normalizedOrder = {
        ...created,

        id:
          created?.id ||
          orderId,

        orderId,

        order_id:
          created?.order_id ||
          orderId,

        orderNumber:
          created?.orderNumber ||
          orderId,

        order_number:
          created?.order_number ||
          orderId,

        cartId,

        items:
          safeCart,

        subtotal,

        gst,

        total_amount:
          finalTotal,

        totalAmount:
          finalTotal,

        location:
          selectedLocation,

        machine:
          selectedMachine,

        createdAt:
          created?.created_at ||
          created?.createdAt ||
          new Date().toISOString(),

        payment_status:
          created?.payment_status ||
          created?.paymentStatus ||
          "PENDING",

        paymentStatus:
          created?.paymentStatus ||
          created?.payment_status ||
          "PENDING",

        status:
          created?.status ||
          "PENDING",
      };

      setOrder(
        normalizedOrder
      );

      setHistoryOrders(
        (current) => [
          normalizedOrder,
          ...current.filter(
            (item) =>
              String(
                item?.id ||
                item?.orderId ||
                item?.order_id ||
                item?.orderNumber ||
                item?.order_number ||
                ""
              ) !==
              String(
                normalizedOrder?.id ||
                normalizedOrder?.orderId ||
                normalizedOrder?.orderNumber ||
                ""
              )
          ),
        ]
      );

      /* =====================================================
         3. SAVE PENDING PAYMENT CONTEXT
         ===================================================== */

      try {
        sessionStorage.setItem(
          "juice_robo_pending_order",
          JSON.stringify(
            normalizedOrder
          )
        );

        sessionStorage.setItem(
          "juice_robo_pending_cart_id",
          cartId
        );

        sessionStorage.setItem(
          "juice_robo_pending_order_id",
          orderId
        );

        const pendingTransactionId =
          transactionId ||
          String(
            normalizedOrder?.transactionId ||
            normalizedOrder?.transaction_id ||
            ""
          ).trim();

        if (pendingTransactionId) {
          sessionStorage.setItem(
            "juice_robo_pending_transaction_id",
            pendingTransactionId
          );
        } else {
          sessionStorage.removeItem(
            "juice_robo_pending_transaction_id"
          );
        }
      } catch (storageError) {
        console.warn(
          "[Juice Robo] Unable to save pending payment context:",
          storageError
        );
      }

      /* =====================================================
         4. USE THE BACKEND-GENERATED UPI PAYMENT STRING
         -----------------------------------------------------
         The Order Master / PhonePe backend returns qrString.
         That value is the payment source of truth.
         Do NOT manufacture a separate frontend UPI payload.
         ===================================================== */

      /*
       * Use ONLY the QR string returned by the existing backend.
       * OrderResp exposes this as qrString inside ServerResponse.data.
       */
      const backendQrString = String(
        created?.qrString ||
        created?.qr_string ||
        findPaymentQr(created?.submitResponse) ||
        findPaymentQr(created) ||
        ""
      ).trim();

      /*
       * Payment must come from the existing backend order/payment flow.
       * Never manufacture a separate UPI request from a frontend UPI ID:
       * that request would not be tied to the backend transaction.
       */
      const upiUrl = backendQrString;

      if (!upiUrl) {
        const submitResponse = created?.submitResponse;
        const backendStatus = submitResponse?.status;
        const backendMessage = String(
          submitResponse?.message ||
          ""
        ).trim();

        if (backendStatus !== undefined && Number(backendStatus) !== 200 && backendMessage) {
          throw new Error(backendMessage);
        }

        throw new Error(
          "Juice Robo backend did not return a payment QR/link."
        );
      }

      console.log(
        "[Juice Robo] Payment source:",
        "EXISTING BACKEND QR"
      );

      const upiId = (() => {
        try {
          const questionMark = upiUrl.indexOf("?");

          if (questionMark < 0) return "";

          return String(
            new URLSearchParams(
              upiUrl.slice(questionMark + 1)
            ).get("pa") || ""
          ).trim();
        } catch {
          return "";
        }
      })();

      console.log(
        "[Juice Robo] Payment amount:",
        Number(
          finalTotal
        ).toFixed(2)
      );

      console.log(
        "[Juice Robo] Payment reference:",
        transactionId
      );

      /* =====================================================
         5. OPEN THE DEVICE'S UPI APP
         -----------------------------------------------------
         Use the standard UPI URI directly from the user's tap.
         Do NOT construct an Android intent wrapper: different Android
         browsers/UPI apps handle such wrappers differently, and an
         invalid intent wrapper can produce a generic "Something
         went wrong" screen inside the UPI application.

         The UPI URI remains the source of truth. Opening the URI
         does NOT mean that payment succeeded.
         ===================================================== */

      setBusy(false);

      try {
        sessionStorage.setItem(
          "juice_robo_pending_upi_url",
          upiUrl
        );

      } catch (storageError) {
        console.warn(
          "[Juice Robo] Unable to save pending UPI context:",
          storageError
        );
      }

      const derivedUpiId = (() => {
        try {
          const raw = String(upiUrl || "").trim();
          const questionMark = raw.indexOf("?");

          if (questionMark < 0) return "";

          const params = new URLSearchParams(
            raw.slice(questionMark + 1)
          );

          return String(
            params.get("pa") || ""
          ).trim();
        } catch {
          return "";
        }
      })();

      setUpiPaymentUrl(upiUrl);
      setUpiMerchantId(derivedUpiId);

      /*
       * iOS: hand the backend-generated UPI URI to the device so
       * iOS can open the customer's registered/preferred UPI app.
       *
       * We never manufacture a PhonePe/Google Pay/etc. payload here.
       * The backend-provided UPI URI remains the payment source of truth.
       */
      setScreen("upi-qr");

    } catch (paymentError) {
      console.error(
        "[Juice Robo] Payment initiation failed:",
        paymentError
      );

      const message =
        errorText(
          paymentError
        ) ||
        "Unable to start payment.";

      setError(
        message
      );

      showToast(
        message
      );

      setBusy(false);
    }
  }


  /* =======================================================
     PAYMENT CONFIRMATION
     -------------------------------------------------------
     Payment success is accepted ONLY when the existing
     backend Order Master status endpoint reports
     PAYMENT-SUCCESS. Opening a UPI app or returning to this
     page never clears the cart by itself.
     ======================================================= */

  async function checkExistingOrderPaymentStatus() {
    const pendingCartId = String(
      sessionStorage.getItem("juice_robo_pending_cart_id") ||
        order?.cartId ||
        ""
    ).trim();

    const pendingTransactionId = String(
      sessionStorage.getItem("juice_robo_pending_transaction_id") ||
        order?.transactionId ||
        order?.transaction_id ||
        ""
    ).trim();

    let pendingOrderId = String(
      sessionStorage.getItem("juice_robo_pending_order_id") ||
        order?.orderId ||
        order?.order_id ||
        ""
    ).trim();

    try {
      setPaymentChecking(true);

      /*
       * FIRST: ask the existing recent-orders endpoint.
       * This is the backend source that already exposes the final
       * OrderMaster payment status and does not require us to guess
       * or manufacture an order ID.
       */
      let recentOrders = [];
      try {
        const recent = await api.orders();
        recentOrders = Array.isArray(recent) ? recent : [];
      } catch (recentError) {
        console.warn(
          "[Juice Robo] Existing recent-orders check failed:",
          recentError
        );
      }

      const matchingOrder = recentOrders.find((item) => {
        const itemCartId = String(
          item?.cartId || item?.cart_id || ""
        ).trim();
        const itemOrderId = String(
          item?.orderId || item?.order_id || item?.id || ""
        ).trim();
        const itemTransactionId = String(
          item?.transactionId || item?.transaction_id || ""
        ).trim();

        if (pendingTransactionId && itemTransactionId === pendingTransactionId) {
          return true;
        }
        if (pendingOrderId && itemOrderId === pendingOrderId) {
          return true;
        }
        if (pendingCartId && itemCartId === pendingCartId) {
          return true;
        }
        return false;
      }) || null;

      if (matchingOrder) {
        const recentStatus = String(
          matchingOrder?.orderStatus ||
            matchingOrder?.order_status ||
            matchingOrder?.status ||
            ""
        ).trim().toUpperCase();

        console.log(
          "[Juice Robo] Existing recent-order payment status:",
          recentStatus || "UNKNOWN",
          matchingOrder
        );

        const resolvedOrderId = String(
          matchingOrder?.orderId ||
            matchingOrder?.order_id ||
            matchingOrder?.id ||
            pendingOrderId ||
            ""
        ).trim();

        if (resolvedOrderId) {
          pendingOrderId = resolvedOrderId;
          try {
            sessionStorage.setItem(
              "juice_robo_pending_order_id",
              resolvedOrderId
            );
          } catch {}
        }

        setOrder((current) => ({
          ...(current || {}),
          ...(matchingOrder || {}),
          orderId: resolvedOrderId || current?.orderId,
          order_id: resolvedOrderId || current?.order_id,
          id: resolvedOrderId || current?.id,
          cartId:
            matchingOrder?.cartId ||
            matchingOrder?.cart_id ||
            current?.cartId ||
            pendingCartId,
          transactionId:
            matchingOrder?.transactionId ||
            matchingOrder?.transaction_id ||
            current?.transactionId ||
            pendingTransactionId,
        }));

        if (recentStatus === "PAYMENT-SUCCESS") {
          return completeSuccessfulPayment(
            matchingOrder,
            pendingCartId,
            resolvedOrderId || pendingOrderId
          );
        }
      }

      /*
       * SECOND: use the existing order-status endpoint only when
       * recent orders did not already confirm PAYMENT-SUCCESS.
       */
      if (!pendingOrderId && matchingOrder) {
        pendingOrderId = String(
          matchingOrder?.orderId ||
            matchingOrder?.order_id ||
            matchingOrder?.id ||
            ""
        ).trim();
      }

      if (!pendingCartId || !pendingOrderId) {
        console.warn(
          "[Juice Robo] Payment status check skipped: missing cartId/orderId.",
          { pendingCartId, pendingOrderId, pendingTransactionId }
        );
        return false;
      }

      const statusOrder = await api.orderStatus(
        pendingCartId,
        pendingOrderId
      );

      if (!statusOrder) return false;

      const backendStatus = String(
        statusOrder?.orderStatus ||
          statusOrder?.order_status ||
          statusOrder?.status ||
          ""
      ).trim().toUpperCase();

      console.log(
        "[Juice Robo] Existing backend order-status payment status:",
        backendStatus || "UNKNOWN"
      );

      if (backendStatus === "PAYMENT-SUCCESS") {
        return completeSuccessfulPayment(
          statusOrder,
          pendingCartId,
          pendingOrderId
        );
      }

      setOrder((current) => ({
        ...(current || {}),
        ...statusOrder,
        orderStatus:
          statusOrder?.orderStatus ||
          statusOrder?.order_status ||
          current?.orderStatus ||
          "QR-INIT",
        status:
          statusOrder?.status ||
          statusOrder?.orderStatus ||
          statusOrder?.order_status ||
          current?.status ||
          "QR-INIT",
      }));

      return false;
    } catch (statusError) {
      console.warn(
        "[Juice Robo] Payment confirmation check failed; payment remains pending.",
        statusError
      );
      return false;
    } finally {
      setPaymentChecking(false);
    }
  }

  async function completeSuccessfulPayment(
    confirmedOrder,
    pendingCartId,
    pendingOrderId
  ) {
    const alreadyConfirmed =
      sessionStorage.getItem("juice_robo_payment_confirmed") === "1";

    if (alreadyConfirmed || screen === "payment-success") {
      return true;
    }

    const completedOrder = {
      ...(order || {}),
      ...(confirmedOrder || {}),
      id:
        confirmedOrder?.orderId ||
        confirmedOrder?.order_id ||
        confirmedOrder?.id ||
        pendingOrderId,
      orderId:
        confirmedOrder?.orderId ||
        confirmedOrder?.order_id ||
        confirmedOrder?.id ||
        pendingOrderId,
      order_id:
        confirmedOrder?.order_id ||
        confirmedOrder?.orderId ||
        confirmedOrder?.id ||
        pendingOrderId,
      cartId:
        confirmedOrder?.cartId ||
        confirmedOrder?.cart_id ||
        order?.cartId ||
        pendingCartId,
      orderStatus: "PAYMENT-SUCCESS",
      status: "PAYMENT-SUCCESS",
      paymentStatus: "PAID",
      payment_status: "PAID",
      paymentConfirmed: true,
      items: order?.items || safeCart,
    };

    try {
      sessionStorage.setItem("juice_robo_payment_confirmed", "1");
    } catch {}

    setOrder(completedOrder);

    setHistoryOrders((current) => [
      completedOrder,
      ...current.filter(
        (item) =>
          String(
            item?.id ||
              item?.orderId ||
              item?.order_id ||
              item?.orderNumber ||
              item?.order_number ||
              ""
          ) !==
          String(
            completedOrder?.id ||
              completedOrder?.orderId ||
              pendingOrderId
          )
      ),
    ]);

    /* Cart is cleared ONLY after the existing backend confirms success. */
    setCart([]);

    try {
      sessionStorage.removeItem("juice_robo_pending_order");
      sessionStorage.removeItem("juice_robo_pending_cart_id");
      sessionStorage.removeItem("juice_robo_pending_order_id");
      sessionStorage.removeItem("juice_robo_pending_transaction_id");
      sessionStorage.removeItem("juice_robo_pending_upi_url");
      sessionStorage.removeItem("juice_robo_pending_upi_id");
    } catch (storageError) {
      console.warn(
        "[Juice Robo] Unable to clear pending payment context:",
        storageError
      );
    }

    setPaymentChecking(false);
    setBusy(false);
    setScreen("payment-success");
    showToast("Payment confirmed successfully");
    return true;
  }

  /*
   * Poll the existing Order Master status endpoint while the
   * customer is on the UPI screen. Also check immediately when
   * the browser becomes visible again after returning from the
   * UPI application.
   */
  useEffect(() => {
    if (screen !== "upi-qr") {
      return undefined;
    }

    let cancelled = false;

    const check = async () => {
      if (cancelled) return;

      await checkExistingOrderPaymentStatus();
    };

    check();

    const intervalId =
      window.setInterval(
        check,
        2500
      );

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        check();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    window.addEventListener(
      "focus",
      check
    );

    return () => {
      cancelled = true;

      window.clearInterval(
        intervalId
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.removeEventListener(
        "focus",
        check
      );
    };
  }, [
    screen,
    order?.cartId,
    order?.orderId,
    order?.order_id,
  ]);

  /* =======================================================
     HISTORY
     ======================================================= */

  async function refreshOrders() {
    try {
      const backendOrders =
        await api.orders();

      if (
        Array.isArray(
          backendOrders
        ) &&
        backendOrders.length
      ) {
        setHistoryOrders(
          backendOrders
        );
      }
    } catch (ordersError) {
      console.warn(
        "[Juice Robo] Backend order history unavailable; using local history.",
        ordersError
      );
    }
  }

  function openOrderHistory() {
    refreshOrders();
    setScreen(
      "history"
    );
  }

  function clearOrderHistory() {
    if (
      !window.confirm(
        "Clear your locally saved order history?"
      )
    ) {
      return;
    }

    localStorage.removeItem(
      STORAGE.orders
    );

    localStorage.removeItem(
      ordersKey(user)
    );

    setHistoryOrders(
      []
    );

    showToast(
      "Order history cleared"
    );
  }

  /* =======================================================
     DEVICE IDENTIFICATION
     -------------------------------------------------------
     Device class is determined from navigator.userAgent.

     We intentionally do NOT use viewport width to decide
     whether the user is on a phone. A desktop browser can
     emulate a 440px phone viewport, which must not be treated
     as an actual mobile device.
     ======================================================= */

  const isMobileDevice =
    useMemo(() => {
      if (typeof navigator === "undefined") {
        return false;
      }

      const userAgent =
        String(
          navigator.userAgent ||
          ""
        ).toLowerCase();

      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|opera mobi|mobile/i.test(
        userAgent
      );
    }, []);

  const isIOSDevice =
    useMemo(() => {
      if (typeof navigator === "undefined") {
        return false;
      }

      const userAgent =
        String(
          navigator.userAgent ||
          ""
        ).toLowerCase();

      return /iphone|ipad|ipod/.test(
        userAgent
      );
    }, []);

/* =======================================================
   DESKTOP BLOCK
   ======================================================= */

if (!isMobileDevice) {
  return (
    <div
      className="jr-desktop-block"
      role="status"
      aria-live="polite"
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        padding: "40px 24px",
        background: "#f7f7f3",
        fontFamily:
          "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        className="jr-desktop-block-content"
        style={{
          width: "100%",
          maxWidth: "460px",
          textAlign: "center",
          padding: "48px 32px",
          boxSizing: "border-box",
          background: "#ffffff",
          borderRadius: "28px",
          boxShadow:
            "0 18px 50px rgba(0, 0, 0, 0.08)",
        }}
      >
        {/* PHONE ICON */}
        <div
          aria-hidden="true"
          style={{
            width: "76px",
            height: "76px",
            margin: "0 auto 24px",
            borderRadius: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#edf8f0",
            color: "#2f8050",
          }}
        >
          <svg
            viewBox="0 0 64 64"
            width="42"
            height="42"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="18"
              y="7"
              width="28"
              height="50"
              rx="6"
              stroke="currentColor"
              strokeWidth="3"
            />

            <rect
              x="23"
              y="13"
              width="18"
              height="35"
              rx="2"
              fill="currentColor"
              opacity="0.10"
            />

            <circle
              cx="32"
              cy="52"
              r="2"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* BRAND */}
        <div
          style={{
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "2px",
            color: "#f28a00",
            marginBottom: "10px",
          }}
        >
          JUICE ROBO
        </div>

        {/* TITLE */}
        <h1
          style={{
            margin: "0 0 14px",
            fontSize: "32px",
            lineHeight: "1.15",
            fontWeight: 800,
            color: "#1c1c1c",
          }}
        >
          Mobile Only
        </h1>

        {/* DESCRIPTION */}
        <p
          style={{
            margin: "0 auto",
            maxWidth: "360px",
            fontSize: "15px",
            lineHeight: "1.7",
            fontWeight: 500,
            color: "#777777",
          }}
        >
          Juice Robo is designed for mobile devices.
          <br />
          Please open this website on your mobile phone
          to continue.
        </p>

        {/* SMALL HINT */}
        <div
          style={{
            marginTop: "28px",
            padding: "12px 18px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            background: "#f7f7f7",
            color: "#666666",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          Best experience on mobile
        </div>
      </div>
    </div>
  );
}

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <div className="jr-app">
        <div className="jr-mobile-frame">
          <div className="jr-loading">
            <img
              src={`${ASSET_BASE}app_logo.jpg`}
              alt="Juice Robo"
              className="jr-loading-image"
              style={{
                width: "180px",
                height: "180px",
                maxWidth: "180px",
                maxHeight: "180px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />

            <div className="jr-loader" />

            <p>
              Loading Juice Robo…
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     LOGIN
     ======================================================= */

  if (screen === "login") {
    return (
      <div className="jr-app">
        <div className="jr-mobile-frame">
          <LoginScreen
            customer={
              customer
            }
            setCustomer={
              setCustomer
            }
            onLogin={
              handleLogin
            }
            busy={
              busy
            }
            error={
              error
            }
            onContinueWithoutLogin={() =>
              setScreen(
                "menu"
              )
            }
          />

          {toast && (
            <Toast
              message={
                toast
              }
            />
          )}
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN APP
     ======================================================= */

  return (
    <div className="jr-app">
      <div className="jr-mobile-frame">

        {/* ===================================================
            HEADER
           =================================================== */}

        <Header
          cartCount={
            cartCount
          }

          location={
            selectedLocation
          }

          machine={
            selectedMachine
          }

          locations={
            locations
          }

          machines={
            machines
          }

          selectedLocationId={
            selectedLocationId
          }

          selectedMachineId={
            selectedMachineId
          }

          onLocation={
            selectLocation
          }

          onMachine={
            selectMachine
          }

          onCart={() => {
            if (!loggedIn) {
              showToast(
                "Please sign in to view your cart"
              );

              setScreen(
                "login"
              );

              return;
            }

            setScreen(
              "cart"
            );
          }}

          onProfile={() => {
            if (!loggedIn) {
              showToast(
                "Please sign in to view your profile"
              );

              setScreen(
                "login"
              );

              return;
            }

            setScreen(
              "profile"
            );
          }}
        />

        <div className="jr-screen-container">

          {/* =================================================
              PROFILE
             ================================================= */}

          {screen === "profile" && (
            <ProfileScreen
              user={
                user
              }

              customer={
                customer
              }

              setCustomer={
                setCustomer
              }

              orders={
                historyOrders
              }

              busy={
                busy
              }

              error={
                error
              }

              onSave={
                handleSaveProfile
              }

              onBack={() =>
                setScreen(
                  "menu"
                )
              }

              /*
               * Both names are supplied for compatibility
               * with the ProfileScreen implementation.
               */
              onLogout={
                handleSignOut
              }

              onSignOut={
                handleSignOut
              }

              onOrders={
                openOrderHistory
              }

              onHistory={
                openOrderHistory
              }
            />
          )}

          {/* =================================================
              HISTORY
             ================================================= */}

          {screen === "history" && (
            <HistoryScreen
              orders={
                historyOrders
              }

              onBack={() =>
                setScreen(
                  "profile"
                )
              }

              onClear={
                clearOrderHistory
              }

              money={
                money
              }
            />
          )}

          {/* =================================================
              LOCATION / MACHINE
             ================================================= */}

          {screen === "location" && (
            <LocationMachineScreen
              locations={
                locations
              }

              machines={
                machines
              }

              selectedLocationId={
                selectedLocationId
              }

              selectedMachineId={
                selectedMachineId
              }

              onLocation={
                selectLocation
              }

              onMachine={
                selectMachine
              }

              onContinue={
                continueToMenu
              }
            />
          )}

          {/* =================================================
              HOME
             ================================================= */}

          {screen === "home" && (
            <HomeScreen
              products={
                products
              }

              selectedLocation={
                selectedLocation
              }

              selectedMachine={
                selectedMachine
              }

              onProduct={
                openProduct
              }

              productImage={
                resolveProductImage
              }

              displayProductName={
                displayProductName
              }

              displayDescription={
                displayDescription
              }

              money={
                money
              }

              onMenu={() =>
                setScreen(
                  "menu"
                )
              }

              onLocation={() =>
                setScreen(
                  "location"
                )
              }

              onOrders={
                openOrderHistory
              }

              onProfile={() =>
                setScreen(
                  "profile"
                )
              }
            />
          )}

          {/* =================================================
              MENU
             ================================================= */}

          {screen === "menu" && (
            <MenuScreen
              products={
                products
              }

              selectedLocation={
                selectedLocation
              }

              selectedMachine={
                selectedMachine
              }

              cart={
                safeCart
              }

              onProduct={
                openProduct
              }

              onUpdate={
                updateQuantity
              }

              onAddToCart={
                handleAddToCart
              }

              productImage={
                resolveProductImage
              }

              displayProductName={
                displayProductName
              }

              displayDescription={
                displayDescription
              }

              money={
                money
              }
            />
          )}

          {/* =================================================
              PRODUCT DETAIL
             ================================================= */}

          {screen === "product" && (
            <ProductDetailScreen
              product={
                selectedProduct
              }

              variant={
                selectedVariant
              }

              selectedVariant={
                selectedVariant
              }

              quantity={
                quantity
              }

              setQuantity={
                setQuantity
              }

              onVariantChange={
                setSelectedVariant
              }

              onBack={() => {
                closeProduct();

                setScreen(
                  "menu"
                );
              }}

              onAddToCart={
                handleAddToCart
              }

              formatMoney={
                money
              }

              money={
                money
              }
            />
          )}

          {/* =================================================
              CART
             ================================================= */}

          {screen === "cart" && (
            <CartScreen
              cart={
                safeCart
              }

              total={
                cartTotal
              }

              subtotal={
                subtotal
              }

              gst={
                gst
              }

              finalTotal={
                finalTotal
              }

              location={
                selectedLocation
              }

              machine={
                selectedMachine
              }

              onBack={() =>
                setScreen(
                  "menu"
                )
              }

              onUpdate={
                updateQuantity
              }

              onRemove={
                removeProduct
              }

              onClear={
                clearCart
              }

              onLocation={() =>
                setScreen(
                  "location"
                )
              }

              onCheckout={
                startCheckout
              }

              productImage={
                resolveProductImage
              }

              displayProductName={
                displayProductName
              }

              money={
                money
              }
            />
          )}

          {/* =================================================
              LOCATION CONFIRMATION
             ================================================= */}

          {screen === "location-confirmation" && (
            <LocationConfirmationScreen
              location={
                selectedLocation
              }

              machine={
                selectedMachine
              }

              cart={
                safeCart
              }

              total={
                finalTotal
              }

              subtotal={
                subtotal
              }

              gst={
                gst
              }

              finalTotal={
                finalTotal
              }

              onBack={() =>
                setScreen(
                  "cart"
                )
              }

              onConfirm={
                proceedToPayment
              }

              money={
                money
              }
            />
          )}

          {/* =================================================
              PAYMENT
             ================================================= */}

          {screen === "payment" && (
            <PaymentScreen
              cart={
                safeCart
              }

              total={
                finalTotal
              }

              subtotal={
                subtotal
              }

              gst={
                gst
              }

              finalTotal={
                finalTotal
              }

              location={
                selectedLocation
              }

              machine={
                selectedMachine
              }

              onBack={() =>
                setScreen(
                  "location-confirmation"
                )
              }

              onPay={
                handlePayment
              }

              money={
                money
              }

              busy={
                busy
              }

              error={
                error
              }
            />
          )}

          {/* =================================================
              UPI QR PAYMENT
             ================================================= */}

          {screen === "upi-qr" && (
            <div
              className="jr-upi-qr-page"
              style={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                overflowY: "auto",
                overflowX: "hidden",
                WebkitOverflowScrolling: "touch",
                padding:
                  "10px 12px calc(28px + env(safe-area-inset-bottom, 0px))",
                textAlign: "center",
                background: "#fbfaf4",
              }}
            >
              <div
                className="jr-upi-qr-card"
                style={{
                  width: "min(100%, 390px)",
                  boxSizing: "border-box",
                  padding: "18px 12px 26px",
                  borderRadius: "22px",
                  background: "#ffffff",
                  boxShadow: "0 8px 28px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: "28px",
                    fontWeight: 800,
                    lineHeight: 1.15,
                    marginBottom: "10px",
                  }}
                >
                  Scan to Pay
                </div>

                <div
                  style={{
                    fontSize: "16px",
                    lineHeight: 1.45,
                    opacity: 0.72,
                    marginBottom: "16px",
                  }}
                >
                  Scan this QR code with any UPI app to complete your payment.
                </div>

                {upiPaymentUrl ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&qzone=2&ecc=H&data=${encodeURIComponent(
                      upiPaymentUrl
                    )}`}
                    alt="Juice Robo UPI payment QR code"
                    style={{
                      display: "block",
                      width: "min(76vw, 330px)",
                      height: "min(76vw, 330px)",
                      maxWidth: "330px",
                      maxHeight: "330px",
                      margin: "6px auto 16px",
                      borderRadius: "10px",
                      background: "#ffffff",
                    }}
                  />
                ) : (
                  <div style={{ padding: "28px 10px", fontSize: "14px" }}>
                    Payment QR is unavailable.
                  </div>
                )}

                <div
                  style={{
                    fontSize: "30px",
                    fontWeight: 800,
                    marginBottom: "4px",
                  }}
                >
                  {money(finalTotal)}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    opacity: 0.68,
                    marginBottom: "16px",
                    wordBreak: "break-all",
                  }}
                >
                  {upiMerchantId || "UPI ID unavailable"}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    marginBottom: "12px",
                  }}
                >
                  {[
                    ["phonepe", "PhonePe"],
                    ["gpay", "Google Pay"],
                    ["paytm", "Paytm"],
                    ["bhim", "BHIM"],
                    ["cred", "CRED"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        try {
                          let pendingTransactionId = "";
                          try {
                            pendingTransactionId = String(
                              sessionStorage.getItem(
                                "juice_robo_pending_transaction_id"
                              ) || ""
                            ).trim();
                          } catch {
                            pendingTransactionId = "";
                          }

                          const appLink =
                            api.createUpiAppLink({
                              upiUrl: upiPaymentUrl,
                              app: key,
                              transactionId: pendingTransactionId,
                            });

                          try {
                            sessionStorage.setItem(
                              "juice_robo_ios_upi_attempted",
                              "1"
                            );
                          } catch {
                            // Ignore storage errors.
                          }

                          /*
                           * Must happen directly inside the user's tap
                           * handler so Safari can hand the URL to the
                           * installed UPI application.
                           */
                          window.location.href = appLink;
                        } catch (linkError) {
                          showToast(
                            errorText(linkError) ||
                              `${label} is not available for this payment.`
                          );
                        }
                      }}
                      style={{
                        minHeight: "58px",
                        border: "none",
                        borderRadius: "14px",
                        background: "#111111",
                        color: "#ffffff",
                        fontSize: "15px",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.4,
                    opacity: 0.62,
                    marginBottom: "8px",
                  }}
                >
                  Select an app installed on your phone.
                </div>

                <div
                  style={{
                    fontSize: "13px",
                    lineHeight: 1.4,
                    opacity: 0.68,
                    marginBottom: "12px",
                  }}
                >
                  Opening your preferred UPI app...
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!upiMerchantId) {
                      showToast("UPI ID is unavailable.");
                      return;
                    }

                    try {
                      await navigator.clipboard.writeText(upiMerchantId);
                      showToast("UPI ID copied");
                    } catch {
                      showToast("Copy is unavailable on this device");
                    }
                  }}
                  style={{
                    width: "100%",
                    minHeight: "54px",
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: "15px",
                    background: "#ffffff",
                    color: "#1685d9",
                    fontSize: "16px",
                    fontWeight: 800,
                    cursor: "pointer",
                    marginBottom: "10px",
                  }}
                >
                  Copy UPI ID
                </button>


                <div
                  style={{
                    fontSize: "11px",
                    lineHeight: 1.45,
                    opacity: 0.6,
                    marginBottom: "10px",
                  }}
                >
                  Payment confirmation comes from the Juice Robo backend.
                  Your cart is cleared only after the backend reports
                  PAYMENT-SUCCESS.
                </div>

                <button
                  type="button"
                  onClick={() => setScreen("payment")}
                  style={{
                    width: "100%",
                    minHeight: "44px",
                    border: "none",
                    borderRadius: "12px",
                    background: "#111111",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Back to Payment
                </button>
              </div>
            </div>
          )}

          {/* =================================================
              CONFIRMATION
             ================================================= */}

          {screen === "confirmation" && (
            <ConfirmationScreen
              order={
                order
              }

              location={
                selectedLocation
              }

              machine={
                selectedMachine
              }

              onHome={() =>
                setScreen(
                  "home"
                )
              }

              onHistory={
                openOrderHistory
              }

              money={
                money
              }
            />
          )}

          {/* =================================================
              PAYMENT SUCCESS
             ================================================= */}

          {screen === "payment-success" && (
            <StaticPaymentSuccessScreen
              order={
                order
              }

              location={
                selectedLocation
              }

              machine={
                selectedMachine
              }

              total={
                finalTotal
              }

              onHome={() =>
                setScreen(
                  "home"
                )
              }

              onMenu={() =>
                setScreen(
                  "menu"
                )
              }

              onHistory={
                openOrderHistory
              }

              money={
                money
              }
            />
          )}
        </div>

        {/* ===================================================
            BOTTOM NAVIGATION
           =================================================== */}

        {screen !== "profile" &&
          screen !== "history" &&
          screen !== "product" &&
          screen !== "confirmation" &&
          screen !== "payment" &&
          screen !== "payment-success" && (
            <BottomNav
              screen={
                screen
              }

              setScreen={
                setScreen
              }

              cartCount={
                cartCount
              }

              loggedIn={
                loggedIn
              }

              onRequireSignIn={() => {
                showToast(
                  "Please sign in to view your cart"
                );

                setScreen(
                  "login"
                );
              }}
            />
          )}

        {/* ===================================================
            TOAST
           =================================================== */}

        {toast && (
          <Toast
            message={
              toast
            }
          />
        )}

        {/* ===================================================
            GLOBAL ERROR
           =================================================== */}

        {error &&
          screen !== "login" &&
          screen !== "payment" && (
            <div
              className="jr-global-error"
              role="alert"
              aria-live="polite"
              style={{
                position: "fixed",
                left: "16px",
                right: "16px",
                bottom: "92px",
                zIndex: 1200,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minHeight: "46px",
                padding: "10px 12px",
                borderRadius: "14px",
                boxSizing: "border-box",
              }}
            >
              <span className="jr-global-error-icon">
                !
              </span>

              <span className="jr-global-error-text">
                {error}
              </span>

              <button
                type="button"
                className="jr-global-error-close"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}
      </div>
    </div>
  );
}

/* =========================================================
   HEADER
   ========================================================= */

function Header({
  cartCount,
  location,
  machine,
  locations = [],
  machines = [],
  selectedLocationId,
  selectedMachineId,
  onLocation,
  onMachine,
  onCart,
  onProfile,
}) {
  const [open, setOpen] = useState(false);

  const clean = (value) =>
    String(value ?? "")
      .replace(/\bundefined\b/gi, "")
      .replace(/\bnull\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const locationId = (item) =>
    String(
      item?.id ??
        item?.storeId ??
        item?.store_id ??
        item?.locId ??
        item?.locationId ??
        item?.location_id ??
        item?.outletId ??
        item?.outlet_id ??
        ""
    );

  const locationName = (item) =>
    clean(
      item?.outletName ??
        item?.locationName ??
        item?.storeName ??
        item?.name ??
        item?.outlet?.name ??
        item?.location?.name ??
        item?.store?.name
    );

  const machineId = (item) =>
    String(
      item?.id ??
        item?.machineId ??
        item?.machine_id ??
        ""
    );

  const machineName = (item) =>
    clean(
      item?.machineName ??
        item?.machine_name ??
        item?.name ??
        item?.machineCode ??
        item?.machine_code ??
        item?.code
    );

  const currentLocationName =
    locationName(location) || "Choose location";

  const currentMachineName =
    machineName(machine) || "Choose machine";

  const availableMachines = machines.filter((item) => {
    if (!selectedLocationId) return true;

    const ids = [
      item?.locationId,
      item?.location_id,
      item?.storeId,
      item?.store_id,
      item?.locId,
      item?.outletId,
      item?.outlet_id,
      item?.location?.id,
      item?.store?.id,
      item?.outlet?.id,
    ]
      .filter(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
      .map((value) => String(value));

    return ids.includes(String(selectedLocationId));
  });

  const machineOptions =
    availableMachines.length
      ? availableMachines
      : machine
        ? [machine]
        : [];

  function chooseLocation(item) {
    if (typeof onLocation === "function") {
      onLocation(item);
    }
    setOpen(false);
  }

  function chooseMachine(item) {
    if (typeof onMachine === "function") {
      onMachine(item);
    }
    setOpen(false);
  }

  return (
    <header className="jr-header">
      <div className="jr-header-selection">
        <div
          className="jr-header-location-icon"
          aria-hidden="true"
          role="img"
          aria-label="Location"
        >
          <span className="jr-location-pin">📍</span>
        </div>

        {/* ONE COMBINED LOCATION + MACHINE DROPDOWN */}
        <div className="jr-combined-picker">
          <button
            type="button"
            className={`jr-combined-picker-trigger ${open ? "open" : ""}`}
            onClick={() => setOpen((value) => !value)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label="Choose location and machine"
          >
            <span className="jr-combined-picker-copy">
              <span className="jr-combined-picker-line">
                <small>LOCATION</small>
                <strong>{currentLocationName}</strong>
              </span>

              <span className="jr-combined-picker-line machine-line">
                <small>MACHINE</small>
                <strong>{currentMachineName}</strong>
              </span>
            </span>

            <svg
              className="jr-combined-picker-chevron"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 9L12 14L17 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {open && (
            <div className="jr-combined-picker-menu">
              <div className="jr-combined-picker-section">
                <div className="jr-combined-picker-section-title">
                  LOCATION
                </div>

                {locations.length ? (
                  locations.map((item, index) => {
                    const id = locationId(item);
                    const active =
                      String(id) === String(selectedLocationId || "");

                    return (
                      <button
                        type="button"
                        className={`jr-combined-picker-option ${active ? "active" : ""}`}
                        key={id || `location-${index}`}
                        onClick={() => chooseLocation(item)}
                      >
                        <span>{locationName(item) || "Unnamed location"}</span>
                        {active && (
                          <span className="jr-combined-picker-check">✓</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="jr-combined-picker-empty">
                    No locations available
                  </div>
                )}
              </div>

              <div className="jr-combined-picker-divider" />

              <div className="jr-combined-picker-section">
                <div className="jr-combined-picker-section-title">
                  MACHINE
                </div>

                {machineOptions.length ? (
                  machineOptions.map((item, index) => {
                    const id = machineId(item);
                    const active =
                      String(id) === String(selectedMachineId || "");

                    return (
                      <button
                        type="button"
                        className={`jr-combined-picker-option ${active ? "active" : ""}`}
                        key={id || `machine-${index}`}
                        onClick={() => chooseMachine(item)}
                      >
                        <span>{machineName(item) || "Unnamed machine"}</span>
                        {active && (
                          <span className="jr-combined-picker-check">✓</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="jr-combined-picker-empty">
                    No machines available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="jr-header-actions">
        <button
          type="button"
          className="jr-profile-button"
          onClick={onProfile}
          aria-label="Profile"
        >
          <svg className="jr-header-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="7.5" r="3.15" fill="currentColor" />
            <path d="M5.5 20C5.9 15.9 8.2 13.7 12 13.7C15.8 13.7 18.1 15.9 18.5 20" fill="currentColor" />
          </svg>
        </button>

        <button
          type="button"
          className="jr-cart-button"
          onClick={onCart}
          aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
        >
          <svg className="jr-header-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4.2 5.2H6.25L7.75 15.1H17.55L19.15 8H7.05" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9.15" cy="19" r="1.35" fill="currentColor" />
            <circle cx="16.25" cy="19" r="1.35" fill="currentColor" />
          </svg>

          {cartCount > 0 && (
            <span className="jr-cart-badge">{cartCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}


/* =========================================================
   BOTTOM NAV
   ========================================================= */

function BottomNav({
  screen,
  setScreen,
  cartCount,
  loggedIn,
  onRequireSignIn,
}) {
  const activeColor =
    "#2f8050";

  const inactiveColor =
    "#929292";

  const navButtonStyle = {
    appearance:
      "none",

    WebkitAppearance:
      "none",

    border:
      "0",

    outline:
      "0",

    background:
      "transparent",

    padding:
      "0",

    margin:
      "0",

    minWidth:
      "0",

    width:
      "100%",

    height:
      "100%",

    display:
      "flex",

    flexDirection:
      "column",

    alignItems:
      "center",

    justifyContent:
      "center",

    gap:
      "4px",

    cursor:
      "pointer",

    fontFamily:
      "Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  };

  const iconStyle = {
    width:
      "23px",

    height:
      "23px",

    display:
      "block",

    flex:
      "0 0 auto",
  };

  const labelStyle = {
    margin:
      "0",

    padding:
      "0",

    fontSize:
      "9px",

    lineHeight:
      "11px",

    fontWeight:
      800,

    letterSpacing:
      "0",

    color:
      "inherit",
  };

  function HomeIcon({
    active,
  }) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="23"
        height="23"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4.5 10.2L12 4L19.5 10.2V19.5H14.8V14.2H9.2V19.5H4.5V10.2Z"
          stroke={
            active
              ? activeColor
              : inactiveColor
          }
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  function OrderIcon({
    active,
  }) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="23"
        height="23"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4.2 5.2H6.2L7.7 15.2H17.7L19.3 8H7"
          stroke={
            active
              ? activeColor
              : inactiveColor
          }
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx="9.1"
          cy="19"
          r="1.35"
          fill={
            active
              ? activeColor
              : inactiveColor
          }
        />

        <circle
          cx="16.5"
          cy="19"
          r="1.35"
          fill={
            active
              ? activeColor
              : inactiveColor
          }
        />
      </svg>
    );
  }

  return (
    <nav
      className="jr-bottom-nav jr-bottom-nav-two"
      aria-label="Primary navigation"
    >

      {/* MENU */}

      <button
        type="button"
        className={
          screen === "menu" ||
          screen === "home"
            ? "active"
            : ""
        }
        onClick={() =>
          setScreen(
            "menu"
          )
        }
        aria-label="Menu"
        style={{
          ...navButtonStyle,
          color:
            screen === "menu" ||
            screen === "home"
              ? activeColor
              : inactiveColor,
        }}
      >

        <span
          style={
            iconStyle
          }
        >
          <HomeIcon
            active={
              screen === "menu" ||
              screen === "home"
            }
          />
        </span>

        <small
          style={
            labelStyle
          }
        >
          Menu
        </small>

      </button>


      {/* CART */}

      <button
        type="button"
        className={
          screen === "cart"
            ? "active"
            : ""
        }
        onClick={() => {
          if (!loggedIn) {
            onRequireSignIn?.();
            return;
          }

          setScreen(
            "cart"
          );
        }}
        aria-label="Cart"
        style={{
          ...navButtonStyle,
          color:
            screen === "cart"
              ? activeColor
              : inactiveColor,
        }}
      >

        <span
          className="jr-nav-cart-icon"
          style={{
            ...iconStyle,
            position:
              "relative",
            display:
              "grid",
            placeItems:
              "center",
          }}
        >

          <OrderIcon
            active={
              screen === "cart"
            }
          />

          {cartCount > 0 && (
            <b
              className="jr-nav-cart-badge"
            >
              {cartCount}
            </b>
          )}

        </span>

        <small
          style={
            labelStyle
          }
        >
          Cart
        </small>

      </button>

    </nav>
  );
}



/* =========================================================
   LOADING / TOAST
   ========================================================= */

function Toast({
  message,
}) {
  return (
    <div className="jr-toast">
      {message}
    </div>
  );
}
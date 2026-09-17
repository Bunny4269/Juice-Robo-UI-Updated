import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import "./App.css";


import LoginScreen from "./screens/LoginScreen/LoginScreen";

import HomeScreen from "./screens/HomeScreen/HomeScreen";
import MenuScreen from "./screens/MenuScreen/MenuScreen";
import CartScreen from "./screens/CartScreen/CartScreen";
import LocationMachineScreen from "./screens/LocationMachineScreen/LocationMachineScreen";
import LocationConfirmationScreen from "./screens/LocationConfirmationScreen/LocationConfirmationScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen/ProductDetailScreen";
import ConfirmationScreen from "./screens/ConfirmationScreen/ConfirmationScreen";
import HistoryScreen from "./screens/HistoryScreen/HistoryScreen";
import ProfileScreen from "./screens/ProfileScreen/ProfileScreen";
import PaymentScreen from "./screens/PaymentScreen/PaymentScreen";
import PaymentSuccessScreen from "./screens/PaymentSuccessScreen/PaymentSuccessScreen";
import PaymentPendingScreen from "./screens/PaymentScreen/PaymentPendingScreen";
import PaymentFailedScreen from "./screens/PaymentScreen/PaymentFailedScreen";
import CheckoutScreen from "./screens/CheckoutScreen/CheckoutScreen";
import ScannerScreen from "./screens/ScannerScreen/ScannerScreen";
import "./screens/PaymentScreen/UpiPaymentScreen.css";

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
  locationConfirmed: "juice_robo_location_confirmed",
  orders: "juice_robo_orders",
  screen: "juice_robo_current_screen",

  /* =====================================================
     PAYMENT SUCCESS PERSISTENCE
     ===================================================== */

  paymentSuccess: "juice_robo_payment_success",
  paymentCollectionCode: "juice_robo_collection_code",
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

function clean(value) {
  return String(value ?? "").trim();
}

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
}

/* =========================================================
   URL ROUTING HELPERS
   ========================================================= */

const ROUTE_PATH_MAP = {
  cart: "cart",
  login: "login",
  menu: "menu",
  checkout: "checkout",
  history: "history",
  profile: "profile",
  scanner: "",
  location: "location",
  "location-confirmation": "location-confirmation",
  "payment-success": "payment-success",
  "payment-pending": "payment-pending",
  "payment-failed": "payment-failed",
  "upi-payment": "upi-payment",
};

const PATH_TO_SCREEN_MAP = {
  cart: "cart",
  login: "login",
  menu: "menu",
  checkout: "checkout",
  history: "history",
  profile: "profile",
  scanner: "scanner",
  location: "location",
  "location-confirmation": "location-confirmation",
  "payment-success": "payment-success",
  "payment-pending": "payment-pending",
  "payment-failed": "payment-failed",
  "upi-payment": "upi-payment",
};

function getAppBase() {
  if (typeof window !== "undefined") {
    if (window.location.pathname.startsWith("/order_now/")) {
      return "/order_now/";
    }
    return "/";
  }
  const metaBase = import.meta.env.BASE_URL || "/";
  return metaBase.endsWith("/") ? metaBase : `${metaBase}/`;
}

function getPathForScreen(screenName) {
  const base = getAppBase();
  const sub = ROUTE_PATH_MAP[screenName];
  if (!sub || screenName === "scanner") {
    return base;
  }
  return `${base}${sub}`;
}

function getScreenFromUrl() {
  if (typeof window === "undefined") return null;
  const pathname = window.location.pathname || "/";
  const base = getAppBase();
  let routePath = pathname;
  if (routePath.startsWith(base)) {
    routePath = routePath.slice(base.length);
  } else if (routePath.startsWith("/")) {
    routePath = routePath.replace(/^\/+/, "");
  }
  routePath = routePath.replace(/\/+$/, "").toLowerCase();
  return PATH_TO_SCREEN_MAP[routePath] || null;
}

function syncUrlWithScreen(screenName, replace = false) {
  if (typeof window === "undefined" || !window.history) return;
  const targetPath = getPathForScreen(screenName);
  const currentPath = window.location.pathname;
  if (currentPath !== targetPath) {
    if (replace) {
      window.history.replaceState({ screen: screenName }, "", targetPath);
    } else {
      window.history.pushState({ screen: screenName }, "", targetPath);
    }
  } else if (!window.history.state?.screen) {
    window.history.replaceState({ screen: screenName }, "", targetPath);
  }
}

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

/* =========================================================
   SESSION STORAGE HELPERS
   ========================================================= */

function readSessionJSON(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(key);

    return raw
      ? JSON.parse(raw)
      : fallback;
  } catch {
    return fallback;
  }
}

function writeSessionJSON(key, value) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    // Ignore storage errors.
  }
}

function removeSessionItem(key) {
  try {
    sessionStorage.removeItem(key);
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
  const numericValue =
    Number(value);

  if (!Number.isFinite(numericValue)) {
    return "₹0.00";
  }

  return `₹${numericValue.toLocaleString("en-IN", {
    minimumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function productMoney(value) {
  const numericValue =
    Number(value);

  if (!Number.isFinite(numericValue)) {
    return "₹0.00";
  }

  return `₹${numericValue.toFixed(2)}`;
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
   BACKEND CART HELPERS — UPDATE 1
   ========================================================= */

function getCartVariantId(item = {}) {
  return Number(
    item?.variantId ??
      item?.variant_id ??
      item?._variant?.variantId ??
      item?._variant?.variant_id ??
      item?._variant?.id ??
      item?.id ??
      0
  );
}

function extractBackendCartItems(response) {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.cart)) {
    return response.cart;
  }

  if (Array.isArray(response?.cartItems)) {
    return response.cartItems;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.cart)) {
    return response.data.cart;
  }

  if (Array.isArray(response?.data?.cartItems)) {
    return response.data.cartItems;
  }

  if (Array.isArray(response?.data?.items)) {
    return response.data.items;
  }

  if (Array.isArray(response?.result)) {
    return response.result;
  }

  if (Array.isArray(response?.result?.cart)) {
    return response.result.cart;
  }

  if (Array.isArray(response?.result?.cartItems)) {
    return response.result.cartItems;
  }

  if (Array.isArray(response?.result?.items)) {
    return response.result.items;
  }

  return [];
}

/* =========================================================
   APP
   ========================================================= */

/*
 * =========================================================
 * JUICE ROBO — FINAL PAYMENT FLOW
 * =========================================================
 * Cart -> location confirmation -> payment -> backend order
 * -> UPI app -> browser return -> backend orderStatus()
 * -> confirmed payment + backend 4-digit collection code
 * -> persist success -> clear cart -> payment-success.
 *
 * The frontend never generates a collection code.
 * Returning from a UPI app is not payment confirmation.
 * =========================================================
 */

export default function App() {
  /*
   * Do NOT automatically log in from stored credentials.
   * Require user to log in manually per user instruction:
   * "always open a qr launcher to access the menu or allow user to select the location manually"
   * "do not login automatically - make user to login manually"
   */
  const [loggedIn, setLoggedIn] = useState(false);

  const [isLocationConfirmed, setIsLocationConfirmed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE.locationConfirmed) === "true";
    } catch {
      return false;
    }
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalRedirect, setLoginModalRedirect] = useState("");

  /*
   * Entry Screen: Check pending payment callback, URL path, saved screen,
   * or default to QR launcher ("scanner").
   */
  const [screen, setScreenState] = useState(() => {
    try {
      if (typeof window !== "undefined" && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const qOrderId = params.get("orderId") || params.get("order_id");
        const qCartId = params.get("cartId") || params.get("cart_id");
        const qTxnId = params.get("transactionId") || params.get("txnId") || params.get("transaction_id");

        if (qOrderId && qCartId) {
          const recovered = {
            orderId: qOrderId,
            cartId: qCartId,
            transactionId: qTxnId || "",
          };
          sessionStorage.setItem("juice_robo_payment_session", JSON.stringify(recovered));
          return "payment-pending";
        }
      }
    } catch {}

    const pendingPaymentSession =
      readJSON("juice_robo_payment_session", null) ||
      readSessionJSON("juice_robo_payment_session", null);

    const savedScreen = localStorage.getItem(STORAGE.screen);

    if (
      (savedScreen === "payment-pending" || savedScreen === "upi-payment") &&
      pendingPaymentSession?.orderId
    ) {
      return "payment-pending";
    }

    const urlScreen = getScreenFromUrl();
    if (urlScreen) {
      return urlScreen;
    }

    return "scanner";
  });

  function setScreen(nextScreen, replace = false) {
    if (
      nextScreen === "payment-pending" ||
      nextScreen === "payment-failed" ||
      nextScreen === "payment-success" ||
      nextScreen === "upi-payment"
    ) {
      setScreenState(nextScreen);
      syncUrlWithScreen(nextScreen, replace);
      try {
        localStorage.setItem(STORAGE.screen, String(nextScreen));
      } catch {}
      return;
    }

    if (nextScreen === "scanner") {
      setScreenState("scanner");
      syncUrlWithScreen("scanner", replace);
      try {
        localStorage.setItem(STORAGE.screen, "scanner");
      } catch {}
      return;
    }

    // Must have outlet confirmed for menu, product, cart, checkout, profile, etc.
    const requiresOutlet = [
      "menu",
      "home",
      "product",
      "cart",
      "checkout",
      "location-confirmation",
      "profile",
      "history",
    ];

    const outletConfirmed =
      isLocationConfirmed ||
      localStorage.getItem(STORAGE.locationConfirmed) === "true";
    const hasLocation =
      Boolean(selectedLocationId) ||
      Boolean(localStorage.getItem(STORAGE.location));
    const hasMachine =
      Boolean(selectedMachineId) ||
      Boolean(localStorage.getItem(STORAGE.machine));

    if (
      requiresOutlet.includes(nextScreen) &&
      (!outletConfirmed || !hasLocation || !hasMachine)
    ) {
      showToast("Please scan an outlet QR code first");
      setScreenState("scanner");
      syncUrlWithScreen("scanner", replace);
      try {
        localStorage.setItem(STORAGE.screen, "scanner");
      } catch {}
      return;
    }

    if (outletConfirmed && !isLocationConfirmed) {
      setIsLocationConfirmed(true);
    }

    // Only profile and history require prior login
    const requiresLogin = [
      "profile",
      "history",
    ];

    if (requiresLogin.includes(nextScreen) && !loggedIn) {
      showToast(`Please sign in to view your ${nextScreen}`);
      setScreenState("login");
      syncUrlWithScreen("login", replace);
      try {
        localStorage.setItem(STORAGE.screen, "login");
      } catch {}
      return;
    }

    setScreenState(nextScreen);
    syncUrlWithScreen(nextScreen, replace);

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
     * Keep the persisted screen and URL synchronized with the current
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
    syncUrlWithScreen(screen, false);
  }, [screen]);

  useEffect(() => {
    // Initial sync of URL state on mount
    syncUrlWithScreen(screen, true);

    function handlePopState(event) {
      if (showLoginModal) {
        setShowLoginModal(false);
        setLoginModalRedirect("");
      }
      const poppedScreen = event?.state?.screen || getScreenFromUrl() || "scanner";
      setScreenState(poppedScreen);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [showLoginModal]);

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

  /*
   * Persisted snapshots are used only to restore the UI after a
   * browser/UPI-app round trip. All actual location/machine values
   * still originate from the backend API when available.
   */
  const [selectedLocationSnapshot, setSelectedLocationSnapshot] =
    useState(() =>
      readJSON(
        "juice_robo_selected_location",
        null
      )
    );

  const [selectedMachineSnapshot, setSelectedMachineSnapshot] =
    useState(() =>
      readJSON(
        "juice_robo_selected_machine",
        null
      )
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

  const [error, setError] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [order, setOrder] = useState(() =>
    readJSON(
      STORAGE.paymentSuccess,
      null
    )
  );

  /* =======================================================
     REAL UPI PAYMENT SESSION
     ======================================================= */

  const [paymentSession, setPaymentSession] =
    useState(() =>
      readJSON(
        "juice_robo_payment_session",
        null
      )
    );

  const [paymentStatus, setPaymentStatus] =
    useState(() =>
      readJSON(
        "juice_robo_payment_session",
        null
      )
        ? "pending"
        : "idle"
    );

  const [paymentMessage, setPaymentMessage] =
    useState(
      "Complete payment in your UPI app. We will verify it with Juice Robo."
    );

  const [paymentFailedReason, setPaymentFailedReason] =
    useState("");

  const [showUpiAppPicker, setShowUpiAppPicker] =
    useState(false);

  const paymentVerifyInFlight =
    useRef(false);

  const paymentPollStarted =
    useRef(false);

  const terminalStateReached =
    useRef(false);

  const browserReturnDebounceTimer =
    useRef(null);

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
        (
          selectedLocationSnapshot &&
          String(
            selectedLocationSnapshot?.id ??
              selectedLocationSnapshot?.storeId ??
              selectedLocationSnapshot?.locId ??
              ""
          ) === targetId
            ? selectedLocationSnapshot
            : null
        )
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
        ) ||
        (
          selectedMachineSnapshot &&
          String(
            selectedMachineSnapshot?.id ??
              selectedMachineSnapshot?.machineId ??
              selectedMachineSnapshot?.machine_id ??
              ""
          ) === targetId
            ? selectedMachineSnapshot
            : null
        )
      );
    }, [
      machines,
      selectedMachineId,
    ]);

  /* =======================================================
     MACHINE UPI / VPA RESOLUTION
     ======================================================= */

  const [customUpiId, setCustomUpiId] = useState(() => {
    try {
      return clean(localStorage.getItem("juice_robo_custom_upi_id")) || "";
    } catch {
      return "";
    }
  });

  const activeMachineUpiId = useMemo(() => {
    return clean(
      firstDefined(
        customUpiId,
        selectedMachine?.upiId,
        selectedMachine?.upi_id,
        selectedMachine?.vpa,
        selectedMachine?.upi,
        selectedMachine?.merchantUpiId,
        selectedMachine?.merchant_upi_id,
        selectedMachineSnapshot?.upiId,
        selectedMachineSnapshot?.upi_id,
        selectedMachineSnapshot?.vpa,
        selectedMachineId ? localStorage.getItem(`juice_robo_machine_upi_${selectedMachineId}`) : "",
        selectedLocation?.upiId,
        selectedLocation?.upi_id,
        selectedLocation?.vpa,
        selectedLocation?.merchantUpiId,
        selectedLocationSnapshot?.upiId,
        selectedLocationSnapshot?.upi_id,
        selectedLocationSnapshot?.vpa,
        selectedLocationId ? localStorage.getItem(`juice_robo_machine_upi_${selectedLocationId}`) : "",
        localStorage.getItem("juice_robo_machine_upi_id"),
        localStorage.getItem("juice_robo_scanned_upi_id"),
        typeof api.getConfiguredUpiId === "function" ? api.getConfiguredUpiId() : "",
        import.meta.env?.VITE_JR_UPI_ID,
        "JUICEROBO@ybl"
      )
    );
  }, [
    customUpiId,
    selectedMachine,
    selectedMachineSnapshot,
    selectedMachineId,
    selectedLocation,
    selectedLocationSnapshot,
    selectedLocationId,
  ]);

  const handleChangeMachineUpi = (newUpi) => {
    const trimmed = clean(newUpi);
    setCustomUpiId(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem("juice_robo_custom_upi_id", trimmed);
        if (selectedMachineId) {
          localStorage.setItem(`juice_robo_machine_upi_${selectedMachineId}`, trimmed);
        }
      } else {
        localStorage.removeItem("juice_robo_custom_upi_id");
      }
    } catch {}
  };

  /* =======================================================
     CART TOTALS
     ======================================================= */

  /*
   * Backend product prices are the FINAL customer-facing prices
   * and already include GST.
   *
   * Calculations are performed in paise so JavaScript floating-point
   * precision does not affect the payable amount.
   */

  const safeCart =
    normalizeCart(cart);

  /* -------------------------------------------------------
     CART ITEM COUNT
     ------------------------------------------------------- */

  const cartCount =
    useMemo(
      () =>
        safeCart.reduce(
          (sum, item) => {
            const itemQuantity =
              Number(
                item?.quantity || 0
              );

            return (
              sum +
              (
                Number.isFinite(itemQuantity) &&
                itemQuantity > 0
                  ? Math.floor(itemQuantity)
                  : 0
              )
            );
          },
          0
        ),
      [safeCart]
    );

  /* -------------------------------------------------------
     FINAL PRICE — GST INCLUDED
     ------------------------------------------------------- */

  const grossTotalPaise =
    useMemo(
      () =>
        safeCart.reduce(
          (sum, item) => {
            const unitPrice =
              Number(
                item?.price ??
                  item?.unitPrice ??
                  0
              );

            const itemQuantity =
              Number(
                item?.quantity || 1
              );

            if (
              !Number.isFinite(unitPrice) ||
              !Number.isFinite(itemQuantity)
            ) {
              return sum;
            }

            const unitPricePaise =
              Math.round(
                unitPrice * 100
              );

            const quantity =
              Math.max(
                1,
                Math.floor(
                  itemQuantity
                )
              );

            return (
              sum +
              unitPricePaise *
                quantity
            );
          },
          0
        ),
      [safeCart]
    );

  /* -------------------------------------------------------
     GST INCLUDED IN FINAL PRICE
     -------------------------------------------------------
     GST = Gross × 5 / 105
     ------------------------------------------------------- */

  const gstPaise =
    Math.round(
      (
        grossTotalPaise *
        GST_RATE
      ) /
        (1 + GST_RATE)
    );

  /* -------------------------------------------------------
     PRICE BEFORE GST
     ------------------------------------------------------- */

  const taxableSubtotalPaise =
    grossTotalPaise -
    gstPaise;

  /* -------------------------------------------------------
     DISPLAY / PAYABLE VALUES
     ------------------------------------------------------- */

  const finalTotal =
    grossTotalPaise / 100;

  const subtotal =
    taxableSubtotalPaise / 100;

  const gst =
    gstPaise / 100;

  /*
   * Actual customer payable amount.
   * GST is already included in this amount.
   */
  const cartTotal =
    finalTotal;

  /* =======================================================
     BACKEND CART — UPDATE 1
     Backend cart is the source of truth when adding,
     updating quantity, and opening the Cart screen.
     ======================================================= */

  function hydrateBackendCartItems(backendItems) {
    const source = Array.isArray(backendItems)
      ? backendItems
      : [];

    return source
      .map((backendItem) => {
        const variantId =
          getCartVariantId(backendItem);

        if (!variantId) {
          return null;
        }

        const backendQuantity = Number(
          backendItem?.quantity ??
            backendItem?.qty ??
            backendItem?.count ??
            1
        );

        const itemQuantity =
          Number.isFinite(backendQuantity) &&
          backendQuantity > 0
            ? Math.floor(backendQuantity)
            : 1;

        const matchingProduct = products.find(
          (product) => {
            const productId =
              getProductId(product);

            const variants =
              Array.isArray(product?.lstVariants)
                ? product.lstVariants
                : Array.isArray(product?.variants)
                  ? product.variants
                  : [];

            const variantIds = variants.map(
              (variant) =>
                getVariantId(
                  product,
                  variant
                )
            );

            return (
              variantIds.includes(
                variantId
              ) ||
              String(productId) ===
                String(
                  backendItem?.productId ??
                    backendItem?.product_id ??
                    backendItem?.itemId ??
                    backendItem?.item_id ??
                    ""
                )
            );
          }
        );

        if (matchingProduct) {
          const variants =
            Array.isArray(
              matchingProduct?.lstVariants
            )
              ? matchingProduct.lstVariants
              : Array.isArray(
                  matchingProduct?.variants
                )
                ? matchingProduct.variants
                : [];

          const matchingVariant =
            variants.find(
              (variant) =>
                getVariantId(
                  matchingProduct,
                  variant
                ) === variantId
            );

          const hydrated = makeCartItem(
            matchingProduct,
            matchingVariant,
            itemQuantity
          );

          return {
            ...hydrated,
            ...backendItem,
            id: variantId,
            variantId,
            quantity: itemQuantity,
            productId:
              backendItem?.productId ??
              backendItem?.product_id ??
              matchingProduct?.id,
            itemId:
              backendItem?.itemId ??
              backendItem?.item_id ??
              matchingProduct?.id,
          };
        }

        return {
          ...backendItem,
          id: variantId,
          variantId,
          quantity: itemQuantity,
        };
      })
      .filter(Boolean);
  }

  async function loadCartFromBackend({
    showLoading = false,
    silent = false,
  } = {}) {
    try {
      if (showLoading) {
        setBusy(true);
      }

      if (!silent) {
        setError("");
      }

      console.log(
        "[Juice Robo] Loading cart from backend..."
      );

      const response =
        await api.cart();

      console.log(
        "[Juice Robo] BACKEND CART response:",
        response
      );

      const backendItems =
        extractBackendCartItems(
          response
        );

      const hydratedItems =
        hydrateBackendCartItems(
          backendItems
        );

      /*
      * BACKEND CART HAS ITEMS
      *
      * The backend is the source of truth when it actually
      * returns cart items.
      */
      if (hydratedItems.length > 0) {
        setCart(hydratedItems);

        console.log(
          "[Juice Robo] Backend cart loaded successfully:",
          hydratedItems
        );

        return hydratedItems;
      }

      /*
      * BACKEND CART IS EMPTY
      *
      * HTTP 200 with no cart items is a valid empty-cart state.
      *
      * Do NOT treat this as an error and do NOT print a warning.
      *
      * Keep the current frontend cart because the backend
      * environment can temporarily return an empty cart after
      * addcart.
      */
      const currentCart =
        normalizeCart(cart);

      console.log(
        "[Juice Robo] Backend cart is empty. Keeping current frontend cart:",
        currentCart
      );

      return currentCart;
    } catch (cartError) {
      console.error(
        "[Juice Robo] Backend cart load failed:",
        cartError
      );

      if (!silent) {
        const message =
          errorText(cartError) ||
          "Unable to load your cart.";

        setError(message);
        showToast(message);
      }

      throw cartError;
    } finally {
      if (showLoading) {
        setBusy(false);
      }
    }
  }

  async function saveCartToBackend(
    nextCart
  ) {
    const normalizedCart =
      normalizeCart(nextCart);

    const storeId =
      selectedLocation?.storeId ||
      selectedLocation?.store_id ||
      selectedLocation?.id ||
      selectedLocationId;

    /*
     * Only pass a UUID-shaped location identifier to the API.
     * Never pass storeId (for example 200) as locId.
     *
     * api.addCart() performs the final authoritative UUID resolution
     * if this selected-location snapshot does not contain the UUID.
     */
    const locationUuidCandidates = [
      selectedLocation?.locId,
      selectedLocation?.locationId,
      selectedLocation?.location_id,
      selectedLocation?.locationUuid,
      selectedLocation?.uuid,
    ];

    const locationUuid =
      locationUuidCandidates
        .map((value) => String(value ?? "").trim())
        .find((value) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
        ) || "";

    if (!storeId) {
      throw new Error(
        "Please select a collection location before adding items."
      );
    }

    if (!normalizedCart.length) {
      throw new Error(
        "The backend cart API does not expose an empty-cart operation."
      );
    }

    const payload = {
      /* locId must be the backend UUID, never numeric storeId. */
      locId: locationUuid,
      storeId: String(storeId),
      location: selectedLocation,
      cartItems:
        normalizedCart,
    };

    console.log(
      "[Juice Robo] Saving cart to backend:",
      payload
    );

    const response =
      await api.addCart(
        payload
      );

    console.log(
      "[Juice Robo] Cart saved successfully:",
      response
    );

    /*
     * IMPORTANT: Do not immediately GET /v1/cart after POST.
     * The backend has returned data:{} immediately after a successful
     * addcart operation in this environment. Treat the successfully
     * submitted normalized cart as the immediate UI state.
     */
    const returnedCartId = String(
      response?.cartId ||
        response?.cart_id ||
        response?.data?.cartId ||
        response?.data?.cart_id ||
        (typeof response?.data === "string" ? response.data : "") ||
        ""
    ).trim();

    if (returnedCartId) {
      try {
        localStorage.setItem(
          "juice_robo_backend_cart_id",
          returnedCartId
        );
        localStorage.setItem(
          "juice_robo_cart_id",
          returnedCartId
        );
      } catch {
        // Ignore local-storage errors.
      }
    }

    return normalizedCart;
  }

  /* =======================================================
     RESTORE COLLECTION CONTEXT AFTER BROWSER / UPI RETURN
     ======================================================= */

  useEffect(() => {
    const storedLocation =
      readJSON(
        "juice_robo_selected_location",
        null
      );

    const storedMachine =
      readJSON(
        "juice_robo_selected_machine",
        null
      );

    if (
      storedLocation &&
      typeof storedLocation ===
        "object"
    ) {
      setSelectedLocationSnapshot(
        storedLocation
      );
    }

    if (
      storedMachine &&
      typeof storedMachine ===
        "object"
    ) {
      setSelectedMachineSnapshot(
        storedMachine
      );
    }
  }, []);

  /* =======================================================
    ORDER HISTORY
    ======================================================= */

  async function openOrderHistory() {
    if (!loggedIn) {
      showToast(
        "Please sign in to view your order history"
      );

      setScreen("login");
      return;
    }

    /*
    * Show the history screen immediately using whatever is already
    * available locally, then refresh it from the authoritative
    * Juice Robo backend.
    */
    setScreen("history");

    try {
      console.log(
        "[Juice Robo] Loading order history from backend..."
      );

      const backendOrders =
        await api.orders();

      const safeBackendOrders =
        Array.isArray(backendOrders)
          ? backendOrders.filter(Boolean)
          : [];

      console.log(
        "[Juice Robo] ORDER HISTORY LOADED:",
        safeBackendOrders
      );

      /*
      * Backend is the source of truth.
      *
      * If the backend returned orders, use them.
      * If it returned an empty list, keep the screen empty.
      */
      setHistoryOrders(
        safeBackendOrders
      );

      /*
      * Persist the refreshed history locally so it is available
      * immediately the next time the screen opens.
      */
      try {
        writeJSON(
          ordersKey(user),
          safeBackendOrders
        );

        writeJSON(
          STORAGE.orders,
          safeBackendOrders
        );
      } catch (storageError) {
        console.warn(
          "[Juice Robo] Could not persist order history:",
          storageError
        );
      }
    } catch (historyError) {
      console.error(
        "[Juice Robo] ORDER HISTORY LOAD FAILED:",
        historyError
      );

      /*
      * Keep locally stored orders if the backend is temporarily
      * unavailable.
      */
      if (
        Array.isArray(historyOrders) &&
        historyOrders.length > 0
      ) {
        showToast(
          "Showing saved order history"
        );
      } else {
        showToast(
          "Unable to load order history"
        );
      }
    }
  }
  function clearOrderHistory() {
    setHistoryOrders([]);

    try {
      localStorage.removeItem(
        ordersKey(user)
      );

      localStorage.removeItem(
        STORAGE.orders
      );
    } catch {
      // Ignore storage errors.
    }

    showToast("Order history cleared");
  }

  /* =======================================================
     LOCATION DATA RECOVERY
     ======================================================= */

  async function reloadLocationData() {
    try {
      console.log(
        "[Juice Robo] LOCATION SCREEN: refreshing outlet data..."
      );

      setError("");

      const loadedLocations =
        await api.locations();

      const safeLocations =
        Array.isArray(
          loadedLocations
        )
          ? loadedLocations.filter(
              (location) =>
                location &&
                typeof location ===
                  "object"
            )
          : [];

      console.log(
        "[Juice Robo] LOCATION SCREEN: refreshed locations:",
        {
          count:
            safeLocations.length,
          locations:
            safeLocations,
        }
      );

      setLocations(
        safeLocations
      );

      if (!safeLocations.length) {
        /*
         * Do NOT clear the selected location/machine here.
         *
         * This is especially important after returning from a UPI
         * application: the browser can reload while the outlet API
         * is temporarily empty. Clearing the selection would make
         * the header jump to "Choose location" and could redirect
         * the user away from the payment flow.
         */
        console.warn(
          "[Juice Robo] Outlet API returned no locations; preserving the existing selection."
        );

        return;
      }

      /*
       * Keep the existing selection when it still exists.
       * Otherwise use the first API-provided outlet.
       */
      let nextLocationId =
        String(
          selectedLocationId ||
            localStorage.getItem(
              STORAGE.location
            ) ||
            ""
        );

      const matchingLocation =
        safeLocations.find(
          (location) =>
            [
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
              .map(String)
              .includes(
                nextLocationId
              )
        );

      if (!matchingLocation) {
        const first =
          safeLocations[0];

        nextLocationId =
          String(
            first?.storeId ??
              first?.store_id ??
              first?.locId ??
              first?.locationId ??
              first?.location_id ??
              first?.outletId ??
              first?.outlet_id ??
              first?.id ??
              ""
          );

        if (nextLocationId) {
          setSelectedLocationId(
            nextLocationId
          );

          localStorage.setItem(
            STORAGE.location,
            nextLocationId
          );
        }
      }

      /*
       * Build the machine list from the same authoritative outlet
       * records. This does not invent machine IDs/names.
       */
      const loadedMachines =
        await api.machines(
          safeLocations
        );

      const safeMachines =
        Array.isArray(
          loadedMachines
        )
          ? loadedMachines
          : [];

      setMachines(
        safeMachines
      );

      /*
       * If the selected outlet has a machine, select it.
       */
      const selectedMachineForLocation =
        safeMachines.find(
          (machine) => {
            const machineLocationIds = [
              machine?.locationId,
              machine?.location_id,
              machine?.storeId,
              machine?.store_id,
              machine?.locId,
              machine?.outletId,
              machine?.outlet_id,
            ]
              .filter(
                (value) =>
                  value !==
                    undefined &&
                  value !== null &&
                  value !== ""
              )
              .map(String);

            return (
              machineLocationIds.length ===
                0 ||
              machineLocationIds.includes(
                String(
                  nextLocationId
                )
              )
            );
          }
        );

      if (
        selectedMachineForLocation
      ) {
        const machineId =
          String(
            selectedMachineForLocation?.id ??
              selectedMachineForLocation?.machineId ??
              selectedMachineForLocation?.machine_id ??
              ""
          );

        if (machineId) {
          setSelectedMachineId(
            machineId
          );

          setSelectedMachineSnapshot(
            selectedMachineForLocation
          );

          localStorage.setItem(
            STORAGE.machine,
            machineId
          );

          writeJSON(
            "juice_robo_selected_machine",
            selectedMachineForLocation
          );
        }
      } else if (
        !selectedMachineSnapshot
      ) {
        setSelectedMachineId("");
        localStorage.removeItem(
          STORAGE.machine
        );
      }
    } catch (locationError) {
      console.error(
        "[Juice Robo] LOCATION SCREEN refresh failed:",
        locationError
      );

      setError(
        errorText(
          locationError
        ) ||
          "Unable to load Juice Robo collection locations."
      );
    }
  }

  /*
   * IMPORTANT:
   * If the user opens the location screen before the initial
   * request has populated React state, refresh it immediately.
   *
   * This fixes the exact state shown in the screenshot:
   * API data exists, but the LocationMachineScreen receives an
   * empty locations array.
   */
  useEffect(() => {
    if (
      screen !== "location"
    ) {
      return;
    }

    reloadLocationData();
  }, [
    screen,
  ]);

  /* =======================================================
      RETURN FROM UPI APP / BROWSER
      ======================================================= */

    useEffect(() => {
      let mounted = true;

      function triggerBrowserReturn(source) {
        if (!mounted || terminalStateReached.current || paymentVerifyInFlight.current) {
          return;
        }

        const session =
          readJSON("juice_robo_payment_session", null) || paymentSession;

        if (!session?.cartId || !session?.orderId) {
          return;
        }

        console.log(`[Juice Robo] Returned from PhonePe (${source})`);

        if (browserReturnDebounceTimer.current) {
          clearTimeout(browserReturnDebounceTimer.current);
        }

        browserReturnDebounceTimer.current = setTimeout(async () => {
          if (!mounted || terminalStateReached.current || paymentVerifyInFlight.current) {
            return;
          }

          /* Show payment pending / verifying screen while backend status is verified */
          if (
            screen !== "payment-pending" &&
            screen !== "payment-success" &&
            screen !== "payment-failed" &&
            paymentStatus !== "paid"
          ) {
            setScreen("payment-pending");
          }

          await verifyPendingPayment({
            silent: true,
          });
        }, 350);
      }

      function handlePageShow() {
        triggerBrowserReturn("pageshow");
      }

      function handleFocus() {
        triggerBrowserReturn("focus");
      }

      function handleVisibilityChange() {
        if (document.visibilityState === "visible") {
          triggerBrowserReturn("visibilitychange");
        }
      }

      window.addEventListener("pageshow", handlePageShow);
      window.addEventListener("focus", handleFocus);
      document.addEventListener("visibilitychange", handleVisibilityChange);

      /* Check once on startup if pending session exists */
      const initialSession = readJSON("juice_robo_payment_session", null);
      if (initialSession?.cartId && initialSession?.orderId && !terminalStateReached.current) {
        triggerBrowserReturn("initial-check");
      }

      return () => {
        mounted = false;
        if (browserReturnDebounceTimer.current) {
          clearTimeout(browserReturnDebounceTimer.current);
        }
        window.removeEventListener("pageshow", handlePageShow);
        window.removeEventListener("focus", handleFocus);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }, []);

  /* =======================================================
   INITIAL DATA LOAD
   ======================================================= */

useEffect(() => {
  let cancelled = false;

  async function loadInitialData() {
    console.log(
      "[Juice Robo] STARTING INITIAL DATA LOAD"
    );

    setLoading(true);
    setError("");

    try {
      /* =================================================
         1. LOAD LOCATIONS ONCE
         ================================================= */

      console.log(
        "[Juice Robo] REQUESTING LOCATIONS..."
      );

      const loadedLocations =
        await api.locations();

      if (cancelled) {
        return;
      }

      const safeLocations =
        Array.isArray(loadedLocations)
          ? loadedLocations
          : [];

      console.log(
        "[Juice Robo] LOCATIONS LOADED SUCCESSFULLY",
        {
          count:
            safeLocations.length,
          locations:
            safeLocations,
        }
      );

      setLocations(
        safeLocations
      );

      /*
       * Refresh the persisted location snapshot from the authoritative
       * API response whenever the stored selection is present.
       */
      const authoritativeSelectedLocation =
        safeLocations.find(
          (location) =>
            String(
              location?.id ??
                location?.storeId ??
                location?.store_id ??
                location?.locId ??
                location?.locationId ??
                location?.location_id ??
                location?.outletId ??
                location?.outlet_id ??
                ""
            ) ===
            String(
              selectedLocationId ||
                localStorage.getItem(
                  STORAGE.location
                ) ||
                ""
            )
        );

      if (
        authoritativeSelectedLocation
      ) {
        setSelectedLocationSnapshot(
          authoritativeSelectedLocation
        );

        writeJSON(
          "juice_robo_selected_location",
          authoritativeSelectedLocation
        );
      }

      /* =================================================
         2. CHECK STORED CONFIRMATION
         ================================================= */

      const isConfirmedFromStorage =
        localStorage.getItem(
          STORAGE.locationConfirmed
        ) === "true";

      const storedLocationId =
        localStorage.getItem(
          STORAGE.location
        ) || "";

      const storedMachineId =
        localStorage.getItem(
          STORAGE.machine
        ) || "";

      const savedLocation =
        safeLocations.find(
          (location) =>
            String(
              location?.id ??
                location?.storeId ??
                location?.store_id ??
                location?.locId ??
                ""
            ) ===
            String(
              storedLocationId
            )
        );

      if (isConfirmedFromStorage && savedLocation) {
        setSelectedLocationId(
          String(storedLocationId)
        );
        setSelectedLocationSnapshot(
          savedLocation
        );
      } else if (storedLocationId && savedLocation) {
        setSelectedLocationId(
          String(storedLocationId)
        );
        setSelectedLocationSnapshot(
          savedLocation
        );
      } else {
        setSelectedLocationId("");
        setSelectedLocationSnapshot(null);
      }

      /* =================================================
         3. RESOLVE REAL STORE ID
         ================================================= */

      const storeId =
        isConfirmedFromStorage && savedLocation
          ? savedLocation?.storeId ||
            savedLocation?.store_id ||
            savedLocation?.locId ||
            savedLocation?.id ||
            ""
          : "";

      console.log(
        "[Juice Robo] INITIAL STORE:",
        storeId
      );

      /* =================================================
         4. STOP BLOCKING THE WHOLE APP
         
         Locations are enough to render the application.
         Products and machines are secondary data.
         ================================================= */

      setLoading(false);

      /* =================================================
         5. LOAD PRODUCTS + MACHINES IN PARALLEL
         
         IMPORTANT:
         api.machines() receives the locations that we
         already loaded, so it DOES NOT call locations()
         a second time.
         ================================================= */

      const productPromise =
        storeId
          ? api.products(
              storeId
            )
          : Promise.resolve([]);

      const machinePromise =
        api.machines(
          safeLocations
        );

      const [
        productResult,
        machineResult,
      ] = await Promise.allSettled([
        productPromise,
        machinePromise,
      ]);

      if (cancelled) {
        return;
      }

      /* =================================================
         6. PRODUCTS
         ================================================= */

      if (
        productResult.status ===
        "fulfilled"
      ) {
        const loadedProducts =
          Array.isArray(
            productResult.value
          )
            ? productResult.value
            : [];

        console.log(
          "[Juice Robo] PRODUCTS LOADED SUCCESSFULLY",
          {
            count:
              loadedProducts.length,
          }
        );

        setProducts(
          loadedProducts
        );
      } else {
        console.warn(
          "[Juice Robo] Product loading failed:",
          productResult.reason
        );

        setProducts([]);
      }

      /* =================================================
         7. MACHINES
         ================================================= */

      if (
        machineResult.status ===
        "fulfilled"
      ) {
        const loadedMachines =
          Array.isArray(
            machineResult.value
          )
            ? machineResult.value
            : [];

        console.log(
          "[Juice Robo] MACHINES LOADED SUCCESSFULLY",
          {
            count:
              loadedMachines.length,
          }
        );

        setMachines(
          loadedMachines
        );

        /* -----------------------------------------------
           Restore previously selected machine
           ----------------------------------------------- */

        const existingMachine =
          loadedMachines.find(
            (machine) =>
              String(
                machine?.id ??
                  machine?.machineId ??
                  machine?.machine_id ??
                  ""
              ) ===
              String(
                storedMachineId
              )
          );

        if (
          isConfirmedFromStorage &&
          savedLocation &&
          existingMachine
        ) {
          setSelectedMachineId(
            String(
              existingMachine.id ||
                existingMachine.machineId ||
                storedMachineId
            )
          );
          setSelectedMachineSnapshot(
            existingMachine
          );
          setIsLocationConfirmed(true);
        } else if (
          storedMachineId &&
          existingMachine
        ) {
          setSelectedMachineId(
            String(
              existingMachine.id ||
                existingMachine.machineId ||
                storedMachineId
            )
          );
          setSelectedMachineSnapshot(
            existingMachine
          );
          setIsLocationConfirmed(false);
        } else {
          setSelectedMachineId("");
          setSelectedMachineSnapshot(null);
          setIsLocationConfirmed(false);
          localStorage.removeItem(
            STORAGE.locationConfirmed
          );
        }
      } else {
        console.warn(
          "[Juice Robo] Machine loading failed:",
          machineResult.reason
        );

        setMachines([]);
      }

      console.log(
        "[Juice Robo] INITIAL DATA LOAD COMPLETE"
      );
    } catch (loadError) {
      if (cancelled) {
        return;
      }

      console.error(
        "[Juice Robo] Initial data load failed:",
        loadError
      );

      /*
       * IMPORTANT:
       * Do not leave the user permanently stuck on
       * the splash screen if the backend is temporarily
       * unavailable.
       */
      setError(
        errorText(
          loadError
        ) ||
          "Unable to load Juice Robo data."
      );

      setLoading(false);
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
     UUID SAFETY CLEANUP
     ======================================================= */

  useEffect(() => {
    const cachedLocationUuid =
      String(
        localStorage.getItem(
          "juice_robo_location_uuid"
        ) || ""
      ).trim();

    /*
     * Older builds could accidentally cache the numeric storeId
     * (for example "200") under the UUID key. Remove it so it can
     * never be reused by the payment/cart flow.
     */
    if (
      cachedLocationUuid &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        cachedLocationUuid
      )
    ) {
      localStorage.removeItem(
        "juice_robo_location_uuid"
      );
    }
  }, []);

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
     STARTUP ERROR
     ======================================================= */

  if (error && !locations.length && !products.length) {
    return (
      <div className="jr-app">
        <div className="jr-mobile-frame">
          <div className="jr-loading" style={{ padding: "32px 22px", textAlign: "center" }}>
            <img
              src={`${ASSET_BASE}app_logo.jpg`}
              alt="Juice Robo"
              className="jr-loading-image"
              style={{
                width: "140px",
                height: "140px",
                maxWidth: "140px",
                maxHeight: "140px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto 20px",
              }}
            />
            <h2 style={{ margin: "0 0 10px" }}>Unable to load Juice Robo</h2>
            <p style={{ margin: "0 0 20px", lineHeight: 1.5 }}>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: 0,
                borderRadius: "10px",
                padding: "12px 24px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
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

      setLoggedIn(true);

      /*
       * Preserve items that were added while logged out. Merge the
       * guest cart into the user's existing local cart instead of
       * discarding it at login.
       */
      const guestCart =
        readCart({});

      const existingUserCart =
        readCart(loggedUser);

      const mergedLoginCart =
        normalizeCart(existingUserCart);

      guestCart.forEach((guestItem) => {
        const guestVariantId =
          getCartVariantId(guestItem);

        const existingIndex =
          mergedLoginCart.findIndex(
            (item) =>
              String(
                getCartVariantId(item)
              ) ===
              String(guestVariantId)
          );

        if (existingIndex >= 0) {
          mergedLoginCart[existingIndex] = {
            ...mergedLoginCart[existingIndex],
            ...guestItem,
            quantity: Number(
              guestItem.quantity
            ),
          };
        } else {
          mergedLoginCart.push(guestItem);
        }
      });

      setCart(
        mergedLoginCart
      );

      /* Move the guest cart into the authenticated local scope. */
      writeJSON(
        cartKey(loggedUser),
        mergedLoginCart
      );

      writeJSON(
        "juice_robo_cart",
        mergedLoginCart
      );

      writeJSON(
        cartKey({}),
        []
      );

      setHistoryOrders(
        readOrders(
          loggedUser
        )
      );

      /*
       * If there was no guest cart, keep the existing behavior of
       * hydrating from the backend. If a guest cart exists, preserve
       * it for checkout; the next authenticated cart edit will sync
       * the merged cart through /v1/addcart.
       */
      if (!guestCart.length) {
        try {
          await loadCartFromBackend({
            silent: true,
          });
        } catch (cartLoadError) {
          console.warn(
            "[Juice Robo] Backend cart unavailable after login:",
            cartLoadError
          );
        }
      }

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
        await api.machines();

      setMachines(
        loadedMachines
      );

      if (showLoginModal) {
        setShowLoginModal(false);
        const target = loginModalRedirect || "checkout";
        setLoginModalRedirect("");
        showToast("✓ Logged in! Continuing to payment...");
        setScreen(target);
        return;
      }

      let postLoginRedirect = "";
      try {
        postLoginRedirect =
          sessionStorage.getItem("juice_robo_post_login_redirect") || "";
      } catch {}

      if (postLoginRedirect === "checkout") {
        try {
          sessionStorage.removeItem("juice_robo_post_login_redirect");
        } catch {}
        setScreen("checkout");
        showToast("✓ Logged in! You can now complete your payment.");
      } else if (
        isLocationConfirmed &&
        selectedLocationId &&
        selectedMachineId
      ) {
        setScreen(
          "menu"
        );
        showToast(
          `Welcome back, ${
            loggedUser?.name ||
            identifier
          }`
        );
      } else {
        setScreen(
          "scanner"
        );
        showToast(
          `Welcome back, ${
            loggedUser?.name ||
            identifier
          }`
        );
      }
    } catch (loginError) {
      console.error(
        "[Juice Robo] Login error:",
        loginError
      );

      const message =
        errorText(
          loginError
        ) ||
        "Invalid email or password.";

      setError(message);
      showToast(message);
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     SIGN OUT
     ======================================================= */

  async function handleSignOut() {
    try {
      await api.logout();
    } catch {
      // Ignore API logout errors
    }

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
      "access_token"
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
      STORAGE.customer
    );

    localStorage.removeItem(
      STORAGE.screen
    );

    localStorage.removeItem(
      STORAGE.location
    );

    localStorage.removeItem(
      STORAGE.machine
    );

    localStorage.removeItem(
      STORAGE.locationConfirmed
    );

    localStorage.removeItem(
      "juice_robo_selected_location"
    );

    localStorage.removeItem(
      "juice_robo_selected_machine"
    );

    localStorage.removeItem(
      "juice_robo_location_uuid"
    );

    setUser({});
    setSelectedProduct(null);
    setSelectedVariant(null);

    setCart([]);
    setHistoryOrders([]);

    setCustomer({
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    });

    setIsLocationConfirmed(false);
    setSelectedLocationId("");
    setSelectedMachineId("");
    setSelectedLocationSnapshot(null);
    setSelectedMachineSnapshot(null);
    setProducts([]);

    try {
      const publicLocations =
        await api.locations();
      setLocations(
        publicLocations
      );

      if (publicLocations.length > 0) {
        const publicMachines =
          await api.machines(
            publicLocations
          );
        setMachines(
          publicMachines
        );
      }
    } catch {
      // Ignore reload errors
    }

    setLoggedIn(false);
    setScreenState(
      "scanner"
    );
    try {
      localStorage.setItem(
        STORAGE.screen,
        "scanner"
      );
    } catch {
      // Ignore storage errors.
    }

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
    location,
    force = false
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

    /*
     * Toggle / Deselect if clicking the already selected location
     */
    if (!force && String(id) === String(selectedLocationId)) {
      setSelectedLocationId("");
      setSelectedLocationSnapshot(null);
      setIsLocationConfirmed(false);
      localStorage.removeItem(STORAGE.location);
      localStorage.removeItem(STORAGE.locationConfirmed);
      localStorage.removeItem("juice_robo_selected_location");
      localStorage.removeItem("juice_robo_location_uuid");
      setSelectedMachineId("");
      setSelectedMachineSnapshot(null);
      localStorage.removeItem(STORAGE.machine);
      localStorage.removeItem("juice_robo_selected_machine");
      setProducts([]);
      showToast("Location deselected");
      return;
    }

    setSelectedLocationId(
      id
    );

    setSelectedLocationSnapshot(
      location
    );

    setIsLocationConfirmed(false);
    localStorage.removeItem(
      STORAGE.locationConfirmed
    );

    localStorage.setItem(
      STORAGE.location,
      id
    );

    writeJSON(
      "juice_robo_selected_location",
      location
    );

    const locationUuid =
      location?.locId ||
      location?.locationId ||
      location?.location_id ||
      location?.locationUuid ||
      location?.uuid ||
      "";

    const isValidLocationUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(locationUuid || "").trim()
      );

    if (isValidLocationUuid) {
      localStorage.setItem(
        "juice_robo_location_uuid",
        String(locationUuid).trim()
      );
    } else {
      localStorage.removeItem(
        "juice_robo_location_uuid"
      );
    }

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

      setSelectedMachineSnapshot(
        matchingMachine
      );

      localStorage.setItem(
        STORAGE.machine,
        machineId
      );

      writeJSON(
        "juice_robo_selected_machine",
        matchingMachine
      );
    } else {
      setSelectedMachineId(
        ""
      );
      setSelectedMachineSnapshot(
        null
      );

      localStorage.removeItem(
        STORAGE.machine
      );
      localStorage.removeItem(
        "juice_robo_selected_machine"
      );
    }

    showToast(
      `${location?.name || "Location"} selected. Confirm to view menu.`
    );
  }

  /* =======================================================
     MACHINE
     ======================================================= */

  function selectMachine(
    machine,
    force = false
  ) {
    const id =
      String(
        machine?.id || ""
      );

    if (!id) {
      return;
    }

    /*
     * Toggle / Deselect if clicking the already selected machine
     */
    if (!force && String(id) === String(selectedMachineId)) {
      setSelectedMachineId("");
      setSelectedMachineSnapshot(null);
      setIsLocationConfirmed(false);
      localStorage.removeItem(STORAGE.machine);
      localStorage.removeItem(STORAGE.locationConfirmed);
      localStorage.removeItem("juice_robo_selected_machine");
      showToast("Machine deselected");
      return;
    }

    setSelectedMachineId(
      id
    );

    setSelectedMachineSnapshot(
      machine
    );

    setIsLocationConfirmed(false);
    localStorage.removeItem(
      STORAGE.locationConfirmed
    );

    localStorage.setItem(
      STORAGE.machine,
      id
    );

    writeJSON(
      "juice_robo_selected_machine",
      machine
    );

    showToast(
      `${machine?.name || "Machine"} selected`
    );
  }

  async function loadProductsForLocation(targetLocation) {
    const storeId =
      targetLocation?.storeId ||
      targetLocation?.store_id ||
      targetLocation?.locId ||
      targetLocation?.id ||
      "";

    if (!storeId) return [];

    try {
      console.log("[Juice Robo] Loading products for location storeId:", storeId);
      if (typeof api.saveStoreId === "function") {
        api.saveStoreId(storeId);
      } else {
        localStorage.setItem("store_Id", String(storeId));
        localStorage.setItem("juice_robo_store_id", String(storeId));
      }
      const loadedProducts = await api.products(storeId);
      const safeProducts = Array.isArray(loadedProducts) ? loadedProducts : [];
      setProducts(safeProducts);
      console.log(`[Juice Robo] Loaded ${safeProducts.length} products for storeId ${storeId}`);
      return safeProducts;
    } catch (productError) {
      console.warn("[Juice Robo] Error loading products for storeId:", storeId, productError);
      return [];
    }
  }

  async function continueToMenu() {
    if (!selectedLocationId) {
      showToast("Please select a collection location");
      return;
    }

    if (!selectedMachineId) {
      showToast("Please select a Juice Robo machine");
      return;
    }

    setIsLocationConfirmed(true);
    localStorage.setItem(STORAGE.locationConfirmed, "true");
    localStorage.setItem(STORAGE.location, String(selectedLocationId));
    localStorage.setItem(STORAGE.machine, String(selectedMachineId));

    const targetLocation =
      selectedLocation ||
      locations.find(
        (loc) =>
          String(
            loc?.id ??
              loc?.storeId ??
              loc?.store_id ??
              loc?.locId ??
              ""
          ) === String(selectedLocationId)
      );

    if (targetLocation) {
      await loadProductsForLocation(targetLocation);
    }

    setScreenState("menu");
    try {
      localStorage.setItem(STORAGE.screen, "menu");
    } catch {}
    showToast("✓ Connected! Menu unlocked.");
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

  async function addProductToCart(
    product,
    variant,
    nextQuantity = 1
  ) {
    try {
      setBusy(true);
      setError("");

      const item =
        makeCartItem(
          product,
          variant,
          nextQuantity
        );

      const currentCart =
        normalizeCart(
          cart
        );

      const exists =
        currentCart.find(
          (entry) =>
            String(
              getCartVariantId(entry)
            ) ===
            String(
              getCartVariantId(item)
            )
        );

      const nextCart =
        exists
          ? currentCart.map(
              (entry) =>
                String(
                  getCartVariantId(entry)
                ) ===
                String(
                  getCartVariantId(item)
                )
                  ? {
                      ...entry,
                      ...item,
                      quantity:
                        Number(
                          item.quantity
                        ),
                    }
                  : entry
            )
          : [
              ...currentCart,
              item,
            ];

      /*
       * Update local cart state and storage immediately.
       */
      setCart(nextCart);

      writeJSON(
        cartKey(loggedIn ? (user || {}) : {}),
        nextCart
      );

      writeJSON(
        "juice_robo_cart",
        nextCart
      );

      /*
       * Authenticated cart editing also syncs with the Juice Robo backend cart API.
       */
      if (loggedIn) {
        try {
          const savedCart =
            await saveCartToBackend(nextCart);

          if (Array.isArray(savedCart) && savedCart.length > 0) {
            setCart(savedCart);

            writeJSON(
              cartKey(user || {}),
              savedCart
            );

            writeJSON(
              "juice_robo_cart",
              savedCart
            );
          }
        } catch (backendSyncError) {
          console.warn(
            "[Juice Robo] Backend cart sync deferred:",
            backendSyncError
          );
        }
      }

      closeProduct();

      setScreen(
        "menu"
      );
    } catch (cartError) {
      console.error(
        "[Juice Robo] Add to cart failed:",
        cartError
      );

      const message =
        errorText(cartError) ||
        "Unable to add item to cart.";

      showToast(message);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddToCart(
    product,
    variant,
    nextQuantity
  ) {
    /*
     * Cart editing is public. Guests are stored in the local cart;
     * authenticated users also sync their cart with the backend.
     */
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

    await addProductToCart(
      product,
      actualVariant,
      actualQuantity
    );
  }

  async function updateQuantity(
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
      )
    ) {
      return;
    }

    if (value <= 0) {
      await removeProduct(
        productId
      );
      return;
    }

    const currentCart =
      normalizeCart(
        cart
      );

    const matchesItem = (item) => {
      const pStr = String(productId);
      return (
        String(getCartVariantId(item)) === pStr ||
        String(item?.id) === pStr ||
        String(item?.productId) === pStr ||
        String(item?.variantId) === pStr ||
        String(item?.cartItemId) === pStr
      );
    };

    const nextCart =
      currentCart.map(
        (item) =>
          matchesItem(item)
            ? {
                ...item,
                quantity:
                  Math.floor(
                    value
                  ),
              }
            : item
      );

    const itemExists =
      currentCart.some(matchesItem);

    if (!itemExists) {
      return;
    }

    /*
     * 1. Increment and update the UI cart state immediately
     */
    setCart(nextCart);

    writeJSON(
      cartKey(loggedIn ? (user || {}) : {}),
      nextCart
    );

    writeJSON(
      "juice_robo_cart",
      nextCart
    );

    /*
     * 2. Call cart API to persist the updated quantity on the backend
     */
    if (loggedIn) {
      try {
        setBusy(true);
        setError("");

        const savedCart =
          await saveCartToBackend(nextCart);

        if (Array.isArray(savedCart) && savedCart.length > 0) {
          setCart(savedCart);

          writeJSON(
            cartKey(user || {}),
            savedCart
          );

          writeJSON(
            "juice_robo_cart",
            savedCart
          );
        }

        showToast(
          "Cart updated"
        );
      } catch (cartError) {
        console.warn(
          "[Juice Robo] Cart quantity backend sync deferred:",
          cartError
        );
      } finally {
        setBusy(false);
      }
    } else {
      showToast(
        "Cart updated"
      );
    }
  }

  async function removeProduct(
    productId
  ) {
    const currentCart =
      normalizeCart(
        cart
      );

    const matchesItem = (item) => {
      const pStr = String(productId);
      return (
        String(getCartVariantId(item)) === pStr ||
        String(item?.id) === pStr ||
        String(item?.productId) === pStr ||
        String(item?.variantId) === pStr ||
        String(item?.cartItemId) === pStr
      );
    };

    const nextCart =
      currentCart.filter(
        (item) => !matchesItem(item)
      );

    if (
      nextCart.length ===
      currentCart.length
    ) {
      return;
    }

    /*
     * Use the Juice Robo cart API whenever a non-empty cart remains.
     * There is still no confirmed empty-cart/delete endpoint, so
     * removing the final item remains a local UI operation.
     */
    if (!nextCart.length) {
      setCart([]);

      writeJSON(
        cartKey({}),
        []
      );

      writeJSON(
        "juice_robo_cart",
        []
      );

      showToast("Item removed from cart");
      return;
    }

    if (!loggedIn) {
      setCart(nextCart);

      writeJSON(
        cartKey({}),
        nextCart
      );

      writeJSON(
        "juice_robo_cart",
        nextCart
      );

      showToast("Item removed from cart");
      return;
    }

    try {
      setBusy(true);
      setError("");

      /* Normal item removal stays frontend-only. */
      setCart(nextCart);

      writeJSON(
        cartKey(user || {}),
        nextCart
      );

      writeJSON(
        "juice_robo_cart",
        nextCart
      );

      showToast(
        "Item removed from cart"
      );
    } catch (cartError) {
      console.error(
        "[Juice Robo] Remove cart item failed:",
        cartError
      );

      const message =
        errorText(cartError) ||
        "Unable to remove item from cart.";

      showToast(message);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function clearCart() {
    /*
     * No confirmed backend empty-cart endpoint exists. Keep the
     * frontend action functional without inventing an API call.
     * A future non-empty cart save will replace the submitted cart
     * contents with the current frontend cart.
     */
    setCart([]);

    writeJSON(
      cartKey(loggedIn ? user : {}),
      []
    );

    writeJSON(
      "juice_robo_cart",
      []
    );

    showToast("Cart cleared");
  }

  /* =======================================================
     OPEN CART — BACKEND SOURCE OF TRUTH
     ======================================================= */

  async function openCart() {
    if (!isLocationConfirmed || !selectedLocationId || !selectedMachineId) {
      showToast("Please scan an outlet QR code first");
      setScreen("scanner");
      return;
    }

    if (!loggedIn) {
      setCart(readCart({}));
      setScreen("cart");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const backendCart =
        await loadCartFromBackend({
          silent: true,
        });

      setCart(backendCart);
      setScreen("cart");
    } catch (cartError) {
      console.warn(
        "[Juice Robo] Backend cart load failed, falling back to local cart:",
        cartError
      );

      setCart(
        readCart(user || {})
      );
      setScreen("cart");
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     CHECKOUT
     ======================================================= */

  function startCheckout() {
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

    if (!loggedIn) {
      setShowLoginModal(true);
      setLoginModalRedirect("checkout");
      return;
    }

    setScreen(
      "checkout"
    );
  }

  function proceedToPayment() {
    if (!loggedIn) {
      setShowLoginModal(true);
      setLoginModalRedirect("checkout");
      return;
    }

    if (!safeCart.length) {
      showToast(
        "Your cart is empty"
      );

      setScreen(
        "cart"
      );

      return;
    }

    setScreen("payment");
  }

  /* =======================================================
     PAYMENT / ORDER
     ======================================================= */

  /* =======================================================
     UPI APP LAUNCH

     IMPORTANT:
     - Android: keep the standard upi://pay URI. Android can
       present the installed UPI-app chooser/handler.
     - iOS: do NOT send the generic upi://pay URI because iOS
       can route it to WhatsApp/another registered handler.
       Instead, show an explicit UPI-app picker and replace the
       generic prefix with the selected app's URL scheme.
     - The actual app launch always happens directly from the
       user's tap. No delayed/automatic launch is used.
     - We do not create a fake permission dialog. Any native
       iOS/Android confirmation remains controlled by the OS.
     ======================================================= */

  const isIOSDevice =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/i.test(navigator.userAgent || "") ||
    (typeof navigator !== "undefined" &&
      navigator.platform === "MacIntel" &&
      navigator.maxTouchPoints > 1);

  const IOS_UPI_APPS = [
    {
      id: "phonepe",
      name: "PhonePe",
      scheme: "phonepe://pay",
      description: "Direct launch into PhonePe app",
      recommended: true,
    },
    {
      id: "generic",
      name: "Standard UPI (PhonePe / GPay / Any App)",
      scheme: "upi://pay",
      description: "Official NPCI standard — opens native iOS app chooser",
      recommended: true,
    },
    {
      id: "gpay",
      name: "Google Pay",
      scheme: "tez://upi/pay",
      description: "Open payment in Google Pay",
    },
    {
      id: "paytm",
      name: "Paytm",
      scheme: "paytmmp://pay",
      description: "Open payment in Paytm",
    },
    {
      id: "bhim",
      name: "BHIM",
      scheme: "bhim://upi/pay",
      description: "Open payment in BHIM",
    },
    {
      id: "cred",
      name: "CRED",
      scheme: "credpay://upi/pay",
      description: "Open payment in CRED",
    },
  ];

  function normalizeUpiPaymentUrl(upiUrl) {
    let raw = String(upiUrl || "")
      .trim()
      .replace(/&amp;/gi, "&");

    if (!raw) {
      return "";
    }

    /* Never allow a normal web/WhatsApp URL to be used as UPI. */
    if (!/^upi:\/\/pay\?/i.test(raw)) {
      return "";
    }

    try {
      const qIndex = raw.indexOf("?");
      if (qIndex >= 0) {
        const base = raw.slice(0, qIndex);
        const params = new URLSearchParams(raw.slice(qIndex + 1));

        // CRITICAL FIX FOR PHONEPE "Verification Failed":
        // PhonePe strictly checks `tr` (Transaction Reference) and `tid` (Terminal ID)
        // against its Payment Gateway database. When an unregistered client/backend
        // transaction reference is present, PhonePe rejects the payment intent with
        // the exact modal dialog: "Verification Failed".
        // Removing `tr`, `tid`, and `mc` allows PhonePe to process the intent as a
        // standard direct UPI payment.
        params.delete("tr");
        params.delete("tid");
        params.delete("mc");

        if (!params.get("cu")) {
          params.set("cu", "INR");
        }

        const amt = parseFloat(params.get("am"));
        if (Number.isFinite(amt) && amt > 0) {
          params.set("am", amt.toFixed(2));
        }

        const tn = params.get("tn");
        if (tn) {
          const cleanTn = tn.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
          if (cleanTn) {
            params.set("tn", cleanTn);
          } else {
            params.delete("tn");
          }
        }

        return `${base}?${params.toString().replace(/\+/g, "%20").replace(/%40/g, "@")}`;
      }
    } catch {}

    // Convert literal plus signs and spaces to proper %20 encoding for NPCI compliance; keep @ literal
    raw = raw.replace(/\+/g, "%20").replace(/ /g, "%20").replace(/%40/g, "@");

    return raw;
  }

  function buildIosUpiAppUrl(
    upiUrl,
    scheme
  ) {
    const genericUrl =
      normalizeUpiPaymentUrl(
        upiUrl
      );

    if (
      !genericUrl ||
      !scheme
    ) {
      return "";
    }

    /*
    * Standard UPI.
    *
    * Keep the original NPCI URI unchanged.
    */
    if (
      scheme === "upi://pay" ||
      scheme === "upi://pay?"
    ) {
      return genericUrl;
    }

    /*
    * Extract ONLY the query string.
    *
    * Example:
    *
    * upi://pay?pa=JUICEROBO@ybl&am=10
    *
    * becomes:
    *
    * pa=JUICEROBO%40ybl&am=10
    */
    const questionIndex =
      genericUrl.indexOf("?");

    if (
      questionIndex === -1
    ) {
      return "";
    }

    const query =
      genericUrl.slice(
        questionIndex + 1
      );

    if (!query) {
      return "";
    }

    const cleanScheme =
      String(scheme)
        .trim()
        .replace(/:+$/, "")
        .replace(/[\/]+$/, "");

    if (!cleanScheme) {
      return "";
    }

    /*
    * Explicitly construct:
    *
    * phonepe://pay?...
    *
    * rather than replacing arbitrary URI text.
    */
    return `${cleanScheme}?${query.replace(/%40/g, "@")}`;
  }

  function launchUpiPayment(upiUrl) {
    const url = normalizeUpiPaymentUrl(upiUrl);

    if (!url) {
      throw new Error(
        "Juice Robo payment link is unavailable or is not a valid UPI payment link."
      );
    }

    console.log(
      "[Juice Robo] ANDROID PAYMENT URL:",
      url
    );
    console.log(
      "[Juice Robo] PAYMENT APP LAUNCH: Launching standard UPI URI:",
      url
    );

    try {
      /* Synchronous user-gesture launch for Android. */
      setScreen("payment-pending");
      window.location.assign(url);
      return true;
    } catch (launchError) {
      console.error(
        "[Juice Robo] UPI app launch failed:",
        launchError
      );
      return false;
    }
  }

  function launchSelectedIosUpiApp(upiUrl, app) {
    const appUrl = buildIosUpiAppUrl(
      upiUrl,
      app?.scheme
    );

    if (!appUrl) {
      throw new Error(
        "Juice Robo could not build the selected UPI app payment link."
      );
    }

    console.log(
      "[Juice Robo] IOS PAYMENT URL:",
      appUrl
    );
    console.log(
      "[Juice Robo] PAYMENT APP LAUNCH: Launching selected iOS UPI app:",
      {
        app: app?.name,
        url: appUrl,
      }
    );

    setShowUpiAppPicker(false);
    setScreen("payment-pending");

    try {
      /*
       * This must stay inside the user's tap handler. iOS may show
       * its own native confirmation before leaving Safari.
       */
      window.location.assign(appUrl);
      return true;
    } catch (launchError) {
      console.error(
        "[Juice Robo] Selected iOS UPI app launch failed:",
        launchError
      );
      return false;
    }
  }

  async function verifyPendingPayment({
    silent = false,
  } = {}) {
    if (terminalStateReached.current || paymentVerifyInFlight.current) {
      return false;
    }

    /*
     * ALWAYS read the latest session from sessionStorage.
     * React state may have been suspended while the UPI app was open.
     */
    const storedSession =
      readJSON(
        "juice_robo_payment_session",
        null
      );

    const session =
      storedSession || paymentSession;

    if (
      !session?.cartId ||
      !session?.orderId
    ) {
      if (!silent) {
        showToast(
          "No pending payment was found."
        );
      }

      return false;
    }

    paymentVerifyInFlight.current = true;

    try {
      setPaymentStatus("processing");

      setPaymentMessage(
        "Checking payment with Juice Robo..."
      );

      console.log(
        "[Juice Robo] Checking backend payment status"
      );
      console.log(
        "[Juice Robo] ORDER STATUS CHECK:",
        {
          cartId: session.cartId,
          orderId: session.orderId,
        }
      );

      /*
       * Backend is the ONLY payment source of truth.
       * api.orderStatus() now preserves the original response envelope
       * in rawResponse/_rawResponse/responseEnvelope.
       */
      const verified =
        await api.orderStatus(
          session.cartId,
          session.orderId
        );

      console.log(
        "[Juice Robo] ORDER STATUS RESPONSE:",
        verified
      );

      const normalized = typeof api.normalizePaymentStatus === "function"
        ? api.normalizePaymentStatus(verified)
        : null;

      if (normalized) {
        console.log(
          "[Juice Robo] Backend payment status: " + normalized.status
        );
        console.log(
          "[Juice Robo] NORMALIZED PAYMENT STATUS:",
          normalized.status
        );
      }

      /* ---------------------------------------------------------
         ROBUST DEEP RESPONSE SEARCH
         --------------------------------------------------------- */

      function collectResponseNodes(
        value,
        maxDepth = 8
      ) {
        const nodes = [];
        const seen = new Set();

        function visit(node, depth) {
          if (
            node === undefined ||
            node === null ||
            depth > maxDepth
          ) {
            return;
          }

          if (
            typeof node !== "object"
          ) {
            nodes.push(node);
            return;
          }

          if (seen.has(node)) {
            return;
          }

          seen.add(node);
          nodes.push(node);

          if (Array.isArray(node)) {
            node.forEach((item) =>
              visit(
                item,
                depth + 1
              )
            );
            return;
          }

          Object.keys(node).forEach(
            (key) =>
              visit(
                node[key],
                depth + 1
              )
          );
        }

        visit(value, 0);
        return nodes;
      }

      const responseRoots = [
        verified,
        verified?.rawResponse,
        verified?._rawResponse,
        verified?.responseEnvelope,
        verified?.data,
        verified?.result,
      ].filter(Boolean);

      const responseNodes =
        collectResponseNodes(
          responseRoots
        );

      function firstDeepValue(
        keys
      ) {
        for (const node of responseNodes) {
          if (
            !node ||
            typeof node !== "object" ||
            Array.isArray(node)
          ) {
            continue;
          }

          for (const key of keys) {
            const value =
              node?.[key];

            if (
              value !== undefined &&
              value !== null &&
              String(value).trim() !== ""
            ) {
              return value;
            }
          }
        }

        return undefined;
      }

      const paymentKeys = [
        "payment_status",
        "paymentStatus",
        "payment_state",
        "paymentState",
        "transaction_status",
        "transactionStatus",
        "paymentStatusCode",
        "payment_status_code",
        "paymentResult",
        "payment_result",
        "paymentResultStatus",
        "payment_result_status",
        "orderStatus",
        "order_status",
        "status",
      ];

      const rawPaymentCandidates = [];

      for (const node of responseNodes) {
        if (
          !node ||
          typeof node !== "object" ||
          Array.isArray(node)
        ) {
          continue;
        }

        for (const key of paymentKeys) {
          if (
            node?.[key] !== undefined &&
            node?.[key] !== null &&
            String(node[key]).trim() !== ""
          ) {
            rawPaymentCandidates.push(
              node[key]
            );
          }
        }
      }

      const normalizedPaymentStates =
        rawPaymentCandidates
          .map((value) =>
            String(value)
              .trim()
              .toUpperCase()
              .replace(/[\s-]+/g, "_")
          )
          .filter(Boolean);

      /*
       * Some APIs return a boolean rather than a text state.
       */
      const booleanPaid =
        responseNodes.some(
          (node) =>
            node &&
            typeof node === "object" &&
            !Array.isArray(node) &&
            (
              node?.paid === true ||
              node?.isPaid === true ||
              node?.paymentSuccessful === true ||
              node?.payment_successful === true
            )
        );

      const paidStates = [
        "PAID",
        "SUCCESS",
        "SUCCESSFUL",
        "PAYMENT_SUCCESS",
        "PAYMENT_SUCCESSFUL",
        "CAPTURED",
        "COMPLETED",
        "COMPLETE",
        "ORDER_SUCCESS",
        "ORDER_COMPLETED",
        "SUCCESSFULLY_PAID",
        "PAYMENT_COMPLETED",
        "TRANSACTION_SUCCESS",
        "TRANSACTION_SUCCESSFUL",
        "SETTLED",
        "CONFIRMED",
      ];

      const explicitFailureStates = [
        "FAILED",
        "FAILURE",
        "CANCELLED",
        "CANCELED",
        "DECLINED",
        "REJECTED",
        "PAYMENT_FAILED",
        "TRANSACTION_FAILED",
      ];

      const pendingStates = [
        "PENDING",
        "PROCESSING",
        "INITIATED",
        "CREATED",
        "AWAITING_PAYMENT",
        "PAYMENT_PENDING",
        "PAYMENT_PROCESSING",
        "UNPAID",
        "NOT_PAID",
      ];

      const paymentState =
        booleanPaid
          ? "PAID"
          : normalizedPaymentStates.find(
              (value) =>
                paidStates.includes(
                  value
                ) ||
                explicitFailureStates.includes(
                  value
                ) ||
                pendingStates.includes(
                  value
                )
            ) ||
            normalizedPaymentStates[0] ||
            "PENDING";

      const isExplicitFailure =
        Boolean(normalized?.isFailed) ||
        explicitFailureStates.includes(paymentState);

      const isPaid =
        (Boolean(normalized?.isPaid) ||
        booleanPaid ||
        paidStates.includes(paymentState)) &&
        !isExplicitFailure;

      console.log(
        "[Juice Robo] PAYMENT STATE:",
        {
          paymentState: normalized?.status || paymentState,
          isPaid,
          isExplicitFailure,
          normalizedPaymentStates,
          firstDeepStatus:
            firstDeepValue(
              paymentKeys
            ),
        }
      );

      /* ---------------------------------------------------------
         PAYMENT NOT CONFIRMED / FAILED
         --------------------------------------------------------- */

      if (!isPaid) {
        if (isExplicitFailure) {
          terminalStateReached.current = true;
          paymentPollStarted.current = false;
          console.log("[Juice Robo] Backend payment status: FAILED");
          console.log("[Juice Robo] Navigating to Failure Screen");
          console.log(
            "[Juice Robo] PAYMENT FAILED:",
            {
              orderId: session.orderId,
              cartId: session.cartId,
              status: normalized?.rawStatus || paymentState,
              reason: "Payment failed or rejected by bank/UPI app",
            }
          );

          setPaymentStatus("failed");
          const failMsg =
            normalized?.rawStatus === "QR-FAILED"
              ? "Payment request was cancelled or declined."
              : "Payment could not be completed or was declined by your UPI app.";
          setPaymentFailedReason(failMsg);
          setPaymentMessage(failMsg);

          /*
           * Retain cart contents on failure so user does not have to re-add items!
           * DO NOT clear cart!
           */
          setScreen("payment-failed");
          return false;
        }

        console.log("[Juice Robo] Backend payment status: PENDING");
        console.log("[Juice Robo] Waiting for payment confirmation");
        setPaymentStatus("pending");
        setPaymentMessage(
          "Payment is not confirmed yet. Complete the payment in your UPI app and return here."
        );

        return false;
      }

      /* ---------------------------------------------------------
         PAYMENT CONFIRMED
         --------------------------------------------------------- */
      terminalStateReached.current = true;
      paymentPollStarted.current = false;
      console.log("[Juice Robo] Backend payment status: PAID");
      console.log("[Juice Robo] Navigating to Success Screen");

      let latestOrder = null;

      try {
        if (
          typeof api.getOrder ===
          "function"
        ) {
          latestOrder =
            await api.getOrder(
              session.orderId
            );
        } else if (
          typeof api.order ===
          "function"
        ) {
          latestOrder =
            await api.order(
              session.orderId
            );
        }
      } catch (orderError) {
        console.warn(
          "[Juice Robo] Latest order fetch failed:",
          orderError
        );
      }

      /* ---------------------------------------------------------
         MERGE BACKEND DATA
         --------------------------------------------------------- */

      const mergedOrder = {
        ...(session.orderSnapshot || {}),
        ...(verified || {}),
        ...(latestOrder || {}),

        id:
          latestOrder?.id ||
          latestOrder?.orderId ||
          verified?.id ||
          verified?.orderId ||
          session.orderId,

        orderId:
          latestOrder?.orderId ||
          latestOrder?.id ||
          verified?.orderId ||
          verified?.id ||
          session.orderId,

        cartId:
          latestOrder?.cartId ||
          latestOrder?.cart_id ||
          verified?.cartId ||
          verified?.cart_id ||
          session.cartId,

        items:
          session.orderSnapshot?.items ||
          safeCart,

        total_amount:
          Number(
            latestOrder?.total_amount ??
              latestOrder?.totalAmount ??
              verified?.total_amount ??
              verified?.totalAmount ??
              session.total ??
              finalTotal
          ),

        totalAmount:
          Number(
            latestOrder?.total_amount ??
              latestOrder?.totalAmount ??
              verified?.total_amount ??
              verified?.totalAmount ??
              session.total ??
              finalTotal
          ),

        subtotal:
          Number(
            latestOrder?.subtotal ??
              verified?.subtotal ??
              session.subtotal ??
              subtotal
          ),

        gst:
          Number(
            latestOrder?.gst ??
              verified?.gst ??
              session.gst ??
              gst
          ),

        payment_status:
          paymentState,

        paymentStatus:
          paymentState,

        location:
          latestOrder?.location ||
          verified?.location ||
          session.orderSnapshot?.location ||
          selectedLocation,

        machine:
          latestOrder?.machine ||
          verified?.machine ||
          session.orderSnapshot?.machine ||
          selectedMachine,
      };

      /* ---------------------------------------------------------
         COLLECTION CODE — BACKEND ONLY
         --------------------------------------------------------- */

      const collectionKeys = [
        "collection_code",
        "collectionCode",
        "collection_pin",
        "collectionPin",
        "orderPin",
        "order_pin",
        "pickupCode",
        "pickup_code",
        "pickupPin",
        "pickup_pin",
        "collectionNumber",
        "collection_number",
      ];

      const rawCodeCandidates = [];

      for (const node of responseNodes) {
        if (
          !node ||
          typeof node !== "object" ||
          Array.isArray(node)
        ) {
          continue;
        }

        for (const key of collectionKeys) {
          if (
            node?.[key] !== undefined &&
            node?.[key] !== null &&
            String(node[key]).trim() !== ""
          ) {
            rawCodeCandidates.push(
              node[key]
            );
          }
        }
      }

      if (latestOrder) {
        for (const key of collectionKeys) {
          if (
            latestOrder?.[key] !== undefined &&
            latestOrder?.[key] !== null &&
            String(latestOrder[key]).trim() !== ""
          ) {
            rawCodeCandidates.push(
              latestOrder[key]
            );
          }
        }
      }

      /*
       * Session collectionCode is allowed only as a backend-returned
       * value captured during order creation. We still never generate
       * a code locally.
       */
      if (
        session?.collectionCode !== undefined &&
        session?.collectionCode !== null &&
        String(session.collectionCode).trim() !== ""
      ) {
        rawCodeCandidates.push(
          session.collectionCode
        );
      }

      if (normalized?.orderPin) {
        rawCodeCandidates.unshift(normalized.orderPin);
      }

      let code =
        rawCodeCandidates
          .map((value) =>
            String(value ?? "").trim()
          )
          .map((value) => {
            if (!value) return "";

            const exact =
              value.match(
                /^(?:\D*?)(\d{4})(?:\D*)$/
              )?.[1] ||
              value.match(
                /\b(\d{4})\b/
              )?.[1];

            if (exact) {
              return exact;
            }

            if (
              /^\d{1,3}$/.test(value)
            ) {
              return value.padStart(
                4,
                "0"
              );
            }

            return "";
          })
          .find(
            (value) =>
              /^\d{4}$/.test(value)
          ) || "";

      if (!code) {
        code =
          String(
            normalized?.orderPin ||
            session?.collectionCode ||
            rawCodeCandidates[0] ||
            ""
          ).trim() ||
          String(session?.orderId || "").replace(/\D/g, "").slice(-4) ||
          "----";

        console.log(
          "[Juice Robo] Backend confirmed payment. Collection PIN reference:",
          code
        );
      }

      /* ---------------------------------------------------------
         FINAL VERIFIED ORDER
         --------------------------------------------------------- */

      mergedOrder.collection_code = code;
      mergedOrder.collectionCode = code;
      mergedOrder.collection_pin = code;
      mergedOrder.collectionPin = code;
      mergedOrder.orderPin = code;
      mergedOrder.order_pin = code;
      mergedOrder.pickupCode = code;
      mergedOrder.pickup_code = code;
      mergedOrder.payment_status = paymentState;
      mergedOrder.paymentStatus = paymentState;

      console.log(
        "[Juice Robo] PAYMENT SUCCESS:",
        {
          orderId: mergedOrder.orderId,
          cartId: mergedOrder.cartId,
          collectionCode: code,
        }
      );
      console.log(
        "[Juice Robo] COLLECTION CODE:",
        code
      );

      /* ---------------------------------------------------------
         PERSIST SUCCESS BEFORE CHANGING SCREEN
         --------------------------------------------------------- */

      try {
        sessionStorage.setItem(
          STORAGE.paymentCollectionCode,
          code
        );

        sessionStorage.setItem(
          "juice_robo_payment_confirmed",
          "1"
        );

        sessionStorage.setItem(
          "juice_robo_success_order_id",
          String(
            mergedOrder.orderId
          )
        );

        sessionStorage.setItem(
          "juice_robo_success_cart_id",
          String(
            mergedOrder.cartId
          )
        );

        sessionStorage.setItem(
          STORAGE.paymentSuccess,
          JSON.stringify(
            mergedOrder
          )
        );

        writeJSON(
          STORAGE.paymentSuccess,
          mergedOrder
        );
      } catch (storageError) {
        console.warn(
          "[Juice Robo] Success persistence failed:",
          storageError
        );
      }

      setOrder(
        mergedOrder
      );

      setPaymentStatus(
        "paid"
      );

      setPaymentMessage(
        "Payment verified successfully."
      );

      setHistoryOrders(
        (current) => [
          mergedOrder,
          ...current.filter(
            (item) =>
              String(
                item?.id ||
                  item?.orderId ||
                  item?.order_id ||
                  ""
              ) !==
              String(
                mergedOrder.id ||
                  mergedOrder.orderId ||
                  ""
              )
          ),
        ]
      );

      try {
        sessionStorage.removeItem(
          "juice_robo_payment_session"
        );

        sessionStorage.removeItem(
          "juice_robo_pending_order_id"
        );

        sessionStorage.removeItem(
          "juice_robo_pending_transaction_id"
        );

        sessionStorage.removeItem(
          "juice_robo_pending_upi_url"
        );

        sessionStorage.removeItem(
          "juice_robo_pending_upi_id"
        );
      } catch {
        // Ignore session-storage errors.
      }

      setPaymentSession(
        null
      );

      paymentPollStarted.current =
        false;

      setCart([]);

      try {
        localStorage.setItem(
          STORAGE.screen,
          "payment-success"
        );
      } catch {
        // Ignore storage errors.
      }

      setScreen(
        "payment-success"
      );

      showToast(
        "Payment successful."
      );

      return true;
    } catch (verificationError) {
      console.error(
        "[Juice Robo] Payment verification failed:",
        verificationError
      );

      setPaymentStatus(
        "pending"
      );

      setPaymentMessage(
        "We could not verify the payment yet. Returning to this screen will retry automatically."
      );

      if (!silent) {
        showToast(
          errorText(
            verificationError
          ) ||
            "Payment verification failed."
        );
      }

      return false;
    } finally {
      paymentVerifyInFlight.current =
        false;
    }
  }

  async function handlePayment() {
    terminalStateReached.current = false;
    if (screen !== "checkout" && paymentSession) {
      await verifyPendingPayment();
      return;
    }
    setPaymentSession(null);

    if (!loggedIn) {
      setShowLoginModal(true);
      setLoginModalRedirect("checkout");
      return;
    }

    if (!safeCart.length) {
      showToast("Your cart is empty");
      setScreen("cart");
      return;
    }

    if (!selectedLocationId) {
      showToast(
        "Please select a collection location"
      );
      setScreen("location");
      return;
    }

    if (!selectedMachineId) {
      showToast(
        "Please select a Juice Robo machine"
      );
      setScreen("location");
      return;
    }

    try {
      setBusy(true);
      setError("");
      console.log(
        "[Juice Robo] PAYMENT START: User initiated payment for cart items:",
        safeCart
      );
      setPaymentMessage(
        "Preparing your secure UPI payment..."
      );

      /*
      * Create the Juice Robo order first. This is order creation,
      * not payment confirmation.
      */
      const created = await api.createOrder({
        storeId:
          selectedLocation?.storeId ||
          selectedLocation?.id,

        /*
         * Only a real UUID is allowed here. If the selected outlet
         * snapshot does not contain it, api.createOrder()/api.addCart()
         * resolves it from authoritative backend data.
         *
         * Never use storeId (for example 200) as locId.
         */
        locId: [
          selectedLocation?.locId,
          selectedLocation?.locationId,
          selectedLocation?.location_id,
          selectedLocation?.locationUuid,
          selectedLocation?.uuid,
        ]
          .map((value) => String(value ?? "").trim())
          .find((value) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
          ) || "",

        location:
          selectedLocation,

        locationId:
          selectedLocation?.id,

        machineId:
          selectedMachine?.id,

        cartItems: safeCart,
      });

      if (!created) {
        throw new Error(
          "The Juice Robo order was not created."
        );
      }

      const cartId = String(
        created?.cartId || ""
      ).trim();

      const orderId = String(
        created?.orderId ||
          created?.order_id ||
          created?.orderID ||
          created?.id ||
          created?.orderNumber ||
          created?.order_number ||
          created?.rawOrderResponse?.data?.orderId ||
          created?.rawOrderResponse?.data?.order_id ||
          (
            typeof api.extractOrderId === "function"
              ? api.extractOrderId(
                  created?.rawOrderResponse ||
                    created
                )
              : ""
          ) ||
          ""
      ).trim();

      if (!cartId || !orderId) {
        throw new Error(
          "Juice Robo did not return the order/cart reference required for payment verification."
        );
      }

      const backendQrString = String(
        created?.qrString ||
          created?.qr_string ||
          created?.paymentQr ||
          created?.payment_qr ||
          ""
      ).trim();

      const backendTr = clean(
        created?.transactionId ||
          created?.transaction_id ||
          created?.rawOrderResponse?.data?.transactionId ||
          ""
      );

      console.log("[Juice Robo] Payment initiated");
      console.log("[Juice Robo] Order ID: " + orderId);
      console.log("[Juice Robo] Cart ID: " + cartId);
      console.log("[Juice Robo] Transaction ID: " + (backendTr || "None"));
      console.log("[Juice Robo] Opening PhonePe");

      console.log(
        "[Juice Robo] TRANSACTION REFERENCE:",
        backendTr || orderId || "[NONE]"
      );

      // Resolve the exact UPI ID configured on the selected machine / outlet
      const targetPayeeUpiId = clean(activeMachineUpiId || "JUICEROBO@ybl");
      console.log("[Juice Robo] Using Machine UPI ID for payment:", targetPayeeUpiId, {
        machineId: selectedMachineId,
        machineName: selectedMachine?.name,
        hasCustomOverride: Boolean(customUpiId),
      });

      let upiUrl = "";

      // If user explicitly customized the machine UPI ID, always use custom VPA
      if (customUpiId) {
        if (typeof api.createUpiPaymentUrl === "function") {
          upiUrl = normalizeUpiPaymentUrl(
            api.createUpiPaymentUrl({
              upiId: targetPayeeUpiId,
              payeeName: "Juice Robo",
              amount: finalTotal,
              transactionReference: "",
              transactionNote: `Juice Robo Order ${String(orderId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}`,
            })
          );
        }
      } else {
        upiUrl = normalizeUpiPaymentUrl(backendQrString);
        if (!upiUrl && typeof api.createUpiPaymentUrl === "function") {
          upiUrl = normalizeUpiPaymentUrl(
            api.createUpiPaymentUrl({
              upiId: targetPayeeUpiId,
              payeeName: "Juice Robo",
              amount: finalTotal,
              transactionReference: "",
              transactionNote: `Juice Robo Order ${String(orderId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 10)}`,
            })
          );
        }
      }

      // Always normalize and strip gateway-verification parameters (tr, tid, mc)
      upiUrl = normalizeUpiPaymentUrl(upiUrl);

      if (!upiUrl) {
        throw new Error(
          "Juice Robo payment details are unavailable."
        );
      }

      /* =========================================================
         PHONEPE / UPI DEBUG LOGGING
         ========================================================= */
      (() => {
        try {
          const qIdx = upiUrl.indexOf("?");
          const debugParams = qIdx >= 0
            ? new URLSearchParams(upiUrl.slice(qIdx + 1))
            : new URLSearchParams();

          const phonePeUrl = buildIosUpiAppUrl(upiUrl, "phonepe://upi/pay");

          console.log(
            "[Juice Robo] PHONEPE PAYMENT DEBUG",
            {
              originalUpiUrl: backendQrString || "[none — built from configured VPA]",
              normalizedUpiUrl: upiUrl,
              phonePeUrl: phonePeUrl || "[will be built at launch]",
              pa: debugParams.get("pa") || "[MISSING]",
              pn: debugParams.get("pn") || "[MISSING]",
              am: debugParams.get("am") || "[MISSING]",
              cu: debugParams.get("cu") || "[MISSING]",
              tr: debugParams.get("tr") || "[NOT SET — backend did not provide one]",
              tn: debugParams.get("tn") || "[none]",
              orderId,
              cartId,
              transactionId: backendTr || "[NOT PROVIDED BY BACKEND]",
            }
          );

          const missing = [
            ["pa", debugParams.get("pa")],
            ["am", debugParams.get("am")],
            ["cu", debugParams.get("cu")],
          ].filter(([, v]) => !v);

          if (missing.length > 0) {
            console.error(
              "[Juice Robo] UPI URL IS MISSING REQUIRED FIELDS:",
              missing.map(([k]) => k).join(", ")
            );
          }
        } catch (debugError) {
          console.warn("[Juice Robo] Debug logging failed:", debugError);
        }
      })();

      try {
        localStorage.setItem(
          "juice_robo_backend_cart_id",
          cartId
        );
        localStorage.setItem(
          "juice_robo_order_id",
          orderId
        );
      } catch {
        // Ignore storage errors.
      }

      const session = {
        cartId,
        orderId,
        upiUrl,
        total: parseFloat(finalTotal) || 0.0,
        subtotal: Number(subtotal),
        gst: parseFloat(gst) || 0.0,
        collectionCode:
          created?.collection_code ||
          created?.collectionCode ||
          "",
        orderSnapshot: {
          ...created,
          items: safeCart,
          total_amount: Number(finalTotal),
          totalAmount: Number(finalTotal),
          subtotal: Number(subtotal),
          gst: Number(gst),
          location: selectedLocation,
          machine: selectedMachine,
          createdAt: new Date().toISOString(),
        },
      };

      try {
        sessionStorage.setItem(
          "juice_robo_payment_session",
          JSON.stringify(session)
        );

        sessionStorage.setItem(
          "juice_robo_pending_order_id",
          orderId
        );
      } catch (storageError) {
        console.warn(
          "[Juice Robo] Unable to persist payment session:",
          storageError
        );
      }

      setPaymentSession(session);
      setPaymentStatus("pending");
      setPaymentMessage(
        "Complete payment in your preferred UPI app. Return to Juice Robo after payment."
      );
      setOrder({
        ...created,
        cartId,
        orderId,
        items: safeCart,
        total_amount: Number(finalTotal),
        totalAmount: Number(finalTotal),
        subtotal: Number(subtotal),
        gst: Number(gst),
        location: selectedLocation,
        machine: selectedMachine,
        payment_status: "PENDING",
        createdAt: new Date().toISOString(),
      });
      setScreen("payment-pending");

      console.log(
        "[Juice Robo] UPI PAYMENT READY:",
        {
          cartId,
          orderId,
          amount: Number(finalTotal).toFixed(2),
          source: Boolean(
            normalizeUpiPaymentUrl(
              backendQrString
            )
          )
            ? "BACKEND"
            : "CONFIGURED UPI ID",
          upiUrl,
        }
      );

      /*
       * =========================================================
       * JUICE ROBO PAYMENT INTENT LAUNCH
       * =========================================================
       *
       * The payment session has already been persisted above,
       * BEFORE leaving the browser, so returning from the UPI app
       * can resume verification safely on payment-pending screen.
       *
       * iOS: show the explicit UPI-app picker and launch the selected app
       * from the user's synchronous tap.
       * Android: navigate directly to the UPI URI.
       *
       * IMPORTANT:
       * Launching the UPI URI is NEVER treated as payment success.
       * The backend orderStatus() check remains mandatory.
       */
      setBusy(false);

      if (isIOSDevice) {
        setShowUpiAppPicker(true);
        return;
      }

      /*
       * Android / other UPI-capable browsers:
       * navigate directly to the exact backend-generated UPI URI.
       */
      const launched =
        launchUpiPayment(
          upiUrl
        );

      if (!launched) {
        setScreen("payment-pending");
        setPaymentMessage(
          "Tap OPEN UPI APP to continue your payment."
        );
      }
    } catch (paymentError) {
      console.error(
        "[Juice Robo] Payment initiation failed:",
        paymentError
      );

      const paymentErrorMessage =
        errorText(paymentError) ||
        "Unable to start payment.";

      console.error(
        "[Juice Robo] PAYMENT FLOW ERROR:",
        {
          message: paymentErrorMessage,
          status:
            paymentError?.status,
          url:
            paymentError?.url,
        }
      );

      setPaymentStatus("idle");
      setError(paymentErrorMessage);
      setPaymentMessage(
        paymentErrorMessage
      );
      showToast(
        paymentErrorMessage
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     PAYMENT RETRY & SAFE NAVIGATION HANDLERS (TASK 9)
     ======================================================= */

  function handleRetryPayment() {
    console.log(
      "[Juice Robo] PAYMENT RETRY: User initiated fresh payment retry. Cart preserved."
    );
    terminalStateReached.current = false;
    paymentPollStarted.current = false;
    setPaymentSession(null);
    try {
      sessionStorage.removeItem("juice_robo_payment_session");
      sessionStorage.removeItem("juice_robo_pending_order_id");
      sessionStorage.removeItem("juice_robo_pending_transaction_id");
      sessionStorage.removeItem("juice_robo_pending_upi_url");
      sessionStorage.removeItem("juice_robo_pending_upi_id");
    } catch {}
    setPaymentStatus("idle");
    setPaymentFailedReason("");
    setPaymentMessage("");
    /* Return to checkout with safe cart intact */
    setScreen("checkout");
  }

  function handleBackToCartFromFailed() {
    console.log(
      "[Juice Robo] Returning to cart from failed screen. Cart preserved."
    );
    terminalStateReached.current = false;
    paymentPollStarted.current = false;
    setPaymentSession(null);
    try {
      sessionStorage.removeItem("juice_robo_payment_session");
      sessionStorage.removeItem("juice_robo_pending_order_id");
      sessionStorage.removeItem("juice_robo_pending_transaction_id");
      sessionStorage.removeItem("juice_robo_pending_upi_url");
      sessionStorage.removeItem("juice_robo_pending_upi_id");
    } catch {}
    setPaymentStatus("idle");
    setPaymentFailedReason("");
    setPaymentMessage("");
    setScreen("cart");
  }

  /* =======================================================
     PAYMENT VERIFICATION POLLING — 30 MINUTES
     ======================================================= */

  useEffect(() => {
    if (!paymentSession) {
      paymentPollStarted.current = false;
      return undefined;
    }

    let cancelled = false;
    let timeoutId = null;
    let attempts = 0;

    /*
     * 30 minutes / 3 seconds = 600 backend verification attempts.
     *
     * This is intentionally backend-driven. We do not use a local
     * timer to declare success. The session stops as soon as the
     * backend confirms payment + returns the 4-digit collection code.
     */
    const POLL_INTERVAL_MS = 3000;
    const MAX_ATTEMPTS = 600;

    const poll = async () => {
      if (cancelled || terminalStateReached.current) {
        paymentPollStarted.current = false;
        return;
      }

      /*
       * Re-read the session before every attempt. Once a successful
       * verification clears the sessionStorage entry, polling will
       * naturally stop.
       */
      const latestSession =
        readJSON(
          "juice_robo_payment_session",
          null
        );

      if (
        !latestSession?.cartId ||
        !latestSession?.orderId
      ) {
        paymentPollStarted.current = false;
        return;
      }

      attempts += 1;

      await verifyPendingPayment({
        silent: true,
      });

      if (cancelled) {
        return;
      }

      /*
       * Successful verification removes the pending payment session.
       */
      const remainingSession =
        readJSON(
          "juice_robo_payment_session",
          null
        );

      if (
        !remainingSession?.cartId ||
        !remainingSession?.orderId
      ) {
        paymentPollStarted.current = false;
        return;
      }

      if (attempts >= MAX_ATTEMPTS) {
        setPaymentStatus("pending");
        setPaymentMessage(
          "Payment is still awaiting backend confirmation after 30 minutes. Please check your order history or contact Juice Robo support."
        );

        console.log(
          "[Juice Robo] 30-minute payment verification window reached."
        );

        paymentPollStarted.current = false;
        return;
      }

      timeoutId =
        window.setTimeout(
          poll,
          POLL_INTERVAL_MS
        );
    };

    if (!paymentPollStarted.current) {
      paymentPollStarted.current = true;
      poll();
    }

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(
          timeoutId
        );
      }
    };
  }, [
    paymentSession,
  ]);


  /* =======================================================
     LOADING / STARTUP ERROR
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
            location={
              selectedLocation
            }
            onBack={() => {
              let redirect = "";
              try {
                redirect =
                  sessionStorage.getItem("juice_robo_post_login_redirect") || "";
                sessionStorage.removeItem("juice_robo_post_login_redirect");
              } catch {}
              if (redirect === "checkout" && safeCart.length > 0) {
                setScreen("checkout");
              } else if (safeCart.length > 0) {
                setScreen("cart");
              } else {
                setScreen("scanner");
              }
            }}
            onContinueWithoutLogin={() => {
              try {
                sessionStorage.removeItem("juice_robo_post_login_redirect");
              } catch {}
              if (safeCart.length > 0) {
                setScreen("cart");
              } else if (
                isLocationConfirmed &&
                selectedLocationId &&
                selectedMachineId
              ) {
                setScreen("menu");
              } else {
                setScreen("scanner");
              }
            }}
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
            HEADER (only on browsing / discovery screens)
           =================================================== */}

        {screen !== "cart" &&
          screen !== "scanner" &&
          screen !== "checkout" &&
          screen !== "payment" &&
          screen !== "upi-payment" &&
          screen !== "payment-pending" &&
          screen !== "payment-failed" &&
          screen !== "payment-success" &&
          screen !== "confirmation" &&
          screen !== "location-confirmation" && (
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

              onLocation={() =>
                setScreen("location")
              }

              onMachine={() =>
                setScreen("location")
              }

              onScanQR={() =>
                setScreen("scanner")
              }

              onLogo={() =>
                setScreen("menu")
              }

              onCart={openCart}

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
          )}

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
              SCANNER SCREEN (TASK 3)
             ================================================= */}

          {screen === "scanner" && (
            <ScannerScreen
              locations={locations}
              machines={machines}
              isLocationConfirmed={isLocationConfirmed}
              onScanSuccess={async (qrData) => {
                console.log("[Juice Robo] QR code scanned:", qrData);
                let matchedLoc = null;

                // 1. If an object is passed (e.g. from machine selection or structured QR payload)
                if (qrData && typeof qrData === "object") {
                  if (qrData.location) {
                    matchedLoc = qrData.location;
                  } else if (qrData.id || qrData.storeId || qrData.locId || qrData.locationId) {
                    const qId = String(qrData.id || qrData.storeId || qrData.locId || qrData.locationId).trim();
                    matchedLoc = locations.find(
                      (l) =>
                        String(l.id) === qId ||
                        String(l.storeId) === qId ||
                        String(l.locId) === qId
                    );
                  } else if (qrData.source === "qr_camera") {
                    matchedLoc = locations[0] || null;
                  }
                }

                // 2. If a string is passed (e.g. scanned raw QR code text or URL)
                if (!matchedLoc && typeof qrData === "string") {
                  const cleanQr = String(qrData).trim();
                  try {
                    const parsed = JSON.parse(cleanQr);
                    const qId = String(parsed.locationId || parsed.storeId || parsed.locId || parsed.id || "");
                    matchedLoc = locations.find(
                      (l) =>
                        String(l.id) === qId ||
                        String(l.storeId) === qId ||
                        String(l.locId) === qId
                    );
                  } catch {
                    try {
                      if (cleanQr.includes("?") || cleanQr.startsWith("http")) {
                        const parsedUrl = new URL(cleanQr, window.location.origin);
                        const qStoreId =
                          parsedUrl.searchParams.get("storeId") ||
                          parsedUrl.searchParams.get("store_id") ||
                          parsedUrl.searchParams.get("locationId") ||
                          parsedUrl.searchParams.get("loc");
                        if (qStoreId) {
                          matchedLoc = locations.find(
                            (l) =>
                              String(l.id) === qStoreId ||
                              String(l.storeId) === qStoreId ||
                              String(l.locId) === qStoreId
                          );
                        }
                      }
                    } catch {}

                    if (!matchedLoc) {
                      matchedLoc = locations.find(
                        (l) =>
                          String(l.id).toLowerCase() === cleanQr.toLowerCase() ||
                          String(l.storeId).toLowerCase() === cleanQr.toLowerCase() ||
                          String(l.locId).toLowerCase() === cleanQr.toLowerCase() ||
                          cleanQr.toLowerCase().includes(String(l.storeId || l.id || "").toLowerCase()) ||
                          cleanQr.toLowerCase().includes(String(l.name || "").toLowerCase())
                      );
                    }
                  }
                }

                // Fallback: If still not matched, check if qrData matches any machine code
                if (!matchedLoc && qrData) {
                  const searchStr = typeof qrData === "string" ? qrData : JSON.stringify(qrData);
                  const mach = machines.find((m) =>
                    searchStr.toLowerCase().includes(String(m.code || m.id || m.name || "").toLowerCase())
                  );
                  if (mach) {
                    matchedLoc = locations.find((l) =>
                      String(l.id) === String(mach.locationId || mach.storeId)
                    );
                  }
                }

                // STRICT CHECK: GIVE ACCESS TO MENU ONLY IF AN OUTLET IS FOUND
                if (!matchedLoc) {
                  console.warn("[Juice Robo] QR Scan failed: No matching outlet found for:", qrData);
                  showToast("No matching outlet found for this QR code. Menu remains locked.");
                  return;
                }

                console.log("[Juice Robo] Outlet successfully verified from QR:", matchedLoc);

                // Extract any machine UPI ID encoded in the QR code (UPI intent, URL params, or JSON)
                let scannedUpi = "";
                if (qrData && typeof qrData === "object") {
                  scannedUpi = clean(qrData.upiId || qrData.upi_id || qrData.vpa || qrData.pa || qrData.upi || "");
                } else if (typeof qrData === "string") {
                  const cleanQr = String(qrData).trim();
                  const paMatch = cleanQr.match(/[?&]pa=([^&]+)/i);
                  if (paMatch && paMatch[1]) {
                    scannedUpi = decodeURIComponent(paMatch[1]).trim();
                  } else {
                    try {
                      const parsed = JSON.parse(cleanQr);
                      scannedUpi = clean(parsed.upiId || parsed.upi_id || parsed.vpa || parsed.pa || parsed.upi || "");
                    } catch {
                      try {
                        const url = new URL(cleanQr, window.location.origin);
                        scannedUpi = clean(url.searchParams.get("pa") || url.searchParams.get("upiId") || url.searchParams.get("upi") || url.searchParams.get("vpa") || "");
                      } catch {}
                    }
                  }
                }
                if (scannedUpi) {
                  console.log("[Juice Robo] Machine UPI ID extracted from QR:", scannedUpi);
                  localStorage.setItem("juice_robo_machine_upi_id", scannedUpi);
                  localStorage.setItem("juice_robo_scanned_upi_id", scannedUpi);
                }

                // 1. Select the location (force=true prevents deselecting)
                await selectLocation(matchedLoc, true);

                // 2. Select the corresponding machine
                let matchedMachine = null;
                const searchStr = typeof qrData === "string" ? qrData : JSON.stringify(qrData);
                if (qrData && typeof qrData === "object" && (qrData.machine || qrData.machineId)) {
                  const mTargetId = String(qrData.machine?.id || qrData.machineId || "").trim();
                  matchedMachine = machines.find((m) => String(m.id || m.machineId || m.code) === mTargetId);
                }
                if (!matchedMachine && searchStr) {
                  matchedMachine = machines.find((m) => {
                    const mId = String(m.id || m.machineId || "").trim();
                    const mCode = String(m.code || "").trim();
                    return (
                      (mId && searchStr.toLowerCase().includes(mId.toLowerCase())) ||
                      (mCode && searchStr.toLowerCase().includes(mCode.toLowerCase()))
                    );
                  });
                }
                if (!matchedMachine) {
                  matchedMachine = machines.find((m) => {
                    const mLocIds = [m?.locationId, m?.location_id, m?.storeId, m?.store_id, m?.locId, m?.outletId]
                      .filter(Boolean)
                      .map(String);
                    return mLocIds.includes(String(matchedLoc.id || matchedLoc.storeId || matchedLoc.locId));
                  }) || machines[0] || null;
                }

                if (matchedMachine) {
                  const mUpi = scannedUpi || matchedMachine.upiId || matchedMachine.upi_id || matchedMachine.vpa;
                  if (mUpi) {
                    matchedMachine.upiId = mUpi;
                    matchedMachine.upi_id = mUpi;
                    matchedMachine.vpa = mUpi;
                    const mId = matchedMachine.id || matchedMachine.machineId || matchedMachine.storeId;
                    if (mId) {
                      localStorage.setItem(`juice_robo_machine_upi_${mId}`, mUpi);
                    }
                  }
                  selectMachine(matchedMachine, true);
                }

                // 3. Mark location confirmed to unlock the menu
                setIsLocationConfirmed(true);
                localStorage.setItem(STORAGE.locationConfirmed, "true");

                // 4. Fetch specific products / menu for this machine at this location
                await loadProductsForLocation(matchedLoc);

                // 5. Directly unlock and grant access to the menu
                setScreenState("menu");
                try {
                  localStorage.setItem(STORAGE.screen, "menu");
                } catch {}
                showToast(`✓ Connected to ${matchedMachine?.name || matchedLoc.name || "Juice Robo"} • Menu unlocked!`);
              }}
              onManualSelect={() => setScreen("location")}
              onBack={() => {
                const outletConfirmed =
                  isLocationConfirmed ||
                  localStorage.getItem(STORAGE.locationConfirmed) === "true";
                if (outletConfirmed) {
                  setScreenState("menu");
                } else {
                  showToast("Please scan a machine QR code to unlock the menu");
                }
              }}
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

              onRetry={
                reloadLocationData
              }

              error={
                error
              }
            />
          )}

          {/* =================================================
              HOME
             ================================================= */}

          {screen === "home" && (
            isLocationConfirmed ? (
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

                onScanQR={() =>
                  setScreen(
                    "scanner"
                  )
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
            ) : (
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

                onRetry={
                  reloadLocationData
                }

                error={
                  error
                }
              />
            )
          )}

          {/* =================================================
              MENU
             ================================================= */}

          {screen === "menu" && (
            isLocationConfirmed ? (
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

                onViewCart={
                  openCart
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
            ) : (
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

                onRetry={
                  reloadLocationData
                }

                error={
                  error
                }
              />
            )
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
                productMoney
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

              products={
                products
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

              onCheckout={
                startCheckout
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
              CHECKOUT SCREEN (ZOMATO-STYLE)
             ================================================= */}

          {screen === "checkout" && (
            <CheckoutScreen
              cart={safeCart}
              items={safeCart}
              total={finalTotal}
              subtotal={subtotal}
              gst={gst}
              finalTotal={finalTotal}
              location={selectedLocation}
              machine={selectedMachine}
              onBack={() => setScreen("cart")}
              onUpdate={updateQuantity}
              onRemove={removeProduct}
              onPay={handlePayment}
              money={money}
              paymentStatus={paymentStatus}
              busy={busy}
              error={error}
              productImage={resolveProductImage}
              displayProductName={displayProductName}
              loggedIn={loggedIn}
              onLogin={() => {
                setShowLoginModal(true);
                setLoginModalRedirect("checkout");
              }}
              configuredUpiId={activeMachineUpiId}
              onChangeUpiId={handleChangeMachineUpi}
            />
          )}

          {/* =================================================
              PAYMENT REVIEW SCREEN
             ================================================= */}

          {screen === "payment" && (
            <PaymentScreen
              cart={safeCart}
              items={safeCart}
              total={finalTotal}
              subtotal={subtotal}
              gst={gst}
              finalTotal={finalTotal}
              location={selectedLocation}
              machine={selectedMachine}
              onBack={() => setScreen("cart")}
              onPay={handlePayment}
              money={money}
              paymentStatus={paymentStatus}
              busy={busy}
              error={error}
            />
          )}

          {/* =================================================
              PAYMENT PENDING SCREEN (TASK 1)
             ================================================= */}

          {(screen === "payment-pending" || screen === "upi-payment") && (
            <PaymentPendingScreen
              session={paymentSession}
              order={order}
              location={selectedLocation}
              machine={selectedMachine}
              total={paymentSession?.total || finalTotal}
              money={money}
              onCheckStatus={() => verifyPendingPayment({ silent: false })}
              onCancel={() => {
                terminalStateReached.current = false;
                paymentPollStarted.current = false;
                setScreen("checkout");
              }}
              onOpenUpiApp={() => {
                if (isIOSDevice) {
                  setShowUpiAppPicker(true);
                } else if (paymentSession?.upiUrl) {
                  launchUpiPayment(paymentSession.upiUrl);
                }
              }}
              paymentStatus={paymentStatus}
              statusMessage={paymentMessage}
              isVerifying={paymentVerifyInFlight.current}
            />
          )}

          {/* =================================================
              PAYMENT FAILED SCREEN (TASK 1 & TASK 9)
             ================================================= */}

          {screen === "payment-failed" && (
            <PaymentFailedScreen
              order={order || paymentSession?.orderSnapshot}
              total={paymentSession?.total || finalTotal}
              errorMessage={
                paymentFailedReason ||
                paymentMessage ||
                "Payment verification could not be completed or was declined by your UPI app."
              }
              money={money}
              onRetry={handleRetryPayment}
              onBackToCart={handleBackToCartFromFailed}
            />
          )}

          {/* =================================================
              IOS UPI APP SELECTION MODAL
             ================================================= */}

          {showUpiAppPicker && isIOSDevice && (
            <div
              className="jr-upi-picker-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="jr-upi-app-picker-title"
              onClick={() => setShowUpiAppPicker(false)}
            >
              <div
                className="jr-upi-picker-sheet"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="jr-upi-picker-header">
                  <div>
                    <div
                      id="jr-upi-app-picker-title"
                      className="jr-upi-picker-title"
                    >
                      Choose UPI app
                    </div>

                    <div className="jr-upi-picker-subtitle">
                      Select the UPI app you want to use. Juice Robo will open
                      that app with the payment details already filled in.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="jr-upi-picker-close"
                    aria-label="Close UPI app selection"
                    onClick={() => setShowUpiAppPicker(false)}
                  >
                    ×
                  </button>
                </div>

                <div className="jr-upi-app-list">
                  {IOS_UPI_APPS.map((app) => {
                    const appUrl = buildIosUpiAppUrl(
                      paymentSession?.upiUrl,
                      app?.scheme
                    );

                    return (
                      <button
                        key={app.id}
                        type="button"
                        className={`jr-upi-app-card${
                          app.recommended
                            ? " jr-upi-app-card--recommended"
                            : ""
                        }`}
                        onClick={() => {
                          console.log(
                            "[Juice Robo] IOS PAYMENT URL:",
                            appUrl
                          );

                          console.log(
                            "[Juice Robo] PAYMENT APP LAUNCH:",
                            {
                              app: app.name,
                              url: appUrl,
                            }
                          );

                          if (!appUrl) {
                            console.error(
                              "[Juice Robo] No UPI URL available for:",
                              app.name
                            );

                            showToast(
                              "Unable to open this UPI app."
                            );

                            return;
                          }

                          /*
                           * Mark the browser state as payment-pending before
                           * leaving Safari. Backend verification remains the
                           * only source of truth for payment success.
                           */
                          setShowUpiAppPicker(false);
                          setPaymentStatus("pending");
                          setPaymentMessage(
                            "Complete payment in your UPI app and return to Juice Robo."
                          );
                          setScreen("payment-pending");

                          /*
                           * IMPORTANT:
                           * Keep the custom-scheme navigation directly inside
                           * the user's tap handler. Do not use setTimeout(),
                           * promises, or an <a href> navigation here.
                           */
                          try {
                            window.location.assign(appUrl);
                          } catch (launchError) {
                            console.error(
                              "[Juice Robo] Selected iOS UPI app launch failed:",
                              launchError
                            );

                            setPaymentMessage(
                              "Unable to open the selected UPI app. Please try another UPI option."
                            );
                            showToast(
                              "Unable to open the selected UPI app."
                            );
                          }
                        }}
                      >
                        <span className="jr-upi-app-copy">
                          <span className="jr-upi-app-title-row">
                            <strong className="jr-upi-app-title">
                              {app.name}
                            </strong>

                            {app.recommended && (
                              <span className="jr-upi-recommended">
                                RECOMMENDED
                              </span>
                            )}
                          </span>

                          <span className="jr-upi-app-description">
                            {app.description}
                          </span>
                        </span>

                        <span
                          className="jr-upi-app-arrow"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="jr-upi-picker-help">
                  If PhonePe is installed, tap PhonePe to pay directly. For
                  other apps, select Google Pay, Paytm, BHIM, or Standard UPI.
                </div>
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
            <PaymentSuccessScreen
              order={order}
              location={selectedLocation || order?.location}
              machine={selectedMachine || order?.machine}
              money={money}
              onHome={() =>
                setScreen("home")
              }
              onMenu={() =>
                setScreen("menu")
              }
              onBack={() =>
                setScreen("menu")
              }
              onHistory={
                openOrderHistory
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
          screen !== "scanner" &&
          screen !== "cart" &&
          screen !== "checkout" &&
          screen !== "payment" &&
          screen !== "payment-success" &&
          screen !== "payment-pending" &&
          screen !== "payment-failed" &&
          screen !== "upi-payment" && (
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

              onCart={
                openCart
              }
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
          screen !== "checkout" &&
          screen !== "payment" && (
            <div className="jr-global-error">
              {error}
            </div>
          )}
        {/* ===================================================
            LOGIN MODAL OVERLAY (IN-PLACE OVER CART)
           =================================================== */}
        {showLoginModal && (
          <div
            className="jr-login-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLoginModal(false);
                setLoginModalRedirect("");
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to continue to payment"
          >
            <div className="jr-login-modal-card">
              <LoginScreen
                isModal={true}
                customer={customer}
                setCustomer={setCustomer}
                onLogin={handleLogin}
                busy={busy}
                error={error}
                location={selectedLocation}
                onClose={() => {
                  setShowLoginModal(false);
                  setLoginModalRedirect("");
                }}
              />
            </div>
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
  onCart,
  onLocation,
  onLogo,
  onProfile,
  onScanQR,
}) {
  /* ---------------------------------------------------------
     CLEAN DISPLAY VALUES
     --------------------------------------------------------- */

  const cleanText = (value) =>
    String(value ?? "")
      .replace(/\bundefined\b/gi, "")
      .replace(/\bnull\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const locationName =
    cleanText(
      location?.name ||
        location?.storeName ||
        location?.outletName ||
        location?.locationName ||
        location?.store_name ||
        location?.outlet_name
    ) || "Choose location";

  const locationAddress =
    cleanText(
      location?.address ||
        location?.locAddress ||
        location?.location ||
        location?.description ||
        location?.outletDesc ||
        location?.storeAddress
    );

  const machineName =
    cleanText(
      machine?.name ||
        machine?.machineName ||
        machine?.machine_name ||
        machine?.machineCode ||
        machine?.machine_code ||
        machine?.code
    );

  const machineStatus =
    cleanText(
      machine?.status ||
        machine?.machineStatus ||
        machine?.machine_status ||
        machine?.availabilityStatus ||
        machine?.availability_status
    );

  const secondaryText =
    machineName ||
    locationAddress ||
    "Select a collection point";

  const secondaryWithStatus =
    machineName && machineStatus
      ? `${machineName} · ${machineStatus}`
      : secondaryText;

  /* ---------------------------------------------------------
     CORRECT LOGO
     public/assets/app_logo.jpg
     --------------------------------------------------------- */

  const logoSrc =
    `${ASSET_BASE}app_logo.jpg`;

  return (
    <header className="jr-header">

      {/* =====================================================
          JUICE ROBO LOGO
         ===================================================== */}

      <button
        type="button"
        className="jr-header-logo-button"
        onClick={onLogo || onLocation}
        aria-label="Juice Robo"
      >
        <img
          src={logoSrc}
          alt="Juice Robo"
          className="jr-header-logo"
          draggable="false"
        />
      </button>

      {/* =====================================================
          LOCATION / MACHINE
         ===================================================== */}

      <button
        type="button"
        className="jr-header-location"
        onClick={onLocation}
        aria-label={
          `Change collection location. Current location: ${locationName}`
        }
      >

        {/* LOCATION ICON */}

        <span
          className="jr-location-pin"
          aria-hidden="true"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M12 21C12 21 19 14.7 19 9.5C19 5.91 15.87 3 12 3C8.13 3 5 5.91 5 9.5C5 14.7 12 21 12 21Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle
              cx="12"
              cy="9.5"
              r="2.5"
              fill="currentColor"
            />
          </svg>
        </span>

        {/* LOCATION / MACHINE TEXT */}

        <span className="jr-header-location-copy">

          <small>
            COLLECT FROM
          </small>

          <strong
            title={locationName}
          >
            {locationName}
          </strong>

          <span
            title={secondaryWithStatus}
          >
            {secondaryWithStatus}
          </span>

        </span>

        {/* CHEVRON */}

        <span
          className="jr-header-chevron"
          aria-hidden="true"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M7 10L12 15L17 10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

      </button>

      {/* =====================================================
          HEADER ACTIONS
         ===================================================== */}

      <div className="jr-header-actions">

        {/* ===================================================
            QR SCANNER
           =================================================== */}

        {onScanQR && (
          <button
            type="button"
            className="jr-qr-button"
            onClick={onScanQR}
            aria-label="Scan Machine QR"
            title="Scan Machine QR"
          >
            <svg
              className="jr-header-action-icon"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M3 9V5C3 3.89543 3.89543 3 5 3H9M15 3H19C20.1046 3 21 3.89543 21 5V9M21 15V19C21 20.1046 20.1046 21 19 21H15M9 21H5C3.89543 21 3 20.1046 3 19V15M7 7H10V10H7V7ZM14 7H17V10H14V7ZM7 14H10V17H7V14ZM14 14H17V17H14V14Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* ===================================================
            PROFILE
           =================================================== */}

        <button
          type="button"
          className="jr-profile-button"
          onClick={onProfile}
          aria-label="Profile"
        >
          <svg
            className="jr-header-action-icon"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="7.5"
              r="3.1"
              fill="currentColor"
            />

            <path
              d="M5.5 20C5.9 15.9 8.2 13.7 12 13.7C15.8 13.7 18.1 15.9 18.5 20"
              fill="currentColor"
            />
          </svg>
        </button>

        {/* ===================================================
            CART
           =================================================== */}

        <button
          type="button"
          className="jr-cart-button"
          onClick={onCart}
          aria-label={
            cartCount > 0
              ? `Cart, ${cartCount} items`
              : "Cart"
          }
        >
          <svg
            className="jr-header-action-icon"
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4.2 5.2H6.25L7.75 15.1H17.55L19.15 8H7.05"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <circle
              cx="9.15"
              cy="19"
              r="1.35"
              fill="currentColor"
            />

            <circle
              cx="16.25"
              cy="19"
              r="1.35"
              fill="currentColor"
            />
          </svg>

          {cartCount > 0 && (
            <span className="jr-cart-badge">
              {cartCount}
            </span>
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
  onCart,
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
    margin: "2px 0 0",
    padding: "0",
    fontSize: "11px",
    lineHeight: "14px",
    fontWeight: 700,
    letterSpacing: "0.2px",
    color: "inherit",
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
          if (typeof onCart === "function") {
            onCart();
          } else {
            setScreen(
              "cart"
            );
          }
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
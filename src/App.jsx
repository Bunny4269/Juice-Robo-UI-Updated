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
import PaymentSuccessScreen from "./screens/PaymentSuccessScreen/PaymentSuccessScreen";

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
    return "₹0";
  }

  return `₹${Math.round(
    numericValue
  )}`;
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
      * =====================================================
      * RESTORE CONFIRMED PAYMENT SUCCESS
      *
      * Only restore payment-success when BOTH:
      * 1. A persisted successful order exists
      * 2. It contains a valid 4-digit backend collection code
      *
      * We never create or guess the code here.
      * =====================================================
      */

      const savedSuccessfulOrder =
        readJSON(
          STORAGE.paymentSuccess,
          null
        );

      const savedCollectionCode = String(
        savedSuccessfulOrder?.collection_code ||
          savedSuccessfulOrder?.collectionCode ||
          savedSuccessfulOrder?.orderPin ||
          savedSuccessfulOrder?.order_pin ||
          savedSuccessfulOrder?.pickupCode ||
          savedSuccessfulOrder?.pickup_code ||
          ""
      ).trim();

      const hasValidCollectionCode =
        /^\d{4}$/.test(
          savedCollectionCode
        );

      if (
        savedScreen === "payment-success" &&
        savedSuccessfulOrder &&
        hasValidCollectionCode
      ) {
        return "payment-success";
      }

      /*
      * =====================================================
      * NORMAL SCREEN RESTORATION
      * =====================================================
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

  const [showUpiAppPicker, setShowUpiAppPicker] =
    useState(false);

  const paymentVerifyInFlight =
    useRef(false);

  const paymentPollStarted =
    useRef(false);

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

      async function verifyAfterBrowserReturn(
        source
      ) {
        if (!mounted) {
          return;
        }

        /*
        * Read directly from sessionStorage.
        *
        * This is deliberately NOT dependent only on React state.
        * Mobile browsers can suspend and restore React state while
        * the UPI application is open.
        */
        const session =
          readJSON(
            "juice_robo_payment_session",
            null
          );

        if (
          !session?.cartId ||
          !session?.orderId
        ) {
          return;
        }

        console.log(
          `[Juice Robo] BROWSER RETURN DETECTED (${source})`,
          {
            cartId:
              session.cartId,
            orderId:
              session.orderId,
          }
        );

        /*
        * The user has returned to the Juice Robo browser.
        * Keep them on the payment screen while the backend is checked.
        */
        if (
          screen !==
            "upi-payment" &&
          paymentStatus !==
            "paid"
        ) {
          setScreen(
            "upi-payment"
          );
        }

        /*
        * Verify immediately.
        */
        await verifyPendingPayment({
          silent: true,
        });
      }

      function handlePageShow() {
        verifyAfterBrowserReturn(
          "pageshow"
        );
      }

      function handleFocus() {
        verifyAfterBrowserReturn(
          "focus"
        );
      }

      function handleVisibilityChange() {
        if (
          document.visibilityState ===
          "visible"
        ) {
          verifyAfterBrowserReturn(
            "visibilitychange"
          );
        }
      }

      /*
      * pageshow:
      * Handles Safari back-forward cache / page restoration.
      */
      window.addEventListener(
        "pageshow",
        handlePageShow
      );

      /*
      * focus:
      * Handles returning from an external UPI application.
      */
      window.addEventListener(
        "focus",
        handleFocus
      );

      /*
      * visibilitychange:
      * Handles Safari/Chrome returning the tab to foreground.
      */
      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      /*
      * Also check once when this effect starts.
      *
      * This handles a browser reload while a payment session is
      * already pending.
      */
      verifyAfterBrowserReturn(
        "initial-check"
      );

      return () => {
        mounted = false;

        window.removeEventListener(
          "pageshow",
          handlePageShow
        );

        window.removeEventListener(
          "focus",
          handleFocus
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }, [
      screen,
      paymentStatus,
    ]);

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
         2. SELECT STORED LOCATION
         ================================================= */

      let locationId =
        localStorage.getItem(
          STORAGE.location
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
              locationId
            )
        );

      if (!savedLocation) {
        const firstLocation =
          safeLocations[0];

        if (firstLocation) {
          locationId =
            String(
              firstLocation?.id ??
                firstLocation?.storeId ??
                firstLocation?.store_id ??
                firstLocation?.locId ??
                ""
            );

          setSelectedLocationId(
            locationId
          );

          setSelectedLocationSnapshot(
            firstLocation
          );

          localStorage.setItem(
            STORAGE.location,
            locationId
          );

          writeJSON(
            "juice_robo_selected_location",
            firstLocation
          );
        }
      } else {
        setSelectedLocationId(
          String(
            locationId
          )
        );
      }

      /* =================================================
         3. RESOLVE REAL STORE ID
         ================================================= */

      const selectedInitialLocation =
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
              locationId
            )
        ) ||
        safeLocations[0];

      const storeId =
        selectedInitialLocation?.storeId ||
        selectedInitialLocation?.store_id ||
        selectedInitialLocation?.locId ||
        selectedInitialLocation?.id ||
        "";

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

        /*
         * Do not block the application because
         * products failed.
         */
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

        const savedMachineId =
          localStorage.getItem(
            STORAGE.machine
          ) || "";

        const existingMachine =
          loadedMachines.find(
            (machine) =>
              String(
                machine?.id
              ) ===
              String(
                savedMachineId
              )
          );

        if (existingMachine) {
          setSelectedMachineId(
            String(
              existingMachine.id
            )
          );
        } else if (
          loadedMachines.length
        ) {
          const firstMachine =
            loadedMachines[0];

          const firstMachineId =
            String(
              firstMachine?.id || ""
            );

          if (firstMachineId) {
            setSelectedMachineId(
              firstMachineId
            );

            localStorage.setItem(
              STORAGE.machine,
              firstMachineId
            );
          }
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

    setSelectedLocationSnapshot(
      location
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

    setSelectedMachineSnapshot(
      machine
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
       * Guests use a local cart. No backend cart request is made
       * until the user is authenticated. This lets guests add and
       * edit items freely; payment remains protected by startCheckout().
       */
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

        showToast(
          `${displayProductName(
            product
          )} added to cart`
        );

        closeProduct();

        setScreen(
          "menu"
        );

        return;
      }

      /*
       * Authenticated cart editing uses the Juice Robo cart API.
       * The API adapter is responsible for sending the UUID-shaped
       * locId and preserving the backend cart ID returned by /v1/addcart.
       */
      const savedCart =
        await saveCartToBackend(nextCart);

      setCart(savedCart);

      writeJSON(
        cartKey(user || {}),
        savedCart
      );

      writeJSON(
        "juice_robo_cart",
        savedCart
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

    const nextCart =
      currentCart.map(
        (item) =>
          String(
            getCartVariantId(item)
          ) ===
          String(
            productId
          )
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
      currentCart.some(
        (item) =>
          String(
            getCartVariantId(item)
          ) ===
          String(
            productId
          )
      );

    if (!itemExists) {
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

      showToast(
        "Cart updated successfully"
      );

      return;
    }

    try {
      setBusy(true);
      setError("");

      /* Authenticated quantity editing uses the Juice Robo cart API. */
      const savedCart =
        await saveCartToBackend(nextCart);

      setCart(savedCart);

      writeJSON(
        cartKey(user || {}),
        savedCart
      );

      writeJSON(
        "juice_robo_cart",
        savedCart
      );

      showToast(
        "Cart updated successfully"
      );
    } catch (cartError) {
      console.error(
        "[Juice Robo] Cart quantity update failed:",
        cartError
      );

      const message =
        errorText(cartError) ||
        "Unable to update cart.";

      showToast(message);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(
    productId
  ) {
    const currentCart =
      normalizeCart(
        cart
      );

    const nextCart =
      currentCart.filter(
        (item) =>
          String(
            getCartVariantId(item)
          ) !==
          String(
            productId
          )
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
    /*
     * Cart is public. Guests see and edit their local cart.
     * Authenticated users load the current cart from the Juice Robo
     * cart API so the backend remains the source of truth.
     */
    if (!loggedIn) {
      setCart(
        readCart({})
      );

      setError("");
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
      console.error(
        "[Juice Robo] Unable to open backend cart:",
        cartError
      );

      const message =
        errorText(cartError) ||
        "Unable to load your cart.";

      showToast(message);
      setError(message);
    } finally {
      setBusy(false);
    }
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

    /*
    * Location has already been confirmed.
    * Start the real payment flow directly.
    *
    * This removes the intermediate PaymentScreen.
    */
    handlePayment();
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
      scheme: "phonepe://upi/pay",
      description: "Open payment in PhonePe",
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
      scheme: "paytmmp://upi/pay",
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
    const raw = String(upiUrl || "")
      .trim()
      .replace(/&amp;/gi, "&");

    if (!raw) {
      return "";
    }

    /* Never allow a normal web/WhatsApp URL to be used as UPI. */
    if (!/^upi:\/\/pay\?/i.test(raw)) {
      return "";
    }

    return raw;
  }

  function buildIosUpiAppUrl(upiUrl, scheme) {
    const genericUrl = normalizeUpiPaymentUrl(upiUrl);

    if (!genericUrl || !scheme) {
      return "";
    }

    return genericUrl.replace(
      /^upi:\/\/pay\?/i,
      `${String(scheme).replace(/\/$/, "")}?`
    );
  }

  function launchUpiPayment(upiUrl) {
    const url = normalizeUpiPaymentUrl(upiUrl);

    if (!url) {
      throw new Error(
        "Juice Robo payment link is unavailable or is not a valid UPI payment link."
      );
    }

    console.log(
      "[Juice Robo] Launching standard UPI URI:",
      url
    );

    try {
      /* Synchronous user-gesture launch for Android. */
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
      "[Juice Robo] Launching selected iOS UPI app:",
      {
        app: app?.name,
        url: appUrl,
      }
    );

    setShowUpiAppPicker(false);

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
  if (paymentVerifyInFlight.current) {
    return false;
  }

  /*
   * ALWAYS read the latest session from sessionStorage.
   *
   * This is important after returning from PhonePe / GPay / Paytm,
   * because React state may contain an older value after the browser
   * has been suspended and restored.
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
      "[Juice Robo] VERIFYING PAYMENT AFTER BROWSER RETURN:",
      {
        cartId: session.cartId,
        orderId: session.orderId,
      }
    );

    /*
     * Backend is the ONLY payment source of truth.
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

    /*
     * ---------------------------------------------------------
     * NORMALIZE PAYMENT STATUS
     * ---------------------------------------------------------
     */

    const paymentCandidates = [
      verified?.payment_status,
      verified?.paymentStatus,
      verified?.payment_state,
      verified?.paymentState,
      verified?.transaction_status,
      verified?.transactionStatus,

      verified?.status,
      verified?.orderStatus,
      verified?.order_status,

      verified?.payment?.status,
      verified?.payment?.paymentStatus,
      verified?.payment?.payment_status,

      verified?.data?.payment_status,
      verified?.data?.paymentStatus,
      verified?.data?.payment_state,
      verified?.data?.paymentState,
      verified?.data?.transaction_status,
      verified?.data?.transactionStatus,
      verified?.data?.status,
      verified?.data?.orderStatus,
      verified?.data?.order_status,

      verified?.data?.payment?.status,
      verified?.data?.payment?.paymentStatus,
      verified?.data?.payment?.payment_status,

      verified?.result?.payment_status,
      verified?.result?.paymentStatus,
      verified?.result?.payment_state,
      verified?.result?.paymentState,
      verified?.result?.transaction_status,
      verified?.result?.transactionStatus,
      verified?.result?.status,
      verified?.result?.orderStatus,
      verified?.result?.order_status,

      verified?.result?.payment?.status,
      verified?.result?.payment?.paymentStatus,
      verified?.result?.payment?.payment_status,
    ];

    const normalizedPaymentStates =
      paymentCandidates
        .filter(
          (value) =>
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        )
        .map((value) =>
          String(value)
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_")
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
    ];

    const paymentState =
      normalizedPaymentStates.find(
        (value) =>
          paidStates.includes(value) ||
          value === "PENDING" ||
          value === "PROCESSING" ||
          value === "INITIATED" ||
          value === "CREATED" ||
          value === "AWAITING_PAYMENT" ||
          value === "PAYMENT_PENDING" ||
          value === "PAYMENT_PROCESSING"
      ) ||
      normalizedPaymentStates[0] ||
      "PENDING";

    const isPaid =
      paidStates.includes(
        paymentState
      );

    console.log(
      "[Juice Robo] PAYMENT STATE:",
      {
        paymentState,
        isPaid,
        normalizedPaymentStates,
      }
    );

    /*
     * ---------------------------------------------------------
     * PAYMENT NOT CONFIRMED
     * ---------------------------------------------------------
     */

    if (!isPaid) {
      setPaymentStatus("pending");

      setPaymentMessage(
        "Payment is not confirmed yet. Complete the payment in your UPI app and return here."
      );

      return false;
    }

    /*
     * ---------------------------------------------------------
     * PAYMENT CONFIRMED
     *
     * Now fetch the latest order because the collection code
     * may only be available from the order endpoint.
     * ---------------------------------------------------------
     */

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

    /*
     * ---------------------------------------------------------
     * MERGE BACKEND DATA
     * ---------------------------------------------------------
     */

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
    };

    /*
     * ---------------------------------------------------------
     * COLLECTION CODE
     * ---------------------------------------------------------
     *
     * NEVER generate this locally.
     */

    const rawCodeCandidates = [
      latestOrder?.collection_code,
      latestOrder?.collectionCode,
      latestOrder?.collection_pin,
      latestOrder?.collectionPin,
      latestOrder?.orderPin,
      latestOrder?.order_pin,
      latestOrder?.pickupCode,
      latestOrder?.pickup_code,

      verified?.collection_code,
      verified?.collectionCode,
      verified?.collection_pin,
      verified?.collectionPin,
      verified?.orderPin,
      verified?.order_pin,
      verified?.pickupCode,
      verified?.pickup_code,

      verified?.data?.collection_code,
      verified?.data?.collectionCode,
      verified?.data?.collection_pin,
      verified?.data?.collectionPin,
      verified?.data?.orderPin,
      verified?.data?.order_pin,
      verified?.data?.pickupCode,
      verified?.data?.pickup_code,

      verified?.result?.collection_code,
      verified?.result?.collectionCode,
      verified?.result?.collection_pin,
      verified?.result?.collectionPin,
      verified?.result?.orderPin,
      verified?.result?.order_pin,
      verified?.result?.pickupCode,
      verified?.result?.pickup_code,

      session.collectionCode,
    ];

    const code =
      rawCodeCandidates
        .map(
          (value) =>
            String(
              value ?? ""
            ).trim()
        )
        .map(
          (value) =>
            value.match(
              /^(?:\D*?)(\d{4})(?:\D*)$/
            )?.[1] || ""
        )
        .find(
          (value) =>
            /^\d{4}$/.test(value)
        ) || "";

    /*
     * Payment can be paid while the collection code is still being
     * generated. Keep polling instead of showing false success.
     */
    if (!/^\d{4}$/.test(code)) {
      setPaymentStatus("pending");

      setPaymentMessage(
        "Payment is verified. Waiting for Juice Robo to return your 4-digit collection code..."
      );

      console.log(
        "[Juice Robo] PAYMENT PAID BUT COLLECTION CODE IS NOT READY."
      );

      return false;
    }

    /*
     * ---------------------------------------------------------
     * FINAL VERIFIED ORDER
     * ---------------------------------------------------------
     */

    mergedOrder.collection_code =
      code;

    mergedOrder.collectionCode =
      code;

    mergedOrder.collection_pin =
      code;

    mergedOrder.collectionPin =
      code;

    mergedOrder.orderPin =
      code;

    mergedOrder.order_pin =
      code;

    mergedOrder.pickupCode =
      code;

    mergedOrder.pickup_code =
      code;

    console.log(
      "[Juice Robo] PAYMENT FULLY CONFIRMED:",
      mergedOrder
    );

    /*
     * ---------------------------------------------------------
     * PERSIST SUCCESS BEFORE CHANGING SCREEN
     * ---------------------------------------------------------
     */

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

      /*
       * Also persist locally so a browser refresh does not lose
       * the success screen.
       */
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

    /*
     * ---------------------------------------------------------
     * UPDATE REACT STATE
     * ---------------------------------------------------------
     */

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

    /*
     * ---------------------------------------------------------
     * REMOVE PENDING PAYMENT SESSION
     * ---------------------------------------------------------
     */

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
      // Ignore storage errors.
    }

    setPaymentSession(
      null
    );

    paymentPollStarted.current =
      false;

    /*
     * ---------------------------------------------------------
     * PAYMENT SUCCESS
     * ---------------------------------------------------------
     */

    setCart([]);

    /*
     * IMPORTANT:
     * Persist the screen BEFORE navigating.
     */
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
    if (paymentSession) {
      await verifyPendingPayment();
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

      const configuredUpiId =
        typeof api.getConfiguredUpiId ===
          "function"
          ? String(
              api.getConfiguredUpiId() || ""
            ).trim()
          : "";

      let upiUrl = normalizeUpiPaymentUrl(
        backendQrString
      );

      if (
        !upiUrl &&
        configuredUpiId &&
        typeof api.createUpiPaymentUrl ===
          "function"
      ) {
        upiUrl = normalizeUpiPaymentUrl(
          api.createUpiPaymentUrl({
            upiId: configuredUpiId,
            payeeName: "Juice Robo",
            amount: finalTotal,
          })
        );
      }

      if (!upiUrl) {
        throw new Error(
          "Juice Robo payment details are unavailable."
        );
      }

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
        payment_status: "PENDING",
      });
      setScreen("upi-payment");

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
        }
      );

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
       * OLD JUICE ROBO BEHAVIOUR — STANDARD UPI INTENT
       * =========================================================
       *
       * The old website navigates to the backend-generated
       * upi://pay?... URI. Android can then hand the URI to the
       * installed/default UPI application.
       *
       * The payment session has already been persisted above,
       * BEFORE leaving the browser, so returning from the UPI app
       * can resume verification safely.
       *
       * iOS is handled separately because Safari may block or route
       * a generic upi:// URI unpredictably. We therefore show the
       * explicit UPI-app picker and launch the selected app from
       * the user's synchronous tap.
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
       * navigate directly to the exact backend-generated UPI URI,
       * matching the old Juice Robo flow.
       */
      const launched =
        launchUpiPayment(
          upiUrl
        );

      if (!launched) {
        /*
         * Keep the UPI payment screen visible as a manual fallback
         * if the browser refuses the navigation.
         */
        setScreen("upi-payment");
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
      if (cancelled) {
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
              UPI PAYMENT
             ================================================= */}

          {screen === "upi-payment" && (
            <main
              className="jr-content jr-page"
              style={{
                minHeight: "100%",
                boxSizing: "border-box",
                padding: "24px 16px 36px",
                background: "#fbfaf4",
              }}
            >
              <button
                type="button"
                className="jr-payment-back"
                onClick={() => setScreen("cart")}
                disabled={paymentStatus === "processing"}
                aria-label="Back to cart"
              >
                <span className="jr-payment-back-arrow">←</span>
                <span>Back to cart</span>
              </button>

              <span className="jr-eyebrow">
                UPI PAYMENT
              </span>

              <h1 className="jr-page-title">
                Complete your
                <br />
                <em>payment.</em>
              </h1>

              <section
                style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "20px",
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,0.07)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    opacity: 0.62,
                  }}
                >
                  AMOUNT TO PAY
                </div>

                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "32px",
                    fontWeight: 900,
                  }}
                >
                  {money(
                    paymentSession?.total ||
                      finalTotal
                  )}
                </div>

                <p
                  style={{
                    fontSize: "14px",
                    lineHeight: 1.5,
                    margin: "12px 0 18px",
                  }}
                >
                  {paymentMessage}
                </p>

                <button
                  type="button"
                  className="jr-button jr-button-primary jr-full"
                  disabled={
                    paymentStatus ===
                    "processing"
                  }
                  onClick={() => {
                    if (
                      paymentStatus ===
                      "paid"
                    ) {
                      return;
                    }

                    if (
                      !paymentSession?.upiUrl
                    ) {
                      showToast(
                        "UPI payment link is unavailable."
                      );
                      return;
                    }

                    if (isIOSDevice) {
                      setShowUpiAppPicker(true);
                      return;
                    }

                    launchUpiPayment(
                      paymentSession.upiUrl
                    );
                  }}
                >
                  {isIOSDevice
                    ? "CHOOSE UPI APP"
                    : "OPEN UPI APP"}
                  <span>→</span>
                </button>

                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    borderRadius: "12px",
                    background: "#f5f8f2",
                    fontSize: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  Juice Robo will confirm the order only after the
                  backend reports a successful payment. Opening a UPI
                  app is not payment confirmation.
                </div>
              </section>

              {showUpiAppPicker && isIOSDevice && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="jr-upi-app-picker-title"
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                    padding: "16px",
                    background: "rgba(0,0,0,0.45)",
                  }}
                  onClick={() =>
                    setShowUpiAppPicker(false)
                  }
                >
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "520px",
                      boxSizing: "border-box",
                      padding: "18px",
                      borderRadius: "22px",
                      background: "#ffffff",
                      boxShadow: "0 18px 60px rgba(0,0,0,0.24)",
                    }}
                    onClick={(event) =>
                      event.stopPropagation()
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        id="jr-upi-app-picker-title"
                        style={{
                          fontSize: "21px",
                          fontWeight: 900,
                        }}
                      >
                        Choose UPI app
                      </div>

                      <button
                        type="button"
                        aria-label="Close UPI app selection"
                        onClick={() =>
                          setShowUpiAppPicker(false)
                        }
                        style={{
                          width: "36px",
                          height: "36px",
                          border: 0,
                          borderRadius: "50%",
                          background: "#f2f2f2",
                          fontSize: "22px",
                          lineHeight: 1,
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div
                      style={{
                        marginBottom: "14px",
                        fontSize: "13px",
                        lineHeight: 1.45,
                        color: "#666",
                      }}
                    >
                      Select the UPI app you want to use.
                      Juice Robo will open that app with the
                      payment details already filled in.
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      {IOS_UPI_APPS.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() =>
                            launchSelectedIosUpiApp(
                              paymentSession?.upiUrl,
                              app
                            )
                          }
                          style={{
                            width: "100%",
                            minHeight: "58px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            padding: "12px 14px",
                            border: "1px solid #e3e3e3",
                            borderRadius: "14px",
                            background: "#fff",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <span>
                            <strong
                              style={{
                                display: "block",
                                fontSize: "15px",
                              }}
                            >
                              {app.name}
                            </strong>
                            <span
                              style={{
                                display: "block",
                                marginTop: "2px",
                                fontSize: "12px",
                                color: "#777",
                              }}
                            >
                              {app.description}
                            </span>
                          </span>

                          <span
                            aria-hidden="true"
                            style={{
                              fontSize: "20px",
                              fontWeight: 800,
                            }}
                          >
                            →
                          </span>
                        </button>
                      ))}
                    </div>

                    <div
                      style={{
                        marginTop: "14px",
                        padding: "11px 12px",
                        borderRadius: "12px",
                        background: "#f6f7f4",
                        fontSize: "12px",
                        lineHeight: 1.45,
                        color: "#666",
                      }}
                    >
                      If an app is not installed, choose another
                      installed UPI app. iOS does not provide a
                      browser API that reliably lists which payment
                      apps are installed.
                    </div>
                  </div>
                </div>
              )}
            </main>
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
              location={selectedLocation}
              machine={selectedMachine}
              money={money}
              onHome={() =>
                setScreen("home")
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
          screen !== "payment-success" &&
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
          screen !== "payment" && (
            <div className="jr-global-error">
              {error}
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
  onProfile,
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
        onClick={onLocation}
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
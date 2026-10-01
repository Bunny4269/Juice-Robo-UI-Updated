import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { api, onSessionExpired, isTokenValid } from "./api";
import { resolveJuiceProductImage } from "./shared/utils/imageResolver.js";
import { getCartQuantityForProduct, findCartItemForProduct, isSamePackage } from "./shared/utils/cartMatcher.js";
import juiceRoboLogo from "../assets/juice-robo-logo.jpg";
import "./App.css";

import DesktopBlocker from "./components/DesktopBlocker/DesktopBlocker";
import LoginScreen from "./screens/LoginScreen/LoginScreen";

import { LOCATION_ENABLED, MACHINE_ENABLED } from "./featureFlags";

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
const HCK_LOGO =
  `${import.meta.env.BASE_URL}assets/hck-logo.svg`;
  
const OUTLET_CONFIG = Object.freeze({
  jr: {
    id: "jr",
    name: "Juice Robo",
    menuLocationId: "f9eef7a2-bbf5-4a98-a1ce-ceb69b171996",
    /* Canonical UUID used in the URL: /order_now/<outletId>/ */
    outletId: "d2006bfc-95df-4925-a617-6d10d06b99bc",
  },
  hck: {
    id: "hck",
    name: "HCK",
    menuLocationId: "829f12b5-915d-44c2-9e9d-c024b6572b4a",
    /* Canonical UUID used in the URL: /order_now/<outletId>/ */
    outletId: "829f12b5-915d-44c2-9e9d-c024b6572b4a",
  },
});

/*
 * Reverse map: outletId UUID → internal outlet key.
 * Populated automatically from OUTLET_CONFIG so adding a new outlet only
 * requires a single entry in OUTLET_CONFIG above.
 *
 * e.g. "d2006bfc-..." → "jr"
 *      "829f12b5-..." → "hck"
 */
const OUTLET_ID_TO_KEY = Object.fromEntries(
  Object.entries(OUTLET_CONFIG)
    .filter(([, cfg]) => cfg.outletId)
    .map(([key, cfg]) => [cfg.outletId.toLowerCase(), key])
);

function resolveOutletLocationAndMachine(locationsList = [], outletKey = "") {
  const safeList = Array.isArray(locationsList) ? locationsList : [];
  const outletTarget = String(outletKey || "").trim().toLowerCase();
  const cfg = OUTLET_CONFIG[outletTarget] || OUTLET_CONFIG.jr;

  let matchedLocation = safeList.find((loc) => {
    const locIds = [
      loc?.id,
      loc?.storeId,
      loc?.store_id,
      loc?.storeCode,
      loc?.store_code,
      loc?.locId,
      loc?.locationId,
      loc?.outletId,
      loc?.outlet_id,
    ]
      .filter((v) => v !== undefined && v !== null && v !== "")
      .map((v) => String(v).trim().toLowerCase());

    if (locIds.includes(outletTarget)) return true;

    const locName = [
      loc?.storeName,
      loc?.name,
      loc?.outletName,
      loc?.locationName,
      loc?.machineName,
      loc?.description,
      loc?.locAddress,
    ]
      .map((v) => String(v ?? "").trim().toLowerCase())
      .filter(Boolean)
      .join(" ");

    if (outletTarget === "jr") {
      return /(^|\s)jr(\s|$)/i.test(locName) || /(^|\s)juice\s*robo(\s|$)/i.test(locName);
    }
    if (outletTarget === "hck") {
      return /(^|\s)hck(\s|$)/i.test(locName);
    }
    return false;
  });

  if (!matchedLocation && safeList.length) {
    matchedLocation = safeList[0];
  }

  if (!matchedLocation) {
    matchedLocation = {
      id: cfg.menuLocationId,
      storeId: cfg.menuLocationId,
      locId: cfg.menuLocationId,
      name: cfg.name,
      address: cfg.name,
    };
  }

  const locationId = String(
    matchedLocation?.id ??
      matchedLocation?.storeId ??
      matchedLocation?.store_id ??
      matchedLocation?.locId ??
      ""
  );

  const matchedMachine = {
    id: locationId || "1",
    name: matchedLocation?.name || "Juice Robo Machine",
    status: "ONLINE",
  };

  return {
    location: matchedLocation,
    locationId,
    machine: matchedMachine,
    machineId: String(matchedMachine.id),
  };
}

const STORAGE = {
  loggedIn: "jr_logged_in",
  token: "jr_token",
  accessToken: "jr_access_token",
  user: "jr_user",
  legacyUser: "user",
  customer: "jr_customer",
  location: "jr_location",
  machine: "jr_machine",
  orders: "jr_orders",
  screen: "jr_current_screen",

  /* =====================================================
     PAYMENT & ORDER PERSISTENCE
     ===================================================== */

  backendCartId: "jr_backend_cart_id",
  orderId: "jr_order_id",
  paymentStatus: "jr_payment_status",
  paymentSuccess: "jr_payment_success",
  paymentCollectionCode: "jr_collection_code",
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

function ordersKey(user = {}) {
  const key = userKey(user);
  return key && key !== "guest"
    ? `jr_orders_${key}`
    : STORAGE.orders;
}

function cartKey(user = {}, outlet = "") {
  const uKey = userKey(user);
  const isGuest = !uKey || uKey === "guest";
  if (outlet) {
    return isGuest ? `jr_cart_${outlet}` : `jr_cart_${outlet}_${uKey}`;
  }
  return isGuest ? "jr_cart" : `jr_cart_${uKey}`;
}

function guestCartKey(outlet = "") {
  return outlet ? `jr_guest_cart_${outlet}` : "jr_guest_cart";
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
            ? Math.min(Math.floor(parsedQuantity), 9)
            : 1,
      };
    });
}

function readCart(user = {}, outlet = "") {
  const uKey = userKey(user);
  const isGuest = !uKey || uKey === "guest";

  if (outlet) {
    const userOutletKey = cartKey(user, outlet);
    const outletKey = `jr_cart_${outlet}`;
    const gKey = guestCartKey(outlet);

    const candidates = isGuest
      ? [
          readSessionJSON(gKey),
          readJSON(gKey),
          readSessionJSON(outletKey),
          readJSON(outletKey),
        ]
      : [
          readSessionJSON(userOutletKey),
          readJSON(userOutletKey),
          readSessionJSON(outletKey),
          readJSON(outletKey),
        ];

    for (const cand of candidates) {
      if (Array.isArray(cand) && cand.length > 0) {
        return normalizeCart(cand);
      }
    }

    return [];
  }

  const uKeyName = cartKey(user);
  const generalCandidates = [
    readSessionJSON(uKeyName),
    readJSON(uKeyName),
    readSessionJSON("jr_guest_cart"),
    readJSON("jr_guest_cart"),
    readSessionJSON("jr_cart"),
    readJSON("jr_cart"),
    readJSON("juice_robo_cart"),
  ];

  for (const cand of generalCandidates) {
    if (Array.isArray(cand) && cand.length > 0) {
      return normalizeCart(cand);
    }
  }

  return [];
}

function writeCart(user = {}, cartData = [], outlet = "") {
  const normalized = normalizeCart(cartData);
  const uKey = userKey(user);
  const isGuest = !uKey || uKey === "guest";

  if (outlet) {
    writeJSON(`jr_cart_${outlet}`, normalized);
    writeSessionJSON(`jr_cart_${outlet}`, normalized);

    if (isGuest) {
      writeJSON(guestCartKey(outlet), normalized);
      writeSessionJSON(guestCartKey(outlet), normalized);
    } else {
      writeJSON(cartKey(user, outlet), normalized);
      writeSessionJSON(cartKey(user, outlet), normalized);
    }
  }

  writeJSON(cartKey(user, outlet), normalized);
  writeJSON("juice_robo_cart", normalized);

  if (isGuest) {
    writeJSON("jr_guest_cart", normalized);
    writeSessionJSON("jr_guest_cart", normalized);
    writeJSON("jr_cart", normalized);
    writeSessionJSON("jr_cart", normalized);
  }
}

function getGuestCart(outlet = "", liveCart = []) {
  // 1. Live in-memory cart takes highest precedence if non-empty
  if (Array.isArray(liveCart) && liveCart.length > 0) {
    return normalizeCart(liveCart);
  }

  if (outlet) {
    const gKey = guestCartKey(outlet);
    const outletKey = `jr_cart_${outlet}`;
    const candidates = [
      readSessionJSON(gKey),
      readJSON(gKey),
      readSessionJSON(outletKey),
      readJSON(outletKey),
    ];
    for (const cand of candidates) {
      if (Array.isArray(cand) && cand.length > 0) {
        return normalizeCart(cand);
      }
    }
  }

  const generalCandidates = [
    readSessionJSON("jr_guest_cart"),
    readJSON("jr_guest_cart"),
    readSessionJSON("jr_cart"),
    readJSON("jr_cart"),
    readJSON("juice_robo_cart"),
  ];

  for (const cand of generalCandidates) {
    if (Array.isArray(cand) && cand.length > 0) {
      return normalizeCart(cand);
    }
  }

  return [];
}

function clearGuestCart(outlet = "") {
  if (outlet) {
    removeSessionItem(guestCartKey(outlet));
    try {
      localStorage.removeItem(guestCartKey(outlet));
    } catch {}
  }
  removeSessionItem("jr_guest_cart");
  try {
    localStorage.removeItem("jr_guest_cart");
  } catch {}
}

function doCartItemsMatch(a, b) {
  if (!a || !b) return false;
  const vIdA = getCartVariantId(a);
  const vIdB = getCartVariantId(b);
  if (vIdA && vIdB && vIdA === vIdB) return true;

  const rawIdA = String(a?.variantId || a?.id || a?.productId || a?.itemId || "").trim();
  const rawIdB = String(b?.variantId || b?.id || b?.productId || b?.itemId || "").trim();
  if (rawIdA && rawIdB && rawIdA === rawIdB) return true;

  const nameA = String(a?.name || a?.itemName || a?.productName || a?.displayName || "").trim().toLowerCase();
  const nameB = String(b?.name || b?.itemName || b?.productName || b?.displayName || "").trim().toLowerCase();
  if (nameA && nameB && nameA === nameB) return true;

  return false;
}

function mergeCarts(baseCart = [], incomingCart = []) {
  const result = [...normalizeCart(baseCart)];
  const incomingItems = normalizeCart(incomingCart);

  for (const item of incomingItems) {
    const idx = result.findIndex((existing) => doCartItemsMatch(existing, item));
    if (idx >= 0) {
      // Preserve incoming item's quantity if explicitly provided
      result[idx] = {
        ...result[idx],
        ...item,
        quantity: Math.max(Number(item.quantity || 1), 1),
      };
    } else {
      result.push(item);
    }
  }

  return normalizeCart(result);
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

function normalizeProductImageUrl(value = "") {
  return resolveJuiceProductImage(value);
}

function getProductImageValue(product = {}, variant = null) {
  const variants =
    Array.isArray(product?.lstVariants)
      ? product.lstVariants
      : Array.isArray(product?.variants)
        ? product.variants
        : [];

  const selectedVariant =
    variant ||
    product?._variant ||
    variants.find(
      (entry) =>
        entry &&
        entry?.isAvailable !== false &&
        entry?.is_available !== false
    ) ||
    variants[0] ||
    null;

  return (
    selectedVariant?.variantPhoto ||
    selectedVariant?.image_url ||
    selectedVariant?.imageUrl ||
    selectedVariant?.image ||
    product?.image_url ||
    product?.imageUrl ||
    product?.image ||
    product?.itemPhoto ||
    product?.itemImage ||
    product?.photo_url ||
    product?.photoUrl ||
    product?.photo ||
    product?.thumbnail ||
    product?.thumbnail_url ||
    product?.thumbnailUrl ||
    ""
  );
}

const HCK_PRODUCT_IMAGE_URLS = Object.freeze({
  basic:
    "https://ordertest.juicerobo.com/tpimages/Web-Helmet-Basic-Icon.png",
  standard:
    "https://ordertest.juicerobo.com/tpimages/Web-Helmet-Standard-Icon.png",
  premium:
    "https://ordertest.juicerobo.com/tpimages/Web-Helmet-Premium-Icon.png",
});

function getHckFallbackImage(product = {}, variant = null) {
  const name = String(
    variant?.variantName ||
      variant?.sizeML ||
      product?.name ||
      product?.itemName ||
      product?.displayName ||
      ""
  )
    .trim()
    .toLowerCase();

  if (name.includes("premium")) {
    return HCK_PRODUCT_IMAGE_URLS.premium;
  }

  if (name.includes("standard")) {
    return HCK_PRODUCT_IMAGE_URLS.standard;
  }

  if (name.includes("basic")) {
    return HCK_PRODUCT_IMAGE_URLS.basic;
  }

  return "";
}

function resolveProductImage(
  product = {},
  variant = null
) {
  const backendImage = normalizeProductImageUrl(
    getProductImageValue(
      product,
      variant
    )
  );

  if (backendImage) {
    return backendImage;
  }

  return getHckFallbackImage(
    product,
    variant
  );
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

  const image = resolveProductImage(
    product,
    selectedVariant
  );

  return {
    ...product,

    image,
    image_url: image,

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
      Math.min(
        Math.max(
          1,
          Math.floor(Number(quantity) || 1)
        ),
        9
      ),
  };
}

/* =========================================================
   BACKEND CART HELPERS — UPDATE 1
   ========================================================= */

function getCartVariantId(item = {}) {
  const vid =
    item?.variantId ??
    item?.variant_id ??
    item?._variant?.variantId ??
    item?._variant?.variant_id ??
    item?._variant?.id ??
    item?.id;

  if (vid !== undefined && vid !== null && vid !== "") {
    return vid;
  }
  return 0;
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
   URL ROUTING HELPERS
   ========================================================= */

const BASE_PATH = "/order_now";

function normalizePath(pathname = "") {
  return String(pathname || "")
    .replace(/\/+/g, "/")
    .trim();
}

/*
 * Given any URL outlet segment — either a UUID outletId like
 * "d2006bfc-95df-4925-a617-6d10d06b99bc" or a legacy short code
 * like "jr" / "hck" — return the canonical OUTLET_CONFIG key
 * (e.g. "jr", "hck").
 *
 * Returns the segment unchanged when it is not recognised, so the
 * router stays forward-compatible with future outlets whose config
 * may not yet be present in OUTLET_CONFIG.
 */
function resolveOutletKey(segment = "") {
  const raw = String(segment || "").trim();
  if (!raw) return raw;
  // Fast path: already a known short key
  if (OUTLET_CONFIG[raw.toLowerCase()]) return raw.toLowerCase();
  // Check if it is a recognised outletId UUID
  const mapped = OUTLET_ID_TO_KEY[raw.toLowerCase()];
  if (mapped) return mapped;
  // Unknown segment — return as-is (e.g. a future outlet UUID not yet in config)
  return raw;
}

/*
 * Given an internal outlet key (e.g. "jr"), return the canonical
 * URL segment to use: the outletId UUID when configured, otherwise
 * the key itself as a fallback.
 */
function outletKeyToUrlSegment(key = "") {
  const cfg = OUTLET_CONFIG[String(key || "").toLowerCase()];
  if (cfg?.outletId) return cfg.outletId;
  return key;
}

function parseUrlToScreen(pathname = "") {
  const clean = normalizePath(pathname);

  // Strip BASE_PATH if present
  let sub = clean;
  if (sub.startsWith(BASE_PATH)) {
    sub = sub.slice(BASE_PATH.length);
  }
  // Trim leading/trailing slashes
  sub = sub.replace(/^\/+|\/+$/g, "");

  // If sub is empty or "scan" -> no outlet, scan screen
  if (!sub || sub === "scan") {
    return { outlet: null, screen: "scan", param: "" };
  }

  // Extract segments
  const segments = sub.split("/").filter(Boolean);
  const first = (segments[0] || "").trim();

  // Known top-level screens that don't have an outlet segment prefix
  const NON_OUTLET_SCREEN_NAMES = new Set([
    "scan",
    "menu",
    "home",
    "cart",
    "profile",
    "history",
    "orders",
    "my_orders",
    "location",
    "location-confirmation",
    "confirmation",
    "checkout",
    "payment",
    "upi-payment",
    "payment-success",
    "login",
    "menu-items",
  ]);

  if (NON_OUTLET_SCREEN_NAMES.has(first.toLowerCase())) {
    // Direct URL access without a recognized outlet -> Scan QR screen
    return { outlet: null, screen: "scan", param: "" };
  }

  /*
   * Normalize the raw URL segment to the canonical internal outlet key.
   * This converts UUID-based outlet IDs (e.g. "d2006bfc-95df-4925-a617-6d10d06b99bc")
   * to the internal key ("jr") that the rest of the app uses.
   * Unrecognised segments are passed through unchanged.
   */
  const outlet = resolveOutletKey(first);
  const restSegments = segments.slice(1);
  const subRoute = restSegments.join("/");

  if (!subRoute || subRoute === "menu" || subRoute === "home") {
    return { outlet, screen: "menu", param: "" };
  }

  if (subRoute === "cart") {
    return { outlet, screen: "cart", param: "" };
  }

  if (subRoute === "profile") {
    return { outlet, screen: "profile", param: "" };
  }

  if (subRoute === "my_orders" || subRoute === "history" || subRoute === "orders") {
    return { outlet, screen: "history", param: "" };
  }

  if (subRoute.startsWith("menu-items/")) {
    const code = subRoute.slice("menu-items/".length).trim();
    return { outlet, screen: "menu", param: code, isMenuItemCode: true };
  }

  if (subRoute.startsWith("menu/")) {
    const code = subRoute.slice("menu/".length).trim();
    return { outlet, screen: "product", param: code };
  }

  if (subRoute === "location") {
    return { outlet, screen: LOCATION_ENABLED ? "location" : "menu", param: "" };
  }

  if (subRoute === "location-confirmation" || subRoute === "confirmation" || subRoute === "checkout") {
    return { outlet, screen: (LOCATION_ENABLED || MACHINE_ENABLED) ? "location-confirmation" : "cart", param: "" };
  }

  if (subRoute === "upi-payment" || subRoute === "payment") {
    return { outlet, screen: "upi-payment", param: "" };
  }

  if (subRoute === "payment-success") {
    return { outlet, screen: "payment-success", param: "" };
  }

  if (subRoute === "login") {
    return { outlet, screen: "login", param: "" };
  }

  if (subRoute === "scan") {
    return { outlet, screen: "scan", param: "" };
  }

  return { outlet, screen: "menu", param: "" };
}

function slugifyText(value = "") {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getProductIdentifier(product = {}) {
  if (!product || typeof product !== "object") return "";

  const isUsable = (val) => {
    if (val === undefined || val === null) return false;
    const str = String(val).trim();
    if (!str) return false;
    // Reject pure numeric database IDs like "3", "123", etc.
    if (/^\d+$/.test(str)) return false;
    const lower = str.toLowerCase();
    if (lower === "null" || lower === "undefined" || lower === "juice") return false;
    return true;
  };

  // 1. Check explicit slug/code fields from existing API data
  const explicitCandidates = [
    product.slug,
    product.product_code,
    product.productCode,
    product.menu_item_code,
    product.menuItemCode,
    product.item_code,
    product.itemCode,
    product.code,
    product._legacyItem?.slug,
    product._legacyItem?.product_code,
    product._legacyItem?.productCode,
    product._legacyItem?.menu_item_code,
    product._legacyItem?.menuItemCode,
    product._legacyItem?.item_code,
    product._legacyItem?.itemCode,
    product._legacyItem?.code,
  ];

  for (const candidate of explicitCandidates) {
    if (isUsable(candidate)) {
      return slugifyText(candidate);
    }
  }

  // 2. Check productType from API (e.g. "ginger", "lemon", "plain", "ginger-lemon")
  const productTypeCandidates = [
    product.product_type,
    product.productType,
    product._variant?.product_type,
    product._variant?.productType,
    product._legacyItem?.product_type,
    product._legacyItem?.productType,
  ];

  for (const candidate of productTypeCandidates) {
    if (isUsable(candidate)) {
      return slugifyText(candidate);
    }
  }

  // 3. Fallback to product name / itemName from API data
  const nameCandidates = [
    product.name,
    product.itemName,
    product.productName,
    product._legacyItem?.name,
    product._legacyItem?.itemName,
    product.displayName,
  ];

  for (const candidate of nameCandidates) {
    if (isUsable(candidate)) {
      return slugifyText(candidate);
    }
  }

  return "";
}

function findProductByParam(products = [], param = "") {
  if (!Array.isArray(products) || !param) return null;
  const rawParam = decodeURIComponent(String(param)).trim();
  const normalizedTarget = slugifyText(rawParam);
  const targetLower = rawParam.toLowerCase();

  // Pass 1: Direct identifier match
  const exactIdentifierMatch = products.find((p) => {
    const ident = getProductIdentifier(p);
    return ident && (ident === normalizedTarget || ident.toLowerCase() === targetLower);
  });
  if (exactIdentifierMatch) return exactIdentifierMatch;

  // Pass 2: Check any explicit field (slug, code, productCode, itemCode, productType, name, itemName, etc.)
  const fieldMatch = products.find((p) => {
    const candidates = [
      p.slug,
      p.product_code,
      p.productCode,
      p.menu_item_code,
      p.menuItemCode,
      p.item_code,
      p.itemCode,
      p.code,
      p.product_type,
      p.productType,
      p.name,
      p.itemName,
      p.productName,
      p.displayName,
      p._legacyItem?.slug,
      p._legacyItem?.product_code,
      p._legacyItem?.productCode,
      p._legacyItem?.item_code,
      p._legacyItem?.itemCode,
      p._legacyItem?.code,
    ];
    return candidates.some((val) => {
      if (!val) return false;
      const str = String(val).trim();
      return str.toLowerCase() === targetLower || slugifyText(str) === normalizedTarget;
    });
  });
  if (fieldMatch) return fieldMatch;

  // Pass 3: Semantic flavor matching for canonical juice variants
  const isGingerLemonTarget =
    (normalizedTarget.includes("ginger") && normalizedTarget.includes("lemon")) ||
    (targetLower.includes("ginger") && targetLower.includes("lemon"));

  if (isGingerLemonTarget) {
    const match = products.find((p) => {
      const text = `${p.name || ""} ${p.itemName || ""} ${p.productType || ""} ${p.displayName || ""}`.toLowerCase();
      return text.includes("ginger") && text.includes("lemon");
    });
    if (match) return match;
  }

  if (normalizedTarget === "ginger" || (normalizedTarget.includes("ginger") && !normalizedTarget.includes("lemon"))) {
    const match = products.find((p) => {
      const text = `${p.name || ""} ${p.itemName || ""} ${p.productType || ""} ${p.displayName || ""}`.toLowerCase();
      return text.includes("ginger") && !text.includes("lemon");
    });
    if (match) return match;
  }

  if (normalizedTarget === "lemon" || (normalizedTarget.includes("lemon") && !normalizedTarget.includes("ginger"))) {
    const match = products.find((p) => {
      const text = `${p.name || ""} ${p.itemName || ""} ${p.productType || ""} ${p.displayName || ""}`.toLowerCase();
      return text.includes("lemon") && !text.includes("ginger");
    });
    if (match) return match;
  }

  if (normalizedTarget === "plain" || normalizedTarget.includes("plain") || normalizedTarget.includes("classic")) {
    const match = products.find((p) => {
      const text = `${p.name || ""} ${p.itemName || ""} ${p.productType || ""} ${p.displayName || ""}`.toLowerCase();
      return (
        (text.includes("plain") || text.includes("classic") || text.includes("sugarcane")) &&
        !text.includes("ginger") &&
        !text.includes("lemon")
      );
    });
    if (match) return match;
  }

  // Pass 4: Legacy database ID match (fallback for numeric IDs)
  const legacyIdMatch = products.find((p) => {
    return (
      String(p.id ?? "") === rawParam ||
      String(p.itemId ?? "") === rawParam ||
      String(p.productId ?? "") === rawParam
    );
  });
  if (legacyIdMatch) return legacyIdMatch;

  return null;
}

function getScreenPath(screenName, param = "", outletId = null) {
  if (screenName === "scan" || !outletId) {
    return `${BASE_PATH}/`.replace(/\/+/g, "/");
  }

  /*
   * Convert the internal outlet key (e.g. "jr") to the URL-facing
   * outletId UUID (e.g. "d2006bfc-95df-4925-a617-6d10d06b99bc").
   * For unknown outlet identifiers the value is used as-is.
   */
  const urlSegment = outletKeyToUrlSegment(String(outletId).trim());
  const currentOutlet = encodeURIComponent(urlSegment);

  let sub = "menu";
  switch (screenName) {
    case "menu":
    case "home":
      sub = "menu";
      break;
    case "cart":
      sub = "cart";
      break;
    case "profile":
      sub = "profile";
      break;
    case "history":
      sub = "my_orders";
      break;
    case "product": {
      const safeParam = param && !/^\d+$/.test(String(param).trim()) ? String(param).trim() : "";
      sub = safeParam ? `menu/${encodeURIComponent(safeParam)}` : "menu";
      break;
    }
    case "location":
      sub = LOCATION_ENABLED ? "location" : "menu";
      break;
    case "location-confirmation":
    case "confirmation":
      sub = (LOCATION_ENABLED || MACHINE_ENABLED) ? "location-confirmation" : "cart";
      break;
    case "upi-payment":
      sub = "upi-payment";
      break;
    case "payment-success":
      sub = "payment-success";
      break;
    case "login":
      sub = "login";
      break;
    case "scan":
      return `${BASE_PATH}/`.replace(/\/+/g, "/");
    default:
      sub = "menu";
  }

  return `${BASE_PATH}/${currentOutlet}/${sub}/`.replace(/\/+/g, "/");
}

function isSameRoute(currentPath = "", canonicalPath = "", outlet = null) {
  const normCurrent = normalizePath(currentPath).replace(/^\/+|\/+$/g, "");
  const normCanonical = normalizePath(canonicalPath).replace(/^\/+|\/+$/g, "");
  if (normCurrent.toLowerCase() === normCanonical.toLowerCase()) return true;

  if (outlet) {
    // Build the full set of URL segment aliases for this outlet:
    // both the internal key (e.g. "jr") and the UUID outletId (e.g. "d2006bfc-...")
    const rawOutlet = String(outlet).trim().toLowerCase();
    const uuidSegment = outletKeyToUrlSegment(rawOutlet).toLowerCase();
    const segmentAliases = [...new Set([
      rawOutlet,
      encodeURIComponent(rawOutlet).toLowerCase(),
      uuidSegment,
      encodeURIComponent(uuidSegment).toLowerCase(),
    ])];
    const lowerCurrent = normCurrent.toLowerCase();
    const lowerCanonical = normCanonical.toLowerCase();

    for (const out of segmentAliases) {
      const baseOutlet = `order_now/${out}`;
      const menuOutlet = `order_now/${out}/menu`;
      if (
        (lowerCurrent === baseOutlet && lowerCanonical === menuOutlet) ||
        (lowerCurrent === menuOutlet && lowerCanonical === baseOutlet)
      ) {
        return true;
      }
    }
  }

  if (
    (normCurrent.toLowerCase() === "order_now" && normCanonical.toLowerCase() === "order_now/scan") ||
    (normCurrent.toLowerCase() === "order_now/scan" && normCanonical.toLowerCase() === "order_now")
  ) {
    return true;
  }

  return false;
}

const ITEM_MASTER_API_BASE =
  "https://tptest.juicerobo.com/tporder/api/v1/itemmaster/items";

function getMenuItemCodeFromUrl() {
  try {
    const pathname = window.location.pathname || "";
    const parsed = parseUrlToScreen(pathname);
    if (parsed.isMenuItemCode && parsed.param) {
      return decodeURIComponent(parsed.param).trim();
    }

    const match = pathname.match(
      /\/menu-items\/([^/?#]+)/i
    );

    if (match?.[1]) {
      return decodeURIComponent(
        match[1]
      ).trim();
    }

    const searchParams = new URLSearchParams(
      window.location.search || ""
    );
    const queryCode =
      searchParams.get("menuItemCode") ||
      searchParams.get("menu_item_code") ||
      searchParams.get("item") ||
      searchParams.get("code");

    if (queryCode) {
      return queryCode.trim();
    }

    return "";
  } catch {
    return "";
  }
}

function extractMenuItemsResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }

  if (Array.isArray(payload?.data?.itemMaster)) {
    return payload.data.itemMaster;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.itemMaster)) {
    return payload.itemMaster;
  }

  if (Array.isArray(payload?.result)) {
    return payload.result;
  }

  if (Array.isArray(payload?.result?.items)) {
    return payload.result.items;
  }

  return [];
}

function normalizeMenuItem(item) {
  if (!item || typeof item !== "object") return null;

  const rawVariants = Array.isArray(item.lstVariants)
    ? item.lstVariants
    : Array.isArray(item.variants)
    ? item.variants
    : [];

  const primaryVariant = rawVariants[0] || {};

  const id =
    item.itemId ??
    item.id ??
    primaryVariant.variantId ??
    null;

  const name = String(
    item.itemName ||
    item.name ||
    primaryVariant.variantName ||
    ""
  ).trim();

  const desc = String(
    item.desc ||
    item.description ||
    primaryVariant.variantDesc ||
    ""
  ).trim();

  const rawPrice =
    primaryVariant.unitPrice ??
    primaryVariant.price ??
    item.unitPrice ??
    item.price ??
    0;

  const price = Number(rawPrice) || 0;

  const variants = rawVariants.map((variant) => {
    const vId =
      variant.variantId ??
      variant.id ??
      id;

    const vPrice =
      Number(
        variant.unitPrice ??
        variant.price ??
        price
      ) || 0;

    return {
      ...variant,
      variantId: vId,
      id: vId,
      variantName: String(
        variant.variantName ||
        variant.name ||
        name
      ).trim(),
      variantDesc: String(
        variant.variantDesc ||
        variant.desc ||
        desc
      ).trim(),
      unitPrice: vPrice,
      price: vPrice,
      sizeML: String(
        variant.sizeML ||
        variant.size ||
        name
      ).trim(),
      taxInclusive: Boolean(
        variant.taxInclusive ??
        item.taxInclusive ??
        true
      ),
      taxRate: Number(
        variant.taxRate ??
        item.taxRate ??
        18
      ),
      variantPhoto:
        variant.variantPhoto ||
        variant.photo ||
        item.itemPhoto ||
        item.photo ||
        null,
      quantity: Number(variant.quantity) || 0,
      isAvailable:
        variant.isAvailable !== false &&
        variant.is_available !== false,
    };
  });

  return {
    ...item,
    id,
    itemId: id,
    productId: id,
    name,
    itemName: name,
    displayName: name,
    desc,
    description: desc,
    price,
    unitPrice: price,
    photo:
      item.itemPhoto ||
      item.photo ||
      primaryVariant.variantPhoto ||
      null,
    image:
      item.itemPhoto ||
      item.photo ||
      primaryVariant.variantPhoto ||
      null,
    lstVariants:
      variants.length > 0
        ? variants
        : [
            {
              variantId: id,
              id,
              variantName: name,
              variantDesc: desc,
              unitPrice: price,
              price,
              sizeML: name,
              taxInclusive: true,
              taxRate: 18,
              quantity: 0,
              isAvailable: true,
            },
          ],
    variants:
      variants.length > 0
        ? variants
        : undefined,
    isAvailable:
      item.isAvailable !== false &&
      item.is_available !== false,
  };
}

async function fetchMenuItemsByCode(
  menuItemCode
) {
  const code = String(
    menuItemCode || ""
  ).trim();

  if (!code) {
    throw new Error(
      "Menu item code is missing from the URL."
    );
  }

  const endpoint = `${ITEM_MASTER_API_BASE}/${encodeURIComponent(code)}`;

  console.log(
    "[Juice Robo] MENU ITEM URL CODE:",
    code
  );

  console.log(
    "[Juice Robo] MENU ITEM API:",
    endpoint
  );

  const response = await fetch(
    endpoint,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Menu item API failed (${response.status}).`
    );
  }

  const payload =
    await response.json();

  const rawItems =
    extractMenuItemsResponse(
      payload
    );

  if (!rawItems.length) {
    throw new Error(
      "The menu item API returned no menu items."
    );
  }

  return rawItems
    .map(normalizeMenuItem)
    .filter(Boolean);
}

/* =========================================================
   SCAN QR SCREEN (NO OUTLET ID)
   ========================================================= */

function ScanQRScreen({ isHck = false }) {
  return (
    <main
      className="jr-content jr-page"
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 24px",
        background: "#fbfaf4",
        boxSizing: "border-box",
      }}
    >
      <img
        src={isHck ? HCK_LOGO : juiceRoboLogo}
        alt={isHck ? "HCK Helmet Cleaning" : "Juice Robo"}
        style={{
          width: "220px",
          height: "auto",
          maxWidth: "90%",
          maxHeight: "70px",
          objectFit: "contain",
          marginBottom: "24px",
          borderRadius: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      />
      <div
        style={{
          width: "76px",
          height: "76px",
          borderRadius: "50%",
          background: "#eef8f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          color: "#2f8050",
          boxShadow: "0 6px 16px rgba(47, 128, 80, 0.12)",
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
          <line x1="7" y1="7" x2="7.01" y2="7"></line>
          <line x1="17" y1="17" x2="17.01" y2="7"></line>
          <line x1="7" y1="17" x2="7.01" y2="17"></line>
          <line x1="17" y1="17" x2="17.01" y2="17"></line>
        </svg>
      </div>

      <h1
        style={{
          fontSize: "24px",
          fontWeight: 900,
          color: "#1b2e20",
          margin: "0 0 10px",
          letterSpacing: "-0.02em",
        }}
      >
        {isHck ? "Scan QR to Clean" : "Scan QR to Order"}
      </h1>

      <p
        style={{
          fontSize: "14px",
          lineHeight: 1.6,
          color: "#555",
          maxWidth: "310px",
          margin: "0 0 26px",
        }}
      >
        {isHck
          ? "Please scan the QR code located on the HCK machine to view the services and place your order."
          : "Please scan the QR code located on the Juice Robo machine to view the menu and place your order."}
      </p>

      <div
        style={{
          padding: "16px 20px",
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e8ede6",
          fontSize: "13px",
          color: "#666",
          lineHeight: 1.55,
          maxWidth: "320px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <strong style={{ display: "block", color: "#222", marginBottom: "4px" }}>
          No outlet detected
        </strong>
        The website requires a valid machine QR code to open the menu for that outlet. Please scan again.
      </div>
    </main>
  );
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
  const [menuItemCode] = useState(
    () => getMenuItemCodeFromUrl()
  );

  /*
   * Outlet in URL is the AUTHORITATIVE source of truth.
   * If URL contains /jr/ -> "jr"
   * If URL contains /hck/ -> "hck"
   * If URL has no outlet -> null (overrides any cached outlet data)
   */
  const [outlet, setOutlet] = useState(() => {
    const parsed = parseUrlToScreen(
      typeof window !== "undefined" ? window.location.pathname || "" : ""
    );
    return parsed.outlet || null;
  });

  const isHck =
    String(outlet || "").toLowerCase() === "hck" ||
    String(outlet || "").toLowerCase() === "829f12b5-915d-44c2-9e9d-c024b6572b4a" ||
    (typeof window !== "undefined" &&
      (window.location.pathname.toLowerCase().includes("829f12b5-915d-44c2-9e9d-c024b6572b4a") ||
       window.location.pathname.toLowerCase().includes("/hck")));

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = isHck
        ? "HCK — Helmet Cleaning Service"
        : "Juice Robo";
    }
  }, [isHck]);

  const [loginRedirectTarget, setLoginRedirectTarget] = useState(() => {
    try {
      return sessionStorage.getItem("jr_login_redirect_target") || null;
    } catch {
      return null;
    }
  });

  /*
   * Authentication state
   * --------------------
   * The login API in this project sets `jr_logged_in` to "true".
   * Do NOT require a token here: some valid login responses do not
   * persist a token under the legacy token keys, which previously
   * caused the Profile button to incorrectly send an already logged-in
   * user back to Login.
   *
   * React state is used as the live source of truth after login/logout,
   * while the explicit localStorage flag is used only to restore the
   * session after a page refresh.
   */
  const storedLoggedInFlag =
    localStorage.getItem(
      STORAGE.loggedIn
    );

  const storedAccessToken =
    localStorage.getItem(
      STORAGE.accessToken
    );

  const storedToken =
    localStorage.getItem(
      STORAGE.token
    );

  const [loggedIn, setLoggedIn] =
    useState(
      () =>
        localStorage.getItem(
          STORAGE.loggedIn
        ) === "true"
    );

  /*
   * Public browsing:
   * When an outlet is present, logged-out users start on the Menu so they can browse
   * products before signing in.
   * When NO outlet is in the URL, user starts on the Scan QR screen.
   */
  const [screen, setScreenState] =
    useState(() => {
      const urlRoute = parseUrlToScreen(
        typeof window !== "undefined"
          ? window.location.pathname || ""
          : ""
      );

      // NO OUTLET ID -> Show Scan QR page.
      if (!urlRoute.outlet || urlRoute.screen === "scan") {
        return "scan";
      }

      if (urlRoute.screen) {
        return urlRoute.screen;
      }

      if (
        menuItemCode
      ) {
        return "menu";
      }

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

      if (
        savedScreen === "payment-success" &&
        savedSuccessfulOrder &&
        /^\d{4}$/.test(savedCollectionCode)
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
        ? (LOCATION_ENABLED ? "location" : "menu")
        : "menu";
    });

  function setScreen(nextScreen, options = {}) {
    let resolvedScreen = nextScreen;
    if (resolvedScreen === "location" && !LOCATION_ENABLED) {
      resolvedScreen = "menu";
    }
    if (resolvedScreen === "location-confirmation" && !LOCATION_ENABLED && !MACHINE_ENABLED) {
      resolvedScreen = "cart";
    }

    const { replace = false, productCode = null, skipHistory = false } = options;
    setScreenState(resolvedScreen);

    try {
      localStorage.setItem(
        STORAGE.screen,
        String(resolvedScreen)
      );
    } catch {
      // Ignore storage errors.
    }

    if (skipHistory || typeof window === "undefined") return;

    try {
      const targetPath = getScreenPath(nextScreen, productCode, outlet);
      const search = window.location.search || "";
      const targetUrl = `${targetPath}${search}`;

      if (!isSameRoute(window.location.pathname, targetPath, outlet)) {
        if (replace) {
          window.history.replaceState({ screen: nextScreen, productCode, outlet }, "", targetUrl);
        } else {
          window.history.pushState({ screen: nextScreen, productCode, outlet }, "", targetUrl);
        }
      }
    } catch (e) {
      console.warn("[Juice Robo] History push/replace failed:", e);
    }
  }

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
        outlet
          ? localStorage.getItem(
              STORAGE.location
            ) || ""
          : ""
    );

  const [selectedMachineId, setSelectedMachineId] =
    useState(
      () =>
        outlet
          ? localStorage.getItem(
              STORAGE.machine
            ) || ""
          : ""
    );

  /*
   * Persisted snapshots are used only to restore the UI after a
   * browser/UPI-app round trip. All actual location/machine values
   * still originate from the backend API when available.
   */
  const [selectedLocationSnapshot, setSelectedLocationSnapshot] =
    useState(() =>
      outlet
        ? readJSON(
            "juice_robo_selected_location",
            null
          )
        : null
    );

  const [selectedMachineSnapshot, setSelectedMachineSnapshot] =
    useState(() =>
      outlet
        ? readJSON(
            "juice_robo_selected_machine",
            null
          )
        : null
    );

  const [cart, setCart] =
    useState(() => {
      const parsed = parseUrlToScreen(
        typeof window !== "undefined"
          ? window.location.pathname || ""
          : ""
      );
      return readCart(
        getStoredUser(),
        parsed.outlet || ""
      );
    });

  const [selectedHckPackage, setSelectedHckPackage] = useState(null);

  const safeCart =
    useMemo(
      () =>
        isHck
          ? (selectedHckPackage ? [makeCartItem(selectedHckPackage, null, 1)] : [])
          : normalizeCart(cart),
      [cart, isHck, selectedHckPackage]
    );

  const handleToggleHckPackage = useCallback(
    (pkg) => {
      if (!isHck) return;
      setSelectedHckPackage((prev) => {
        const isSame = isSamePackage(prev, pkg);
        const next = isSame ? null : pkg;
        const nextCart = next ? [makeCartItem(next, null, 1)] : [];
        setCart(nextCart);
        writeCart(user || {}, nextCart, outlet);
        return next;
      });
    },
    [isHck, user, outlet]
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
      () => Boolean(outlet) && loggedIn
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
      ) ||
      readSessionJSON(
        "juice_robo_payment_session",
        null
      )
    );

  const [paymentStatus, setPaymentStatus] =
    useState(() =>
      (readJSON(
        "juice_robo_payment_session",
        null
      ) ||
      readSessionJSON(
        "juice_robo_payment_session",
        null
      ))
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
     URL SYNCHRONIZATION & ROUTING LIFECYCLE
     ======================================================= */

  // 1. Initial URL canonicalization
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentPath = normalizePath(window.location.pathname || "");
    const parsed = parseUrlToScreen(currentPath);
    const targetOutlet = parsed.outlet || outlet || null;
    const targetScreen = (!targetOutlet || parsed.screen === "scan") ? "scan" : (parsed.screen || screen || "menu");
    const canonical = getScreenPath(targetScreen, parsed.param, targetOutlet);
    const search = window.location.search || "";
    if (!isSameRoute(currentPath, canonical, targetOutlet)) {
      window.history.replaceState({ screen: targetScreen, productCode: parsed.param, outlet: targetOutlet }, "", `${canonical}${search}`);
    }
  }, []);

  // 2. Synchronize URL on screen, selectedProduct, and outlet changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE.screen,
        String(screen)
      );
    } catch {}

    try {
      const currentParsed = parseUrlToScreen(window.location.pathname || "");
      const currentIdentifier = selectedProduct ? getProductIdentifier(selectedProduct) : null;
      if (
        currentParsed.screen !== screen ||
        currentParsed.outlet !== outlet ||
        (screen === "product" && currentParsed.param !== currentIdentifier)
      ) {
        const productCode = screen === "product" ? currentIdentifier : null;
        const targetPath = getScreenPath(screen, productCode, outlet);
        const search = window.location.search || "";
        if (!isSameRoute(window.location.pathname, targetPath, outlet)) {
          window.history.replaceState({ screen, productCode, outlet }, "", `${targetPath}${search}`);
        }
      }
    } catch (e) {
      console.warn("[Juice Robo] URL sync failed:", e);
    }
  }, [screen, selectedProduct, outlet]);

  // 3. Browser Back / Forward (popstate) handling
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handlePopState() {
      const parsed = parseUrlToScreen(window.location.pathname || "");
      const newOutlet = parsed.outlet || null;
      const targetScreen = (!newOutlet || parsed.screen === "scan") ? "scan" : (parsed.screen || "menu");

      if (newOutlet !== outlet) {
        setOutlet(newOutlet);
      }
      setScreenState(targetScreen);
      try {
        localStorage.setItem(STORAGE.screen, targetScreen);
      } catch {}

      if (targetScreen === "product" && parsed.param) {
        const found = findProductByParam(products, parsed.param);
        if (found) {
          setSelectedProduct(found);
          const variants = Array.isArray(found?.lstVariants)
            ? found.lstVariants
            : Array.isArray(found?.variants)
            ? found.variants
            : [];
          setSelectedVariant(variants[0] || null);
          const cartQty = getCartQuantityForProduct(safeCart, found, variants[0] || null);
          setQuantity(cartQty > 0 ? cartQty : 1);
        }
      } else if (targetScreen !== "product") {
        setSelectedProduct(null);
        setSelectedVariant(null);
      }

      if (targetScreen === "history" && loggedIn) {
        api
          .orders()
          .then((backendOrders) => {
            if (Array.isArray(backendOrders)) {
              setHistoryOrders(backendOrders.filter(Boolean));
            }
          })
          .catch(() => {});
      }
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [products, loggedIn, safeCart, outlet]);

  // 4. Outlet switch handler: clears stale products, switches cart, loads new menu
  const prevOutletRef = useRef(outlet);
  useEffect(() => {
    const prevOutlet = prevOutletRef.current;
    if (prevOutlet !== outlet) {
      console.log(`[Juice Robo] Outlet switched from ${prevOutlet} to ${outlet}`);
      prevOutletRef.current = outlet;

      // Clear stale products immediately
      setProducts([]);
      setSelectedProduct(null);
      setSelectedVariant(null);

      // Load cart for the new outlet to prevent cross-contamination
      const newOutletCart = outlet ? readCart(user, outlet) : [];
      setCart(newOutletCart);

      // Load menu for the new outlet
      if (outlet) {
        loadMenuForOutlet(outlet)
          .then((items) => {
            if (Array.isArray(items)) {
              setProducts(items);
            }
          })
          .catch((err) => {
            console.warn("[Juice Robo] Outlet menu load failed:", err);
          });
      }
    }
  }, [outlet]);

  // 4. Auto-open product if initial URL was a product URL or on refresh
  useEffect(() => {
    if (!products.length || typeof window === "undefined") return;
    const parsed = parseUrlToScreen(window.location.pathname || "");
    if (
      parsed.screen === "product" &&
      parsed.param &&
      (!selectedProduct || getProductIdentifier(selectedProduct) !== parsed.param)
    ) {
      const found = findProductByParam(products, parsed.param);
      if (found) {
        openProduct(found);
      }
    }
  }, [products]);

  /* =======================================================
     SESSION EXPIRATION MANAGEMENT
     ======================================================= */

  function handleSessionExpiry(reason = "Session expired") {
    console.warn("[Juice Robo] Genuine session expiration detected:", reason);
    setLoggedIn(false);
    setUser({});
    setCart([]);

    // Clear stored session and auth tokens
    localStorage.removeItem(STORAGE.loggedIn);
    localStorage.removeItem(STORAGE.token);
    localStorage.removeItem(STORAGE.accessToken);
    localStorage.removeItem(STORAGE.user);
    localStorage.removeItem(STORAGE.legacyUser);
    localStorage.removeItem("_token");
    localStorage.removeItem("juice_robo_logged_in");
    localStorage.removeItem("juice_robo_token");
    localStorage.removeItem("juice_robo_access_token");
    localStorage.removeItem("access_token");

    // Clear cart data belonging to the expired session
    localStorage.removeItem("jr_cart");
    localStorage.removeItem("juice_robo_cart");
    localStorage.removeItem(cartKey(user));
    localStorage.removeItem(STORAGE.backendCartId);
    localStorage.removeItem("juice_robo_backend_cart_id");

    setBusy(false);

    // Return user to menu
    setScreen("menu", { replace: true });

    // Show appropriate user message
    showToast("Your session has expired. Please add your items again.");
  }

  useEffect(() => {
    const unsub = onSessionExpired((reason) => {
      handleSessionExpiry(reason);
    });

    const handleExpiredEvent = (e) => {
      handleSessionExpiry(e?.detail?.reason);
    };
    window.addEventListener("juice-robo:session-expired", handleExpiredEvent);

    // Startup check: if flagged as logged in but stored token is an expired JWT
    if (loggedIn) {
      const token =
        localStorage.getItem(STORAGE.token) ||
        localStorage.getItem(STORAGE.accessToken) ||
        localStorage.getItem("juice_robo_access_token") ||
        localStorage.getItem("access_token");
      if (token && !isTokenValid(token)) {
        handleSessionExpiry("Stored token expired");
      }
    }

    return () => {
      unsub();
      window.removeEventListener("juice-robo:session-expired", handleExpiredEvent);
    };
  }, [loggedIn]);

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

  /* -------------------------------------------------------
     CART ITEM COUNT
     ------------------------------------------------------- */

  const cartCount =
    useMemo(
      () =>
        isHck
          ? 0
          : safeCart.reduce(
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
      [safeCart, isHck]
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

          const dynamicImage =
            resolveProductImage(
              matchingProduct,
              matchingVariant
            );

          return {
            ...backendItem,
            ...hydrated,
            image: dynamicImage,
            image_url: dynamicImage,
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

        const dynamicImage =
          resolveProductImage(
            backendItem
          );

        return {
          ...backendItem,
          image: dynamicImage,
          image_url: dynamicImage,
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

    const resolvedFallback = resolveOutletLocationAndMachine(locations, outlet);
    const effectiveLocation = selectedLocation || resolvedFallback.location;

    const storeId =
      effectiveLocation?.storeId ||
      effectiveLocation?.store_id ||
      effectiveLocation?.id ||
      selectedLocationId ||
      resolvedFallback.locationId;

    /*
     * Only pass a UUID-shaped location identifier to the API.
     * Never pass storeId (for example 200) as locId.
     *
     * api.addCart() performs the final authoritative UUID resolution
     * if this selected-location snapshot does not contain the UUID.
     */
    const locationUuidCandidates = [
      effectiveLocation?.locId,
      effectiveLocation?.locationId,
      effectiveLocation?.location_id,
      effectiveLocation?.locationUuid,
      effectiveLocation?.uuid,
      resolvedFallback.location?.locId,
    ];

    const locationUuid =
      locationUuidCandidates
        .map((value) => String(value ?? "").trim())
        .find((value) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
        ) || "";

    if (!storeId && LOCATION_ENABLED) {
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
      location: effectiveLocation,
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
    /*
     * Show the history screen immediately.
     * Profile -> My Orders updates URL to /order_now/my_orders/
     */
    setScreen("history");

    if (!loggedIn) {
      return;
    }

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

    // Only fetch location data when the feature is enabled
    if (!LOCATION_ENABLED) {
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
      if (!outlet) {
        console.log(
          "[Juice Robo] No outlet in URL - skipping initial data load"
        );
        setLoading(false);
        setProducts([]);
        setSelectedLocationId("");
        setSelectedMachineId("");
        setSelectedLocationSnapshot(null);
        setSelectedMachineSnapshot(null);
        return;
      }

      console.log(
        "[Juice Robo] STARTING INITIAL DATA LOAD FOR OUTLET:",
        outlet
      );

      setLoading(true);
      setError("");

      try {
        /* =================================================
           1. RESOLVE LOCATION & MACHINE (SINGLE MACHINE AT 1 LOCATION)
           ================================================= */
        let safeLocations = [];

        try {
          const loadedLocations = await api.locations();
          if (Array.isArray(loadedLocations)) {
            safeLocations = loadedLocations;
          }
        } catch (locErr) {
          console.warn("[Juice Robo] Location fetch failed, using outlet config fallback:", locErr);
        }

        if (cancelled) {
          return;
        }

        const resolved = resolveOutletLocationAndMachine(safeLocations, outlet);
        const matchedLocation = resolved.location;
        const locationId = resolved.locationId;

        setLocations(safeLocations.length ? safeLocations : [matchedLocation]);
        setSelectedLocationId(locationId);
        setSelectedLocationSnapshot(matchedLocation);
        localStorage.setItem(STORAGE.location, locationId);
        writeJSON("juice_robo_selected_location", matchedLocation);
        if (matchedLocation.locId) {
          localStorage.setItem("juice_robo_location_uuid", matchedLocation.locId);
        }

        setLoading(false);

        /* =================================================
           2. LOAD PRODUCTS + MACHINES IN PARALLEL
           ================================================= */
        const outletTarget = String(outlet).toLowerCase();
        const config = OUTLET_CONFIG[outletTarget];
        const outletMenuUuid = config?.menuLocationId || "";
        const locationMenuUuid = resolveMenuCodeForLocation(matchedLocation);
        const requestedCode = menuItemCode || outletMenuUuid || locationMenuUuid;

        const productPromise = requestedCode
          ? fetchMenuItemsByCode(requestedCode)
          : loadMenuForLocation(matchedLocation, menuItemCode);

        const machinePromise = api.machines(safeLocations.length ? safeLocations : [matchedLocation])
          .catch(() => [resolved.machine]);

        const [productResult, machineResult] = await Promise.allSettled([
          productPromise,
          machinePromise,
        ]);

        if (cancelled) {
          return;
        }

        if (productResult.status === "fulfilled") {
          const loadedProducts = Array.isArray(productResult.value)
            ? productResult.value
            : [];
          setProducts(loadedProducts);
        } else {
          console.warn("[Juice Robo] Product loading failed:", productResult.reason);
          setProducts([]);
        }

        let loadedMachines = [];
        if (machineResult.status === "fulfilled" && Array.isArray(machineResult.value) && machineResult.value.length) {
          loadedMachines = machineResult.value;
        } else {
          loadedMachines = [resolved.machine];
        }

        setMachines(loadedMachines);

        const savedMachineId = localStorage.getItem(STORAGE.machine) || "";
        const existingMachine = loadedMachines.find(
          (m) => String(m?.id) === String(savedMachineId)
        ) || loadedMachines.find(
          (m) => String(m?.id) === String(locationId) || String(m?.location_id) === String(locationId)
        ) || loadedMachines[0] || resolved.machine;

        const finalMachineId = String(existingMachine.id);
        setSelectedMachineId(finalMachineId);
        setSelectedMachineSnapshot(existingMachine);
        localStorage.setItem(STORAGE.machine, finalMachineId);
        writeJSON("juice_robo_selected_machine", existingMachine);

        console.log("[Juice Robo] INITIAL DATA LOAD COMPLETE (auto-selected 1 location & 1 machine):", {
          locationId,
          machineId: finalMachineId,
        });

        console.log("[Juice Robo] INITIAL DATA LOAD COMPLETE");
      } catch (loadError) {
        if (cancelled) return;
        console.error("[Juice Robo] Initial data load failed:", loadError);
        setError(errorText(loadError) || "Unable to load Juice Robo data.");
        setLoading(false);
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [
    loggedIn,
    outlet,
    menuItemCode,
  ]);

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

      // Keep the profile button in the authenticated state immediately.
      setLoggedIn(true);

      /*
       * Preserve items that were added while logged out. Merge the
       * guest cart into the user's existing local cart instead of
       * discarding it at login.
       */
      const guestCart = getGuestCart(outlet, cart);
      console.log("[Juice Robo] Preserving guest cart at login:", guestCart);

      const existingUserCart = readCart(loggedUser, outlet);

      let backendUserCart = [];
      try {
        const backendResp = await api.cart();
        const rawBackendItems = extractBackendCartItems(backendResp);
        backendUserCart = hydrateBackendCartItems(rawBackendItems);
      } catch (backendErr) {
        console.warn("[Juice Robo] Backend cart check during login:", backendErr);
      }

      const combinedUserCart = mergeCarts(existingUserCart, backendUserCart);
      const mergedLoginCart = guestCart.length > 0
        ? mergeCarts(combinedUserCart, guestCart)
        : combinedUserCart;

      console.log("[Juice Robo] Final merged cart at login:", mergedLoginCart);

      setCart(mergedLoginCart);

      /* Move the guest cart into the authenticated local scope. */
      writeCart(loggedUser, mergedLoginCart, outlet);
      clearGuestCart(outlet);

      setHistoryOrders(
        readOrders(
          loggedUser
        )
      );

      let loadedLocations = [];
      try {
        const apiLocs = await api.locations();
        if (Array.isArray(apiLocs)) loadedLocations = apiLocs;
      } catch (locErr) {
        console.warn("[Juice Robo] Login locations fetch failed:", locErr);
      }

      const resolved = resolveOutletLocationAndMachine(loadedLocations, outlet);
      const matchedLocation = resolved.location;
      const nextLocationId = resolved.locationId;

      setLocations(loadedLocations.length ? loadedLocations : [matchedLocation]);
      setSelectedLocationId(nextLocationId);
      setSelectedLocationSnapshot(matchedLocation);
      localStorage.setItem(STORAGE.location, nextLocationId);
      writeJSON("juice_robo_selected_location", matchedLocation);
      if (matchedLocation.locId) {
        localStorage.setItem("juice_robo_location_uuid", matchedLocation.locId);
      }

      /*
       * Always load the redesigned website menu from the
       * authoritative Item Master endpoint.
       */
      const loadedProducts =
        await loadMenuForLocation(
          matchedLocation,
          menuItemCode
        );

      setProducts(
        Array.isArray(loadedProducts)
          ? loadedProducts
          : []
      );

      let loadedMachines = [];
      try {
        const apiMachines = await api.machines(loadedLocations.length ? loadedLocations : [matchedLocation]);
        if (Array.isArray(apiMachines) && apiMachines.length) loadedMachines = apiMachines;
      } catch (mErr) {
        console.warn("[Juice Robo] Login machines fetch failed:", mErr);
      }

      const matchedMachine = loadedMachines.find(
        (m) => String(m?.id) === String(nextLocationId) || String(m?.location_id) === String(nextLocationId)
      ) || loadedMachines[0] || resolved.machine;

      const finalMachineId = String(matchedMachine.id);
      setMachines(loadedMachines.length ? loadedMachines : [matchedMachine]);
      setSelectedMachineId(finalMachineId);
      setSelectedMachineSnapshot(matchedMachine);
      localStorage.setItem(STORAGE.machine, finalMachineId);
      writeJSON("juice_robo_selected_machine", matchedMachine);

      const destinationScreen =
        loginRedirectTarget === "cart" ? "cart" : "menu";
      setLoginRedirectTarget(null);
      try {
        sessionStorage.removeItem("jr_login_redirect_target");
      } catch {}

      setScreen(
        destinationScreen
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
    // Update React authentication state first so no authenticated
    // screen remains active while the local session is being cleared.
    setLoggedIn(false);

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
    clearGuestCart(outlet);
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
     LOCATION -> MENU RESOLUTION
     ======================================================= */

  function resolveMenuCodeForLocation(location) {
    /*
     * The outlet API currently identifies these two test outlets by
     * their visible outlet/machine names, while the Item Master uses
     * separate UUIDs.  Resolve HCK/JR here so /order_now/ can remain
     * the single standard entry URL.
     */
    const locationText = [
      location?.storeName,
      location?.name,
      location?.outletName,
      location?.locationName,
      location?.machineName,
      location?.description,
      location?.locAddress,
    ]
      .map((value) => String(value ?? "").trim().toLowerCase())
      .filter(Boolean)
      .join(" ");

    if (/(^|\s)hck(\s|$)/i.test(locationText)) {
      return "829f12b5-915d-44c2-9e9d-c024b6572b4a";
    }

    if (/(^|\s)jr(\s|$)/i.test(locationText)) {
      return "f9eef7a2-bbf5-4a98-a1ce-ceb69b171996";
    }

    const candidates = [
      location?.menuItemCode,
      location?.menu_item_code,
      location?.menuLocationId,
      location?.menu_location_id,
      location?.menuLocationUUID,
      location?.menuLocationUuid,
      location?.menu_location_uuid,
      location?.itemMasterLocationId,
      location?.item_master_location_id,
      location?.itemMasterLocationUuid,
      location?.item_master_location_uuid,
      location?.itemMasterId,
      location?.item_master_id,
      location?.menuId,
      location?.menu_id,
      location?.menuUuid,
      location?.menu_uuid,
      location?.menu?.id,
      location?.menu?.uuid,
      location?.menu?.menuItemCode,
      location?.menu?.menuLocationId,
      location?.itemMaster?.id,
      location?.itemMaster?.uuid,
      location?.itemMaster?.menuLocationId,
    ];

    return candidates
      .map((value) => String(value ?? "").trim())
      .find((value) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
      ) || "";
  }

  async function loadMenuForLocation(location, explicitCode = "") {
    const locationMenuCode = resolveMenuCodeForLocation(location);
    const requestedCode =
      String(locationMenuCode || explicitCode || "").trim();

    /*
     * A menuItemCode in the URL represents the QR/menu entry that
     * opened the site. It has highest priority. Otherwise the
     * selected outlet's own menu UUID is used.
     */
    if (requestedCode) {
      return fetchMenuItemsByCode(requestedCode);
    }

    return api.menuItems(
      "",
      location
    );
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

      /*
       * The menu is sourced from the same authoritative Item Master
       * endpoint used by the initial application load.
       */
      const loadedProducts =
        await loadMenuForLocation(
          location,
          menuItemCode
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

  async function loadMenuForOutlet(targetOutlet) {
    if (!targetOutlet) return [];
    const targetKey = String(targetOutlet).toLowerCase();
    const config = OUTLET_CONFIG[targetKey];
    const uuid = config?.menuLocationId;
    if (uuid) {
      return fetchMenuItemsByCode(uuid);
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetOutlet)) {
      return fetchMenuItemsByCode(targetOutlet);
    }
    return api.menuItems("", { outlet: targetOutlet, storeId: targetOutlet, id: targetOutlet });
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

    const nextOutletId = String(
      location?.storeId ??
        location?.id ??
        location?.store_id ??
        location?.locId ??
        id
    ).trim();

    if (nextOutletId && nextOutletId !== outlet) {
      setOutlet(nextOutletId);
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
    if (LOCATION_ENABLED && !selectedLocationId) {
      showToast(
        "Select a collection location"
      );
      return;
    }

    if (MACHINE_ENABLED && !selectedMachineId) {
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
    if (!product) return;

    setSelectedProduct(
      product
    );

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

    const firstVariant =
      variants[0] || null;

    setSelectedVariant(
      firstVariant
    );

    const cartQty = getCartQuantityForProduct(safeCart, product, firstVariant);
    setQuantity(cartQty > 0 ? cartQty : 1);

    const productCode = getProductIdentifier(product);

    setScreen(
      "product",
      { productCode }
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

    setScreen(
      "menu"
    );
  }

  async function addProductToCart(
    product,
    variant,
    nextQuantity = 1,
    options = {}
  ) {
    try {
      setBusy(true);
      setError("");

      const clampedQty = Math.min(
        Math.max(1, Math.floor(Number(nextQuantity) || 1)),
        9
      );

      const item =
        makeCartItem(
          product,
          variant,
          clampedQty
        );

      const currentCart =
        normalizeCart(
          cart
        );

      const existingItem =
        findCartItemForProduct(
          currentCart,
          product,
          variant || item._variant
        );

      const nextCart =
        existingItem
          ? currentCart.map((entry) =>
              entry === existingItem
                ? {
                    ...entry,
                    ...item,
                    quantity: clampedQty,
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
        writeCart({}, nextCart, outlet);

        if (!options?.keepOpen) {
          closeProduct();
          setScreen(
            "menu"
          );
        }

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
      writeCart(user || {}, savedCart, outlet);

      if (!options?.keepOpen) {
        closeProduct();
        setScreen(
          "menu"
        );
      }
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
    nextQuantity,
    options = {}
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
      actualQuantity,
      options
    );
  }

  function cartItemMatchesId(item, targetId) {
    if (!item || targetId === undefined || targetId === null || targetId === "") return false;
    const tid = String(targetId).trim();
    if (!tid) return false;

    // Match exact cart item ID or variant ID first
    if (item.id !== undefined && item.id !== null && String(item.id).trim() === tid) return true;
    if (item.variantId !== undefined && item.variantId !== null && String(item.variantId).trim() === tid) return true;
    if (item._variant?.variantId !== undefined && item._variant?.variantId !== null && String(item._variant?.variantId).trim() === tid) return true;
    if (item._variant?.id !== undefined && item._variant?.id !== null && String(item._variant?.id).trim() === tid) return true;

    // Match product IDs
    if (item.productId !== undefined && item.productId !== null && String(item.productId).trim() === tid) return true;
    if (item.itemId !== undefined && item.itemId !== null && String(item.itemId).trim() === tid) return true;

    return false;
  }

  async function updateQuantity(
    productId,
    nextQuantity
  ) {
    const rawValue =
      Number(
        nextQuantity
      );

    if (
      !Number.isFinite(
        rawValue
      )
    ) {
      return;
    }

    if (rawValue <= 0) {
      await removeProduct(
        productId
      );
      return;
    }

    const value = Math.min(
      Math.max(1, Math.floor(rawValue)),
      9
    );

    const currentCart =
      normalizeCart(
        cart
      );

    const targetItem = currentCart.find((item) => cartItemMatchesId(item, productId));

    if (!targetItem) {
      return;
    }

    const nextCart = currentCart.map((item) =>
      item === targetItem
        ? {
            ...item,
            quantity: value,
          }
        : item
    );

    if (!loggedIn) {
      setCart(nextCart);
      writeCart({}, nextCart, outlet);
      return;
    }

    try {
      setBusy(true);
      setError("");

      /* Authenticated quantity editing uses the Juice Robo cart API. */
      const savedCart =
        await saveCartToBackend(nextCart);

      setCart(savedCart);
      writeCart(user || {}, savedCart, outlet);

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
          !cartItemMatchesId(item, productId)
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
      writeCart(user || {}, [], outlet);
      return;
    }

    if (!loggedIn) {
      setCart(nextCart);
      writeCart(user || {}, nextCart, outlet);
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

  }

  /* =======================================================
     OPEN CART — BACKEND SOURCE OF TRUTH
     ======================================================= */

  async function openCart() {
    if (isHck) {
      return;
    }

    /*
     * Cart is public. Guests see and edit their local cart.
     * Authenticated users load the current cart from the Juice Robo
     * cart API so the backend remains the source of truth.
     */
    if (!loggedIn) {
      if (!Array.isArray(cart) || cart.length === 0) {
        const loaded = readCart(user || {}, outlet);
        if (Array.isArray(loaded) && loaded.length > 0) {
          setCart(loaded);
        }
      }

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

      if (Array.isArray(backendCart) && backendCart.length > 0) {
        setCart(backendCart);
      } else if (!Array.isArray(cart) || cart.length === 0) {
        const local = readCart(user || {}, outlet);
        if (Array.isArray(local) && local.length > 0) {
          setCart(local);
        }
      }
      setScreen("cart");
    } catch (cartError) {
      console.error(
        "[Juice Robo] Unable to open backend cart:",
        cartError
      );

      const message =
        errorText(cartError) ||
        "Unable to load your cart.";

      if (!Array.isArray(cart) || cart.length === 0) {
        const local = readCart(user || {}, outlet);
        if (Array.isArray(local) && local.length > 0) {
          setCart(local);
        }
      }
      setScreen("cart");
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     CHECKOUT
     ======================================================= */

  function startCheckout() {
    if (!loggedIn) {
      setLoginRedirectTarget("cart");
      try {
        sessionStorage.setItem("jr_login_redirect_target", "cart");
      } catch {}
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

    // Feature-flag fast path:
    // When both Location and Machine are disabled, skip all selection
    // screens and proceed directly to payment.
    if (!LOCATION_ENABLED && !MACHINE_ENABLED) {
      proceedToPayment();
      return;
    }

    const hasExactlyOneLocationAndMachine =
      locations.length === 1 &&
      machines.length === 1;

    if (hasExactlyOneLocationAndMachine) {
      // The API exposes only one possible collection option.
      // Keep the selected values and do not show a chooser.
      if (!selectedLocationId) {
        const onlyLocation = locations[0];
        const onlyLocationId = String(
          onlyLocation?.id ??
            onlyLocation?.storeId ??
            onlyLocation?.store_id ??
            onlyLocation?.locId ??
            onlyLocation?.locationId ??
            onlyLocation?.location_id ??
            ""
        );
        if (onlyLocationId) {
          setSelectedLocationId(onlyLocationId);
          setSelectedLocationSnapshot(onlyLocation);
          localStorage.setItem(STORAGE.location, onlyLocationId);
        }
      }

      if (!selectedMachineId) {
        const onlyMachine = machines[0];
        const onlyMachineId = String(onlyMachine?.id ?? "");
        if (onlyMachineId) {
          setSelectedMachineId(onlyMachineId);
          setSelectedMachineSnapshot(onlyMachine);
          localStorage.setItem(STORAGE.machine, onlyMachineId);
        }
      }

      if (selectedLocationId && selectedMachineId) {
        proceedToPayment();
      } else {
        // Data has not finished resolving yet; keep checkout safe.
        setScreen("location-confirmation");
      }
      return;
    }

    // Multiple/no confirmed choices: ask for location + machine here,
    // at checkout, rather than in the top navigation or before browsing.
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
      latestOrder?.data?.collection_code,
      latestOrder?.data?.collectionCode,
      latestOrder?.data?.orderPin,
      latestOrder?.data?.order_pin,

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
      verified?.data?.order?.collection_code,
      verified?.data?.order?.collectionCode,
      verified?.data?.order?.orderPin,

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
          (value) => {
            if (!value) return "";
            const exact =
              value.match(/^(?:\D*?)(\d{4})(?:\D*)$/)?.[1] ||
              value.match(/\b(\d{4})\b/)?.[1];
            if (exact) return exact;
            if (/^\d{1,3}$/.test(value)) return value.padStart(4, "0");
            return "";
          }
        )
        .find(
          (value) =>
            /^\d{4}$/.test(value)
        ) || "";

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
      sessionStorage.setItem("jr_collection_code", code);

      sessionStorage.setItem(
        "jr_order_id",
        String(mergedOrder.orderId)
      );

      sessionStorage.setItem(
        "jr_backend_cart_id",
        String(mergedOrder.cartId)
      );

      sessionStorage.setItem(
        "jr_payment_status",
        "paid"
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

      sessionStorage.setItem(
        "jr_payment_success",
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
      writeJSON(
        "jr_payment_success",
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

    if (LOCATION_ENABLED && !selectedLocationId) {
      showToast(
        "Please select a collection location"
      );
      setScreen("location");
      return;
    }

    if (MACHINE_ENABLED && !selectedMachineId) {
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

      const resolved = resolveOutletLocationAndMachine(locations, outlet);
      const effectiveLocation = selectedLocation || resolved.location;
      const effectiveMachine = selectedMachine || resolved.machine;

      /*
      * Create the Juice Robo order first. This is order creation,
      * not payment confirmation.
      */
      const created = await api.createOrder({
        storeId:
          effectiveLocation?.storeId ||
          effectiveLocation?.id ||
          resolved.locationId,

        /*
         * Only a real UUID is allowed here. If the selected outlet
         * snapshot does not contain it, api.createOrder()/api.addCart()
         * resolves it from authoritative backend data.
         *
         * Never use storeId (for example 200) as locId.
         */
        locId: [
          effectiveLocation?.locId,
          effectiveLocation?.locationId,
          effectiveLocation?.location_id,
          effectiveLocation?.locationUuid,
          effectiveLocation?.uuid,
          resolved.location?.locId,
        ]
          .map((value) => String(value ?? "").trim())
          .find((value) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
          ) || "",

        location:
          effectiveLocation,

        locationId:
          effectiveLocation?.id || resolved.locationId,

        machineId:
          effectiveMachine?.id || resolved.machineId,

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
     STARTUP ERROR
     ======================================================= */

  if (error && !locations.length && !products.length) {
    return (
      <div className="jr-app">
        <DesktopBlocker isHck={isHck} />
        <div className="jr-mobile-frame">
          <div className="jr-loading" style={{ padding: "32px 22px", textAlign: "center" }}>
            <img
              src={isHck ? HCK_LOGO : juiceRoboLogo}
              alt={isHck ? "HCK Helmet Cleaning" : "Juice Robo"}
              className="jr-loading-image"
              style={{
                width: "260px",
                height: "auto",
                maxWidth: "90%",
                maxHeight: "80px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto 20px",
              }}
            />
            <h2 style={{ margin: "0 0 10px" }}>
              {isHck ? "Unable to load cleaning services" : "Unable to load Juice Robo"}
            </h2>
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
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <div className="jr-app">
        <DesktopBlocker isHck={isHck} />
        <div className="jr-mobile-frame">
          <div className="jr-loading">
            <img
              src={isHck ? HCK_LOGO : juiceRoboLogo}
              alt={isHck ? "HCK Helmet Cleaning" : "Juice Robo"}
              className="jr-loading-image"
              style={{
                width: "280px",
                height: "auto",
                maxWidth: "90%",
                maxHeight: "90px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />

            <div className="jr-loader" />

            <p>
              {isHck ? "Loading helmet cleaning services..." : "Loading Juice Robo…"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     SCAN QR SCREEN (NO OUTLET DETECTED)
     ======================================================= */

  if (screen === "scan" || !outlet) {
    return (
      <div className="jr-app">
        <DesktopBlocker isHck={isHck} />
        <div className="jr-mobile-frame">
          <ScanQRScreen isHck={isHck} />

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
     LOGIN
     ======================================================= */

  if (screen === "login") {
    return (
      <div className="jr-app">
        <DesktopBlocker isHck={isHck} />
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
            isHck={
              isHck
            }
            onContinueWithoutLogin={() => {
              const target =
                loginRedirectTarget === "cart" ? "cart" : "menu";
              setLoginRedirectTarget(null);
              try {
                sessionStorage.removeItem("jr_login_redirect_target");
              } catch {}
              setScreen(target);
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
      <DesktopBlocker isHck={isHck} />
      <div className="jr-mobile-frame">

        {/* ===================================================
            HEADER
           =================================================== */}

        <Header
          cartCount={cartCount}
          onCart={openCart}
          isHck={isHck}
          onProfile={() => {
            setScreen("profile");
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

              loggedIn={
                loggedIn
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
              isHck={isHck}
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

              money={
                money
              }
            />
          )}

          {/* =================================================
              LOCATION / MACHINE
             ================================================= */}

          {screen === "location" && (
            LOCATION_ENABLED ? (
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
            ) : (
              // LOCATION_ENABLED=0: silently redirect away from the
              // location screen so it is never visible to the user.
              (() => { setTimeout(() => setScreen("menu"), 0); return null; })()
            )
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

              showLocation={Boolean(LOCATION_ENABLED)}
              isHck={isHck}

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

              onProfile={() => {
                console.log(
                  "[Juice Robo] Home profile action:",
                  { loggedIn }
                );

                setScreen(
                  loggedIn
                    ? "profile"
                    : "login"
                );
              }}
            />
          )}

          {/* =================================================
              MENU
             ================================================= */}

          {(screen === "menu" || screen === "product") && (
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

              isHck={
                isHck
              }

              selectedHckPackage={
                selectedHckPackage
              }

              onToggleHckPackage={
                handleToggleHckPackage
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

              cart={
                safeCart
              }

              onUpdate={
                updateQuantity
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

              onClose={closeProduct}

              onBack={() => {
                closeProduct();

                setScreen(
                  "menu"
                );
              }}

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

              formatMoney={
                money
              }

              money={
                productMoney
              }

              isHck={
                isHck
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

              showLocation={Boolean(LOCATION_ENABLED)}

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

              isHck={
                isHck
              }
            />
          )}

          {/* =================================================
              LOCATION CONFIRMATION
             ================================================= */}

          {screen === "location-confirmation" && (
            (!LOCATION_ENABLED && !MACHINE_ENABLED)
              // Both disabled: redirect straight to payment without rendering
              // the confirmation screen.
              ? (() => { setTimeout(() => proceedToPayment(), 0); return null; })()
              : (
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
              )
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

              isHck={
                isHck
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
              isHck={
                isHck
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

              onCart={
                openCart
              }

              isHck={
                isHck
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
  onCart,
  onProfile,
  isHck = false,
}) {
  return (
    <header className="jr-header">
      {/* BRAND LOGO */}
      <button
        type="button"
        className="jr-header-logo-button"
        onClick={onProfile}
        aria-label={isHck ? "HCK Helmet Cleaning" : "Juice Robo"}
      >
        <img
          src={isHck ? HCK_LOGO : juiceRoboLogo}
          alt={isHck ? "HCK Helmet Cleaning" : "Juice Robo"}
          className="jr-header-logo"
          draggable="false"
        />
      </button>

      {/* HEADER SPACER */}
      <div
        className="jr-header-spacer"
        aria-hidden="true"
      />

      {/* PROFILE */}
      <button
        type="button"
        className="jr-profile-button"
        onClick={onProfile}
        aria-label="Profile"
      >
        <svg
          className="jr-header-action-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="8"
            r="3.1"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path
            d="M5.5 20C5.9 15.9 8.2 13.7 12 13.7C15.8 13.7 18.1 15.9 18.5 20"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* CART */}
      {!isHck && (
        <button
          type="button"
          className="jr-cart-button"
          onClick={() => {
            if (typeof onCart === "function") {
              onCart();
            }
          }}
          aria-label={
            cartCount > 0
              ? `Cart, ${cartCount} items`
              : "Cart"
          }
        >
          <svg
            className="jr-header-action-icon jr-cart-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4.2 5.2H6.25L7.75 15.1H17.55L19.15 8H7.05"
              stroke="currentColor"
              strokeWidth="1.9"
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
            <span
              className="jr-cart-badge"
              aria-hidden="true"
            >
              {cartCount}
            </span>
          )}
        </button>
      )}
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
  isHck = false,
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
      className={`jr-bottom-nav ${isHck ? "jr-bottom-nav--single" : "jr-bottom-nav-two"}`}
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
      {!isHck && (
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
            } else if (typeof setScreen === "function") {
              setScreen("cart");
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
      )}
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
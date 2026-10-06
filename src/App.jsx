import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";

import { api, onSessionExpired, isTokenValid } from "./api";

import { resolveJuiceProductImage } from "./shared/utils/imageResolver.js";

import {
  getCartQuantityForProduct,
  findCartItemForProduct,
  isSamePackage,
} from "./shared/utils/cartMatcher.js";

import juiceRoboLogo from "../assets/juice-robo-logo.jpg";

import "./App.css";

/* =========================================================
   COMPONENTS
   ========================================================= */

import DesktopBlocker from "./components/DesktopBlocker/DesktopBlocker";

/* =========================================================
   SCREENS
   ========================================================= */

import LoginScreen from "./screens/LoginScreen/LoginScreen";
import HomeScreen from "./screens/HomeScreen/HomeScreen";
import MenuScreen from "./screens/MenuScreen/MenuScreen";
import CartScreen from "./screens/CartScreen/CartScreen";

import LocationMachineScreen from "./screens/LocationMachineScreen/LocationMachineScreen";

import LocationConfirmationScreen from "./screens/LocationConfirmationScreen/LocationConfirmationScreen";

import ProductDetailScreen from "./screens/ProductDetailScreen/ProductDetailScreen";

import ConfirmationScreen from "./screens/ConfirmationScreen/ConfirmationScreen";

import PaymentFailureScreen from "./screens/PaymentFailedScreen/PaymentFailedScreen";

import HistoryScreen from "./screens/HistoryScreen/HistoryScreen";

import ProfileScreen from "./screens/ProfileScreen/ProfileScreen";

import PaymentSuccessScreen from "./screens/PaymentSuccessScreen/PaymentSuccessScreen";

import PaymentPendingScreen from "./screens/PaymentPendingScreen/PaymentPendingScreen";

/* =========================================================
   FEATURE FLAGS
   ========================================================= */

import {
  LOCATION_ENABLED,
  MACHINE_ENABLED,
} from "./featureFlags";

/* =========================================================
   PAYMENT ENGINE
   ========================================================= */

import {
  isMobileDevice,
  launchCrossPlatformUpi,
  persistPaymentSession,
  clearPaymentSession,
  formatUpiAmount,
  validateBackendUpiUrl,
  buildBackendUpiPaymentUrl,
} from "./payment/paymentEngine.js";

/* ============================================================
   1. CONSTANTS & CONFIGURATION
   ============================================================ */

const BASE_PATH = "/order_now";
const HCK_LOGO = `${import.meta.env.BASE_URL}assets/hck-logo.svg`;
const GST_RATE = 0.05;

const ITEM_MASTER_API_BASE =
  "https://tptest.juicerobo.com/tporder/api/v1/itemmaster/items";

export const OUTLET_CONFIG = Object.freeze({
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

const OUTLET_ID_TO_KEY = Object.freeze(
  Object.fromEntries(
    Object.entries(OUTLET_CONFIG)
      .filter(([, cfg]) => cfg.outletId)
      .map(([key, cfg]) => [cfg.outletId.toLowerCase(), key])
  )
);

const STORAGE = Object.freeze({
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
  backendCartId: "jr_backend_cart_id",
  orderId: "jr_order_id",
  paymentStatus: "jr_payment_status",
  paymentSuccess: "jr_payment_success",
  paymentCollectionCode: "jr_collection_code",
});

const EMPTY_CUSTOMER = Object.freeze({
  name: "",
  phone: "",
  email: "",
  loginIdentifier: "",
  password: "",
  confirmPassword: "",
});

/* ============================================================
   2. OUTLET RESOLUTION HELPERS
   ============================================================ */

export function resolveOutletKey(segment = "") {
  const raw = String(segment || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (OUTLET_CONFIG[lower]) return lower;
  if (OUTLET_ID_TO_KEY[lower]) return OUTLET_ID_TO_KEY[lower];
  return raw;
}

export function getCanonicalOutletUuid(outletOrKey = "") {
  const raw = String(outletOrKey || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (OUTLET_CONFIG[lower]?.outletId) return OUTLET_CONFIG[lower].outletId;
  if (OUTLET_ID_TO_KEY[lower]) {
    const key = OUTLET_ID_TO_KEY[lower];
    return OUTLET_CONFIG[key].outletId;
  }
  return raw;
}

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
      return (
        /(^|\s)jr(\s|$)/i.test(locName) ||
        /(^|\s)juice\s*robo(\s|$)/i.test(locName)
      );
    }
    if (outletTarget === "hck") {
      return /(^|\s)hck(\s|$)/i.test(locName);
    }
    return false;
  });

  if (!matchedLocation && safeList.length) {
    if (outletTarget === "jr") {
      const nonHck = safeList.find((loc) => {
        const n = String(loc?.name || loc?.storeName || "").toLowerCase();
        return !n.includes("hck");
      });
      if (nonHck) matchedLocation = nonHck;
    } else {
      matchedLocation = safeList[0];
    }
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

/* ============================================================
   3. STORAGE & CART UTILITIES
   ============================================================ */

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function readSessionJSON(key, fallback = null) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeSessionJSON(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function removeSessionItem(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

function getStoredUser() {
  const isAuth =
    localStorage.getItem(STORAGE.loggedIn) === "true" ||
    localStorage.getItem("juice_robo_logged_in") === "true";

  if (!isAuth) {
    return null;
  }

  const stored =
    readJSON(STORAGE.user, null) ||
    readJSON("juice_robo_user", null) ||
    readJSON(STORAGE.legacyUser, null);

  if (
    stored &&
    typeof stored === "object" &&
    (stored.id ||
      stored.userId ||
      stored.user_id ||
      stored.email ||
      stored.phone ||
      stored.userName ||
      stored.name)
  ) {
    if (
      stored.name === "Juice Lover" &&
      !stored.id &&
      !stored.email &&
      !stored.phone
    ) {
      return null;
    }
    return stored;
  }

  return null;
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
  return key && key !== "guest" ? `jr_orders_${key}` : STORAGE.orders;
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
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const parsedQuantity = Number(
        item?.quantity ?? item?.qty ?? item?.count ?? 1
      );

      return {
        ...item,
        quantity:
          Number.isFinite(parsedQuantity) && parsedQuantity > 0
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

  const rawIdA = String(
    a?.variantId || a?.id || a?.productId || a?.itemId || ""
  ).trim();
  const rawIdB = String(
    b?.variantId || b?.id || b?.productId || b?.itemId || ""
  ).trim();
  if (rawIdA && rawIdB && rawIdA === rawIdB) return true;

  const nameA = String(
    a?.name || a?.itemName || a?.productName || a?.displayName || ""
  )
    .trim()
    .toLowerCase();
  const nameB = String(
    b?.name || b?.itemName || b?.productName || b?.displayName || ""
  )
    .trim()
    .toLowerCase();
  if (nameA && nameB && nameA === nameB) return true;

  return false;
}

function mergeCarts(baseCart = [], incomingCart = []) {
  const result = [...normalizeCart(baseCart)];
  const incomingItems = normalizeCart(incomingCart);

  for (const item of incomingItems) {
    const idx = result.findIndex((existing) => doCartItemsMatch(existing, item));
    if (idx >= 0) {
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
  const scoped = readJSON(ordersKey(user), null);
  if (Array.isArray(scoped)) return scoped;
  const legacy = readJSON(STORAGE.orders, []);
  return Array.isArray(legacy) ? legacy : [];
}

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

function cartItemMatchesId(item, targetId) {
  if (!item || targetId === undefined || targetId === null || targetId === "")
    return false;
  const tid = String(targetId).trim();
  if (!tid) return false;

  if (item.id !== undefined && item.id !== null && String(item.id).trim() === tid)
    return true;
  if (
    item.variantId !== undefined &&
    item.variantId !== null &&
    String(item.variantId).trim() === tid
  )
    return true;
  if (
    item._variant?.variantId !== undefined &&
    item._variant?.variantId !== null &&
    String(item._variant?.variantId).trim() === tid
  )
    return true;
  if (
    item._variant?.id !== undefined &&
    item._variant?.id !== null &&
    String(item._variant?.id).trim() === tid
  )
    return true;
  if (
    item.productId !== undefined &&
    item.productId !== null &&
    String(item.productId).trim() === tid
  )
    return true;
  if (
    item.itemId !== undefined &&
    item.itemId !== null &&
    String(item.itemId).trim() === tid
  )
    return true;

  return false;
}

/* ============================================================
   4. PRODUCT & PRICING UTILITIES
   ============================================================ */

function normalizeProductImageUrl(value = "") {
  return resolveJuiceProductImage(value);
}

function getProductImageValue(product = {}, variant = null) {
  const variants = Array.isArray(product?.lstVariants)
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
  basic: "https://ordertest.juicerobo.com/tpimages/Web-Helmet-Basic-Icon.png",
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

  if (name.includes("premium")) return HCK_PRODUCT_IMAGE_URLS.premium;
  if (name.includes("standard")) return HCK_PRODUCT_IMAGE_URLS.standard;
  if (name.includes("basic")) return HCK_PRODUCT_IMAGE_URLS.basic;
  return "";
}

function resolveProductImage(product = {}, variant = null) {
  const backendImage = normalizeProductImageUrl(
    getProductImageValue(product, variant)
  );
  if (backendImage) return backendImage;
  return getHckFallbackImage(product, variant);
}

function displayProductName(product = {}) {
  const name =
    product?.name ||
    product?.itemName ||
    product?.productName ||
    product?.product_name ||
    product?.title ||
    "";

  return String(name)
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function displayDescription(product = {}) {
  const variants = Array.isArray(product?.lstVariants)
    ? product.lstVariants
    : Array.isArray(product?.variants)
    ? product.variants
    : [];

  const variant = variants[0];
  return String(
    product?.desc || product?.description || variant?.variantDesc || ""
  )
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .trim();
}

function productPrice(product = {}) {
  const variants = Array.isArray(product?.lstVariants)
    ? product.lstVariants
    : Array.isArray(product?.variants)
    ? product.variants
    : [];

  const variant =
    variants.find(
      (item) =>
        Number(
          item?.unitPrice ?? item?.unit_price ?? item?.price ?? 0
        ) >= 0
    ) || variants[0];

  return Number(
    variant?.unitPrice ??
      variant?.unit_price ??
      variant?.price ??
      product?.price ??
      product?.unitPrice ??
      0
  );
}

function getProductId(product = {}) {
  return String(
    product?.id ??
      product?.itemId ??
      product?.item_id ??
      product?.productId ??
      ""
  );
}

function getVariantId(product = {}, variant = null) {
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
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "₹0";
  return `₹${Math.round(numericValue)}`;
}

function productMoney(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "₹0.00";
  return `₹${numericValue.toFixed(2)}`;
}

function errorText(error) {
  return error?.message || error?.data?.message || "Something went wrong.";
}

function makeCartItem(product, variant, quantity) {
  const selectedVariant =
    variant ||
    (Array.isArray(product?.lstVariants) ? product.lstVariants[0] : null);

  const variantId = getVariantId(product, selectedVariant);
  const price = Number(
    selectedVariant?.unitPrice ??
      selectedVariant?.unit_price ??
      selectedVariant?.price ??
      product?.price ??
      0
  );

  if (!variantId) {
    throw new Error("This juice does not have a valid variant.");
  }

  const image = resolveProductImage(product, selectedVariant);

  return {
    ...product,
    image,
    image_url: image,
    id: variantId,
    variantId,
    productId: product?.id,
    itemId: product?.id,
    name: displayProductName(product),
    description:
      selectedVariant?.variantDesc ||
      product?.desc ||
      product?.description ||
      "",
    price,
    unitPrice: price,
    variantName: selectedVariant?.variantName || "",
    sizeML: selectedVariant?.sizeML || selectedVariant?.sizeM || "",
    variantDesc: selectedVariant?.variantDesc || "",
    variantPhoto: selectedVariant?.variantPhoto || null,
    _variant: selectedVariant,
    quantity: Math.min(Math.max(1, Math.floor(Number(quantity) || 1)), 9),
  };
}

function extractBackendCartItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.cart)) return response.cart;
  if (Array.isArray(response?.cartItems)) return response.cartItems;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.cart)) return response.data.cart;
  if (Array.isArray(response?.data?.cartItems)) return response.data.cartItems;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.result?.cart)) return response.result.cart;
  if (Array.isArray(response?.result?.cartItems)) return response.result.cartItems;
  if (Array.isArray(response?.result?.items)) return response.result.items;
  return [];
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
    if (!str || /^\d+$/.test(str)) return false;
    const lower = str.toLowerCase();
    if (lower === "null" || lower === "undefined" || lower === "juice")
      return false;
    return true;
  };

  const candidates = [
    product.slug,
    product.product_code,
    product.productCode,
    product.menu_item_code,
    product.menuItemCode,
    product.item_code,
    product.itemCode,
    product.code,
    product.product_type,
    product.productType,
    product._variant?.product_type,
    product._variant?.productType,
    product.name,
    product.itemName,
    product.productName,
    product.displayName,
  ];

  for (const candidate of candidates) {
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

  const exact = products.find((p) => {
    const ident = getProductIdentifier(p);
    return (
      ident &&
      (ident === normalizedTarget || ident.toLowerCase() === targetLower)
    );
  });
  if (exact) return exact;

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
    ];
    return candidates.some((val) => {
      if (!val) return false;
      const str = String(val).trim();
      return (
        str.toLowerCase() === targetLower ||
        slugifyText(str) === normalizedTarget
      );
    });
  });
  if (fieldMatch) return fieldMatch;

  const legacyIdMatch = products.find(
    (p) =>
      String(p.id ?? "") === rawParam ||
      String(p.itemId ?? "") === rawParam ||
      String(p.productId ?? "") === rawParam
  );
  if (legacyIdMatch) return legacyIdMatch;

  return null;
}

/* ============================================================
   5. CENTRALIZED ROUTER & URL UTILITIES
   ============================================================ */

function normalizePath(pathname = "") {
  return String(pathname || "")
    .replace(/\/+/g, "/")
    .trim();
}

function parseUrlToScreen(pathname = "") {
  const clean = normalizePath(pathname);
  let sub = clean;
  if (sub.startsWith(BASE_PATH)) {
    sub = sub.slice(BASE_PATH.length);
  }
  sub = sub.replace(/^\/+|\/+$/g, "");

  if (!sub || sub === "scan") {
    return { outlet: null, screen: "scan", param: "" };
  }

  const segments = sub.split("/").filter(Boolean);
  const first = (segments[0] || "").trim();

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
    "payment-failure",
    "login",
    "menu-items",
  ]);

  if (NON_OUTLET_SCREEN_NAMES.has(first.toLowerCase())) {
    return { outlet: null, screen: "scan", param: "" };
  }

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
  if (
    subRoute === "my_orders" ||
    subRoute === "history" ||
    subRoute === "orders"
  ) {
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
    return {
      outlet,
      screen: LOCATION_ENABLED ? "location" : "menu",
      param: "",
    };
  }
  if (
    subRoute === "location-confirmation" ||
    subRoute === "confirmation" ||
    subRoute === "checkout"
  ) {
    return {
      outlet,
      screen:
        LOCATION_ENABLED || MACHINE_ENABLED
          ? "location-confirmation"
          : "cart",
      param: "",
    };
  }
  if (subRoute === "upi-payment" || subRoute === "payment") {
    return { outlet, screen: "upi-payment", param: "" };
  }
  if (subRoute === "payment-success") {
    return { outlet, screen: "payment-success", param: "" };
  }
  if (subRoute === "payment-failure") {
    return { outlet, screen: "payment-failure", param: "" };
  }
  if (subRoute === "login") {
    return { outlet, screen: "login", param: "" };
  }

  return { outlet, screen: "menu", param: "" };
}

function getScreenPath(screenName, param = "", outlet = null) {
  if (screenName === "scan" || !outlet) {
    return `${BASE_PATH}/`;
  }

  const canonicalOutlet = getCanonicalOutletUuid(outlet);
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
      const safeParam =
        param && !/^\d+$/.test(String(param).trim())
          ? String(param).trim()
          : "";
      sub = safeParam ? `menu/${encodeURIComponent(safeParam)}` : "menu";
      break;
    }
    case "location":
      sub = LOCATION_ENABLED ? "location" : "menu";
      break;
    case "location-confirmation":
    case "confirmation":
      sub =
        LOCATION_ENABLED || MACHINE_ENABLED
          ? "location-confirmation"
          : "cart";
      break;
    case "upi-payment":
      sub = "upi-payment";
      break;
    case "payment-success":
      sub = "payment-success";
      break;
    case "payment-failure":
      sub = "payment-failure";
      break;
    case "login":
      sub = "login";
      break;
    case "scan":
      return `${BASE_PATH}/`;
    default:
      sub = "menu";
  }

  return `${BASE_PATH}/${canonicalOutlet}/${sub}/`;
}

function isSameRoute(currentPath = "", canonicalPath = "", outlet = null) {
  const normCurrent = normalizePath(currentPath).replace(/^\/+|\/+$/g, "");
  const normCanonical = normalizePath(canonicalPath).replace(/^\/+|\/+$/g, "");
  if (normCurrent.toLowerCase() === normCanonical.toLowerCase()) return true;

  if (outlet) {
    const rawOutlet = String(outlet).trim().toLowerCase();
    const uuidSegment = getCanonicalOutletUuid(rawOutlet).toLowerCase();
    const segmentAliases = [
      ...new Set([
        rawOutlet,
        encodeURIComponent(rawOutlet).toLowerCase(),
        uuidSegment,
        encodeURIComponent(uuidSegment).toLowerCase(),
      ]),
    ];
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

  return false;
}

function getMenuItemCodeFromUrl() {
  try {
    const pathname = window.location.pathname || "";
    const parsed = parseUrlToScreen(pathname);
    if (parsed.isMenuItemCode && parsed.param) {
      return decodeURIComponent(parsed.param).trim();
    }
    const match = pathname.match(/\/menu-items\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
    const searchParams = new URLSearchParams(window.location.search || "");
    return (
      searchParams.get("menuItemCode") ||
      searchParams.get("menu_item_code") ||
      searchParams.get("item") ||
      searchParams.get("code") ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

async function fetchMenuItemsByCode(menuItemCode) {
  const code = String(menuItemCode || "").trim();
  if (!code) throw new Error("Menu item code is missing.");

  const endpoint = `${ITEM_MASTER_API_BASE}/${encodeURIComponent(code)}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Menu item API failed (${response.status}).`);
  }

  const payload = await response.json();
  const rawItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data?.items)
    ? payload.data.items
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.result)
    ? payload.result
    : [];

  return rawItems
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const rawVariants = Array.isArray(item.lstVariants)
        ? item.lstVariants
        : Array.isArray(item.variants)
        ? item.variants
        : [];
      const primaryVariant = rawVariants[0] || {};
      const id = item.itemId ?? item.id ?? primaryVariant.variantId ?? null;
      const name = String(
        item.itemName || item.name || primaryVariant.variantName || ""
      ).trim();
      const desc = String(
        item.desc || item.description || primaryVariant.variantDesc || ""
      ).trim();
      const rawPrice =
        primaryVariant.unitPrice ??
        primaryVariant.price ??
        item.unitPrice ??
        item.price ??
        0;

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
        price: Number(rawPrice) || 0,
        unitPrice: Number(rawPrice) || 0,
        photo: item.itemPhoto || primaryVariant.variantPhoto || null,
        image: item.itemPhoto || primaryVariant.variantPhoto || null,
        lstVariants:
          rawVariants.length > 0
            ? rawVariants
            : [
                {
                  variantId: id,
                  id,
                  variantName: name,
                  unitPrice: Number(rawPrice) || 0,
                  price: Number(rawPrice) || 0,
                  sizeML: name,
                  taxInclusive: true,
                  taxRate: 18,
                  quantity: 0,
                  isAvailable: true,
                },
              ],
        isAvailable:
          item.isAvailable !== false && item.is_available !== false,
      };
    });
}

function resolveMenuCodeForLocation(location) {
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
    return OUTLET_CONFIG.hck.menuLocationId;
  }
  if (/(^|\s)jr(\s|$)/i.test(locationText)) {
    return OUTLET_CONFIG.jr.menuLocationId;
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
    location?.itemMasterId,
    location?.item_master_id,
  ];

  return (
    candidates
      .map((value) => String(value ?? "").trim())
      .find((value) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          value
        )
      ) || ""
  );
}

/* ============================================================
   6. SUB-COMPONENTS (SCAN QR, HEADER, BOTTOM NAV, TOAST)
   ============================================================ */

function ScanQRScreen({ isHck = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scanHandledRef = useRef(false);
  const lastScanTimeRef = useRef(0);

  const [cameraState, setCameraState] =
    useState("idle");

  const [cameraError, setCameraError] =
    useState("");

  const [scanMessage, setScanMessage] =
    useState(
      isHck
        ? "Allow camera access to scan the HCK machine QR."
        : "Allow camera access to scan the Juice Robo machine QR."
    );

  /* =========================================================
     STOP CAMERA
     ========================================================= */

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore camera cleanup errors.
          }
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /* =========================================================
     RESOLVE OUTLET FROM SCANNED QR
     ========================================================= */

  const resolveScannedOutlet = (rawOutlet) => {
    const value = String(
      rawOutlet || ""
    )
      .trim()
      .toLowerCase();

    if (!value) {
      return null;
    }

    /*
     * Existing internal outlet key.
     *
     * Example:
     * jr
     * hck
     */

    if (
      OUTLET_CONFIG[value]
    ) {
      return {
        key: value,
        outletId:
          OUTLET_CONFIG[value]
            .outletId,
      };
    }

    /*
     * Existing canonical outlet UUID.
     *
     * Example:
     *
     * d2006bfc-95df-4925-a617-6d10d06b99bc
     */

    const mappedKey =
      OUTLET_ID_TO_KEY[value];

    if (
      mappedKey &&
      OUTLET_CONFIG[mappedKey]
    ) {
      return {
        key: mappedKey,
        outletId:
          OUTLET_CONFIG[mappedKey]
            .outletId,
      };
    }

    return null;
  };

  /* =========================================================
     EXTRACT OUTLET FROM QR VALUE
     ========================================================= */

  const getOutletFromQrValue = (
    rawValue
  ) => {
    const value = String(
      rawValue || ""
    ).trim();

    if (!value) {
      return null;
    }

    /*
     * -------------------------------------------------------
     * CASE 1
     * QR contains a complete URL
     *
     * Example:
     *
     * https://example.com/order_now/
     * d2006bfc-95df-4925-a617-6d10d06b99bc/
     * -------------------------------------------------------
     */

    try {
      const parsedUrl =
        new URL(value);

      const pathname =
        parsedUrl.pathname || "";

      const segments =
        pathname
          .split("/")
          .filter(Boolean);

      const orderNowIndex =
        segments.findIndex(
          (segment) =>
            segment.toLowerCase() ===
            "order_now"
        );

      if (
        orderNowIndex !== -1 &&
        segments[
          orderNowIndex + 1
        ]
      ) {
        const scannedOutlet =
          segments[
            orderNowIndex + 1
          ];

        const outlet =
          resolveScannedOutlet(
            scannedOutlet
          );

        if (outlet) {
          return outlet;
        }
      }

      /*
       * Support QR URLs containing:
       *
       * ?outletId=<uuid>
       */

      const outletId =
        parsedUrl.searchParams.get(
          "outletId"
        ) ||
        parsedUrl.searchParams.get(
          "outlet_id"
        ) ||
        parsedUrl.searchParams.get(
          "outlet"
        );

      if (outletId) {
        const outlet =
          resolveScannedOutlet(
            outletId
          );

        if (outlet) {
          return outlet;
        }
      }
    } catch {
      /*
       * QR is not a URL.
       * Continue with raw UUID/code handling.
       */
    }

    /*
     * -------------------------------------------------------
     * CASE 2
     * QR contains only UUID
     * -------------------------------------------------------
     */

    const uuidMatch =
      value.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
      );

    if (uuidMatch) {
      return resolveScannedOutlet(
        uuidMatch[0]
      );
    }

    /*
     * -------------------------------------------------------
     * CASE 3
     * QR contains outlet key
     *
     * jr / hck
     * -------------------------------------------------------
     */

    return resolveScannedOutlet(
      value
    );
  };

  /* =========================================================
     HANDLE QR DETECTION
     ========================================================= */

  const handleQRCode = (
    qrValue
  ) => {
    if (
      scanHandledRef.current
    ) {
      return;
    }

    console.log(
      "[Juice Robo] QR detected:",
      qrValue
    );

    console.log(
      "[Juice Robo] RAW QR VALUE:",
      JSON.stringify(qrValue)
    );

    const outlet =
      getOutletFromQrValue(
        qrValue
      );

    /*
     * QR detected but not a valid
     * Juice Robo / HCK outlet QR.
     */

    if (!outlet) {
      setScanMessage(
        isHck
          ? "Invalid HCK QR. Please scan the QR displayed on the HCK machine."
          : "Invalid Juice Robo QR. Please scan the QR displayed on the Juice Robo machine."
      );

      return;
    }

    console.log(
      "[Juice Robo] Outlet detected:",
      outlet
    );

    scanHandledRef.current =
      true;

    setScanMessage(
      "Outlet detected. Opening menu..."
    );

    stopCamera();

    /*
     * IMPORTANT:
     *
     * The URL remains the source of truth.
     *
     * Example:
     *
     * /order_now/
     * d2006bfc-95df-4925-a617-6d10d06b99bc/
     */

    const targetPath =
      `/order_now/${encodeURIComponent(
        outlet.outletId
      )}/`;

    window.location.assign(
      targetPath
    );
  };

  /* =========================================================
     SCAN CAMERA FRAME
     ========================================================= */

  const scanFrame = (
    timestamp
  ) => {
    if (
      scanHandledRef.current ||
      !videoRef.current ||
      !canvasRef.current
    ) {
      return;
    }

    /*
     * Limit QR processing to
     * approximately 10 FPS.
     */

    if (
      timestamp -
        lastScanTimeRef.current <
      100
    ) {
      animationFrameRef.current =
        requestAnimationFrame(
          scanFrame
        );

      return;
    }

    lastScanTimeRef.current =
      timestamp;

    const video =
      videoRef.current;

    if (
      video.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      animationFrameRef.current =
        requestAnimationFrame(
          scanFrame
        );

      return;
    }

    const videoWidth =
      video.videoWidth;

    const videoHeight =
      video.videoHeight;

    if (
      !videoWidth ||
      !videoHeight
    ) {
      animationFrameRef.current =
        requestAnimationFrame(
          scanFrame
        );

      return;
    }

    const canvas =
      canvasRef.current;

    /*
     * Scan the central portion
     * corresponding to the QR frame.
     */

    const cropRatio = 0.80;

    const cropWidth =
      Math.floor(
        videoWidth *
          cropRatio
      );

    const cropHeight =
      Math.floor(
        videoHeight *
          cropRatio
      );

    const cropX =
      Math.floor(
        (videoWidth -
          cropWidth) /
          2
      );

    const cropY =
      Math.floor(
        (videoHeight -
          cropHeight) /
          2
      );

    canvas.width =
      cropWidth;

    canvas.height =
      cropHeight;

    const context =
      canvas.getContext(
        "2d",
        {
          willReadFrequently:
            true,
        }
      );

    if (!context) {
      animationFrameRef.current =
        requestAnimationFrame(
          scanFrame
        );

      return;
    }

    context.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    try {
      const imageData =
        context.getImageData(
          0,
          0,
          cropWidth,
          cropHeight
        );

      const code =
        jsQR(
          imageData.data,
          imageData.width,
          imageData.height,
          {
            inversionAttempts:
              "attemptBoth",
          }
        );

      if (code?.data) {
        handleQRCode(
          code.data
        );

        return;
      }
    } catch (error) {
      console.warn(
        "[Juice Robo] QR scan error:",
        error
      );
    }

    animationFrameRef.current =
      requestAnimationFrame(
        scanFrame
      );
  };

  /* =========================================================
     REQUEST CAMERA PERMISSION
     ========================================================= */

  const requestCameraAccess =
    async () => {
      setCameraError("");

      setCameraState(
        "requesting"
      );

      setScanMessage(
        "Please allow camera access."
      );

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        setCameraState(
          "error"
        );

        setCameraError(
          "Camera access is not supported by this browser."
        );

        return;
      }

      try {
        /*
         * Make sure no previous
         * camera stream exists.
         */

        stopCamera();

        scanHandledRef.current =
          false;

        /*
         * This triggers the browser's
         * native camera permission prompt.
         *
         * facingMode = environment
         * requests the rear camera.
         */

        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode: {
                  ideal:
                    "environment",
                },

                width: {
                  ideal: 1920,
                },

                height: {
                  ideal: 1080,
                },
              },

              audio: false,
            }
          );

        streamRef.current =
          stream;

        const video =
          videoRef.current;

        if (!video) {
          stopCamera();

          setCameraState(
            "error"
          );

          setCameraError(
            "Unable to initialise the camera."
          );

          return;
        }

        video.srcObject =
          stream;

        video.muted =
          true;

        video.autoplay =
          true;

        video.playsInline =
          true;

        await video.play();

        setCameraState(
          "scanning"
        );

        setScanMessage(
          "Position the machine QR inside the frame."
        );

        animationFrameRef.current =
          requestAnimationFrame(
            scanFrame
          );
      } catch (error) {
        console.error(
          "[Juice Robo] Camera permission/access error:",
          error
        );

        stopCamera();

        if (
          error?.name ===
          "NotAllowedError"
        ) {
          setCameraState(
            "denied"
          );

          setCameraError(
            "Camera permission was denied. Please allow camera access in your browser settings and try again."
          );

          return;
        }

        if (
          error?.name ===
          "NotFoundError"
        ) {
          setCameraState(
            "error"
          );

          setCameraError(
            "No camera was found on this device."
          );

          return;
        }

        if (
          error?.name ===
          "NotReadableError"
        ) {
          setCameraState(
            "error"
          );

          setCameraError(
            "The camera is currently being used by another application."
          );

          return;
        }

        setCameraState(
          "error"
        );

        setCameraError(
          "Unable to access the camera. Please check your browser permissions and try again."
        );
      }
    };

  /* =========================================================
     CLEANUP
     ========================================================= */

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []); 

  /* =========================================================
     CAMERA PERMISSION SCREEN
     ========================================================= */

  const renderPermissionScreen =
    () => {
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 5,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            padding:
              "100px 28px 80px",

            background:
              "#151515",

            color: "#fff",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "350px",
              textAlign: "center",
            }}
          >
            {/* QR ICON */}

            <div
              style={{
                width: "84px",
                height: "84px",

                margin:
                  "0 auto 28px",

                borderRadius:
                  "50%",

                background:
                  "rgba(255,255,255,0.10)",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="42"
                height="42"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                />

                <rect
                  x="14"
                  y="3"
                  width="7"
                  height="7"
                  rx="1"
                />

                <rect
                  x="3"
                  y="14"
                  width="7"
                  height="7"
                  rx="1"
                />

                <path
                  d="M14 14h3v3h-3z"
                />

                <path
                  d="M18 18h3v3h-3z"
                />

                <path
                  d="M18 14h3"
                />
              </svg>
            </div>

            <h1
              style={{
                margin:
                  "0 0 10px",

                fontSize:
                  "25px",

                fontWeight:
                  800,

                letterSpacing:
                  "-0.02em",
              }}
            >
              Allow Camera Access
            </h1>

            <p
              style={{
                margin:
                  "0 auto 28px",

                maxWidth:
                  "310px",

                fontSize:
                  "14px",

                lineHeight:
                  1.55,

                color:
                  "rgba(255,255,255,0.72)",
              }}
            >
              {isHck
                ? "We need access to your camera to scan the QR code on the HCK machine and open the services for that location."
                : "We need access to your camera to scan the QR code on the Juice Robo machine and open the menu for that location."}
            </p>

            {cameraError && (
              <div
                style={{
                  marginBottom:
                    "18px",

                  padding:
                    "13px 15px",

                  borderRadius:
                    "14px",

                  background:
                    "rgba(255,255,255,0.10)",

                  fontSize:
                    "12px",

                  lineHeight:
                    1.45,

                  color:
                    "#fff",
                }}
              >
                {cameraError}
              </div>
            )}

            <button
              type="button"
              onClick={
                requestCameraAccess
              }
              disabled={
                cameraState ===
                "requesting"
              }
              style={{
                width:
                  "100%",

                height:
                  "52px",

                border:
                  "none",

                borderRadius:
                  "26px",

                background:
                  "#ffffff",

                color:
                  "#1d6f42",

                fontSize:
                  "15px",

                fontWeight:
                  800,

                cursor:
                  cameraState ===
                  "requesting"
                    ? "wait"
                    : "pointer",

                opacity:
                  cameraState ===
                  "requesting"
                    ? 0.65
                    : 1,
              }}
            >
              {cameraState ===
              "requesting"
                ? "Requesting Camera..."
                : cameraState ===
                    "denied"
                  ? "Try Camera Again"
                  : "Allow Camera"}
            </button>
          </div>
        </div>
      );
    };

  /* =========================================================
     SCANNER FRAME
     ========================================================= */

  const renderScanner =
    () => {
      return (
        <>
          {/* CAMERA OVERLAY */}

          <div
            style={{
              position:
                "absolute",

              inset: 0,

              zIndex: 2,

              pointerEvents:
                "none",

              background:
                "linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.05) 32%, rgba(0,0,0,0.05) 70%, rgba(0,0,0,0.58) 100%)",
            }}
          />

          {/* SCAN FRAME */}

          <div
            style={{
              position:
                "absolute",

              top: "50%",
              left: "50%",

              zIndex: 5,

              width:
                "min(76vw, 310px)",

              aspectRatio:
                "1 / 1",

              transform:
                "translate(-50%, -50%)",

              pointerEvents:
                "none",
            }}
          >
            {/* TOP LEFT */}

            <span
              style={{
                position:
                  "absolute",

                top: 0,
                left: 0,

                width: "52px",
                height: "52px",

                borderTop:
                  "4px solid #ffffff",

                borderLeft:
                  "4px solid #ffffff",

                borderTopLeftRadius:
                  "16px",
              }}
            />

            {/* TOP RIGHT */}

            <span
              style={{
                position:
                  "absolute",

                top: 0,
                right: 0,

                width: "52px",
                height: "52px",

                borderTop:
                  "4px solid #ffffff",

                borderRight:
                  "4px solid #ffffff",

                borderTopRightRadius:
                  "16px",
              }}
            />

            {/* BOTTOM LEFT */}

            <span
              style={{
                position:
                  "absolute",

                bottom: 0,
                left: 0,

                width: "52px",
                height: "52px",

                borderBottom:
                  "4px solid #ffffff",

                borderLeft:
                  "4px solid #ffffff",

                borderBottomLeftRadius:
                  "16px",
              }}
            />

            {/* BOTTOM RIGHT */}

            <span
              style={{
                position:
                  "absolute",

                bottom: 0,
                right: 0,

                width: "52px",
                height: "52px",

                borderBottom:
                  "4px solid #ffffff",

                borderRight:
                  "4px solid #ffffff",

                borderBottomRightRadius:
                  "16px",
              }}
            />

            {/* SCANNING LINE */}

            <span
              style={{
                position:
                  "absolute",

                left: "9%",
                right: "9%",

                top: "50%",

                height: "2px",

                background:
                  "rgba(100,220,130,0.95)",

                boxShadow:
                  "0 0 12px rgba(100,220,130,0.9)",

                animation:
                  "juiceRoboScanLine 2s ease-in-out infinite",
              }}
            />
          </div>

          {/* BOTTOM MESSAGE */}

          <div
            style={{
              position:
                "absolute",

              left: 0,
              right: 0,

              bottom: 0,

              zIndex: 10,

              padding:
                "20px 24px calc(env(safe-area-inset-bottom) + 30px)",

              textAlign:
                "center",

              color: "#fff",
            }}
          >
            <div
              style={{
                fontSize:
                  "16px",

                fontWeight:
                  700,
              }}
            >
              {isHck
                ? "Scan HCK machine QR"
                : "Scan Juice Robo machine QR"}
            </div>

            <div
              style={{
                marginTop:
                  "5px",

                fontSize:
                  "13px",

                opacity:
                  0.80,

                lineHeight:
                  1.4,
              }}
            >
              {scanMessage}
            </div>
          </div>
        </>
      );
    };

  /* =========================================================
     MAIN UI
     ========================================================= */

  return (
    <main
      className="jr-scan-screen"
      style={{
        position:
          "relative",

        width:
          "100%",

        height:
          "100dvh",

        minHeight:
          "100%",

        overflow:
          "hidden",

        background:
          "#111",

        color:
          "#fff",
      }}
    >
      {/* ===================================================
          LIVE CAMERA
          =================================================== */}

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-label={
          isHck
            ? "Camera for scanning HCK outlet QR code"
            : "Camera for scanning Juice Robo outlet QR code"
        }
        style={{
          position:
            "absolute",

          inset: 0,

          width:
            "100%",

          height:
            "100%",

          objectFit:
            "cover",

          background:
            "#111",

          opacity:
            cameraState ===
            "scanning"
              ? 1
              : 0,

          transition:
            "opacity 0.25s ease",
        }}
      />

      {/* ===================================================
          HIDDEN QR CANVAS
          =================================================== */}

      <canvas
        ref={canvasRef}
        style={{
          display:
            "none",
        }}
      />

      {/* ===================================================
          HEADER
          =================================================== */}

      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,

          zIndex: 20,

          padding:
            "calc(env(safe-area-inset-top) + 16px) 18px 16px",

          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",

          color: "#fff",
        }}
      >
        {/* LEFT SPACER */}

        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
          }}
        />

        {/* TITLE */}

        <div
          style={{
            flex: 1,
            textAlign: "center",
            padding: "0 14px",
          }}
        >
          <div
            style={{
              fontSize: "21px",
              fontWeight: 800,
              lineHeight: 1.15,
            }}
          >
            Scan QR
          </div>

          <div
            style={{
              marginTop: "5px",
              fontSize: "13px",
              opacity: 0.85,
            }}
          >
            {cameraState === "scanning"
              ? isHck
                ? "Scan the HCK machine QR"
                : "Scan the Juice Robo machine QR"
              : "Camera access required"}
          </div>
        </div>

        {/* RIGHT SPACER */}

        <div
          style={{
            width: "44px",
            height: "44px",
            flexShrink: 0,
          }}
        />
      </header>

      {/* ===================================================
          PERMISSION / ERROR SCREEN
          =================================================== */}

      {cameraState !==
        "scanning" &&
        renderPermissionScreen()}

      {/* ===================================================
          LIVE SCANNER
          =================================================== */}

      {cameraState ===
        "scanning" &&
        renderScanner()}

      {/* ===================================================
          SCANNER ANIMATION
          =================================================== */}

      <style>
        {`
          @keyframes juiceRoboScanLine {
            0% {
              transform: translateY(-115px);
              opacity: 0.35;
            }

            50% {
              transform: translateY(115px);
              opacity: 1;
            }

            100% {
              transform: translateY(-115px);
              opacity: 0.35;
            }
          }
        `}
      </style>
    </main>
  );
}

function Header({ cartCount, onCart, onProfile, onLogo, isHck = false }) {
  return (
    <header className="jr-header">
      <button
        type="button"
        className="jr-header-logo-button"
        onClick={onLogo || onProfile}
        aria-label={isHck ? "HCK Helmet Cleaning" : "Juice Robo"}
      >
        <img
          src={isHck ? HCK_LOGO : juiceRoboLogo}
          alt={isHck ? "HCK Helmet Cleaning" : "Juice Robo"}
          className="jr-header-logo"
          draggable="false"
        />
      </button>

      <div className="jr-header-spacer" aria-hidden="true" />

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
          <circle cx="12" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M5.5 20C5.9 15.9 8.2 13.7 12 13.7C15.8 13.7 18.1 15.9 18.5 20"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {!isHck && (
        <button
          type="button"
          className="jr-cart-button"
          onClick={onCart}
          aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
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
            <circle cx="9.15" cy="19" r="1.35" fill="currentColor" />
            <circle cx="16.25" cy="19" r="1.35" fill="currentColor" />
          </svg>

          {cartCount > 0 && (
            <span className="jr-cart-badge" aria-hidden="true">
              {cartCount}
            </span>
          )}
        </button>
      )}
    </header>
  );
}

function BottomNav({
  screen,
  setScreen,
  cartCount,
  onCart,
  cartTotal = 0,
  money: moneyFn,
  onContinue,
  isHck = false,
}) {
  const activeColor = "#2f8050";
  const inactiveColor = "#929292";

  const navButtonStyle = {
    appearance: "none",
    WebkitAppearance: "none",
    border: 0,
    outline: 0,
    background: "transparent",
    padding: 0,
    margin: 0,
    flex: "1 1 0",
    minWidth: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    cursor: "pointer",
    fontFamily:
      "Poppins, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  };

  const iconContainerStyle = {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flex: "0 0 auto",
  };

  const labelStyle = {
    margin: 0,
    padding: 0,
    fontSize: "9px",
    lineHeight: "11px",
    fontWeight: 800,
    letterSpacing: 0,
    color: "inherit",
    textAlign: "center",
  };

  const showZomatoCartBar = !isHck && cartCount > 0 && screen !== "cart";
  const formattedCartTotal =
    typeof moneyFn === "function"
      ? moneyFn(cartTotal)
      : `₹${Number(cartTotal || 0).toLocaleString("en-IN", {
          maximumFractionDigits: 2,
        })}`;

  if (showZomatoCartBar) {
    return (
      <nav
        className="jr-bottom-nav jr-bottom-nav--cart-cta"
        aria-label="Cart checkout navigation"
      >
        <button
          type="button"
          className="jr-cart-cta-summary"
          onClick={onCart}
          aria-label={`View cart, ${cartCount} ${
            cartCount === 1 ? "item" : "items"
          }`}
        >
          <span className="jr-cart-cta-item-count">
            {cartCount}-item{cartCount === 1 ? "" : "s"}
          </span>
          <span className="jr-cart-cta-total">
            {formattedCartTotal} <small>(incl. 5% GST)</small>
          </span>
        </button>

        <button
          type="button"
          className="jr-cart-cta-continue"
          onClick={onContinue || onCart}
          aria-label="Continue to checkout"
        >
          <span>Continue</span>
          <span className="jr-cart-cta-arrow" aria-hidden="true">
            ›
          </span>
        </button>

        <button
          type="button"
          className="jr-cart-cta-menu"
          onClick={() => setScreen("menu")}
          aria-label="Menu"
        >
          <span aria-hidden="true">☰</span>
          <span>Menu</span>
        </button>
      </nav>
    );
  }

  return (
    <nav
      className={`jr-bottom-nav ${
        isHck ? "jr-bottom-nav--single" : "jr-bottom-nav-two"
      }`}
      aria-label="Primary navigation"
    >
      <button
        type="button"
        className={screen === "menu" || screen === "home" ? "active" : ""}
        onClick={() => setScreen("menu")}
        aria-label="Menu"
        style={{
          ...navButtonStyle,
          color:
            screen === "menu" || screen === "home"
              ? activeColor
              : inactiveColor,
        }}
      >
        <span style={iconContainerStyle}>
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4.5 10.2L12 4L19.5 10.2V19.5H14.8V14.2H9.2V19.5H4.5V10.2Z"
              stroke={
                screen === "menu" || screen === "home"
                  ? activeColor
                  : inactiveColor
              }
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <small style={labelStyle}>Menu</small>
      </button>

      {!isHck && (
        <button
          type="button"
          className={screen === "cart" ? "active" : ""}
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
            color: screen === "cart" ? activeColor : inactiveColor,
          }}
        >
          <span className="jr-nav-cart-icon" style={iconContainerStyle}>
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4.2 5.2H6.2L7.7 15.2H17.7L19.3 8H7"
                stroke={screen === "cart" ? activeColor : inactiveColor}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="9.1"
                cy="19"
                r="1.35"
                fill={screen === "cart" ? activeColor : inactiveColor}
              />
              <circle
                cx="16.5"
                cy="19"
                r="1.35"
                fill={screen === "cart" ? activeColor : inactiveColor}
              />
            </svg>
            {cartCount > 0 && (
              <b className="jr-nav-cart-badge">{cartCount}</b>
            )}
          </span>
          <small style={labelStyle}>Cart</small>
        </button>
      )}
    </nav>
  );
}

function Toast({ message }) {
  return <div className="jr-toast">{message}</div>;
}

/* ============================================================
   7. MAIN APPLICATION CONTROLLER
   ============================================================ */

export default function App() {
  const [menuItemCode] = useState(() => getMenuItemCodeFromUrl());

  /* -----------------------------------------------------------
     A. URL & OUTLET STATE (URL is Single Source of Truth)
     ----------------------------------------------------------- */
  const [outlet, setOutlet] = useState(() => {
    const parsed = parseUrlToScreen(
      typeof window !== "undefined" ? window.location.pathname || "" : ""
    );
    return parsed.outlet || null;
  });

  const isHck =
    String(outlet || "").toLowerCase() === "hck" ||
    String(outlet || "").toLowerCase() ===
      OUTLET_CONFIG.hck.outletId.toLowerCase() ||
    (typeof window !== "undefined" &&
      (window.location.pathname
        .toLowerCase()
        .includes(OUTLET_CONFIG.hck.outletId.toLowerCase()) ||
        window.location.pathname.toLowerCase().includes("/hck")));

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = isHck
        ? "HCK — Helmet Cleaning Service"
        : "Juice Robo";
    }
  }, [isHck]);

  /* -----------------------------------------------------------
     B. AUTHENTICATION STATE
     ----------------------------------------------------------- */
  const [loggedIn, setLoggedIn] = useState(() => Boolean(getStoredUser()));
  const [user, setUser] = useState(getStoredUser);
  const [customer, setCustomer] = useState(() => {
    const stored = readJSON(STORAGE.customer, null);
    return {
      ...EMPTY_CUSTOMER,
      ...(stored || {}),
    };
  });
  const [loginRedirectTarget, setLoginRedirectTarget] = useState(() => {
    try {
      return sessionStorage.getItem("jr_login_redirect_target") || null;
    } catch {
      return null;
    }
  });

  /* -----------------------------------------------------------
     C. SCREEN & NAVIGATION STATE
     ----------------------------------------------------------- */
  const [screen, setScreenState] = useState(() => {
    const urlRoute = parseUrlToScreen(
      typeof window !== "undefined" ? window.location.pathname || "" : ""
    );

    if (!urlRoute.outlet || urlRoute.screen === "scan") {
      return "scan";
    }

    if (urlRoute.screen) {
      if (urlRoute.screen === "profile") {
        const storedUser = getStoredUser();
        if (!storedUser) return "login";
      }
      return urlRoute.screen;
    }

    if (menuItemCode) return "menu";

    const savedScreen = localStorage.getItem(STORAGE.screen);
    const savedSuccessfulOrder = readJSON(STORAGE.paymentSuccess, null);
    const savedCollectionCode = String(
      savedSuccessfulOrder?.collection_code ||
        savedSuccessfulOrder?.collectionCode ||
        savedSuccessfulOrder?.orderPin ||
        ""
    ).trim();

    if (
      savedScreen === "payment-success" &&
      savedSuccessfulOrder &&
      /^\d{4}$/.test(savedCollectionCode)
    ) {
      return "payment-success";
    }

    const isAuthed = Boolean(getStoredUser());
    if (
      savedScreen &&
      (isAuthed || savedScreen === "menu" || savedScreen === "login")
    ) {
      if (savedScreen === "profile" && !isAuthed) return "login";
      return savedScreen;
    }

    return isAuthed
      ? LOCATION_ENABLED
        ? "location"
        : "menu"
      : "menu";
  });

  const setScreen = useCallback(
    (nextScreen, options = {}) => {
      let resolvedScreen = nextScreen;
      if (resolvedScreen === "location" && !LOCATION_ENABLED) {
        resolvedScreen = "menu";
      }
      if (
        resolvedScreen === "location-confirmation" &&
        !LOCATION_ENABLED &&
        !MACHINE_ENABLED
      ) {
        resolvedScreen = "cart";
      }
      if (resolvedScreen === "profile" && (!user || !loggedIn)) {
        resolvedScreen = "login";
      }

      const {
        replace = false,
        productCode = null,
        skipHistory = false,
      } = options;

      setScreenState(resolvedScreen);

      try {
        localStorage.setItem(STORAGE.screen, String(resolvedScreen));
      } catch {}

      if (skipHistory || typeof window === "undefined") return;

      try {
        const targetPath = getScreenPath(resolvedScreen, productCode, outlet);
        const search = window.location.search || "";
        const targetUrl = `${targetPath}${search}`;

        if (!isSameRoute(window.location.pathname, targetPath, outlet)) {
          if (replace) {
            window.history.replaceState(
              { screen: resolvedScreen, productCode, outlet },
              "",
              targetUrl
            );
          } else {
            window.history.pushState(
              { screen: resolvedScreen, productCode, outlet },
              "",
              targetUrl
            );
          }
        }
      } catch (e) {
        console.warn("[Juice Robo] History push/replace failed:", e);
      }
    },
    [user, loggedIn, outlet]
  );

  /* -----------------------------------------------------------
     D. PRODUCT & LOCATION STATE
     ----------------------------------------------------------- */
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [machines, setMachines] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedHckPackage, setSelectedHckPackage] = useState(null);

  const [selectedLocationId, setSelectedLocationId] = useState(() =>
    outlet ? localStorage.getItem(STORAGE.location) || "" : ""
  );
  const [selectedMachineId, setSelectedMachineId] = useState(() =>
    outlet ? localStorage.getItem(STORAGE.machine) || "" : ""
  );
  const [selectedLocationSnapshot, setSelectedLocationSnapshot] = useState(
    () => (outlet ? readJSON("juice_robo_selected_location", null) : null)
  );
  const [selectedMachineSnapshot, setSelectedMachineSnapshot] = useState(
    () => (outlet ? readJSON("juice_robo_selected_machine", null) : null)
  );

  const selectedLocation = useMemo(() => {
    const targetId = String(selectedLocationId || "");
    return (
      locations.find((loc) => {
        const ids = [
          loc?.id,
          loc?.storeId,
          loc?.store_id,
          loc?.locId,
          loc?.locationId,
          loc?.location_id,
          loc?.outletId,
          loc?.outlet_id,
        ]
          .filter((v) => v !== undefined && v !== null && v !== "")
          .map(String);
        return ids.includes(targetId);
      }) ||
      (selectedLocationSnapshot &&
      String(
        selectedLocationSnapshot?.id ??
          selectedLocationSnapshot?.storeId ??
          selectedLocationSnapshot?.locId ??
          ""
      ) === targetId
        ? selectedLocationSnapshot
        : null)
    );
  }, [locations, selectedLocationId, selectedLocationSnapshot]);

  const selectedMachine = useMemo(() => {
    const targetId = String(selectedMachineId || "");
    return (
      machines.find((m) => String(m?.id ?? "") === targetId) ||
      (selectedMachineSnapshot &&
      String(selectedMachineSnapshot?.id ?? "") === targetId
        ? selectedMachineSnapshot
        : null)
    );
  }, [machines, selectedMachineId, selectedMachineSnapshot]);

  /* -----------------------------------------------------------
     E. CART STATE & CALCULATIONS
     ----------------------------------------------------------- */
  const [cart, setCart] = useState(() => {
    const parsed = parseUrlToScreen(
      typeof window !== "undefined" ? window.location.pathname || "" : ""
    );
    return readCart(getStoredUser(), parsed.outlet || "");
  });

  const safeCart = useMemo(
    () =>
      isHck
        ? selectedHckPackage
          ? [makeCartItem(selectedHckPackage, null, 1)]
          : []
        : normalizeCart(cart),
    [cart, isHck, selectedHckPackage]
  );

  const cartCount = useMemo(
    () =>
      isHck
        ? 0
        : safeCart.reduce((sum, item) => {
            const qty = Number(item?.quantity || 0);
            return (
              sum +
              (Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 0)
            );
          }, 0),
    [safeCart, isHck]
  );

  const grossTotalPaise = useMemo(
    () =>
      safeCart.reduce((sum, item) => {
        const unitPrice = Number(
          item?.price ?? item?.unitPrice ?? 0
        );
        const itemQuantity = Number(item?.quantity || 1);
        if (!Number.isFinite(unitPrice) || !Number.isFinite(itemQuantity))
          return sum;
        const unitPricePaise = Math.round(unitPrice * 100);
        const qty = Math.max(1, Math.floor(itemQuantity));
        return sum + unitPricePaise * qty;
      }, 0),
    [safeCart]
  );

  const gstPaise = Math.round((grossTotalPaise * GST_RATE) / (1 + GST_RATE));
  const taxableSubtotalPaise = grossTotalPaise - gstPaise;
  const finalTotal = grossTotalPaise / 100;
  const subtotal = taxableSubtotalPaise / 100;
  const gst = gstPaise / 100;
  const cartTotal = finalTotal;

  /* -----------------------------------------------------------
     F. ORDERS, PAYMENT & STATUS STATE
     ----------------------------------------------------------- */
  const [historyOrders, setHistoryOrders] = useState(() =>
    readOrders(getStoredUser())
  );
  const [loading, setLoading] = useState(
    () => Boolean(outlet) && loggedIn
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [order, setOrder] = useState(() =>
    readJSON(STORAGE.paymentSuccess, null)
  );

  const [paymentSession, setPaymentSession] = useState(() =>
    readJSON("juice_robo_payment_session", null) ||
    readSessionJSON("juice_robo_payment_session", null)
  );

  const [paymentStatus, setPaymentStatus] = useState(() =>
    readJSON("juice_robo_payment_session", null) ||
    readSessionJSON("juice_robo_payment_session", null)
      ? "pending"
      : "idle"
  );

  const [paymentMessage, setPaymentMessage] = useState(
    "Complete payment in your UPI app. We will verify it with Juice Robo."
  );

  const [paymentDebugDetails, setPaymentDebugDetails] = useState(null);

  /* -----------------------------------------------------------
     G. PAYMENT POLLING REFS & CONTROLS (STRICT 5 ATTEMPTS MAX)
     ----------------------------------------------------------- */
  const MAX_POLL_ATTEMPTS = 5;
  const POLL_INTERVAL_MS = 2500;
  const pollTimerRef = useRef(null);
  const pollAttemptsRef = useRef(0);
  const isPollingActiveRef = useRef(false);
  const paymentVerifyInFlight = useRef(false);
  const paymentStatusRef = useRef(paymentStatus);
  paymentStatusRef.current = paymentStatus;

  function stopPolling() {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    isPollingActiveRef.current = false;
  }

  function showToast(message) {
    setToast(String(message || ""));
    window.clearTimeout(window.__juiceRoboToastTimer);
    window.__juiceRoboToastTimer = window.setTimeout(() => {
      setToast("");
    }, 2400);
  }

  /* -----------------------------------------------------------
     H. PAYMENT VERIFICATION FUNCTION
     ----------------------------------------------------------- */
  async function verifyPendingPayment({ silent = false } = {}) {
    if (paymentVerifyInFlight.current) {
      return false;
    }

    const session =
      readJSON("juice_robo_payment_session", null) || paymentSession;

    if (!session?.cartId || !session?.orderId) {
      if (!silent) showToast("No pending payment was found.");
      return false;
    }

    const isUuid = (value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value ?? "").trim()
      );

    if (!isUuid(session.cartId) || !isUuid(session.orderId)) {
      console.error("[Juice Robo] Blocked invalid payment session:", {
        cartId: session.cartId,
        orderId: session.orderId,
      });

      try {
        sessionStorage.removeItem("juice_robo_payment_session");
        sessionStorage.removeItem("juice_robo_pending_order_id");
        sessionStorage.removeItem("juice_robo_pending_transaction_id");
      } catch {}

      stopPolling();
      setPaymentStatus("failed");
      setPaymentMessage("Payment could not be verified due to invalid reference.");
      setPaymentSession(null);
      setScreen("payment-failure");
      return false;
    }

    paymentVerifyInFlight.current = true;

    try {
      setPaymentStatus("processing");
      setPaymentMessage("Checking payment with Juice Robo...");

      console.log("[Juice Robo] VERIFYING PAYMENT AFTER BROWSER RETURN:", {
        cartId: session.cartId,
        orderId: session.orderId,
      });

      const verified = await api.orderStatus(
        session.cartId,
        session.orderId
      );

      console.log("[Juice Robo] ORDER STATUS RESPONSE:", verified);

      const paymentCandidates = [
        verified?.payment_status,
        verified?.paymentStatus,
        verified?.payment_state,
        verified?.paymentState,
        verified?.status,
        verified?.orderStatus,
        verified?.order_status,
        verified?.data?.payment_status,
        verified?.data?.paymentStatus,
        verified?.data?.status,
        verified?.result?.payment_status,
        verified?.result?.paymentStatus,
        verified?.result?.status,
      ];

      const normalizedPaymentStates = paymentCandidates
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

      const failedStates = [
        "FAILED",
        "FAILURE",
        "PAYMENT_FAILED",
        "PAYMENT_FAILURE",
        "DECLINED",
        "REJECTED",
        "CANCELLED",
        "CANCELED",
        "EXPIRED",
        "TRANSACTION_FAILED",
        "ORDER_FAILED",
      ];

      const paymentState =
        normalizedPaymentStates.find(
          (value) =>
            paidStates.includes(value) ||
            failedStates.includes(value) ||
            value === "PENDING" ||
            value === "PROCESSING"
        ) ||
        normalizedPaymentStates[0] ||
        "PENDING";

      const isPaid = paidStates.includes(paymentState);
      const isFailed = failedStates.includes(paymentState);

      console.log("[Juice Robo] PAYMENT STATE:", {
        paymentState,
        isPaid,
        normalizedPaymentStates,
      });

      if (isFailed) {
        stopPolling();
        setPaymentStatus("failed");
        setPaymentMessage(
          "Payment failed or was declined. No successful payment was confirmed."
        );
        try {
          sessionStorage.setItem("jr_payment_status", "failed");
          clearPaymentSession();
        } catch {}
        setPaymentSession(null);
        setScreen("payment-failure");
        return false;
      }

      if (!isPaid) {
        setPaymentStatus("pending");
        setPaymentMessage(
          "Payment is not confirmed yet. Complete the payment in your UPI app and return here."
        );
        return false;
      }

      // Backend confirmed isPaid === true! Now verify collection code
      let latestOrder = null;
      try {
        if (typeof api.getOrder === "function") {
          latestOrder = await api.getOrder(session.orderId);
        } else if (typeof api.order === "function") {
          latestOrder = await api.order(session.orderId);
        }
      } catch (orderError) {
        console.warn("[Juice Robo] Latest order fetch error:", orderError);
      }

      const backendCollectionCodeCandidates = [
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
        verified?.collection_code,
        verified?.collectionCode,
        verified?.orderPin,
        verified?.data?.collection_code,
        verified?.result?.collection_code,
      ];

      const backendCollectionCode =
        backendCollectionCodeCandidates
          .map((v) => String(v ?? "").trim())
          .map((v) => {
            if (!v) return "";
            return (
              v.match(/^(?:\D*?)(\d{4})(?:\D*)$/)?.[1] ||
              v.match(/\b(\d{4})\b/)?.[1] ||
              (/^\d{1,3}$/.test(v) ? v.padStart(4, "0") : "")
            );
          })
          .find((v) => /^\d{4}$/.test(v)) || "";

      if (!backendCollectionCode) {
        setPaymentStatus("processing");
        setPaymentMessage(
          "Payment is confirmed. Juice Robo is generating your 4-digit collection code..."
        );
        return false;
      }

      const mergedOrder = {
        ...(session.orderSnapshot || {}),
        ...(verified || {}),
        ...(latestOrder || {}),
        id: session.orderId,
        orderId: session.orderId,
        cartId: session.cartId,
        items: session.orderSnapshot?.items || safeCart,
        total_amount: Number(session.total || finalTotal),
        totalAmount: Number(session.total || finalTotal),
        subtotal: Number(session.subtotal || subtotal),
        gst: Number(session.gst || gst),
        payment_status: paymentState,
        paymentStatus: paymentState,
        collection_code: backendCollectionCode,
        collectionCode: backendCollectionCode,
        location: selectedLocation,
        machine: selectedMachine,
      };

      console.log("[Juice Robo] PAYMENT FULLY CONFIRMED:", mergedOrder);

      // Persist success
      try {
        sessionStorage.setItem(
          STORAGE.paymentCollectionCode,
          backendCollectionCode
        );
        sessionStorage.setItem("jr_collection_code", backendCollectionCode);
        sessionStorage.setItem("jr_order_id", String(session.orderId));
        sessionStorage.setItem("jr_backend_cart_id", String(session.cartId));
        sessionStorage.setItem("jr_payment_status", "paid");
        sessionStorage.setItem("juice_robo_payment_confirmed", "1");
        sessionStorage.setItem(
          STORAGE.paymentSuccess,
          JSON.stringify(mergedOrder)
        );
        writeJSON(STORAGE.paymentSuccess, mergedOrder);
        clearPaymentSession();
      } catch (storageError) {
        console.warn("[Juice Robo] Success persistence error:", storageError);
      }

      stopPolling();
      setOrder(mergedOrder);
      setPaymentStatus("paid");
      setPaymentMessage("Payment verified successfully.");
      setHistoryOrders((current) => [
        mergedOrder,
        ...current.filter((item) => String(item?.id || item?.orderId) !== String(session.orderId)),
      ]);

      setPaymentSession(null);
      setCart([]);
      writeCart(user || {}, [], outlet);
      clearGuestCart(outlet);

      setScreen("payment-success");
      showToast("Payment successful.");
      return true;
    } catch (verificationError) {
      console.error("[Juice Robo] Payment verification failed:", verificationError);
      setPaymentStatus("pending");
      setPaymentMessage("We could not verify payment yet.");
      if (!silent) {
        showToast(errorText(verificationError) || "Payment verification failed.");
      }
      return false;
    } finally {
      paymentVerifyInFlight.current = false;
    }
  }

  /* -----------------------------------------------------------
     I. SINGLE PAYMENT POLLING CONTROLLER (MAX 5 ATTEMPTS)
     ----------------------------------------------------------- */
  const executePollAttempt = useCallback(async () => {
    if (screen !== "upi-payment") {
      stopPolling();
      return;
    }

    const session =
      readJSON("juice_robo_payment_session", null) || paymentSession;
    if (!session?.cartId || !session?.orderId) {
      stopPolling();
      return;
    }

    if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      setPaymentStatus("pending");
      setPaymentMessage(
        "Payment verification reached maximum attempts (5). The payment is still pending. Tap Check Status to retry or cancel to return to cart."
      );
      return;
    }

    pollAttemptsRef.current += 1;
    console.log(
      `[Juice Robo] Polling payment attempt ${pollAttemptsRef.current}/${MAX_POLL_ATTEMPTS}`
    );

    isPollingActiveRef.current = true;
    let paid = false;
    try {
      paid = await verifyPendingPayment({ silent: true });
    } catch (err) {
      console.warn("[Juice Robo] Polling attempt error:", err);
    }

    if (screen !== "upi-payment" || !isPollingActiveRef.current) {
      stopPolling();
      return;
    }

    if (paid) {
      stopPolling();
      return;
    }

    if (paymentStatusRef.current === "failed") {
      stopPolling();
      return;
    }

    if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      setPaymentStatus("pending");
      setPaymentMessage(
        "Payment is still awaiting confirmation. You can check status again or choose another payment option."
      );
      console.log(
        "[Juice Robo] Payment polling stopped after 5 attempts (still pending)."
      );
      return;
    }

    pollTimerRef.current = window.setTimeout(
      executePollAttempt,
      POLL_INTERVAL_MS
    );
  }, [screen, paymentSession]);

  const startPolling = useCallback(
    (resetCount = false) => {
      if (resetCount) {
        pollAttemptsRef.current = 0;
      }
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        return;
      }
      stopPolling();
      isPollingActiveRef.current = true;
      executePollAttempt();
    },
    [executePollAttempt]
  );

  /* -----------------------------------------------------------
     J. PAYMENT CANCEL HANDLER (CRITICAL REQUIREMENT)
     ----------------------------------------------------------- */
  function handleCancelPayment() {
    console.log(
      "[Juice Robo] Payment cancelled by user. Returning to cart for current outlet:",
      outlet
    );
    stopPolling();
    // Do NOT clear the cart, do NOT create new order, keep same outlet UUID
    setScreen("cart");
  }

  /* -----------------------------------------------------------
     K. POLLING LIFECYCLE & CLEANUP
     ----------------------------------------------------------- */
  useEffect(() => {
    if (screen === "upi-payment" && paymentSession) {
      if (
        pollAttemptsRef.current < MAX_POLL_ATTEMPTS &&
        !isPollingActiveRef.current
      ) {
        startPolling(false);
      }
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [screen, paymentSession, startPolling]);

  // Browser return handling (visibility / focus / pageshow)
  useEffect(() => {
    if (screen !== "upi-payment") return;

    function handleBrowserReturn() {
      if (document.visibilityState === "hidden") return;
      if (
        screen === "upi-payment" &&
        paymentSession &&
        pollAttemptsRef.current < MAX_POLL_ATTEMPTS &&
        !isPollingActiveRef.current
      ) {
        console.log(
          "[Juice Robo] Resuming payment polling on browser return"
        );
        executePollAttempt();
      }
    }

    window.addEventListener("pageshow", handleBrowserReturn);
    window.addEventListener("focus", handleBrowserReturn);
    document.addEventListener("visibilitychange", handleBrowserReturn);

    return () => {
      window.removeEventListener("pageshow", handleBrowserReturn);
      window.removeEventListener("focus", handleBrowserReturn);
      document.removeEventListener("visibilitychange", handleBrowserReturn);
    };
  }, [screen, paymentSession, executePollAttempt]);

  /* -----------------------------------------------------------
     L. DATA LOADING & OUTLET SWITCH LIFECYCLE
     ----------------------------------------------------------- */
  const prevOutletRef = useRef(outlet);
  useEffect(() => {
    const prevOutlet = prevOutletRef.current;
    if (prevOutlet !== outlet) {
      console.log(
        `[Juice Robo] Outlet switched from ${prevOutlet} to ${outlet}`
      );
      prevOutletRef.current = outlet;
      setProducts([]);
      setSelectedProduct(null);
      setSelectedVariant(null);
      const newOutletCart = outlet ? readCart(user, outlet) : [];
      setCart(newOutletCart);
    }
  }, [outlet, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (!outlet) {
        setLoading(false);
        setProducts([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        let safeLocations = [];
        try {
          const loadedLocations = await api.locations();
          if (Array.isArray(loadedLocations)) safeLocations = loadedLocations;
        } catch (locErr) {
          console.warn("[Juice Robo] Locations load fallback:", locErr);
        }

        if (cancelled) return;

        const resolved = resolveOutletLocationAndMachine(safeLocations, outlet);
        const matchedLocation = resolved.location;
        const locationId = resolved.locationId;

        setLocations(safeLocations.length ? safeLocations : [matchedLocation]);
        setSelectedLocationId(locationId);
        setSelectedLocationSnapshot(matchedLocation);
        localStorage.setItem(STORAGE.location, locationId);
        writeJSON("juice_robo_selected_location", matchedLocation);

        const outletTarget = String(outlet).toLowerCase();
        const config = OUTLET_CONFIG[outletTarget];
        const outletMenuUuid = config?.menuLocationId || "";
        const locationMenuUuid = resolveMenuCodeForLocation(matchedLocation);
        const requestedCode = menuItemCode || outletMenuUuid || locationMenuUuid;

        const productPromise = requestedCode
          ? fetchMenuItemsByCode(requestedCode)
          : api.menuItems("", matchedLocation);

        const machinePromise = api
          .machines(safeLocations.length ? safeLocations : [matchedLocation])
          .catch(() => [resolved.machine]);

        const [productResult, machineResult] = await Promise.allSettled([
          productPromise,
          machinePromise,
        ]);

        if (cancelled) return;

        if (productResult.status === "fulfilled") {
          setProducts(
            Array.isArray(productResult.value) ? productResult.value : []
          );
        } else {
          setProducts([]);
        }

        let loadedMachines = [];
        if (
          machineResult.status === "fulfilled" &&
          Array.isArray(machineResult.value) &&
          machineResult.value.length
        ) {
          loadedMachines = machineResult.value;
        } else {
          loadedMachines = [resolved.machine];
        }

        setMachines(loadedMachines);
        const finalMachine = loadedMachines[0] || resolved.machine;
        setSelectedMachineId(String(finalMachine.id));
        setSelectedMachineSnapshot(finalMachine);
        localStorage.setItem(STORAGE.machine, String(finalMachine.id));
        writeJSON("juice_robo_selected_machine", finalMachine);

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("[Juice Robo] Initial data load failed:", err);
        setError(errorText(err) || "Unable to load Juice Robo data.");
        setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [outlet, menuItemCode]);

  /* -----------------------------------------------------------
     M. BROWSER POPSTATE (BACK / FORWARD) & URL SYNC
     ----------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handlePopState() {
      const parsed = parseUrlToScreen(window.location.pathname || "");
      const newOutlet = parsed.outlet || null;
      let targetScreen =
        !newOutlet || parsed.screen === "scan" ? "scan" : parsed.screen || "menu";

      if (targetScreen === "profile" && (!getStoredUser() && !user)) {
        targetScreen = "login";
      }

      if (newOutlet !== outlet) {
        setOutlet(newOutlet);
      }
      setScreenState(targetScreen);

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
          const cartQty = getCartQuantityForProduct(
            safeCart,
            found,
            variants[0] || null
          );
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
  }, [products, loggedIn, safeCart, outlet, user]);

  useEffect(() => {
    if (screen === "profile" && (!user || !loggedIn)) {
      setScreen("login", { replace: true });
    }
  }, [screen, user, loggedIn, setScreen]);

  useEffect(() => {
    if (!products.length || typeof window === "undefined") return;
    const parsed = parseUrlToScreen(window.location.pathname || "");
    if (
      parsed.screen === "product" &&
      parsed.param &&
      (!selectedProduct ||
        getProductIdentifier(selectedProduct) !== parsed.param)
    ) {
      const found = findProductByParam(products, parsed.param);
      if (found) {
        setSelectedProduct(found);
        const variants = Array.isArray(found?.lstVariants)
          ? found.lstVariants
          : Array.isArray(found?.variants)
          ? found.variants
          : [];
        setSelectedVariant(variants[0] || null);
        const cartQty = getCartQuantityForProduct(
          safeCart,
          found,
          variants[0] || null
        );
        setQuantity(cartQty > 0 ? cartQty : 1);
      }
    }
  }, [products, safeCart, selectedProduct]);

  /* -----------------------------------------------------------
     N. SESSION EXPIRY HANDLING
     ----------------------------------------------------------- */
  const handleSessionExpiry = useCallback((reason = "Session expired") => {
    console.warn("[Juice Robo] Session expired:", reason);
    setLoggedIn(false);
    setUser(null);
    setCustomer({ ...EMPTY_CUSTOMER });
    setCart([]);

    const authKeys = [
      STORAGE.loggedIn,
      STORAGE.token,
      STORAGE.accessToken,
      STORAGE.user,
      STORAGE.legacyUser,
      STORAGE.customer,
      "_token",
      "juice_robo_logged_in",
      "juice_robo_token",
      "juice_robo_access_token",
      "access_token",
      "juice_robo_user",
    ];
    authKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {}
    });

    clearGuestCart(outlet);
    setBusy(false);
    setScreen("menu", { replace: true });
    showToast("Your session has expired. Please sign in again.");
  }, [outlet, setScreen]);

  useEffect(() => {
    const unsub = onSessionExpired((reason) => handleSessionExpiry(reason));
    const handleExpiredEvent = (e) =>
      handleSessionExpiry(e?.detail?.reason);
    window.addEventListener(
      "juice-robo:session-expired",
      handleExpiredEvent
    );

    if (loggedIn) {
      const token =
        localStorage.getItem(STORAGE.token) ||
        localStorage.getItem(STORAGE.accessToken) ||
        localStorage.getItem("juice_robo_access_token");
      if (token && !isTokenValid(token)) {
        handleSessionExpiry("Stored token expired");
      }
    }

    return () => {
      unsub();
      window.removeEventListener(
        "juice-robo:session-expired",
        handleExpiredEvent
      );
    };
  }, [loggedIn, handleSessionExpiry]);

  /* -----------------------------------------------------------
     O. AUTHENTICATION ACTIONS (LOGIN / LOGOUT / PROFILE)
     ----------------------------------------------------------- */
  async function handleLogin(event) {
    if (event?.preventDefault) event.preventDefault();
    const identifier = String(
      customer?.email || customer?.loginIdentifier || customer?.phone || ""
    ).trim();
    const password = String(customer?.password || "");

    if (!identifier) {
      showToast("Enter your email or phone number");
      return;
    }
    if (!password) {
      showToast("Enter your password");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const response = await api.login({
        userName: identifier,
        email: identifier,
        password,
      });

      const loggedUser = response?.user || (response?.id ? response : null);
      setUser(loggedUser);
      setCustomer((current) => ({
        ...current,
        name:
          loggedUser?.name ||
          loggedUser?.firstname ||
          loggedUser?.firstName ||
          current.name ||
          "",
        phone: loggedUser?.phone || current.phone || "",
        email: loggedUser?.email || current.email || identifier,
        password: "",
        confirmPassword: "",
      }));

      localStorage.setItem(STORAGE.loggedIn, "true");
      localStorage.setItem("juice_robo_logged_in", "true");
      if (loggedUser) {
        writeJSON(STORAGE.user, loggedUser);
        writeJSON("juice_robo_user", loggedUser);
      }

      setLoggedIn(true);

      // Merge guest cart with user cart
      const guestCart = getGuestCart(outlet, cart);
      const existingUserCart = readCart(loggedUser, outlet);
      const mergedLoginCart =
        guestCart.length > 0
          ? mergeCarts(existingUserCart, guestCart)
          : existingUserCart;

      setCart(mergedLoginCart);
      writeCart(loggedUser, mergedLoginCart, outlet);
      clearGuestCart(outlet);

      const destinationScreen =
        loginRedirectTarget === "cart" ? "cart" : "menu";
      setLoginRedirectTarget(null);
      try {
        sessionStorage.removeItem("jr_login_redirect_target");
      } catch {}

      setScreen(destinationScreen);
      showToast(`Welcome back, ${loggedUser?.name || identifier}`);
    } catch (loginError) {
      console.error("[Juice Robo] Login error:", loginError);
      showToast(
        loginError?.status === 401
          ? "Invalid email or password"
          : errorText(loginError) || "Unable to sign in."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setLoggedIn(false);
    setUser(null);
    setCustomer({ ...EMPTY_CUSTOMER });

    try {
      await api.logout();
    } catch (e) {
      console.warn("[Juice Robo] api.logout error:", e);
    }

    const authKeys = [
      STORAGE.loggedIn,
      STORAGE.accessToken,
      STORAGE.token,
      STORAGE.user,
      STORAGE.legacyUser,
      STORAGE.customer,
      "_token",
      "juice_robo_logged_in",
      "juice_robo_token",
      "juice_robo_access_token",
      "access_token",
      "juice_robo_user",
    ];

    authKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {}
    });

    setSelectedProduct(null);
    setSelectedVariant(null);
    setCart([]);
    clearGuestCart(outlet);
    setHistoryOrders([]);

    setScreen("menu", { replace: true });
    showToast("You have been signed out");
  }

  async function handleSaveProfile(event) {
    if (event?.preventDefault) event.preventDefault();
    const name = String(customer?.name || "").trim();
    const email = String(customer?.email || "").trim();

    if (!name) {
      showToast("Please enter your full name");
      return;
    }
    if (!email) {
      showToast("Please enter your email");
      return;
    }

    try {
      setBusy(true);
      setError("");

      const updatedUser = { ...user, name, email };
      setUser(updatedUser);
      writeJSON(STORAGE.user, updatedUser);
      writeJSON(STORAGE.legacyUser, updatedUser);

      const safeCustomer = { ...customer, name, email };
      delete safeCustomer.password;
      delete safeCustomer.confirmPassword;
      setCustomer(safeCustomer);
      writeJSON(STORAGE.customer, safeCustomer);

      showToast("Profile saved successfully");
    } catch (profileError) {
      console.error("[Juice Robo] Profile save failed:", profileError);
      showToast(errorText(profileError) || "Unable to save profile");
    } finally {
      setBusy(false);
    }
  }

  /* -----------------------------------------------------------
     P. CART & ORDER ACTIONS
     ----------------------------------------------------------- */
  async function handleAddToCart(product, variant, nextQuantity = 1) {
    const clampedQty = Math.min(
      Math.max(1, Math.floor(Number(nextQuantity) || 1)),
      9
    );
    const item = makeCartItem(product, variant, clampedQty);
    const currentCart = normalizeCart(cart);
    const existingItem = findCartItemForProduct(
      currentCart,
      product,
      variant || item._variant
    );

    const nextCart = existingItem
      ? currentCart.map((entry) =>
          entry === existingItem
            ? { ...entry, ...item, quantity: clampedQty }
            : entry
        )
      : [...currentCart, item];

    setCart(nextCart);
    writeCart(user || {}, nextCart, outlet);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setQuantity(1);
    setScreen("menu");
  }

  async function updateQuantity(productId, nextQuantity) {
    const rawValue = Number(nextQuantity);
    if (!Number.isFinite(rawValue)) return;

    if (rawValue <= 0) {
      await removeProduct(productId);
      return;
    }

    const value = Math.min(Math.max(1, Math.floor(rawValue)), 9);
    const currentCart = normalizeCart(cart);
    const targetItem = currentCart.find((item) =>
      cartItemMatchesId(item, productId)
    );
    if (!targetItem) return;

    const nextCart = currentCart.map((item) =>
      item === targetItem ? { ...item, quantity: value } : item
    );

    setCart(nextCart);
    writeCart(user || {}, nextCart, outlet);
  }

  async function removeProduct(productId) {
    const currentCart = normalizeCart(cart);
    const nextCart = currentCart.filter(
      (item) => !cartItemMatchesId(item, productId)
    );
    setCart(nextCart);
    writeCart(user || {}, nextCart, outlet);
  }

  async function clearCart() {
    setCart([]);
    writeCart(user || {}, [], outlet);
  }

  function openCart() {
    if (isHck) return;
    setError("");
    setScreen("cart");
  }

  function startCheckout() {
    if (!loggedIn) {
      setLoginRedirectTarget("cart");
      try {
        sessionStorage.setItem("jr_login_redirect_target", "cart");
      } catch {}
      showToast("Please sign in to proceed to payment");
      setScreen("login");
      return;
    }

    if (!safeCart.length) {
      showToast("Your cart is empty");
      setScreen("menu");
      return;
    }

    if (LOCATION_ENABLED && !selectedLocationId) {
      showToast("Please select a collection location");
      setScreen("location");
      return;
    }

    if (MACHINE_ENABLED && !selectedMachineId) {
      showToast("Please select a Juice Robo machine");
      setScreen("location");
      return;
    }

    handlePayment();
  }

  /* -----------------------------------------------------------
     Q. PAYMENT ORDER INITIATION
     ----------------------------------------------------------- */
  async function handlePayment() {
    if (paymentSession) {
      setScreen("upi-payment");
      startPolling(true);
      return;
    }

    if (!safeCart.length) {
      showToast("Your cart is empty");
      setScreen("cart");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setPaymentMessage("Preparing your secure UPI payment...");

      const resolved = resolveOutletLocationAndMachine(locations, outlet);
      const effectiveLocation = selectedLocation || resolved.location;
      const effectiveMachine = selectedMachine || resolved.machine;

      const locUuid =
        [
          effectiveLocation?.locId,
          effectiveLocation?.locationId,
          effectiveLocation?.location_id,
          effectiveLocation?.locationUuid,
          effectiveLocation?.uuid,
          resolved.location?.locId,
        ]
          .map((v) => String(v ?? "").trim())
          .find((v) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              v
            )
          ) || "";

      const created = await api.createOrder({
        storeId:
          effectiveLocation?.storeId ||
          effectiveLocation?.id ||
          resolved.locationId,
        locId: locUuid,
        location: effectiveLocation,
        locationId: effectiveLocation?.id || resolved.locationId,
        machineId: effectiveMachine?.id || resolved.machineId,
        cartItems: safeCart,
      });

      if (!created) {
        throw new Error("The Juice Robo order was not created.");
      }

      const cartId = String(created?.cartId || "").trim();
      const orderId = String(
        created?.orderId ||
          created?.order_id ||
          created?.id ||
          created?.orderNumber ||
          ""
      ).trim();

      if (!cartId || !orderId) {
        throw new Error(
          "Juice Robo did not return the order/cart reference required for payment verification."
        );
      }

      const backendPayment = buildBackendUpiPaymentUrl(
        created,
        created?.total_amount || created?.totalAmount || finalTotal
      );

      const upiUrl = String(backendPayment?.upiUrl || "").trim();
      if (!validateBackendUpiUrl(upiUrl)) {
        throw new Error(
          "The backend did not return a complete UPI payment request."
        );
      }

      const backendPaymentAmount = formatUpiAmount(
        backendPayment?.amount || created?.total_amount || finalTotal
      );

      const session = {
        cartId,
        orderId,
        transactionId: backendPayment?.transactionId || "",
        upiUrl,
        total: parseFloat(backendPaymentAmount || finalTotal) || 0.0,
        subtotal: Number(subtotal),
        gst: parseFloat(gst) || 0.0,
        collectionCode: created?.collection_code || "",
        orderSnapshot: {
          ...created,
          items: safeCart,
          total_amount: Number(backendPaymentAmount || finalTotal),
          totalAmount: Number(backendPaymentAmount || finalTotal),
        },
      };

      persistPaymentSession(session);
      setPaymentSession(session);
      setPaymentStatus("pending");
      setPaymentMessage(
        "Complete payment in your UPI app. Return to Juice Robo after payment."
      );
      setOrder({
        ...created,
        cartId,
        orderId,
        items: safeCart,
        total_amount: Number(backendPaymentAmount || finalTotal),
        payment_status: "PENDING",
      });

      // Start fresh payment polling loop with reset attempts counter
      pollAttemptsRef.current = 0;
      setScreen("upi-payment");
    } catch (paymentError) {
      console.error("[Juice Robo] Payment initiation failed:", paymentError);
      const msg = errorText(paymentError) || "Unable to start payment.";
      setPaymentStatus("idle");
      setError(msg);
      showToast(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleProceedWithUpi() {
    const session =
      readJSON("juice_robo_payment_session", null) || paymentSession;

    if (!session?.upiUrl) {
      showToast("UPI payment link is unavailable.");
      return;
    }

    launchCrossPlatformUpi(session.upiUrl, {
      onDesktop: () => {
        setPaymentMessage(
          "UPI payment apps cannot be opened from a desktop browser. Please open this same order on your mobile phone to complete payment."
        );
        showToast("Open Juice Robo on your phone to pay with UPI.");
      },
      onNoHandler: () => {
        setPaymentMessage(
          "No compatible UPI app was found. Please ensure a UPI app is installed, or tap Check Status if you paid elsewhere."
        );
      },
    });
  }

  async function openOrderHistory() {
    setScreen("history");
    if (!loggedIn) return;
    try {
      const backendOrders = await api.orders();
      if (Array.isArray(backendOrders)) {
        setHistoryOrders(backendOrders.filter(Boolean));
      }
    } catch (historyError) {
      console.error("[Juice Robo] History load error:", historyError);
    }
  }

  /* -----------------------------------------------------------
     R. SCREEN RENDERER
     ----------------------------------------------------------- */
  if (error && !locations.length && !products.length) {
    return (
      <div className="jr-app">
        <DesktopBlocker isHck={isHck} />
        <div className="jr-mobile-frame">
          <div
            className="jr-loading"
            style={{ padding: "32px 22px", textAlign: "center" }}
          >
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
              {isHck
                ? "Unable to load cleaning services"
                : "Unable to load Juice Robo"}
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
              {isHck
                ? "Loading helmet cleaning services..."
                : "Loading Juice Robo…"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "scan" || !outlet) {
    return (
      <div className="jr-app">
        <DesktopBlocker isHck={isHck} />
        <div className="jr-mobile-frame">
          <ScanQRScreen isHck={isHck} />
          {toast && <Toast message={toast} />}
        </div>
      </div>
    );
  }

  if (screen === "login") {
    return (
      <div className="jr-app">
        <DesktopBlocker isHck={isHck} />
        <div className="jr-mobile-frame">
          <LoginScreen
            customer={customer}
            setCustomer={setCustomer}
            onLogin={handleLogin}
            busy={busy}
            error={error}
            isHck={isHck}
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
          {toast && <Toast message={toast} />}
        </div>
      </div>
    );
  }

  return (
    <div className="jr-app">
      <DesktopBlocker isHck={isHck} />
      <div className="jr-mobile-frame">
        <Header
          cartCount={cartCount}
          onCart={openCart}
          isHck={isHck}
          onLogo={() => setScreen("menu")}
          onProfile={() => {
            if (user && loggedIn) {
              setScreen("profile");
            } else {
              setScreen("login");
            }
          }}
        />

        <div className="jr-screen-container">
          {screen === "profile" && user && (
            <ProfileScreen
              user={user}
              customer={customer}
              setCustomer={setCustomer}
              orders={historyOrders}
              busy={busy}
              error={error}
              loggedIn={loggedIn}
              onSave={handleSaveProfile}
              onBack={() => setScreen("menu")}
              onLogout={handleSignOut}
              onSignOut={handleSignOut}
              onOrders={openOrderHistory}
              onHistory={openOrderHistory}
              isHck={isHck}
            />
          )}

          {screen === "history" && (
            <HistoryScreen
              orders={historyOrders}
              onBack={() => setScreen("profile")}
              money={money}
            />
          )}

          {screen === "location" &&
            (LOCATION_ENABLED ? (
              <LocationMachineScreen
                locations={locations}
                machines={machines}
                selectedLocationId={selectedLocationId}
                selectedMachineId={selectedMachineId}
                onLocation={(loc) => {
                  setSelectedLocationId(String(loc?.id || ""));
                  setSelectedLocationSnapshot(loc);
                }}
                onMachine={(m) => {
                  setSelectedMachineId(String(m?.id || ""));
                  setSelectedMachineSnapshot(m);
                }}
                onContinue={() => setScreen("menu")}
              />
            ) : (
              (() => {
                setTimeout(() => setScreen("menu"), 0);
                return null;
              })()
            ))}

          {screen === "home" && (
            <HomeScreen
              products={products}
              selectedLocation={selectedLocation}
              selectedMachine={selectedMachine}
              onProduct={(p) => {
                setSelectedProduct(p);
                setScreen("product", {
                  productCode: getProductIdentifier(p),
                });
              }}
              productImage={resolveProductImage}
              displayProductName={displayProductName}
              displayDescription={displayDescription}
              money={money}
              showLocation={Boolean(LOCATION_ENABLED)}
              isHck={isHck}
              onMenu={() => setScreen("menu")}
              onLocation={() => setScreen("location")}
              onOrders={openOrderHistory}
              onProfile={() => {
                if (user && loggedIn) setScreen("profile");
                else setScreen("login");
              }}
            />
          )}

          {(screen === "menu" || screen === "product") && (
            <MenuScreen
              products={products}
              selectedLocation={selectedLocation}
              selectedMachine={selectedMachine}
              cart={safeCart}
              onProduct={(p) => {
                setSelectedProduct(p);
                setScreen("product", {
                  productCode: getProductIdentifier(p),
                });
              }}
              onUpdate={updateQuantity}
              onAddToCart={handleAddToCart}
              productImage={resolveProductImage}
              displayProductName={displayProductName}
              displayDescription={displayDescription}
              money={money}
              isHck={isHck}
              selectedHckPackage={selectedHckPackage}
              onToggleHckPackage={(pkg) => {
                if (!isHck) return;
                setSelectedHckPackage((prev) =>
                  isSamePackage(prev, pkg) ? null : pkg
                );
              }}
            />
          )}

          {screen === "product" && (
            <ProductDetailScreen
              product={selectedProduct}
              variant={selectedVariant}
              selectedVariant={selectedVariant}
              cart={safeCart}
              onUpdate={updateQuantity}
              quantity={quantity}
              setQuantity={setQuantity}
              onVariantChange={setSelectedVariant}
              onClose={() => {
                setSelectedProduct(null);
                setSelectedVariant(null);
                setScreen("menu");
              }}
              onBack={() => {
                setSelectedProduct(null);
                setSelectedVariant(null);
                setScreen("menu");
              }}
              onAddToCart={handleAddToCart}
              productImage={resolveProductImage}
              displayProductName={displayProductName}
              displayDescription={displayDescription}
              formatMoney={money}
              money={productMoney}
              isHck={isHck}
            />
          )}

          {screen === "cart" && (
            <CartScreen
              cart={safeCart}
              total={cartTotal}
              subtotal={subtotal}
              gst={gst}
              finalTotal={finalTotal}
              location={selectedLocation}
              machine={selectedMachine}
              onBack={() => setScreen("menu")}
              onUpdate={updateQuantity}
              onRemove={removeProduct}
              onClear={clearCart}
              onLocation={() => setScreen("location")}
              showLocation={Boolean(LOCATION_ENABLED)}
              onCheckout={startCheckout}
              productImage={resolveProductImage}
              displayProductName={displayProductName}
              money={money}
              isHck={isHck}
            />
          )}

          {screen === "location-confirmation" && (
            <LocationConfirmationScreen
              location={selectedLocation}
              machine={selectedMachine}
              cart={safeCart}
              total={finalTotal}
              subtotal={subtotal}
              gst={gst}
              finalTotal={finalTotal}
              onBack={() => setScreen("cart")}
              onConfirm={handlePayment}
              money={money}
            />
          )}

          {screen === "upi-payment" && (
            <PaymentPendingScreen
              session={paymentSession || {}}
              order={order || paymentSession?.orderSnapshot || {}}
              total={paymentSession?.total || finalTotal}
              location={selectedLocation}
              machine={selectedMachine}
              money={money}
              paymentStatus={paymentStatus}
              statusMessage={paymentMessage}
              isVerifying={paymentStatus === "processing"}
              verifying={paymentStatus === "processing"}
              message="Your order is ready. Continue with UPI to choose your preferred payment app. After payment, return to Juice Robo and we will verify it with the backend."
              onCheckStatus={() => startPolling(true)}
              onCancel={handleCancelPayment}
              onProceedWithUpi={handleProceedWithUpi}
              onOpenUpiApp={handleProceedWithUpi}
              isMobile={isMobileDevice}
            />
          )}

          {screen === "payment-failure" && (
            <PaymentFailureScreen
              order={order}
              errorMessage={paymentMessage}
              money={money}
              onRetry={handlePayment}
              onBack={() => setScreen("cart")}
              onHome={() => setScreen("menu")}
              isHck={isHck}
            />
          )}

          {screen === "payment-success" && (
            <PaymentSuccessScreen
              order={order}
              location={selectedLocation}
              machine={selectedMachine}
              money={money}
              onHome={() => setScreen("home")}
              onBack={() => setScreen("menu")}
              onHistory={openOrderHistory}
              isHck={isHck}
            />
          )}
        </div>

        {screen !== "profile" &&
          screen !== "history" &&
          screen !== "product" &&
          screen !== "confirmation" &&
          screen !== "payment-success" &&
          screen !== "payment-failure" &&
          screen !== "location-confirmation" &&
          screen !== "upi-payment" && (
            <BottomNav
              screen={screen}
              setScreen={setScreen}
              cartCount={cartCount}
              onCart={openCart}
              cartTotal={finalTotal}
              money={money}
              onContinue={startCheckout}
              isHck={isHck}
            />
          )}

        {toast && <Toast message={toast} />}

        {error && screen !== "login" && screen !== "upi-payment" && (
          <div className="jr-global-error">{error}</div>
        )}
      </div>
    </div>
  );
}
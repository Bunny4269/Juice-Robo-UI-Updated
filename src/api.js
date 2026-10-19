  /* ============================================================
    JUICE ROBO — API ADAPTER
    ============================================================ */

import {
  buildPlatformUpiUrl,
  extractBackendPaymentData,
  generateAppQrStrings,
  parseUpiUriParams,
  validateBackendUpiUrl,
} from "./payment/paymentEngine.js";

import {
  OUTLET_CONFIG,
  resolveOutletKey,
} from "./shared/config/outletConfig.js";

const API_BASE = String(
  import.meta.env.VITE_JR_API_BASE ||
    "https://tptest.juicerobo.com/tporder/api"
).replace(/\/+$/, "");

const ORDER_API_BASE = String(
  import.meta.env.VITE_JR_ORDER_API_BASE ||
    "https://tptest.juicerobo.com/tpordermaster/api"
).replace(/\/+$/, "");

/*
 * JUICE ROBO MENU ITEMMASTER
 *
 * Menu items are loaded dynamically by outlet menu UUID.
 */
const MENU_LOCATION_ID = String(
  import.meta.env.VITE_JR_MENU_LOCATION_ID ||
    OUTLET_CONFIG.jr.menuLocationId
).trim();

/*
 * Known Item Master menu UUIDs derived from centralized outlet configuration.
 */
const KNOWN_MENU_LOCATION_IDS = Object.freeze(
  Object.fromEntries(
    Object.entries(OUTLET_CONFIG)
      .filter(([, cfg]) => Boolean(cfg?.menuLocationId))
      .map(([k, cfg]) => [
        k.toUpperCase(),
        cfg.menuLocationId,
      ])
  )
);

function isMenuLocationUuid(value) {
  return isUuid(value);
}

function findMenuLocationId(source, depth = 0) {
  if (!source || depth > 7) return "";

  if (typeof source === "string") {
    return isMenuLocationUuid(source) ? clean(source) : "";
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findMenuLocationId(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof source !== "object") return "";

  const preferredKeys = [
    "locId",
    "locID",
    "menuItemCode",
    "menu_item_code",
    "menuLocationId",
    "menu_location_id",
    "menuLocationUUID",
    "menuLocationUuid",
    "menu_location_uuid",
    "itemMasterLocationId",
    "item_master_location_id",
    "itemMasterLocationUuid",
    "item_master_location_uuid",
    "itemMasterId",
    "item_master_id",
    "menuId",
    "menu_id",
    "menuUuid",
    "menu_uuid",
  ];

  for (const key of preferredKeys) {
    const value = clean(source?.[key]);
    if (isMenuLocationUuid(value)) return value;
  }

  for (const key of [
    "menu",
    "itemMaster",
    "item_master",
    "configuration",
    "config",
    "data",
    "result",
    "outlet",
    "store",
  ]) {
    const found = findMenuLocationId(source?.[key], depth + 1);
    if (found) return found;
  }

  return "";
}

function resolveMenuLocationId(location = null, explicitMenuLocationId = "") {
  const explicit = clean(explicitMenuLocationId);
  const explicitKey = resolveOutletKey(explicit);
  if (explicitKey && OUTLET_CONFIG[explicitKey]?.menuLocationId) {
    return OUTLET_CONFIG[explicitKey].menuLocationId;
  }

  if (isMenuLocationUuid(explicit)) return explicit;

  const fromLocation = findMenuLocationId(location);
  if (fromLocation) return fromLocation;

  const locationText = [
    location?.storeName,
    location?.name,
    location?.outletName,
    location?.locationName,
    location?.machineName,
    location?.description,
    location?.locAddress,
  ]
    .map((value) => clean(value).toLowerCase())
    .filter(Boolean)
    .join(" ");

  for (const cfg of Object.values(OUTLET_CONFIG)) {
    if (cfg.name && locationText.includes(cfg.name.toLowerCase())) {
      return cfg.menuLocationId;
    }
    if (cfg.id && locationText.includes(cfg.id.toLowerCase())) {
      return cfg.menuLocationId;
    }
  }

  return "";
}

const DEFAULT_ORG_ID = String(
  import.meta.env.VITE_JR_ORG_ID || ""
).trim();

const JR_API_KEY = String(
  import.meta.env.VITE_JR_API_KEY ||
    "fd272156-8768-47ec-80e5-6779309e6cac"
).trim();

const JR_API_KEY_SECRET = String(
  import.meta.env.VITE_JR_API_KEY_SECRET ||
    "e844933d-9f44-4e4b-b0fe-e7bfc771ce99"
).trim();

export const GST_PERCENT = 12;
export const GST_RATE = GST_PERCENT / 100;

/* ============================================================
   STORAGE / CONFIG
   ============================================================ */

function clean(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim().replace(/^"|"$/g, "");
}

/* ============================================================
   LOCATION IDENTIFIERS
   IMPORTANT: storeId and locId are different identifiers.
   /v1/addcart expects locId as a UUID. Never send a numeric
   storeId such as 200 in the locId field.
   ============================================================ */

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value));
}

function findUuidInObject(source, depth = 0) {
  if (!source || depth > 6) return "";

  if (typeof source === "string") {
    const value = clean(source);
    return isUuid(value) ? value : "";
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findUuidInObject(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof source !== "object") return "";

  const preferredKeys = [
    "locId", "locID", "locationId", "location_id",
    "locationUUID", "locationUuid", "location_uuid",
    "outletId", "outlet_id", "outletUUID", "outletUuid",
    "storeLocationId", "store_location_id",
    "id", "uuid", "locationUuid"
  ];

  for (const key of preferredKeys) {
    const value = clean(source?.[key]);
    if (isUuid(value)) return value;
  }

  for (const key of ["location", "outlet", "store", "data", "result", "_legacyOutlet"]) {
    const found = findUuidInObject(source?.[key], depth + 1);
    if (found) return found;
  }

  return "";
}

function getLocationUuid(source) {
  return findUuidInObject(source);
}


function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

function firstDefined(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== ""
  );
}

function getStoredToken() {
  return (
    clean(localStorage.getItem("juice_robo_access_token")) ||
    clean(localStorage.getItem("juice_robo_token")) ||
    clean(localStorage.getItem("access_token")) ||
    clean(localStorage.getItem("_token"))
  );
}

let sessionExpiredHandler = null;

function onSessionExpired(handler) {
  sessionExpiredHandler = handler;
  return () => {
    sessionExpiredHandler = null;
  };
}

function isTokenValid(token = null) {
  const currentToken = token || getStoredToken();
  if (!currentToken) return false;
  try {
    const parts = currentToken.split(".");
    if (parts.length === 3) {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const parsed = JSON.parse(jsonPayload);
      if (parsed && typeof parsed.exp === "number") {
        return parsed.exp * 1000 > Date.now();
      }
    }
  } catch {
    return true;
  }
  return true;
}

function handleSessionExpired(reason = "Session expired") {
  console.warn("[Juice Robo] Session expired:", reason);
  if (typeof sessionExpiredHandler === "function") {
    sessionExpiredHandler(reason);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("juice-robo:session-expired", { detail: { reason } })
    );
  }
}

function getUserSnapshot() {
  const isAuth =
    clean(localStorage.getItem("juice_robo_logged_in")) === "true" ||
    clean(localStorage.getItem("jr_logged_in")) === "true";
  if (!isAuth) return null;
  const user =
    readJson("juice_robo_user", null) ||
    readJson("user", null) ||
    readJson("jr_user", null);
  if (
    user &&
    typeof user === "object" &&
    (user.id || user.userId || user.email || user.phone || user.userName || user.name)
  ) {
    if (user.name === "Juice Lover" && !user.id && !user.email && !user.phone) {
      return null;
    }
    return user;
  }
  return null;
}

function getOrgId() {
  const stored =
    clean(localStorage.getItem("ORG_ID")) ||
    clean(localStorage.getItem("juice_robo_org_id"));

  if (stored) return stored;

  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );

  const queryOrg =
    clean(params.get("o_id")) || clean(params.get("org_id"));

  if (queryOrg) {
    localStorage.setItem("ORG_ID", queryOrg);
    localStorage.setItem("juice_robo_org_id", queryOrg);
    return queryOrg;
  }

  if (DEFAULT_ORG_ID) {
    localStorage.setItem("ORG_ID", DEFAULT_ORG_ID);
    localStorage.setItem("juice_robo_org_id", DEFAULT_ORG_ID);
    return DEFAULT_ORG_ID;
  }

  return "";
}

function getStoreId() {
  return (
    clean(localStorage.getItem("store_Id")) ||
    clean(localStorage.getItem("juice_robo_store_id"))
  );
}

function saveStoreId(storeId) {
  const value = clean(storeId);
  if (value) {
    localStorage.setItem("store_Id", value);
    localStorage.setItem("juice_robo_store_id", value);
  }
  return value;
}

function clearStoredCartId() {
  localStorage.removeItem("juice_robo_backend_cart_id");
  localStorage.removeItem("juice_robo_cart_id");
}

/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

function unwrap(value) {
  let current = value;
  for (let i = 0; i < 6; i += 1) {
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      current.data !== undefined
    ) {
      current = current.data;
      continue;
    }
    break;
  }
  return current;
}

function asArray(value) {
  const result = unwrap(value);
  if (Array.isArray(result)) return result;

  if (result && typeof result === "object") {
    for (const key of [
      "items",
      "products",
      "locations",
      "outlets",
      "stores",
      "storesData",
      "storeSpot",
      "machines",
      "orders",
      "results",
      "result",
    ]) {
      if (Array.isArray(result[key])) return result[key];
    }
  }

  return [];
}

function normalizeError(data, status) {
  const value = unwrap(data);

  if (value && typeof value === "object") {
    if (typeof value.message === "string") return value.message;
    if (typeof value.error === "string") return value.error;
    if (typeof value.detail === "string") return value.detail;
    if (typeof value.description === "string") return value.description;

    if (Array.isArray(value.errors)) {
      return value.errors
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.message || item?.msg || JSON.stringify(item)
        )
        .join(" ");
    }
  }

  if (typeof value === "string" && value.trim()) return value;
  return `Juice Robo request failed (${status})`;
}

/* ============================================================
   REQUEST
   ============================================================ */

function buildHeaders(options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (JR_API_KEY) headers["JR-API-KEY"] = JR_API_KEY;
  if (JR_API_KEY_SECRET) headers["JR-API-KEY-SECRET"] = JR_API_KEY_SECRET;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (!options.skipAuth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request(path, options = {}, baseUrl = API_BASE) {
  const cleanBase = String(baseUrl).replace(/\/+$/, "");
  const cleanPath = String(path).startsWith("/") ? String(path) : `/${path}`;
  const url = `${cleanBase}${cleanPath}`;
  const { skipAuth, ...fetchOptions } = options;
  const headers = buildHeaders(options);

  console.log(`[Juice Robo] ${fetchOptions.method || "GET"} ${url}`);

  let response;
  try {
    response = await fetch(url, { ...fetchOptions, headers });
  } catch (error) {
    console.error("[Juice Robo] Network error:", error);
    throw new Error(
      "Please check your Internet Connection"
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;

  try {
    if (contentType.toLowerCase().includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text || null;
    }
  } catch {
    data = null;
  }

  console.log("[Juice Robo] Response:", {
    status: response.status,
    url,
    data,
  });

  if (!response.ok) {
    const errorMsg = normalizeError(data, response.status);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    if (response.status === 401 && !options.skipAuth) {
      handleSessionExpired("Backend returned 401 Unauthorized");
    }
    throw error;
  }

  return data;
}

/* ============================================================
   UUID
   ============================================================ */

function generateUuidV4() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/* ============================================================
   PRODUCT NORMALIZATION
   ============================================================ */

function getProductVariants(item = {}) {
  if (Array.isArray(item.lstVariants)) return item.lstVariants;
  if (Array.isArray(item.variants)) return item.variants;
  return [];
}

function normalizeProduct(item) {
  if (!item || typeof item !== "object") return null;

  const variants = getProductVariants(item);
  const availableVariant =
    variants.find(
      (entry) =>
        entry?.isAvailable !== false &&
        entry?.is_available !== false &&
        String(entry?.variantName || "").toLowerCase() === "full"
    ) ||
    variants.find(
      (entry) =>
        entry?.isAvailable !== false && entry?.is_available !== false
    ) ||
    variants[0] ||
    item;

  const name = String(
    firstDefined(item?.name, item?.itemName, item?.productName, "Juice")
  );

  const productType = String(
    firstDefined(
      item?.productType,
      item?.product_type,
      availableVariant?.productType,
      ""
    )
  );

  const variantName = String(
    firstDefined(availableVariant?.variantName, item?.variantName, "Full")
  );

  const variantId = firstDefined(
    availableVariant?.variantId,
    availableVariant?.variant_id,
    availableVariant?.id,
    item?.variantId,
    item?.variant_id,
    item?.id
  );

  const price = Number(
    firstDefined(
      availableVariant?.unitPrice,
      availableVariant?.unit_price,
      availableVariant?.price,
      item?.unitPrice,
      item?.unit_price,
      item?.price,
      0
    )
  );

  const description = String(
    firstDefined(
      availableVariant?.variantDesc,
      item?.description,
      item?.desc,
      ""
    )
  );

  const imageUrl = firstDefined(
    availableVariant?.variantPhoto,
    availableVariant?.variant_photo,
    availableVariant?.photo,
    item?.image_url,
    item?.image,
    ""
  );

  const isAvailable =
    item?.is_available !== false &&
    item?.isAvailable !== false &&
    availableVariant?.is_available !== false &&
    availableVariant?.isAvailable !== false;

  const normalizedVariants = variants.map((variant) => ({
    ...variant,
    variantId: firstDefined(
      variant?.variantId,
      variant?.variant_id,
      variant?.id,
      null
    ),
    id: firstDefined(variant?.variantId, variant?.variant_id, variant?.id, null),
    itemName: String(firstDefined(variant?.itemName, item?.itemName, item?.name, "Juice")),
    variantName: String(firstDefined(variant?.variantName, "Full")),
    variantDesc: String(
      firstDefined(variant?.variantDesc, item?.description, item?.desc, "")
    ),
    unitPrice: Number(
      firstDefined(
        variant?.unitPrice,
        variant?.unit_price,
        variant?.price,
        item?.price,
        0
      )
    ),
    taxInclusive: Boolean(variant?.taxInclusive ?? item?.taxInclusive ?? true),
    taxRate: Number(firstDefined(variant?.taxRate, item?.taxRate, GST_PERCENT)),
    isAvailable:
      variant?.isAvailable !== false && variant?.is_available !== false,
    variantPhoto: variant?.variantPhoto || variant?.variant_photo || null,
  }));

  return {
    ...item,
    id: String(variantId ?? ""),
    itemId: String(firstDefined(item?.id, item?.itemId, variantId, "")),
    productId: firstDefined(item?.productId, item?.product_id, item?.id, null),
    name,
    itemName: String(firstDefined(item?.itemName, name)),
    productName: String(firstDefined(item?.productName, name)),
    productType,
    variantName,
    displayName: productType ? `${name} ${productType}` : name,
    description,
    desc: description,
    price,
    unitPrice: price,
    image_url: imageUrl,
    image: imageUrl,
    is_available: isAvailable,
    isAvailable,
    storeId: firstDefined(
      item?.storeId,
      item?.store_id,
      availableVariant?.storeId,
      getStoreId()
    ),
    lstVariants: normalizedVariants,
    variants: normalizedVariants,
    _variant: availableVariant,
    _legacyItem: item,
  };
}

/* ============================================================
   LOCATION / MACHINE NORMALIZATION
   ============================================================ */

function normalizeLocation(outlet, index = 0, parent = null) {
  if (!outlet || typeof outlet !== "object") return null;

  /* Numeric/legacy outlet identifier used for product APIs. */
  const storeId = clean(
    firstDefined(
      outlet?.storeId,
      outlet?.storeID,
      outlet?.store_id,
      outlet?.storeCode,
      outlet?.store_code,
      outlet?.id,
      outlet?.locId,
      outlet?.locID
    )
  );

  if (!storeId) return null;

  /* UUID required by the order-service cart contract. */
  const locationUuid = getLocationUuid(outlet) || getLocationUuid(parent);

  const name = String(
    firstDefined(
      outlet?.storeName,
      outlet?.name,
      outlet?.outletName,
      outlet?.locationName,
      parent?.outletName,
      ""
    )
  );

  const address = String(
    firstDefined(
      outlet?.locAddress,
      outlet?.address,
      outlet?.location,
      outlet?.description,
      outlet?.outletDesc,
      parent?.outletDesc,
      ""
    )
  );

  return {
    ...outlet,
    id: storeId,
    storeId,
    /* Only expose a value as locId when it is actually a UUID. */
    locId: locationUuid || "",
    locationId: locationUuid || firstDefined(outlet?.locationId, outlet?.location_id, ""),
    locationUuid: locationUuid || "",
    name,
    storeName: firstDefined(outlet?.storeName, name),
    address,
    locAddress: firstDefined(outlet?.locAddress, address),
    is_active: outlet?.isActive !== false && outlet?.active !== false,
    image: firstDefined(outlet?.outletPhoto, outlet?.image, null),
    _legacyOutlet: outlet,
    _index: index,
  };
}

function normalizeOutlets(response) {
  const unwrapped = unwrap(response);
  let source = asArray(response);

  if (
    !source.length &&
    unwrapped &&
    typeof unwrapped === "object" &&
    Array.isArray(unwrapped.storeSpot)
  ) {
    source = unwrapped.storeSpot;
  }

  const parent =
    unwrapped && !Array.isArray(unwrapped) ? unwrapped : null;

  return source
    .map((item, index) => normalizeLocation(item, index, parent))
    .filter(Boolean);
}

function normalizeMachine(source, parent = null) {
  if (!source || typeof source !== "object") return null;

  const machineId = clean(
    firstDefined(
      source?.machineId,
      source?.machine_id,
      source?.id,
      source?.storeId,
      source?.store_id,
      source?.locId,
      parent?.storeId,
      parent?.id
    )
  );

  if (!machineId) return null;

  return {
    ...source,
    id: machineId,
    machineId: firstDefined(source?.machineId, source?.machine_id, machineId),
    machine_code: String(
      firstDefined(source?.machineCode, source?.machine_code, source?.code, machineId)
    ),
    name: String(
      firstDefined(source?.name, source?.machineName, source?.machine_name, parent?.name, "")
    ),
    location_id: String(
      firstDefined(source?.locationId, source?.location_id, parent?.id, machineId)
    ),
    firmware_version: firstDefined(
      source?.firmwareVersion,
      source?.firmware_version,
      "LEGACY"
    ),
    firmwareVersion: firstDefined(
      source?.firmwareVersion,
      source?.firmware_version,
      "LEGACY"
    ),
    status: firstDefined(
      source?.status,
      source?.machineStatus,
      source?.machine_status,
      source?.availabilityStatus,
      source?.availability_status,
      "ONLINE"
    ),
    last_seen_at: firstDefined(source?.lastSeenAt, source?.last_seen_at, null),
    lastSeenAt: firstDefined(source?.lastSeenAt, source?.last_seen_at, null),
    _legacyMachine: source,
  };
}

function normalizeMachines(locationsList) {
  if (!Array.isArray(locationsList)) return [];
  return locationsList
    .map((location) =>
      normalizeMachine(
        {
          id: location.storeId,
          storeId: location.storeId,
          name: location.name,
          status: "ONLINE",
        },
        location
      )
    )
    .filter(Boolean);
}

/* ============================================================
   ORDER NORMALIZATION
   ============================================================ */

function parsePossibleJson(value) {
  if (typeof value !== "string") return value;

  const text = value.trim();
  if (!text) return value;

  // Backend gateways occasionally serialize `data` as a JSON string.
  if (
    (text.startsWith("{") && text.endsWith("}")) ||
    (text.startsWith("[") && text.endsWith("]"))
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return value;
    }
  }

  return value;
}

function extractOrderIdDeep(value, depth = 0, seen = new Set()) {
  if (depth > 10 || value === undefined || value === null) {
    return "";
  }

  const parsed = parsePossibleJson(value);

  if (parsed !== value) {
    return extractOrderIdDeep(parsed, depth + 1, seen);
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return clean(value);
  }

  if (
    typeof value !== "object" ||
    seen.has(value)
  ) {
    return "";
  }

  seen.add(value);

  const preferredKeys = [
    "orderId",
    "order_id",
    "orderID",
    "OrderId",
    "OrderID",
    "orderNumber",
    "order_number",
    "orderNo",
    "order_no",
    "orderCode",
    "order_code",
  ];

  for (const key of preferredKeys) {
    if (
      Object.prototype.hasOwnProperty.call(
        value,
        key
      )
    ) {
      const candidate = clean(value[key]);
      if (candidate) return candidate;
    }
  }

  for (const key of Object.keys(value)) {
    const normalizedKey = String(key)
      .replace(/[ _-]/g, "")
      .toLowerCase();

    if (
      normalizedKey === "orderresp" ||
      normalizedKey === "orderresponse" ||
      normalizedKey === "orderinfo" ||
      normalizedKey === "order"
    ) {
      const found = extractOrderIdDeep(
        value[key],
        depth + 1,
        seen
      );
      if (found) return found;
    }
  }

  for (const key of Object.keys(value)) {
    const found = extractOrderIdDeep(
      value[key],
      depth + 1,
      seen
    );
    if (found) return found;
  }

  return "";
}

function extractOrderId(value) {
  const deepOrderId = extractOrderIdDeep(value);

  if (deepOrderId) {
    return deepOrderId;
  }

  const data = unwrap(value) || {};

  if (typeof data === "string" || typeof data === "number") {
    const text = clean(data);
    return text && !/^(-?\d+(?:\.\d+)?)$/.test(text)
      ? text
      : text;
  }

  const direct = clean(
    firstDefined(
      data?.orderId,
      data?.order_id,
      data?.orderID,
      data?.OrderId,
      data?.OrderID,
      data?.orderNumber,
      data?.order_number,
      data?.orderNo,
      data?.order_no,
      data?.orderCode,
      data?.order_code,
      data?.OrderInfo?.orderId,
      data?.OrderInfo?.order_id,
      data?.OrderInfo?.id,
      data?.orderInfo?.orderId,
      data?.orderInfo?.order_id,
      data?.orderInfo?.id,
      data?.order?.orderId,
      data?.order?.order_id,
      data?.order?.id,
      data?.data?.orderId,
      data?.data?.order_id,
      data?.data?.orderID,
      data?.data?.orderNumber,
      data?.data?.order_number,
      data?.data?.orderCode,
      data?.data?.order_code,
      data?.data?.OrderInfo?.orderId,
      data?.data?.OrderInfo?.order_id,
      data?.data?.OrderInfo?.id,
      data?.result?.orderId,
      data?.result?.order_id,
      data?.result?.orderNumber,
      data?.result?.order_number,
      data?.result?.orderCode,
      data?.result?.order_code,
      data?.result?.OrderInfo?.orderId,
      data?.result?.OrderInfo?.order_id,
      data?.result?.OrderInfo?.id
    )
  );

  if (direct) return direct;

  // Last-resort recursive lookup for legacy Order Master wrappers.
  const seen = new Set();
  const visit = (node, depth = 0) => {
    if (!node || depth > 6 || typeof node !== "object" || seen.has(node)) {
      return "";
    }
    seen.add(node);

    const keys = Object.keys(node);
    for (const key of keys) {
      const normalizedKey = String(key).replace(/[ _-]/g, "").toLowerCase();
      if (
        [
          "orderid",
          "ordercode",
          "ordernumber",
          "orderno",
        ].includes(normalizedKey)
      ) {
        const found = clean(node[key]);
        if (found) return found;
      }
    }

    for (const key of keys) {
      const found = visit(node[key], depth + 1);
      if (found) return found;
    }

    return "";
  };

  return visit(data);
}

function extractCartId(value) {
  const seen = new Set();

  const visit = (node, depth = 0, insideCartObject = false) => {
    if (
      node === undefined ||
      node === null ||
      depth > 10
    ) {
      return "";
    }

    const parsed = parsePossibleJson(node);

    if (parsed !== node) {
      return visit(parsed, depth + 1, insideCartObject);
    }

    /*
     * A backend response can legitimately return the cart UUID as a
     * primitive string, for example:
     *
     * {
     *   status: 200,
     *   message: "Loaded successfully",
     *   data: "19f79b35-eb8d-43a3-9f0d-6308e6beebc9"
     * }
     *
     * Accept primitive values ONLY when they are valid UUIDs.
     * This prevents values such as "-1", "200", or "Invalid Cart
     * Details" from ever being treated as cart IDs.
     */
    if (
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "boolean"
    ) {
      const primitiveValue = clean(node);
      return isUuid(primitiveValue)
        ? primitiveValue
        : "";
    }

    if (
      typeof node !== "object" ||
      seen.has(node)
    ) {
      return "";
    }

    seen.add(node);

    /*
     * Direct cart ID fields.
     *
     * Only accept the value if it is a valid UUID.
     */
    const cartIdKeys = [
      "cartId",
      "cart_id",
      "cartID",
      "CartId",
      "CartID",
      "cartIdentifier",
      "cart_identifier",
    ];

    for (const key of cartIdKeys) {
      if (
        Object.prototype.hasOwnProperty.call(node, key)
      ) {
        const candidate = clean(node[key]);

        if (isUuid(candidate)) {
          return candidate;
        }
      }
    }

    /*
     * If this is specifically a cart object, allow its `id`
     * field to represent the cart ID.
     *
     * We NEVER accept a generic `id` from an arbitrary object,
     * because that could be storeId, orderId, machineId, etc.
     */
    if (insideCartObject) {
      const cartObjectId = clean(
        firstDefined(
          node?.id,
          node?.uuid
        )
      );

      if (isUuid(cartObjectId)) {
        return cartObjectId;
      }
    }

    /*
     * Traverse known response/container objects.
     */
    const nestedCartKeys = [
      "cart",
      "data",
      "result",
      "response",
      "payload",
      "resultData",
      "cartData",
      "cartDetails",
      "cartInfo",
    ];

    for (const key of nestedCartKeys) {
      if (
        Object.prototype.hasOwnProperty.call(node, key)
      ) {
        const child = node[key];

        const found = visit(
          child,
          depth + 1,
          key === "cart" ||
            key === "cartData" ||
            key === "cartDetails" ||
            key === "cartInfo"
        );

        if (found) {
          return found;
        }
      }
    }

    /*
     * Some backend responses may wrap cart information inside
     * arrays or additional objects. Continue searching objects,
     * but ONLY cart-specific keys can produce a result.
     */
    for (const key of Object.keys(node)) {
      const child = node[key];

      if (
        child &&
        typeof child === "object"
      ) {
        const found = visit(
          child,
          depth + 1,
          insideCartObject
        );

        if (found) {
          return found;
        }
      }
    }

    return "";
  };

  return visit(value);
}

function findQrString(value) {
  const extracted = extractBackendPaymentData(value);
  return extracted?.upiUrl || "";
}

function normalizeOrder(rawOrder) {
  const order = unwrap(rawOrder) || {};
  if (!order || typeof order !== "object") return null;

  const id = extractOrderId(order);
  const cartId = extractCartId(order);

  const paymentStatus = String(
    firstDefined(
      order?.payment_status,
      order?.paymentStatus,
      order?.payment_state,
      order?.paymentState,
      order?.transaction_status,
      order?.transactionStatus,
      order?.payment?.status,
      order?.data?.payment_status,
      order?.data?.paymentStatus,
      "PENDING"
    )
  )
    .trim()
    .toUpperCase();

  const status = firstDefined(
    order?.orderStatus,
    order?.order_status,
    order?.status,
    order?.data?.orderStatus,
    order?.data?.order_status,
    "PENDING_PAYMENT"
  );

  const total = Number(
    firstDefined(
      order?.netBill,
      order?.total_amount,
      order?.totalAmount,
      order?.grandTotal,
      order?.grand_total,
      order?.data?.netBill,
      order?.data?.total_amount,
      order?.data?.totalAmount,
      order?.data?.grandTotal,
      0
    )
  );

  const collectionCode = clean(
    firstDefined(
      order?.collection_code,
      order?.collectionCode,
      order?.orderPin,
      order?.order_pin,
      order?.pickupCode,
      order?.pickup_code,
      order?.data?.collection_code,
      order?.data?.collectionCode,
      order?.data?.orderPin,
      order?.data?.order_pin,
      order?.data?.pickupCode,
      order?.data?.pickup_code,
      order?.result?.collection_code,
      order?.result?.collectionCode,
      order?.result?.orderPin,
      order?.result?.order_pin,
      order?.result?.pickupCode,
      order?.result?.pickup_code
    )
  );

  return {
    ...order,
    id,
    orderId: firstDefined(order?.orderId, order?.order_id, id),
    order_id: firstDefined(order?.order_id, order?.orderId, id),
    orderNumber: firstDefined(order?.orderNumber, order?.order_number, id),
    order_number: firstDefined(order?.order_number, order?.orderNumber, id),
    cartId,
    transactionId: firstDefined(order?.transactionId, order?.transaction_id, ""),
    transaction_id: firstDefined(order?.transaction_id, order?.transactionId, ""),
    orderPin: collectionCode,
    order_pin: collectionCode,
    collection_code: collectionCode,
    collectionCode,
    pickupCode: collectionCode,
    pickup_code: collectionCode,
    payment_status: paymentStatus,
    paymentStatus,
    status,
    total_amount: total,
    totalAmount: total,
    qrString: findQrString(rawOrder),
    qr_string: findQrString(rawOrder),
    qrStrings: generateAppQrStrings(findQrString(rawOrder)),
    qr_strings: generateAppQrStrings(findQrString(rawOrder)),
    phonepeQr: generateAppQrStrings(findQrString(rawOrder))?.phonepe || "",
    phonepe_qr: generateAppQrStrings(findQrString(rawOrder))?.phonepe || "",
    gpayQr: generateAppQrStrings(findQrString(rawOrder))?.gpay || "",
    gpay_qr: generateAppQrStrings(findQrString(rawOrder))?.gpay || "",
  };
}

/* ============================================================
   AUTH NORMALIZATION
   ============================================================ */

function normalizeAuth(rawResponse) {
  const response = unwrap(rawResponse) || {};
  const data = response && typeof response === "object" ? response : {};

  const token = clean(
    firstDefined(
      data?.accessToken,
      data?.access_token,
      data?.token,
      data?.jwt,
      data?.data?.accessToken,
      data?.data?.access_token,
      data?.data?.token,
      data?.result?.accessToken,
      data?.result?.access_token,
      data?.result?.token
    )
  );

  const user =
    data?.user ||
    data?.customer ||
    data?.profile ||
    data?.data?.user ||
    data?.data?.customer ||
    (data?.id || data?.userId || data?.email || data?.userName
      ? data
      : getUserSnapshot());

  if (token) {
    localStorage.setItem("juice_robo_token", token);
    localStorage.setItem("juice_robo_access_token", token);
    localStorage.setItem("access_token", token);
  }

  const normalizedUser = {
    ...(user || {}),
    id: firstDefined(user?.id, user?.userId, user?.user_id, ""),
    name: firstDefined(
      user?.name,
      [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      [user?.firstname, user?.lastname].filter(Boolean).join(" "),
      ""
    ),
    email: firstDefined(user?.email, user?.userEmail, ""),
    phone: firstDefined(user?.phone, user?.mobile, user?.userName, ""),
  };

  writeJson("juice_robo_user", normalizedUser);
  writeJson("user", normalizedUser);

  return {
    ...data,
    user: normalizedUser,
    token,
    accessToken: token,
    access_token: token,
  };
}

/* ============================================================
   CART / ORDER PAYLOAD HELPERS
   ============================================================ */

function getVariant(item = {}) {
  return (
    item?._variant ||
    item?.variant ||
    (Array.isArray(item?.lstVariants) ? item.lstVariants[0] : null) ||
    item
  );
}

function getVariantId(item = {}) {
  const variant = getVariant(item);
  return Number(
    firstDefined(
      variant?.variantId,
      variant?.variant_id,
      variant?.id,
      item?.variantId,
      item?.variant_id,
      item?.id,
      item?.productId,
      item?.product_id,
      0
    )
  );
}

function getProductName(item = {}) {
  return String(
    firstDefined(
      item?.itemName,
      item?.name,
      item?.productName,
      item?.product_name,
      "Juice"
    )
  );
}

function getVariantName(item = {}) {
  const variant = getVariant(item);
  return String(firstDefined(variant?.variantName, item?.variantName, "Full"));
}

function getVariantDescription(item = {}) {
  const variant = getVariant(item);
  return String(
    firstDefined(
      variant?.variantDesc,
      item?.variantDesc,
      item?.description,
      item?.desc,
      ""
    )
  );
}

function getPrice(item = {}) {
  const variant = getVariant(item);
  return Number(
    firstDefined(
      variant?.unitPrice,
      variant?.unit_price,
      variant?.price,
      item?.unitPrice,
      item?.unit_price,
      item?.price,
      0
    )
  );
}

function getPhoto(item = {}) {
  const variant = getVariant(item);
  return (
    variant?.variantPhoto ||
    variant?.variant_photo ||
    item?.variantPhoto ||
    item?.image_url ||
    item?.image ||
    null
  );
}

function buildLegacyCartItems(sourceItems = []) {
  return sourceItems.map((item) => {
    const variant = getVariant(item);
    return {
      variantId: getVariantId(item),
      itemName: getProductName(item),
      variantName: getVariantName(item),
      variantDesc: getVariantDescription(item),
      unitPrice: getPrice(item),
      taxInclusive: variant?.taxInclusive ?? item?.taxInclusive ?? true,
      taxRate: Number(firstDefined(variant?.taxRate, item?.taxRate, GST_PERCENT)),
      quantity: Math.max(
        1,
        Math.floor(Number(item?.quantity || variant?.quantity || 1))
      ),
      variantPhoto: getPhoto(item),
    };
  });
}

function buildLegacyOrderPayload(payload = {}) {
  const customer = payload?.customer || payload?.user || getUserSnapshot();
  const sourceItems = Array.isArray(payload?.cartItems)
    ? payload.cartItems
    : Array.isArray(payload?.items)
      ? payload.items
      : [];

  if (!sourceItems.length) throw new Error("Your Juice Robo cart is empty.");

  const storeId = clean(
    firstDefined(
      payload?.storeId,
      payload?.store_id,
      payload?.location?.storeId,
      payload?.location?.store_id,
      payload?.locId,
      payload?.location?.locId,
      getStoreId()
    )
  );

  /*
   * IMPORTANT:
   * locId belongs to the Order Master service and MUST be a UUID.
   *
   * Do not validate it by falling back to storeId here. The real
   * UUID may need to be resolved by api.addCart() from the
   * authoritative location object or the existing backend cart.
   *
   * Keeping this function synchronous also means it cannot perform
   * an API lookup. Therefore createOrder() delegates the final
   * UUID resolution to api.addCart().
   */
  const suppliedLocId =
    clean(payload?.locId) ||
    getLocationUuid(payload?.location) ||
    clean(localStorage.getItem("juice_robo_location_uuid"));

  const locId =
    isUuid(suppliedLocId)
      ? suppliedLocId
      : "";

  if (!storeId) {
    throw new Error("No Juice Robo collection location is selected.");
  }

  const cartId = clean(payload?.cartId) || generateUuidV4();
  const updatedBy = String(
    firstDefined(
      payload?.updatedBy,
      customer?.firstname,
      customer?.firstName,
      customer?.name,
      customer?.email,
      ""
    )
  );

  return {
    cartId: String(cartId),
    storeId,
    locId,
    updatedBy,
    cartItems: buildLegacyCartItems(sourceItems),
  };
}

/* ============================================================
   UPI
   ============================================================ */

function buildUpiPaymentUrl({
  upiId = "",
  payeeName = "Juice Robo",
  amount,
  transactionReference = "",
  transactionNote = "Juice Robo Payment",
} = {}) {
  const safeUpiId = clean(upiId);
  if (!safeUpiId) return "";

  const params = new URLSearchParams();
  params.set("pa", safeUpiId);
  params.set("pn", String(payeeName || "Juice Robo"));

  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.set("am", numericAmount.toFixed(2));
  }

  params.set("cu", "INR");

  if (clean(transactionReference)) params.set("tr", clean(transactionReference));
  if (clean(transactionNote)) params.set("tn", clean(transactionNote));

  return `upi://pay?${params.toString()}`;
}

/* ============================================================
   PUBLIC API
   ============================================================ */

export const api = {
  baseUrl: API_BASE,
  orderBaseUrl: ORDER_API_BASE,

  currentUser: async () => api.profile(),

  users: async () => {
    try {
      const response = await request("/v1/users", {}, API_BASE);
      return asArray(response);
    } catch (error) {
      console.warn("[Juice Robo] users endpoint unavailable:", error);
      return [];
    }
  },

  createUser: async (payload = {}) => {
    if (payload?.password) return api.register(payload);
    const customer = { ...getUserSnapshot(), ...payload };
    writeJson("juice_robo_user", customer);
    writeJson("user", customer);
    return customer;
  },

  createCustomer: async (payload = {}) => {
    const existing = getUserSnapshot();
    const customer = {
      ...existing,
      ...payload,
      name: String(payload?.name || existing?.name || "").trim(),
      phone: String(payload?.phone || existing?.phone || "").replace(/\D/g, ""),
      email: String(payload?.email || existing?.email || "").trim(),
    };
    writeJson("juice_robo_user", customer);
    writeJson("user", customer);
    return customer;
  },

  login: async (payload = {}) => {
    const identifier = clean(
      firstDefined(
        payload?.userName,
        payload?.username,
        payload?.email,
        payload?.phone,
        payload?.identifier
      )
    );

    const password = String(payload?.password || "");
    if (!identifier) throw new Error("Email or phone number is required.");
    if (!password) throw new Error("Password is required.");

    const response = await request(
      "/v1/auth/signin",
      {
        method: "POST",
        body: JSON.stringify({ userName: identifier, password }),
        skipAuth: true,
      },
      API_BASE
    );

    clearStoredCartId();
    return normalizeAuth(response);
  },

  register: async (payload = {}) => {
    const fullName = clean(payload?.name);
    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstName = clean(payload?.firstName || parts[0]);
    const lastName = clean(payload?.lastName || parts.slice(1).join(" ") || firstName);
    const userName = clean(payload?.userName || payload?.phone);
    const userEmail = clean(payload?.userEmail || payload?.email);
    const password = String(payload?.password || "");

    const response = await request(
      "/v1/auth/registerUser",
      {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          userName,
          userEmail,
          password,
          confirmPassword: payload?.confirmPassword || password,
          city: payload?.city || "",
          state: payload?.state || "",
          country: payload?.country || "",
        }),
        skipAuth: true,
      },
      API_BASE
    );

    return normalizeAuth(response);
  },

  logout: async () => {
    for (const key of [
      "juice_robo_token",
      "juice_robo_access_token",
      "access_token",
      "_token",
      "juice_robo_logged_in",
      "jr_logged_in",
      "jr_token",
      "jr_access_token",
      "jr_user",
      "juice_robo_user",
      "user",
      "jr_customer",
    ]) {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {}
    }
    clearStoredCartId();
    return true;
  },

  profile: async () => {
    const user = getUserSnapshot();
    if (!user?.id) return user;

    try {
      const response = await request(
        `/user/${encodeURIComponent(user.id)}`,
        {},
        API_BASE
      );
      const data = unwrap(response);

      if (data && typeof data === "object") {
        const normalized = {
          ...user,
          ...data,
          name:
            firstDefined(
              data?.name,
              [data?.firstName, data?.lastName].filter(Boolean).join(" "),
              user?.name,
              ""
            ),
          email: firstDefined(data?.email, data?.userEmail, user?.email, ""),
          phone: firstDefined(data?.phone, data?.userName, user?.phone, ""),
        };
        writeJson("juice_robo_user", normalized);
        writeJson("user", normalized);
        return normalized;
      }
    } catch (error) {
      console.warn("[Juice Robo] Profile API unavailable; using stored profile.", error);
    }

    return {
      ...user,
      name:
        user?.name ||
        [user?.firstname, user?.lastname].filter(Boolean).join(" ") ||
        "",
      email: user?.email || "",
      phone: user?.phone || "",
    };
  },

  updateProfile: async (payload = {}) => {
    const user = getUserSnapshot();

    if (!user?.id) {
      const next = { ...user, ...payload };
      writeJson("juice_robo_user", next);
      writeJson("user", next);
      return next;
    }

    const response = await request(
      "/user/edit",
      {
        method: "POST",
        body: JSON.stringify({ _method: "patch", id: user.id, ...payload }),
      },
      API_BASE
    );

    const data = unwrap(response) || {};
    const next = { ...user, ...data, ...payload };
    writeJson("juice_robo_user", next);
    writeJson("user", next);
    return next;
  },

  /*
   * MENU ITEMS
   *
   * This is the authoritative endpoint requested for the redesigned
   * Juice Robo website. It intentionally does not depend on the
   * currently selected numeric storeId.
   */
  menuItems: async (requestedMenuLocationId = "", requestedLocation = null) => {
    const menuLocationId =
      resolveMenuLocationId(
        requestedLocation,
        requestedMenuLocationId
      );

    if (!menuLocationId) {
      throw new Error("Juice Robo menu location ID is not configured.");
    }

    const response = await request(
      `/v1/itemmaster/items/${encodeURIComponent(menuLocationId)}`,
      { skipAuth: true },
      API_BASE
    );

    const rawItems = asArray(response);

    const normalizedItems = rawItems
      .map(normalizeProduct)
      .filter(Boolean);

    console.log(
      "[Juice Robo] MENU ITEMS LOADED FROM ITEM MASTER:",
      {
        endpoint:
          `${API_BASE}/v1/itemmaster/items/${menuLocationId}`,
        rawCount: rawItems.length,
        normalizedCount: normalizedItems.length,
        items: normalizedItems,
      }
    );

    return normalizedItems;
  },

  products: async (requestedStoreId = "") => {
    let storeId = clean(requestedStoreId) || getStoreId();

    if (!storeId) {
      throw new Error("No collection location is selected.");
    }

    const response = await request(
      `/v1/itemmaster/items/${encodeURIComponent(storeId)}`,
      { skipAuth: true },
      API_BASE
    );

    return asArray(response).map(normalizeProduct).filter(Boolean);
  },

  getProducts: async (storeId) => api.products(storeId),

  getMenuItems: async (menuLocationId) =>
    api.menuItems(menuLocationId),

  locations: async (requestedOrgId = "") => {
    const orgId = clean(requestedOrgId) || getOrgId();
    if (!orgId) throw new Error("No organization or outlet ID is configured.");

    const response = await request(
      `/v1/getoutlets/${encodeURIComponent(orgId)}`,
      { skipAuth: true },
      API_BASE
    );

    const locationsList = normalizeOutlets(response);
    console.log("[Juice Robo] Parsed locations:", locationsList);
    return locationsList;
  },

  getLocations: async (requestedOrgId = "") => api.locations(requestedOrgId),

  getOutlet: async (outletId = "") => {
    const id = clean(outletId) || getOrgId();
    if (!id) throw new Error("Outlet ID is required.");
    return api.locations(id);
  },

  machines: async (suppliedLocations = null) => {
    const locationsList = Array.isArray(suppliedLocations)
      ? suppliedLocations
      : await api.locations();
    return normalizeMachines(locationsList);
  },

  getMachines: async (locationsList) => api.machines(locationsList),

  addCart: async (payload = {}) => {
    /*
     * /v1/addcart expects locId as java.util.UUID.
     * NEVER fall back to storeId here. The screenshot error was
     * caused by sending the numeric store id (for example 200).
     */
    let locId =
      getLocationUuid(payload) ||
      clean(localStorage.getItem("juice_robo_location_uuid"));

    /*
     * A previous build could have stored the numeric store ID under
     * the UUID key. Never trust it.
     */
    if (!isUuid(locId)) {
      locId = "";
      localStorage.removeItem("juice_robo_location_uuid");
    }

    /* If the selected location object/cache did not expose the UUID,
       try the authoritative current backend cart before failing. */
    if (!locId) {
      try {
        const currentCart = await request(
          "/v1/cart",
          {},
          ORDER_API_BASE
        );
        locId = getLocationUuid(currentCart);
        if (locId) {
          console.log("[Juice Robo] Resolved cart locId UUID from backend cart:", locId);
        }
      } catch (cartLookupError) {
        console.warn("[Juice Robo] Could not resolve locId UUID from current cart:", cartLookupError);
      }
    }

    const sourceItems = Array.isArray(payload?.cartItems)
      ? payload.cartItems
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

    if (!locId) {
      throw new Error("Juice Robo collection location ID is unavailable. Please refresh and select the collection location again.");
    }
    if (!isUuid(locId)) {
      throw new Error("Invalid Juice Robo collection location ID. A UUID is required.");
    }
    if (!sourceItems.length) throw new Error("Your Juice Robo cart is empty.");

    /*
     * /v1/addcart expects cartId as java.util.UUID too.
     * Older builds could have persisted the numeric store ID (200)
     * under a cart-id key. Never send that value as cartId.
     */
    const suppliedCartId = clean(payload?.cartId);
    const storedBackendCartId = clean(localStorage.getItem("juice_robo_backend_cart_id"));
    const storedCartId = clean(localStorage.getItem("juice_robo_cart_id"));

    const cartIdCandidates = [
      suppliedCartId,
      storedBackendCartId,
      storedCartId,
    ];

    let cartId = cartIdCandidates.find((candidate) => isUuid(candidate)) || "";

    /* Purge legacy numeric/invalid cart IDs so they cannot leak into the request. */
    if (!cartId) {
      localStorage.removeItem("juice_robo_backend_cart_id");
      localStorage.removeItem("juice_robo_cart_id");
      cartId = generateUuidV4();
    }

    const cartPayload = {
      cartId: String(cartId),
      locId: String(locId),
      cartItems: buildLegacyCartItems(sourceItems),
    };

    const response = await request(
      "/v1/addcart",
      {
        method: "POST",
        body: JSON.stringify(cartPayload),
      },
      ORDER_API_BASE
    );

    /*
      * ==========================================================
      * VALIDATE THE AUTHORITATIVE CART UUID
      * ==========================================================
      *
      * The /v1/addcart response may contain:
      *
      *   cartId
      *   cart_id
      *   data.cartId
      *   data.cart_id
      *   etc.
      *
      * extractCartId() now returns ONLY a valid UUID.
      *
      * However, we still validate it here because this function is
      * the final boundary before the cart ID is persisted and later
      * submitted to /v1/order/submit.
      */

      const returnedCartId = extractCartId(response);

      console.log(
        "[Juice Robo] ADD CART returned cart ID:",
        returnedCartId || "[NONE]"
      );

      console.log(
        "[Juice Robo] ADD CART generated/supplied cart ID:",
        cartId
      );

      /*
      * Prefer the backend-returned UUID when one exists.
      *
      * If the backend does not return a cart ID, use our original
      * UUID only if it is actually valid.
      */
      const finalCartId = isUuid(returnedCartId)
        ? returnedCartId
        : isUuid(cartId)
          ? cartId
          : "";

      /*
      * NEVER persist an invalid cart ID.
      */
      if (!finalCartId) {
        console.error(
          "[Juice Robo] ADD CART FAILED: No valid cart UUID available.",
          {
            returnedCartId,
            returnedCartIdIsUuid: isUuid(returnedCartId),
            originalCartId: cartId,
            originalCartIdIsUuid: isUuid(cartId),
            response,
          }
        );

        /*
        * Clear potentially stale values so the next checkout cannot
        * accidentally reuse an invalid cart ID.
        */
        localStorage.removeItem(
          "juice_robo_backend_cart_id"
        );

        localStorage.removeItem(
          "juice_robo_cart_id"
        );

        throw new Error(
          "Juice Robo did not return or create a valid cart UUID."
        );
      }

      /*
      * Final safety check.
      *
      * This should always be true at this point.
      */
      if (!isUuid(finalCartId)) {
        throw new Error(
          "Juice Robo cart ID is invalid. A UUID is required."
        );
      }

      console.log(
        "[Juice Robo] FINAL CART UUID:",
        {
          cartId: finalCartId,
          returnedByBackend: returnedCartId || "[NONE]",
          originalCartId: cartId,
          isValidUuid: isUuid(finalCartId),
        }
      );

      /*
      * Do not overwrite store_Id with the UUID locId.
      */
      localStorage.setItem(
        "juice_robo_location_uuid",
        String(locId)
      );

      localStorage.setItem(
        "juice_robo_backend_cart_id",
        String(finalCartId)
      );

      localStorage.setItem(
        "juice_robo_cart_id",
        String(finalCartId)
      );

      return {
        ...(response && typeof response === "object"
          ? response
          : {}),
        cartId: String(finalCartId),
        response,
      };
  },

  updateCart: async (payload = {}) => api.addCart(payload),

  addToCart: async (payload = {}) => api.addCart(payload),

  cart: async () =>
    request("/v1/cart", {}, ORDER_API_BASE),

  getCart: async () => api.cart(),

  submitOrder: async (cartId) => {
    const safeCartId = clean(cartId);

    if (!isUuid(safeCartId)) {
      throw new Error(
        "Juice Robo cart ID is invalid. A valid UUID is required to submit the order."
      );
    }

    console.log(
      "[Juice Robo] ORDER SUBMIT cart UUID:",
      safeCartId
    );

    return request(
      "/v1/order/submit",
      {
        method: "POST",
        body: JSON.stringify({ cartId: safeCartId }),
      },
      ORDER_API_BASE
    );
  },

  createOrder: async (payload = {}) => {
  console.log(
    "[Juice Robo] createOrder payload:",
    payload
  );

  const legacyPayload =
    buildLegacyOrderPayload(payload);

  /*
   * Never trust legacy cartId values here. Older frontend state can
   * contain the numeric outlet/store id (for example "200").
   * api.addCart() is responsible for selecting/creating a valid UUID.
   */
  const suppliedCartId = clean(legacyPayload.cartId);
  const cartId = isUuid(suppliedCartId) ? suppliedCartId : "";

  /*
   * ==========================================================
   * 1. ADD CART
   * ==========================================================
   */

  /*
   * ==========================================================
   * ADD CART THROUGH THE SINGLE UUID-SAFE PATH
   * ==========================================================
   *
   * Do NOT construct /v1/addcart directly here.
   *
   * api.addCart() is the single enforcement point for the
   * Order Master locId contract. It:
   *   1. accepts a real UUID when the selected location has one
   *   2. otherwise tries the authoritative existing backend cart
   *      to recover the UUID
   *   3. refuses to send numeric store IDs such as "200"
   *
   * This removes the old code path that could accidentally send:
   *     { "locId": "200" }
   */
  const addCartPayload = {
    ...legacyPayload,
    /* Empty/invalid values are intentionally passed through so
       api.addCart() can create a UUID instead of ever sending 200. */
    cartId,
    cartItems: legacyPayload.cartItems,
  };

  console.log(
    "[Juice Robo] ADD CART URL:",
    `${ORDER_API_BASE}/v1/addcart`
  );

  console.log(
    "[Juice Robo] ADD CART payload before UUID resolution:",
    {
      cartId,
      locId:
        legacyPayload.locId || "[RESOLVE FROM BACKEND]",
      cartItems:
        legacyPayload.cartItems.map(
          (item) => ({
            variantId:
              Number(item.variantId),
            quantity:
              Number(item.quantity),
          })
        ),
    }
  );

  const addCartResult =
    await api.addCart(
      addCartPayload
    );

  const addCartResponse =
    addCartResult?.response ??
    addCartResult;

  console.log(
    "[Juice Robo] ADD CART response:",
    addCartResponse
  );

  /*
   * The backend may return the authoritative cart ID.
   * Use it when available.
   */
  /*
   * api.addCart() returns the authoritative cartId explicitly.
   * Prefer that value over parsing the raw response because this API
   * returns the UUID in `data` as a string, while older parsing logic
   * only looked for object-shaped cartId fields.
   */
  const returnedCartId =
    clean(addCartResult?.cartId) ||
    extractCartId(addCartResponse);

  const submitCartId =
    isUuid(returnedCartId)
      ? returnedCartId
      : isUuid(cartId)
        ? cartId
        : "";

  if (!submitCartId) {
    throw new Error(
      "Juice Robo did not return a valid cart ID."
    );
  }

  console.log(
    "[Juice Robo] AUTHORITATIVE CART ID:",
    submitCartId
  );

  /*
   * Save the cart ID so the payment flow can survive
   * returning from the UPI application.
   */
  try {
    localStorage.setItem(
      "juice_robo_backend_cart_id",
      String(submitCartId)
    );

    localStorage.setItem(
      "juice_robo_cart_id",
      String(submitCartId)
    );
  } catch {
    // Ignore storage errors.
  }

  /*
   * ==========================================================
   * 2. SUBMIT ORDER
   * ==========================================================
   */

  const submitPayload = {
    cartId:
      String(
        submitCartId
      ),
  };

  console.log(
    "[Juice Robo] ORDER SUBMIT URL:",
    `${ORDER_API_BASE}/v1/order/submit`
  );

  console.log(
    "[Juice Robo] ORDER SUBMIT payload:",
    submitPayload
  );

  const submitResponse =
    await request(
      "/v1/order/submit",
      {
        method: "POST",

        body:
          JSON.stringify(
            submitPayload
          ),
      },
      ORDER_API_BASE
    );

  console.log(
    "================ JUICE ROBO ORDER SUBMIT RESPONSE ================"
  );

  console.log(
    "[Juice Robo] ORDER SUBMIT URL:",
    `${ORDER_API_BASE}/v1/order/submit`
  );

  console.log(
    "[Juice Robo] ORDER SUBMIT PAYLOAD:",
    submitPayload
  );

  console.log(
    "[Juice Robo] ORDER SUBMIT RESPONSE:",
    submitResponse
  );

  console.log(
    "[Juice Robo] ORDER SUBMIT FULL RESPONSE:",
    submitResponse
  );

  console.log(
    "[Juice Robo] ORDER SUBMIT RESPONSE JSON:",
    JSON.stringify(submitResponse, null, 2)
  );

  if (typeof console !== "undefined" && typeof console.dir === "function") {
    try {
      console.dir(submitResponse, { depth: null });
    } catch {}
  }

  try {
    if (typeof window !== "undefined") {
      window.__LAST_ORDER_SUBMIT_RESPONSE__ = submitResponse;
      try {
        sessionStorage.setItem(
          "juice_robo_last_submit_response",
          JSON.stringify(submitResponse)
        );
      } catch {}
    }
  } catch {}

  try {
    const debugBody = JSON.stringify({
      tag: "ORDER_SUBMIT_RESPONSE",
      url: `${ORDER_API_BASE}/v1/order/submit`,
      payload: submitPayload,
      response: submitResponse,
    });
    fetch("/order_now/__debug_log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: debugBody,
    }).catch(() => {});
    if (typeof window !== "undefined" && window.location?.hostname) {
      fetch(`${window.location.protocol}//${window.location.hostname}:5174/order_now/__debug_log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: debugBody,
        mode: "cors",
      }).catch(() => {});
    }
  } catch {}

  // Important payment/order fields
  console.log(
    "[Juice Robo] STATUS:",
    submitResponse?.status
  );

  console.log(
    "[Juice Robo] ORDER ID:",
    submitResponse?.orderId ||
      submitResponse?.order_id ||
      submitResponse?.id
  );

  console.log(
    "[Juice Robo] CART ID:",
    submitResponse?.cartId ||
      submitResponse?.cart_id
  );

  console.log(
    "[Juice Robo] TRANSACTION ID:",
    submitResponse?.transactionId ||
      submitResponse?.transaction_id
  );

  console.log(
    "[Juice Robo] QR / UPI STRING:",
    submitResponse?.qrString ||
      submitResponse?.qr_string ||
      submitResponse?.paymentQr ||
      submitResponse?.payment_qr
  );

  console.log(
    "[Juice Robo] UPI ID / VPA:",
    submitResponse?.upiId ||
      submitResponse?.upi_id ||
      submitResponse?.vpa
  );

  console.log(
    "[Juice Robo] AMOUNT:",
    submitResponse?.netBill ||
      submitResponse?.total_amount ||
      submitResponse?.totalAmount
  );

  console.log(
    "[Juice Robo] PAYMENT URL:",
    submitResponse?.paymentUrl ||
      submitResponse?.payment_url
  );

  console.log(
    "=================================================================="
  );

  /*
   * ==========================================================
   * 3. READ THE ACTUAL BACKEND DATA
   * ==========================================================
   *
   * Backend response:
   *
   * {
   *   status: 200,
   *   message: "...",
   *   data: {
   *     orderId: "...",
   *     cartId: "...",
   *     transactionId: "...",
   *     qrString: "..."
   *   }
   * }
   *
   * IMPORTANT:
   * Read data.orderId directly first.
   */

  const submitData =
    unwrap(
      submitResponse
    ) || {};

  console.log(
    "[Juice Robo] ORDER SUBMIT data:",
    submitData
  );
  /*
  * ==========================================================
  * 3A. VALIDATE ORDER SUBMIT RESPONSE
  * ==========================================================
  *
  * HTTP 200 alone does NOT mean the order was created.
  *
  * The backend can return:
  *
  * {
  *   status: -1,
  *   message: "Invalid Cart Details",
  *   data: {
  *     orderId: -1
  *   }
  * }
  *
  * Such a response MUST NOT continue to payment.
  */

  /*
  * Read the backend/application status.
  */
  const backendStatus = Number(
    firstDefined(
      submitResponse?.status,
      submitResponse?.data?.status,
      submitData?.status,
      submitData?.Status
    )
  );

  /*
  * Read the backend message.
  */
  const backendMessage = clean(
    firstDefined(
      submitResponse?.message,
      submitResponse?.Message,
      submitResponse?.error,
      submitResponse?.detail,

      submitResponse?.data?.message,
      submitResponse?.data?.Message,
      submitResponse?.data?.error,
      submitResponse?.data?.detail,

      submitData?.message,
      submitData?.Message,
      submitData?.error,
      submitData?.detail
    )
  );

  /*
  * Read the order ID ONLY for validation.
  *
  * Do not treat it as a successful order yet.
  */
  const rawOrderId = clean(
    firstDefined(
      submitData?.orderId,
      submitData?.order_id,
      submitData?.orderID,
      submitData?.OrderId,
      submitData?.OrderID
    )
  );

  console.log(
    "[Juice Robo] ORDER SUBMIT validation:",
    {
      backendStatus,
      backendMessage,
      rawOrderId,
      rawOrderIdIsUuid: isUuid(rawOrderId),
    }
  );

  /*
  * ==========================================================
  * INVALID CART RESPONSE
  * ==========================================================
  */

  const responseText = JSON.stringify(
    submitResponse ?? {}
  ).toLowerCase();

  const hasInvalidCartError =
    responseText.includes("invalid cart") ||
    responseText.includes("invalid cart details");

  /*
  * Stop immediately if backend rejected the cart.
  */
  if (hasInvalidCartError) {
    console.error(
      "[Juice Robo] ORDER SUBMIT REJECTED:",
      {
        backendStatus,
        backendMessage,
        rawOrderId,
        submitResponse,
      }
    );

    throw new Error(
      backendMessage ||
        "Juice Robo rejected the order: Invalid Cart Details."
    );
  }

  /*
  * ==========================================================
  * BACKEND FAILURE STATUS
  * ==========================================================
  */

  if (backendStatus === -1) {
    console.error(
      "[Juice Robo] ORDER SUBMIT FAILED:",
      {
        backendStatus,
        backendMessage,
        rawOrderId,
        submitResponse,
      }
    );

    throw new Error(
      backendMessage ||
        "Juice Robo order submission failed."
    );
  }

  /*
  * ==========================================================
  * INVALID ORDER ID
  * ==========================================================
  *
  * An order ID such as:
  *
  *   -1
  *   0
  *   200
  *   "FAILED"
  *
  * is NOT a valid order.
  *
  * The order must have a UUID before payment starts.
  */

  if (
    rawOrderId &&
    !isUuid(rawOrderId)
  ) {
    console.error(
      "[Juice Robo] INVALID ORDER ID:",
      {
        rawOrderId,
        backendStatus,
        backendMessage,
        submitResponse,
      }
    );

    throw new Error(
      backendMessage ||
        "Juice Robo returned an invalid order ID. The order was not created."
    );
  }

  /*
   * ==========================================================
   * 4. EXTRACT ORDER ID
   * ==========================================================
   */

  let orderId =
    clean(
      firstDefined(
        /*
         * Direct backend response
         */
        submitResponse?.orderId,
        submitResponse?.order_id,
        submitResponse?.orderID,

        /*
         * Actual OrderResp location
         */
        submitResponse?.data?.orderId,
        submitResponse?.data?.order_id,
        submitResponse?.data?.orderID,

        /*
         * Unwrapped response
         */
        submitData?.orderId,
        submitData?.order_id,
        submitData?.orderID,

        /*
         * Other known wrappers
         */
        submitData?.OrderInfo?.orderId,
        submitData?.OrderInfo?.order_id,

        submitData?.orderInfo?.orderId,
        submitData?.orderInfo?.order_id,

        submitData?.order?.orderId,
        submitData?.order?.order_id,

        /*
         * Generic extractor as final fallback
         */
        extractOrderId(
          submitResponse
        )
      )
    );

  /*
   * If the backend serializes data as a JSON string,
   * parse it once and retry.
   */
  if (
    !orderId &&
    typeof submitResponse?.data ===
      "string"
  ) {
    try {
      const parsedData =
        JSON.parse(
          submitResponse.data
        );

      orderId =
        clean(
          firstDefined(
            parsedData?.orderId,
            parsedData?.order_id,
            parsedData?.orderID,
            extractOrderId(
              parsedData
            )
          )
        );

      console.log(
        "[Juice Robo] Parsed string data orderId:",
        orderId
      );
    } catch {
      // data was not JSON; ignore.
    }
  }

  console.log(
    "[Juice Robo] FINAL ORDER ID:",
    orderId || "[MISSING]"
  );

  let transactionId =
    clean(
      firstDefined(
        submitResponse?.transactionId,
        submitResponse?.transaction_id,

        submitResponse?.data?.transactionId,
        submitResponse?.data?.transaction_id,

        submitData?.transactionId,
        submitData?.transaction_id
      )
    );

  let recoveredRecentOrder = null;

  /*
   * ==========================================================
   * 4A. RECOVER ORDER ID FROM RECENT ORDERS
   * ==========================================================
   *
   * The TP Order Master API can create the order successfully but
   * /v1/order/submit may return:
   *
   * {
   *   "status": null,
   *   "message": null,
   *   "data": null
   * }
   *
   * In that case there is no orderId to extract from the submit
   * response. The authenticated /v1/order/recent endpoint exposes
   * the created order and includes the exact cartId.
   *
   * IMPORTANT:
   * - This is frontend-only recovery.
   * - Do NOT invent an orderId.
   * - Do NOT use cartId as orderId.
   * - Only accept an order whose cartId exactly matches submitCartId.
   * - Only accept a valid UUID as the recovered orderId.
   */
  if (!orderId) {
    try {
      console.log(
        "[Juice Robo] ORDER SUBMIT returned no orderId. Recovering from /v1/order/recent..."
      );

      const recentResponse =
        await request(
          "/v1/order/recent",
          {},
          ORDER_API_BASE
        );

      console.log(
        "[Juice Robo] RECENT ORDERS raw response:",
        recentResponse
      );

      const recentOrders =
        asArray(
          recentResponse
        );

      console.log(
        "[Juice Robo] RECENT ORDERS count:",
        recentOrders.length
      );

      const matchingRecentOrders =
        recentOrders
          .map((entry) => {
            if (
              !entry ||
              typeof entry !== "object"
            ) {
              return null;
            }

            const candidateCartId =
              clean(
                firstDefined(
                  entry?.cartId,
                  entry?.cart_id,
                  entry?.CartId,
                  entry?.CartID
                )
              );

            const candidateOrderId =
              clean(
                firstDefined(
                  entry?.orderId,
                  entry?.order_id,
                  entry?.orderID,
                  entry?.OrderId,
                  entry?.OrderID
                )
              );

            return {
              entry,
              cartId:
                candidateCartId,
              orderId:
                candidateOrderId,
              orderDate:
                clean(
                  firstDefined(
                    entry?.orderDate,
                    entry?.order_date,
                    entry?.createdAt,
                    entry?.created_at
                  )
                ),
            };
          })
          .filter(
            (entry) =>
              entry &&
              isUuid(entry.cartId) &&
              entry.cartId.toLowerCase() ===
                submitCartId.toLowerCase() &&
              isUuid(entry.orderId)
          )
          .sort((a, b) => {
            const aTime =
              Date.parse(
                a.orderDate
              ) || 0;
            const bTime =
              Date.parse(
                b.orderDate
              ) || 0;

            return bTime - aTime;
          });

      const recoveredOrder =
        matchingRecentOrders[0] || null;

      if (recoveredOrder) {
        recoveredRecentOrder =
          recoveredOrder.entry;

        orderId =
          recoveredOrder.orderId;

        console.log(
          "[Juice Robo] RECOVERED ORDER ID FROM RECENT ORDERS:",
          {
            orderId:
              recoveredOrder.orderId,
            cartId:
              recoveredOrder.cartId,
            orderDate:
              recoveredOrder.orderDate,
          }
        );

        /*
         * The submit response may have been empty, but the recent
         * order record can contain transactionId / collection data.
         * Preserve those values when available.
         */
        if (!transactionId) {
          const recoveredTransactionId =
            clean(
              firstDefined(
                recoveredOrder.entry?.transactionId,
                recoveredOrder.entry?.transaction_id,
                recoveredOrder.entry?.TransactionId,
                recoveredOrder.entry?.TransactionID
              )
            );

          if (recoveredTransactionId) {
            transactionId =
              recoveredTransactionId;
          }
        }
      } else {
        console.warn(
          "[Juice Robo] No recent order matched the submitted cart UUID.",
          {
            submitCartId,
            recentOrders,
          }
        );
      }
    } catch (recoveryError) {
      console.warn(
        "[Juice Robo] Recent-order recovery failed:",
        recoveryError
      );
    }
  }

  console.log(
    "[Juice Robo] FINAL ORDER ID AFTER RECOVERY:",
    orderId || "[MISSING]"
  );

  /*
   * ==========================================================
   * 5. EXTRACT CART ID
   * ==========================================================
   */

  const cleanSubmitResponse = Object.fromEntries(
    Object.entries(submitResponse || {}).filter(
      ([, val]) => val !== null && val !== undefined
    )
  );

  const authoritativeOrderSource = recoveredRecentOrder
    ? { ...recoveredRecentOrder, ...cleanSubmitResponse }
    : submitResponse;

  const configuredUpiId =
    (typeof api?.getConfiguredUpiId === "function"
      ? api.getConfiguredUpiId()
      : clean(import.meta.env.VITE_JR_UPI_ID || "")) || "";

  const existingBackendUpiId = firstDefined(
    recoveredRecentOrder?.upiId,
    recoveredRecentOrder?.upi_id,
    recoveredRecentOrder?.vpa,
    recoveredRecentOrder?.deliveryUpiId,
    recoveredRecentOrder?.delivery_upi_id,
    submitResponse?.upiId,
    submitResponse?.upi_id,
    submitResponse?.vpa,
    submitResponse?.deliveryUpiId,
    submitResponse?.delivery_upi_id,
    submitResponse?.data?.upiId,
    submitResponse?.data?.upi_id,
    submitResponse?.data?.vpa
  );

  const fallbackUpiId = existingBackendUpiId || configuredUpiId;

  const paymentSource = recoveredRecentOrder
    ? {
        ...recoveredRecentOrder,
        ...cleanSubmitResponse,
        ...(fallbackUpiId ? { upiId: fallbackUpiId, vpa: fallbackUpiId } : {}),
        recentOrderResponse: recoveredRecentOrder,
        rawOrderResponse: submitResponse,
      }
    : {
        ...submitResponse,
        ...(fallbackUpiId ? { upiId: fallbackUpiId, vpa: fallbackUpiId } : {}),
      };

  const responseCartId =
    clean(
      firstDefined(
        recoveredRecentOrder?.cartId,
        recoveredRecentOrder?.cart_id,

        submitResponse?.cartId,
        submitResponse?.cart_id,

        submitResponse?.data?.cartId,
        submitResponse?.data?.cart_id,

        submitData?.cartId,
        submitData?.cart_id,

        extractCartId(
          submitResponse
        ),

        submitCartId
      )
    );

  /*
   * ==========================================================
   * 6. EXTRACT TRANSACTION ID
   * ==========================================================
   */

  /*
   * ==========================================================
   * 7. EXTRACT BACKEND QR & PAYMENT INFORMATION
   * ==========================================================
   */

  const frontendFallbackAmount = firstDefined(
    payload?.total_amount,
    payload?.totalAmount,
    payload?.finalTotal,
    payload?.amount,
    legacyPayload?.total_amount,
    legacyPayload?.totalAmount,
    null
  );

  const backendAmountCandidate = firstDefined(
    recoveredRecentOrder?.netBill,
    recoveredRecentOrder?.total_amount,
    recoveredRecentOrder?.totalAmount,
    recoveredRecentOrder?.grandTotal,
    recoveredRecentOrder?.grand_total,
    submitData?.netBill,
    submitData?.total_amount,
    submitData?.totalAmount
  );

  const authoritativeBackendAmount =
    Number(backendAmountCandidate) > 0
      ? backendAmountCandidate
      : frontendFallbackAmount;

  const paymentExtraction = extractBackendPaymentData(
    paymentSource,
    authoritativeBackendAmount
  );

  console.log(
    "[Juice Robo] PAYMENT EXTRACTION:",
    {
      upiUrl: paymentExtraction?.upiUrl || "",
      upiId: paymentExtraction?.upiId || "",
      vpa: paymentExtraction?.vpa || paymentExtraction?.upiId || "",
      amount: paymentExtraction?.amount || "",
      transactionId: paymentExtraction?.transactionId || "",
      merchantName: paymentExtraction?.merchantName || "",
      source: paymentExtraction?.source || "NOT FOUND",
    }
  );

  const qrString =
    paymentExtraction?.upiUrl ||
    findQrString(paymentSource) ||
    findQrString(authoritativeOrderSource) ||
    findQrString(recoveredRecentOrder) ||
    findQrString(submitResponse) ||
    findQrString(submitData);

  if (qrString) {
    console.log(
      "[Juice Robo] FINAL UPI URI:",
      qrString
    );

    const extractedUpiParams = parseUpiUriParams(qrString);
    console.log(
      "[Juice Robo] FINAL UPI PARAMETERS:",
      {
        pa: extractedUpiParams.pa || null,
        am: extractedUpiParams.am || null,
        tr: extractedUpiParams.tr || null,
        tn: extractedUpiParams.tn || null,
        pn: extractedUpiParams.pn || null,
        cu: extractedUpiParams.cu || null,
        mc: extractedUpiParams.mc || null,
      }
    );
  }

  console.log(
    "[Juice Robo] PAYMENT DATA:",
    {
      cartId: responseCartId,
      orderId,
      transactionId: paymentExtraction?.transactionId || transactionId,
      hasQrString: Boolean(qrString),
    }
  );

  /*
   * ==========================================================
   * 8. DO NOT USE CART ID AS ORDER ID
   * ==========================================================
   *
   * The backend status endpoint requires:
   *
   * /order/status/{cartId}/{orderId}
   *
   * Therefore we must have the real backend orderId.
   */

  if (!orderId || !isUuid(orderId)) {
    const diagnostic = {
      reason: orderId
        ? "Backend returned a non-UUID orderId."
        : "Backend did not return an orderId.",
      invalidOrderId: orderId || "",
      cartId: responseCartId,
      submitResponse,
      submitData,
    };

    console.error(
      "[Juice Robo] Backend order was submitted but orderId could not be extracted:",
      diagnostic
    );

    const error =
      new Error(
        orderId
          ? `Juice Robo returned an invalid order ID ("${orderId}"). A valid UUID is required for payment verification.`
          : "Juice Robo order was created, but the backend did not return the order ID required for payment verification."
      );

    error.backendResponse =
      diagnostic;

    throw error;
  }

  /*
   * ==========================================================
   * 9. NORMALIZE ORDER
   * ==========================================================
   */

  const normalized =
    normalizeOrder(
      authoritativeOrderSource
    ) || {};

  const finalOrder = {
    ...normalized,

    id:
      String(orderId),

    orderId:
      String(orderId),

    order_id:
      String(orderId),

    orderNumber:
      String(orderId),

    order_number:
      String(orderId),

    cartId:
      String(responseCartId),

    cart_id:
      String(responseCartId),

    transactionId:
      paymentExtraction?.transactionId ||
      transactionId ||
      recoveredRecentOrder?.transactionId ||
      recoveredRecentOrder?.transaction_id ||
      "",

    transaction_id:
      paymentExtraction?.transactionId ||
      transactionId ||
      recoveredRecentOrder?.transactionId ||
      recoveredRecentOrder?.transaction_id ||
      "",

    qrString:
      qrString,

    qr_string:
      qrString,

    qrStrings:
      paymentExtraction?.qrStrings || generateAppQrStrings(qrString),

    qr_strings:
      paymentExtraction?.qrStrings || generateAppQrStrings(qrString),

    phonepeQr:
      paymentExtraction?.phonepeQr || generateAppQrStrings(qrString)?.phonepe || "",

    phonepe_qr:
      paymentExtraction?.phonepeQr || generateAppQrStrings(qrString)?.phonepe || "",

    gpayQr:
      paymentExtraction?.gpayQr || generateAppQrStrings(qrString)?.gpay || "",

    gpay_qr:
      paymentExtraction?.gpayQr || generateAppQrStrings(qrString)?.gpay || "",

    upiUrl:
      qrString,

    upi_url:
      qrString,

    upiUri:
      qrString,

    upi_uri:
      qrString,

    paymentUrl:
      qrString,

    payment_url:
      qrString,

    upiId:
      paymentExtraction?.upiId || "",

    upi_id:
      paymentExtraction?.upiId || "",

    vpa:
      paymentExtraction?.vpa || paymentExtraction?.upiId || "",

    deliveryUpiId:
      paymentExtraction?.upiId || "",

    delivery_upi_id:
      paymentExtraction?.upiId || "",

    rawCartResponse:
      addCartResponse,

    rawOrderResponse:
      recoveredRecentOrder || submitResponse,

    recentOrderResponse:
      recoveredRecentOrder || null,

    items:
      payload?.cartItems ||
      payload?.items ||
      recoveredRecentOrder?.items ||
      [],

    total_amount:
      Number(
        firstDefined(
          paymentExtraction?.amount,
          authoritativeBackendAmount,
          submitData?.netBill,
          submitData?.total_amount,
          submitData?.totalAmount,
          normalized?.total_amount,
          0
        )
      ),

    totalAmount:
      Number(
        firstDefined(
          paymentExtraction?.amount,
          authoritativeBackendAmount,
          submitData?.netBill,
          submitData?.total_amount,
          submitData?.totalAmount,
          normalized?.totalAmount,
          normalized?.total_amount,
          0
        )
      ),

    netBill:
      firstDefined(
        authoritativeBackendAmount,
        normalized?.netBill,
        null
      ),
  };

  console.log(
    "[Juice Robo] FINAL CREATED ORDER:",
    finalOrder
  );

  return finalOrder;
},

  orders: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    });

    const suffix = query.toString() ? `?${query.toString()}` : "";
    const response = await request(`/v1/order/recent${suffix}`, {}, ORDER_API_BASE);
    return asArray(response).map(normalizeOrder).filter(Boolean);
  },

  getOrders: async (params = {}) => api.orders(params),

  order: async (orderId) => {
    const safeOrderId = clean(orderId);
    if (!safeOrderId) throw new Error("Order ID is required.");

    const response = await request(
      `/order/${encodeURIComponent(safeOrderId)}`,
      {},
      ORDER_API_BASE
    );

    return normalizeOrder(response);
  },

  getOrder: async (orderId) => api.order(orderId),

  getOrderById: async (orderId) => api.order(orderId),

  orderStatus: async (cartId, orderId) => {
    const safeCartId = clean(cartId);
    const safeOrderId = clean(orderId);

    if (!safeCartId) throw new Error("Cart ID is required to check payment status.");
    if (!safeOrderId) throw new Error("Order ID is required to check payment status.");

    // The backend status endpoint requires UUIDs for BOTH path parameters.
    // Never send placeholder values such as -1.
    if (!isUuid(safeCartId)) {
      const error = new Error(
        `Invalid cart ID for payment verification: "${safeCartId}". Expected a UUID.`
      );
      error.code = "INVALID_CART_UUID";
      error.cartId = safeCartId;
      throw error;
    }

    if (!isUuid(safeOrderId)) {
      const error = new Error(
        `Invalid order ID for payment verification: "${safeOrderId}". Expected a UUID.`
      );
      error.code = "INVALID_ORDER_UUID";
      error.orderId = safeOrderId;
      throw error;
    }

    const response = await request(
      `/v1/order/status/${encodeURIComponent(safeCartId)}/${encodeURIComponent(safeOrderId)}`,
      {},
      ORDER_API_BASE
    );

    return normalizeOrder(response);
  },

  getOrderStatus: async (cartId, orderId) => api.orderStatus(cartId, orderId),

  createUpiPaymentUrl: ({
    upiId = import.meta.env.VITE_JR_UPI_ID || "",
    payeeName = "Juice Robo",
    amount,
    transactionReference = "",
    transactionNote = "Juice Robo Payment",
  } = {}) =>
    buildUpiPaymentUrl({
      upiId,
      payeeName,
      amount,
      transactionReference,
      transactionNote,
    }),

  getConfiguredUpiId: () => clean(import.meta.env.VITE_JR_UPI_ID || ""),

  createUpiAppLink: ({ upiUrl = "", app = "phonepe", platform = "" } = {}) => {
    const raw = String(upiUrl || "").trim();
    if (!raw) throw new Error("UPI payment link is unavailable.");

    const questionMark = raw.indexOf("?");
    if (questionMark < 0) throw new Error("Invalid UPI payment link.");

    const isAndroid =
      platform === "android"
        ? true
        : platform === "ios"
        ? false
        : typeof navigator !== "undefined" &&
          /Android/i.test(navigator.userAgent || "");

    const link = buildPlatformUpiUrl(raw, app, isAndroid);
    if (!link) throw new Error("This UPI app is not supported.");
    return link;
  },

  createPaymentOrder: async () => {
    throw new Error(
      "The existing Juice Robo API does not expose the newer Razorpay create-order endpoint."
    );
  },

  verifyPayment: async () => {
    throw new Error(
      "The existing Juice Robo API does not expose the newer Razorpay verification endpoint."
    );
  },

  config: {
    baseUrl: API_BASE,
    orderBaseUrl: ORDER_API_BASE,
    orgId: getOrgId,
    storeId: getStoreId,
    hasApiKey: Boolean(JR_API_KEY),
    hasApiSecret: Boolean(JR_API_KEY_SECRET),
    hasAuthorization: Boolean(getStoredToken()),
    hasUpiId: Boolean(clean(import.meta.env.VITE_JR_UPI_ID || "")),
  },
};

/* ============================================================
   EXPORTS
   ============================================================ */

export {
  API_BASE,
  ORDER_API_BASE,
  DEFAULT_ORG_ID,
  getOrgId,
  getStoreId,
  saveStoreId,
  normalizeProduct,
  normalizeLocation,
  normalizeMachine,
  normalizeOrder,
  normalizeAuth,
  request,
  buildLegacyOrderPayload,
  extractOrderId,
  extractCartId,
  isUuid,
  getLocationUuid,
  onSessionExpired,
  isTokenValid,
};

export default api;

console.log("[Juice Robo] API adapter loaded.", {
  apiBase: API_BASE,
  orderApiBase: ORDER_API_BASE,
  hasApiKey: Boolean(JR_API_KEY),
  hasApiSecret: Boolean(JR_API_KEY_SECRET),
  hasAuthorization: Boolean(getStoredToken()),
  hasUpiId: Boolean(clean(import.meta.env.VITE_JR_UPI_ID || "")),
});

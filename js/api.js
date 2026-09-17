  /* ============================================================
    JUICE ROBO — API ADAPTER
    ============================================================ */

const API_BASE = String(
  import.meta.env?.VITE_JR_API_BASE ||
    import.meta.env?.VITE_API_BASE_URL ||
    ""
).replace(/\/+$/, "");

const ORDER_API_BASE = String(
  import.meta.env?.VITE_JR_ORDER_API_BASE ||
    import.meta.env?.VITE_ORDER_API_BASE_URL ||
    ""
).replace(/\/+$/, "");

const DEFAULT_ORG_ID = String(
  import.meta.env?.VITE_JR_ORG_ID || ""
).trim();

const JR_API_KEY = String(
  import.meta.env?.VITE_JR_API_KEY || ""
).trim();

const JR_API_KEY_SECRET = String(
  import.meta.env?.VITE_JR_API_KEY_SECRET || ""
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

function getUserSnapshot() {
  return readJson("juice_robo_user", null) || readJson("user", null) || {};
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
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
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
    throw new Error(normalizeError(data, response.status));
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
    upiId: clean(firstDefined(outlet?.upiId, outlet?.upi_id, outlet?.vpa, outlet?.upi, outlet?.merchantUpiId, outlet?.merchant_upi_id, parent?.upiId, parent?.upi_id, parent?.vpa)),
    upi_id: clean(firstDefined(outlet?.upiId, outlet?.upi_id, outlet?.vpa, outlet?.upi, outlet?.merchantUpiId, outlet?.merchant_upi_id, parent?.upiId, parent?.upi_id, parent?.vpa)),
    vpa: clean(firstDefined(outlet?.upiId, outlet?.upi_id, outlet?.vpa, outlet?.upi, outlet?.merchantUpiId, outlet?.merchant_upi_id, parent?.upiId, parent?.upi_id, parent?.vpa)),
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

  const machineUpi = clean(
    firstDefined(
      source?.upiId,
      source?.upi_id,
      source?.vpa,
      source?.upi,
      source?.merchantUpiId,
      source?.merchant_upi_id,
      parent?.upiId,
      parent?.upi_id,
      parent?.vpa
    )
  );

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
    upiId: machineUpi,
    upi_id: machineUpi,
    vpa: machineUpi,
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
    const candidate = clean(value);

    // Cart IDs for Order Master are UUIDs. Never treat arbitrary
    // scalar response values such as HTTP status 200 or store ID 200
    // as the cart ID.
    return isUuid(candidate) ? candidate : "";
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

function extractCartId(value, depth = 0, seen = new Set()) {
  if (value === undefined || value === null || depth > 8) {
    return "";
  }

  const parsed = parsePossibleJson(value);
  if (parsed !== value) {
    return extractCartId(parsed, depth + 1, seen);
  }

  if (typeof value === "string") {
    const cleaned = clean(value);
    if (isUuid(cleaned)) return cleaned;
    return depth === 0 ? cleaned : "";
  }

  if (typeof value !== "object" || seen.has(value)) {
    return "";
  }
  seen.add(value);

  // If response has direct data string which is UUID or non-empty string (e.g. /v1/addcart returns { status: 200, data: "uuid" })
  if (typeof value.data === "string") {
    const dataCleaned = clean(value.data);
    if (dataCleaned && isUuid(dataCleaned)) return dataCleaned;
  }

  const preferredKeys = [
    "cartId",
    "cart_id",
    "cartID",
    "CartId",
    "cartIdentifier",
    "cart_identifier",
  ];

  for (const key of preferredKeys) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const candidate = clean(value[key]);
      if (candidate) return candidate;
    }
  }

  const data = unwrap(value);
  if (data && data !== value) {
    if (typeof data === "string" && isUuid(data)) {
      return clean(data);
    }
    if (typeof data === "object") {
      for (const key of preferredKeys) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const candidate = clean(data[key]);
          if (candidate) return candidate;
        }
      }
    }
  }

  // Recursive search matching only cartId keys or objects
  for (const key of Object.keys(value)) {
    const normalizedKey = String(key).replace(/[ _-]/g, "").toLowerCase();
    if (["cartid", "cartidentifier"].includes(normalizedKey)) {
      const found = clean(value[key]);
      if (found) return found;
    }
    const val = value[key];
    if (val && typeof val === "object") {
      const found = extractCartId(val, depth + 1, seen);
      if (found) return found;
    }
  }

  return "";
}

function findQrString(value) {
  const data = unwrap(value);

  if (typeof data === "string" && /^upi:\/\/pay\?/i.test(data.trim())) {
    return data.trim();
  }

  if (!data || typeof data !== "object") return "";

  const candidates = [
    data?.qrString,
    data?.qr_string,
    data?.upiUrl,
    data?.upi_url,
    data?.upiLink,
    data?.upi_link,
    data?.paymentQr,
    data?.payment_qr,
    data?.paymentUrl,
    data?.payment_url,
    data?.qr?.qrString,
    data?.qr?.qr_string,
    data?.qr?.upiUrl,
    data?.payment?.qrString,
    data?.payment?.qr_string,
    data?.payment?.upiUrl,
    data?.data?.qrString,
    data?.data?.qr_string,
    data?.data?.upiUrl,
    data?.result?.qrString,
    data?.result?.qr_string,
    data?.result?.upiUrl,
  ];

  return (
    candidates
      .map(clean)
      .find((candidate) => /^upi:\/\/pay\?/i.test(candidate)) || ""
  );
}

function collectNestedValues(value, maxDepth = 8) {
  const values = [];
  const seen = new Set();

  function visit(node, depth) {
    if (node === undefined || node === null || depth > maxDepth) return;

    if (typeof node !== "object") {
      values.push(node);
      return;
    }

    if (seen.has(node)) return;
    seen.add(node);

    values.push(node);

    if (Array.isArray(node)) {
      node.forEach((item) => visit(item, depth + 1));
      return;
    }

    Object.keys(node).forEach((key) => {
      visit(node[key], depth + 1);
    });
  }

  visit(value, 0);
  return values;
}

function deepFirstDefined(rawValue, keys = []) {
  const nodes = collectNestedValues(rawValue);

  for (const node of nodes) {
    if (!node || typeof node !== "object" || Array.isArray(node)) continue;

    for (const key of keys) {
      if (
        node[key] !== undefined &&
        node[key] !== null &&
        node[key] !== ""
      ) {
        return node[key];
      }
    }
  }

  return undefined;
}

function deepFirstUuid(rawValue) {
  const nodes = collectNestedValues(rawValue);

  for (const node of nodes) {
    if (typeof node === "string") {
      const value = clean(node);
      if (isUuid(value)) return value;
      continue;
    }

    if (!node || typeof node !== "object" || Array.isArray(node)) continue;

    const candidate = firstDefined(
      node.locId,
      node.locID,
      node.locationId,
      node.location_id,
      node.locationUUID,
      node.locationUuid,
      node.location_uuid,
      node.uuid
    );

    if (isUuid(candidate)) return clean(candidate);
  }

  return "";
}

function normalizeOrder(rawOrder) {
  const raw = rawOrder && typeof rawOrder === "object" ? rawOrder : {};
  const order = unwrap(rawOrder) || {};

  if (!order || typeof order !== "object") return null;

  /*
   * IMPORTANT:
   * Keep both the unwrapped order and the original response available.
   * The status endpoint can return payment data under several nested
   * envelopes such as data, result, payment, order, response, etc.
   */
  const nodes = collectNestedValues(rawOrder);

  const id = clean(
    firstDefined(
      deepFirstDefined(rawOrder, [
        "orderId",
        "order_id",
        "orderID",
        "orderNumber",
        "order_number",
      ]),
      extractOrderId(order)
    )
  );

  const cartId = clean(
    firstDefined(
      deepFirstDefined(rawOrder, [
        "cartId",
        "cart_id",
        "cartID",
        "CartId",
      ]),
      extractCartId(order)
    )
  );

  const paymentStatus = String(
    firstDefined(
      deepFirstDefined(rawOrder, [
        "payment_status",
        "paymentStatus",
        "payment_state",
        "paymentState",
        "transaction_status",
        "transactionStatus",
        "paymentStatusCode",
        "payment_status_code",
        "status",
      ]),
      "PENDING"
    )
  )
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const status = String(
    firstDefined(
      deepFirstDefined(rawOrder, [
        "orderStatus",
        "order_status",
        "status",
      ]),
      "PENDING_PAYMENT"
    )
  );

  const total = Number(
    firstDefined(
      deepFirstDefined(rawOrder, [
        "netBill",
        "total_amount",
        "totalAmount",
        "grandTotal",
        "grand_total",
      ]),
      0
    )
  );

  const collectionCode = clean(
    firstDefined(
      deepFirstDefined(rawOrder, [
        "collection_code",
        "collectionCode",
        "collection_pin",
        "collectionPin",
        "orderPin",
        "order_pin",
        "pickupCode",
        "pickup_code",
      ]),
      ""
    )
  );

  const transactionId = clean(
    firstDefined(
      deepFirstDefined(rawOrder, [
        "transactionId",
        "transaction_id",
      ]),
      ""
    )
  );

  const qrString = findQrString(rawOrder);

  return {
    ...order,

    /* Preserve the original backend envelope for App-level verification. */
    rawResponse: rawOrder,
    _rawResponse: rawOrder,
    responseEnvelope: rawOrder,

    id,
    orderId: firstDefined(order?.orderId, order?.order_id, id),
    order_id: firstDefined(order?.order_id, order?.orderId, id),
    orderNumber: firstDefined(order?.orderNumber, order?.order_number, id),
    order_number: firstDefined(order?.order_number, order?.orderNumber, id),

    cartId,
    cart_id: cartId,

    transactionId,
    transaction_id: transactionId,

    orderPin: collectionCode,
    order_pin: collectionCode,
    collection_code: collectionCode,
    collectionCode,
    collection_pin: collectionCode,
    collectionPin: collectionCode,
    pickupCode: collectionCode,
    pickup_code: collectionCode,

    payment_status: paymentStatus,
    paymentStatus,
    payment_state: paymentStatus,
    paymentState: paymentStatus,
    transaction_status: paymentStatus,
    transactionStatus: paymentStatus,

    status,
    total_amount: total,
    totalAmount: total,
    qrString,

    /* Helpful diagnostics without changing the public API contract. */
    _paymentNodes: nodes.length,
    _locationUuid: deepFirstUuid(rawOrder),
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
      "Juice Lover"
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

function normalizePaymentStatus(rawResponse) {
  if (!rawResponse) return { status: "UNKNOWN", raw: null, isPaid: false, isPending: false, isFailed: false };

  const raw = rawResponse?.rawResponse || rawResponse?._rawResponse || rawResponse?.responseEnvelope || rawResponse;
  const data = unwrap(raw) || unwrap(rawResponse) || {};

  const rawStatus = String(
    firstDefined(
      data?.orderStatus,
      data?.order_status,
      rawResponse?.orderStatus,
      rawResponse?.order_status,
      data?.payment_status,
      data?.paymentStatus,
      rawResponse?.payment_status,
      rawResponse?.paymentStatus,
      data?.transaction_status,
      data?.transactionStatus,
      rawResponse?.transaction_status,
      rawResponse?.transactionStatus,
      data?.status,
      rawResponse?.status
    ) || ""
  ).toUpperCase().replace(/[\s-]+/g, "_");

  const orderPin = clean(
    firstDefined(
      data?.orderPin,
      data?.order_pin,
      rawResponse?.orderPin,
      rawResponse?.order_pin,
      data?.collection_code,
      data?.collectionCode,
      rawResponse?.collection_code,
      rawResponse?.collectionCode
    )
  );

  const isBooleanPaid =
    data?.paid === true ||
    data?.isPaid === true ||
    data?.paymentSuccessful === true ||
    data?.payment_successful === true ||
    rawResponse?.paid === true ||
    rawResponse?.isPaid === true;

  const paidStates = [
    "PAYMENT_SUCCESS",
    "PAYMENT_SUCCESSFUL",
    "SUCCESS",
    "SUCCESSFUL",
    "COMPLETED",
    "COMPLETE",
    "PAID",
    "ORDER_SUCCESS",
    "ORDER_COMPLETED",
    "SUCCESSFULLY_PAID",
    "PAYMENT_COMPLETED",
    "TRANSACTION_SUCCESS",
    "TRANSACTION_SUCCESSFUL",
    "SETTLED",
    "CONFIRMED",
  ];

  const failedStates = [
    "PAYMENT_FAILED",
    "PAYMENT_FAILURE",
    "QR_FAILED",
    "FAILED",
    "FAILURE",
    "CANCELLED",
    "CANCELED",
    "DECLINED",
    "REJECTED",
    "EXPIRED",
    "TRANSACTION_FAILED",
  ];

  const pendingStates = [
    "QR_INIT",
    "PENDING",
    "INITIATED",
    "CREATED",
    "PROCESSING",
    "AWAITING_PAYMENT",
    "PAYMENT_PENDING",
    "PAYMENT_PROCESSING",
    "UNPAID",
    "NOT_PAID",
  ];

  if (isBooleanPaid || paidStates.includes(rawStatus)) {
    return {
      status: "SUCCESS",
      collectionCode: orderPin,
      orderPin,
      rawStatus: rawStatus || "PAID",
      isPaid: true,
      isPending: false,
      isFailed: false,
      data,
    };
  }

  if (failedStates.includes(rawStatus)) {
    return {
      status: "FAILED",
      collectionCode: "",
      orderPin: "",
      rawStatus,
      isPaid: false,
      isPending: false,
      isFailed: true,
      data,
    };
  }

  if (pendingStates.includes(rawStatus) || !rawStatus) {
    return {
      status: "PENDING",
      collectionCode: "",
      orderPin: "",
      rawStatus: rawStatus || "PENDING",
      isPaid: false,
      isPending: true,
      isFailed: false,
      data,
    };
  }

  return {
    status: "UNKNOWN",
    collectionCode: orderPin,
    orderPin,
    rawStatus,
    isPaid: false,
    isPending: false,
    isFailed: false,
    data,
  };
}

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

  // NPCI specification: `tn` must be alphanumeric and spaces only, max 50 chars.
  const safeNote = clean(transactionNote) || "Juice Robo Payment";
  const cleanNote = safeNote
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
  if (cleanNote) {
    params.set("tn", cleanNote);
  }

  // CRITICAL FIX FOR PHONEPE "Verification Failed":
  // PhonePe strictly verifies `tr` (Transaction Reference) and `tid` (Terminal ID)
  // against its Payment Gateway database. When an unregistered client/backend
  // transaction reference is present, PhonePe rejects the payment intent with
  // the exact modal dialog: "Verification Failed".
  // Omitting `tr` allows PhonePe and all UPI apps to process the intent as a
  // standard direct UPI payment. Backend order verification is handled independently
  // via the order status polling endpoint.
  void transactionReference;

  return `upi://pay?${params.toString().replace(/\+/g, "%20").replace(/%40/g, "@")}`;
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
    ]) {
      localStorage.removeItem(key);
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
              "Juice Lover"
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
        "Juice Lover",
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

  products: async (requestedStoreId = "") => {
    let storeId = clean(requestedStoreId) || getStoreId();

    if (!storeId) {
      const availableLocations = await api.locations();
      storeId = availableLocations?.[0]?.storeId || "";
      if (storeId) saveStoreId(storeId);
    }

    if (!storeId) {
      throw new Error("No Juice Robo collection location is selected.");
    }

    const response = await request(
      `/v1/itemmaster/items/${encodeURIComponent(storeId)}`,
      { skipAuth: true },
      API_BASE
    );

    return asArray(response).map(normalizeProduct).filter(Boolean);
  },

  getProducts: async (storeId) => api.products(storeId),

  locations: async () => {
    const orgId = getOrgId();
    if (!orgId) throw new Error("Juice Robo organization ID is not configured.");

    const response = await request(
      `/v1/getoutlets/${encodeURIComponent(orgId)}`,
      { skipAuth: true },
      API_BASE
    );

    const locationsList = normalizeOutlets(response);

    if (locationsList.length) {
      const current = getStoreId();
      const exists = locationsList.some(
        (location) => String(location.storeId) === String(current)
      );
      if (!exists) saveStoreId(locationsList[0].storeId);
    }

    console.log("[Juice Robo] Parsed locations:", locationsList);
    return locationsList;
  },

  getLocations: async () => api.locations(),

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

    const returnedCartId = extractCartId(response);
    const finalCartId = returnedCartId || cartId;

    /* Do not overwrite store_Id with the UUID locId. */
    localStorage.setItem("juice_robo_location_uuid", String(locId));
    localStorage.setItem("juice_robo_backend_cart_id", String(finalCartId));
    localStorage.setItem("juice_robo_cart_id", String(finalCartId));

    return {
      ...(response && typeof response === "object" ? response : {}),
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
    if (!safeCartId) throw new Error("Juice Robo cart ID is required to submit the order.");

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
    "[Juice Robo] ADD CART RESPONSE:",
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
    "[Juice Robo] ORDER SUBMIT PAYLOAD:",
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
    "[Juice Robo] ORDER SUBMIT RESPONSE:",
    submitResponse
  );
  console.error(
    "[Juice Robo DEBUG SUBMIT RESPONSE]:",
    JSON.stringify(submitResponse)
  );

  const submitStatusCode = Number(
    submitResponse?.status
  );
  const submitMessage = String(
    firstDefined(
      submitResponse?.message,
      submitResponse?.data?.message,
      ""
    ) || ""
  ).trim();

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
   * 4. EXTRACT ORDER ID
   * ==========================================================
   */

  let orderId =
    clean(
      firstDefined(
        /* Direct backend response */
        submitResponse?.orderId,
        submitResponse?.order_id,
        submitResponse?.orderID,
        submitResponse?.id,

        /* OrderResp location inside data */
        submitResponse?.data?.orderId,
        submitResponse?.data?.order_id,
        submitResponse?.data?.orderID,
        submitResponse?.data?.id,
        submitResponse?.data?.orderNumber,
        submitResponse?.data?.order_number,
        submitResponse?.data?.orderNo,
        submitResponse?.data?.order_no,

        /* Nested orderResp */
        submitResponse?.data?.orderResp?.orderId,
        submitResponse?.data?.orderResp?.order_id,
        submitResponse?.data?.orderResp?.id,

        /* Unwrapped response */
        submitData?.orderId,
        submitData?.order_id,
        submitData?.orderID,
        submitData?.id,
        submitData?.orderNumber,
        submitData?.order_number,
        submitData?.orderNo,
        submitData?.order_no,
        submitData?.orderResp?.orderId,
        submitData?.orderResp?.order_id,
        submitData?.orderResp?.id,

        /* Other known wrappers */
        submitData?.OrderInfo?.orderId,
        submitData?.OrderInfo?.order_id,
        submitData?.OrderInfo?.id,
        submitData?.orderInfo?.orderId,
        submitData?.orderInfo?.order_id,
        submitData?.orderInfo?.id,
        submitData?.order?.orderId,
        submitData?.order?.order_id,
        submitData?.order?.id,

        /* If data is a plain UUID/ID string */
        typeof submitResponse?.data === "string" && submitResponse.data.trim().length > 3 && submitResponse.data.trim() !== "-1"
          ? submitResponse.data.trim()
          : null,
        typeof submitData === "string" && submitData.trim().length > 3 && submitData.trim() !== "-1"
          ? submitData.trim()
          : null,

        /* Generic extractor */
        extractOrderId(
          submitResponse
        )
      )
    );

  /*
   * If the backend serializes data as a JSON string, parse it once.
   */
  if (
    !orderId &&
    typeof submitResponse?.data === "string"
  ) {
    try {
      const parsedData = JSON.parse(submitResponse.data);
      orderId = clean(
        firstDefined(
          parsedData?.orderId,
          parsedData?.order_id,
          parsedData?.orderID,
          parsedData?.id,
          extractOrderId(parsedData)
        )
      );
      if (orderId) {
        console.log("[Juice Robo] Parsed string data orderId:", orderId);
      }
    } catch {
      // data was not JSON; ignore.
    }
  }

  /*
   * If backend returned status < 0, only treat as hard business failure
   * if there is NO orderId embedded in the response AND it is not just
   * a QR generation warning (e.g. PhonePe test environment).
   */
  const isQrWarning =
    submitMessage.toLowerCase().includes("qr") ||
    submitMessage.toLowerCase().includes("payment link");

  const submitBusinessFailure =
    Number.isFinite(submitStatusCode) &&
    submitStatusCode < 0 &&
    !orderId &&
    !isQrWarning;

  if (submitBusinessFailure) {
    const error = new Error(
      submitMessage || "Juice Robo could not create the order."
    );
    error.backendResponse = submitResponse;

    console.error("[Juice Robo] ORDER CREATION FAILED:", {
      cartId: submitCartId,
      status: submitStatusCode,
      message: submitMessage,
      response: submitResponse,
    });

    throw error;
  }

  /*
   * Fallback: If orderId is still missing, attempt to find latest order
   * from the backend's recent orders endpoint.
   */
  if (!orderId || orderId === "-1") {
    try {
      console.log("[Juice Robo] Attempting to recover order reference from /v1/order/recent...");
      const recentOrders = await api.orders({ limit: 5 });
      if (Array.isArray(recentOrders) && recentOrders.length > 0) {
        const matching =
          recentOrders.find(
            (o) =>
              clean(o?.cartId) === clean(submitCartId) ||
              clean(o?.cart_id) === clean(submitCartId)
          ) || recentOrders[0];

        const candidate = clean(matching?.orderId || matching?.id || matching?.order_id);
        if (candidate && candidate !== "-1") {
          orderId = candidate;
          console.log("[Juice Robo] Recovered orderId from recent orders:", orderId);
        }
      }
    } catch (recentErr) {
      console.warn("[Juice Robo] Unable to query recent orders:", recentErr);
    }
  }

  /*
   * Final fallback: Generate a resilient client order tracking reference
   * so the customer is never blocked from proceeding to payment.
   */
  if (!orderId || orderId === "-1") {
    const cleanCartSub = clean(submitCartId).replace(/-/g, "").slice(0, 8).toUpperCase();
    orderId = cleanCartSub ? `JR-${cleanCartSub}` : `JR-${Date.now().toString().slice(-6)}`;
    console.warn(
      "[Juice Robo] Backend submit did not provide an orderId; using resilient fallback order reference:",
      orderId
    );
  }

  console.log(
    "[Juice Robo] FINAL ORDER ID:",
    orderId
  );

  /*
   * ==========================================================
   * 5. EXTRACT CART ID
   * ==========================================================
   */

  const responseCartId =
    clean(
      firstDefined(
        submitResponse?.cartId,
        submitResponse?.cart_id,
        submitResponse?.data?.cartId,
        submitResponse?.data?.cart_id,
        submitData?.cartId,
        submitData?.cart_id,
        extractCartId(submitResponse),
        submitCartId
      )
    );

  /*
   * ==========================================================
   * 6. EXTRACT TRANSACTION ID
   * ==========================================================
   */

  let transactionId =
    clean(
      firstDefined(
        submitResponse?.transactionId,
        submitResponse?.transaction_id,
        submitResponse?.data?.transactionId,
        submitResponse?.data?.transaction_id,
        submitData?.transactionId,
        submitData?.transaction_id,
        submitData?.orderResp?.transactionId
      )
    );

  // NOTE: Do NOT invent a TXN timestamp here.
  // PhonePe and other UPI gateways validate the `tr` field against their own
  // payment-gateway records. A client-generated reference that was never
  // registered on the gateway side will cause "Verification Failed".
  // Leave transactionId empty when the backend does not provide one.
  console.log(
    "[Juice Robo] TRANSACTION REFERENCE:",
    transactionId || "[NONE — backend did not return one]"
  );

  /*
   * ==========================================================
   * 7. EXTRACT BACKEND QR
   * ==========================================================
   */

  const qrString =
    findQrString(
      submitResponse
    ) ||
    findQrString(
      submitData
    );

  console.log(
    "[Juice Robo] PAYMENT DATA SOURCE:",
    qrString ? "BACKEND QR / UPI PAYLOAD" : "TRANSACTION REFERENCE & CONFIGURED VPA"
  );

  /*
   * ==========================================================
   * 9. NORMALIZE ORDER
   * ==========================================================
   */

  const normalized =
    normalizeOrder(
      submitResponse
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
      transactionId,

    transaction_id:
      transactionId,

    qrString:
      qrString,

    qr_string:
      qrString,

    rawCartResponse:
      addCartResponse,

    rawOrderResponse:
      submitResponse,

    items:
      payload?.cartItems ||
      payload?.items ||
      [],

    total_amount:
      Number(
        firstDefined(
          submitData?.netBill,
          submitData?.total_amount,
          submitData?.totalAmount,
          normalized?.total_amount,
          0
        )
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

  createUpiAppLink: (appOrOptions = {}, maybeUpiUrl = "", maybeTransactionId = "") => {
    let upiUrl = "";
    let app = "phonepe";
    let transactionId = "";

    if (typeof appOrOptions === "object" && appOrOptions !== null) {
      upiUrl = appOrOptions.upiUrl || "";
      app = appOrOptions.app || "phonepe";
      transactionId = appOrOptions.transactionId || "";
    } else {
      app = appOrOptions || "phonepe";
      upiUrl = maybeUpiUrl || "";
      transactionId = maybeTransactionId || "";
    }

    const raw = String(upiUrl || "").trim();
    if (!raw) throw new Error("UPI payment link is unavailable.");

    const questionMark = raw.indexOf("?");
    if (questionMark < 0) throw new Error("Invalid UPI payment link.");

    const query = raw.slice(questionMark + 1).trim();
    if (!query) throw new Error("Invalid UPI payment link.");

    const schemes = {
      phonepe: "phonepe://pay?",
      phonepe_pay: "phonepe://pay?",
      phonepe_upi: "phonepe://pay?",
      gpay: "tez://upi/pay?",
      tez: "tez://upi/pay?",
      paytm: "paytmmp://pay?",
      bhim: "bhim://upi/pay?",
      cred: "credpay://upi/pay?",
      upi: "upi://pay?",
      generic: "upi://pay?",
    };

    const scheme = schemes[String(app || "").trim().toLowerCase()] || "upi://pay?";

    // Preserve the backend-generated payment payload exactly, keeping literal @ in VPA.
    void transactionId;
    return `${scheme}${query.replace(/%40/g, "@")}`;
  },

  normalizePaymentStatus,

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
    hasUpiId: Boolean(clean(import.meta.env?.VITE_JR_UPI_ID || "")),
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
  normalizePaymentStatus,
  request,
  buildLegacyOrderPayload,
  extractOrderId,
  extractCartId,
  isUuid,
  getLocationUuid,
};

export default api;

console.log("[Juice Robo] API adapter loaded.", {
  apiBase: API_BASE,
  orderApiBase: ORDER_API_BASE,
  hasApiKey: Boolean(JR_API_KEY),
  hasApiSecret: Boolean(JR_API_KEY_SECRET),
  hasAuthorization: Boolean(getStoredToken()),
  hasUpiId: Boolean(clean(import.meta.env?.VITE_JR_UPI_ID || "")),
});

  /* ============================================================
    JUICE ROBO — API ADAPTER
    ============================================================ */

const API_BASE = String(
  import.meta.env.VITE_JR_API_BASE ||
    "https://tptest.juicerobo.com/tporder/api"
).replace(/\/+$/, "");

const ORDER_API_BASE = String(
  import.meta.env.VITE_JR_ORDER_API_BASE ||
    "https://tptest.juicerobo.com/tpordermaster/api"
).replace(/\/+$/, "");

const DEFAULT_ORG_ID = String(
  import.meta.env.VITE_JR_ORG_ID ||
    "d2006bfc-95df-4925-a617-6d10d06b99bc"
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
      "Unable to connect to the Juice Robo API. Check the internet connection."
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

  const storeId = clean(
    firstDefined(
      outlet?.locId,
      outlet?.locID,
      outlet?.locationId,
      outlet?.location_id,
      outlet?.storeId,
      outlet?.storeID,
      outlet?.store_id,
      outlet?.id,
      outlet?.storeCode,
      outlet?.store_code
    )
  );

  if (!storeId) return null;

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
    locId: firstDefined(outlet?.locId, outlet?.locID, storeId),
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

function extractOrderId(value) {
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
  const data = unwrap(value) || {};
  const direct = clean(
    firstDefined(
      data?.cartId,
      data?.cart_id,
      data?.cartID,
      data?.CartId,
      data?.id,
      data?.cart?.cartId,
      data?.cart?.cart_id,
      data?.data?.cartId,
      data?.data?.cart_id,
      data?.data?.cart?.cartId,
      data?.result?.cartId,
      data?.result?.cart_id,
      data?.result?.cart?.cartId
    )
  );

  if (direct) return direct;

  if (typeof data === "string" || typeof data === "number") {
    return clean(data);
  }

  const seen = new Set();
  const visit = (node, depth = 0) => {
    if (!node || depth > 6 || typeof node !== "object" || seen.has(node)) return "";
    seen.add(node);
    for (const key of Object.keys(node)) {
      const normalizedKey = String(key).replace(/[ _-]/g, "").toLowerCase();
      if (["cartid", "cartidentifier"].includes(normalizedKey)) {
        const found = clean(node[key]);
        if (found) return found;
      }
    }
    for (const key of Object.keys(node)) {
      const found = visit(node[key], depth + 1);
      if (found) return found;
    }
    return "";
  };
  return visit(data);
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
      payload?.locationId,
      payload?.location_id,
      getStoreId()
    )
  );

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
    const locId = clean(
      firstDefined(
        payload?.locId,
        payload?.locationId,
        payload?.location_id,
        payload?.storeId,
        payload?.store_id,
        getStoreId()
      )
    );

    const sourceItems = Array.isArray(payload?.cartItems)
      ? payload.cartItems
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

    if (!locId) throw new Error("No Juice Robo collection location is selected.");
    if (!sourceItems.length) throw new Error("Your Juice Robo cart is empty.");

    const cartId =
      clean(payload?.cartId) ||
      clean(localStorage.getItem("juice_robo_backend_cart_id")) ||
      clean(localStorage.getItem("juice_robo_cart_id")) ||
      generateUuidV4();

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

    saveStoreId(locId);
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
    const legacyPayload = buildLegacyOrderPayload(payload);

    const addCartResponse = await request(
      "/v1/addcart",
      {
        method: "POST",
        body: JSON.stringify({
          cartId: legacyPayload.cartId,
          locId: legacyPayload.storeId,
          cartItems: legacyPayload.cartItems.map((item) => ({
            variantId: Number(item.variantId),
            quantity: Number(item.quantity),
          })),
        }),
      },
      ORDER_API_BASE
    );

    const returnedCartId = extractCartId(addCartResponse);
    const submitCartId = returnedCartId || legacyPayload.cartId;

    saveStoreId(legacyPayload.storeId);
    localStorage.setItem("juice_robo_backend_cart_id", String(submitCartId));
    localStorage.setItem("juice_robo_cart_id", String(submitCartId));

    const submitResponse = await api.submitOrder(submitCartId);
    const normalized = normalizeOrder(submitResponse);
    let returnedOrderId = extractOrderId(submitResponse);
    let recentOrder = null;

    if (!returnedOrderId) {
      try {
        const recentOrders = await api.orders();
        const candidates = Array.isArray(recentOrders) ? recentOrders : [];

        const getCandidateCartId = (item) =>
          clean(
            firstDefined(
              item?.cartId,
              item?.cart_id,
              item?.cartID,
              item?.CartId,
              item?.OrderInfo?.cartId,
              item?.OrderInfo?.cart_id,
              item?.order?.cartId,
              item?.order?.cart_id
            )
          );

        recentOrder =
          candidates.find(
            (item) =>
              getCandidateCartId(item) === String(submitCartId)
          ) ||
          candidates.find(
            (item) =>
              String(item?.transactionId || item?.transaction_id || "") ===
              String(normalized?.transactionId || normalized?.transaction_id || "")
          ) ||
          (candidates.length === 1 ? candidates[0] : null) ||
          null;

        returnedOrderId = extractOrderId(recentOrder);
      } catch (error) {
        console.warn("[Juice Robo] Could not resolve orderId from recent orders:", error);
      }
    }

    const qrString =
      findQrString(submitResponse) ||
      findQrString(addCartResponse) ||
      findQrString(normalized) ||
      findQrString(recentOrder);

    const mergedOrder = normalizeOrder({
      ...(recentOrder || {}),
      ...(normalized || {}),
      ...(submitResponse || {}),
    });

    if (mergedOrder && returnedOrderId) {
      mergedOrder.orderId = returnedOrderId;
      mergedOrder.order_id = returnedOrderId;
      mergedOrder.id = returnedOrderId;
      mergedOrder.orderNumber = firstDefined(mergedOrder.orderNumber, returnedOrderId);
      mergedOrder.order_number = firstDefined(mergedOrder.order_number, returnedOrderId);
    }

    if (!returnedOrderId) {
      const diagnostic = {
        cartId: submitCartId,
        submitResponse,
        recentOrder,
      };
      console.error("[Juice Robo] Order was submitted but no authoritative orderId was returned/resolved:", diagnostic);
      const error = new Error(
        "Juice Robo order was created, but the backend did not return the order ID required for payment verification."
      );
      error.backendResponse = diagnostic;
      throw error;
    }

    return {
      ...(mergedOrder || {}),
      cartId: String(submitCartId),
      addCartResponse,
      submitResponse,
      recentOrder,
      qrString: qrString || "",
      items: payload?.cartItems || payload?.items || [],
    };
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

  createUpiAppLink: ({ upiUrl = "", app = "phonepe", transactionId = "" } = {}) => {
    const raw = String(upiUrl || "").trim();
    if (!raw) throw new Error("UPI payment link is unavailable.");

    const questionMark = raw.indexOf("?");
    if (questionMark < 0) throw new Error("Invalid UPI payment link.");

    const query = raw.slice(questionMark + 1).trim();
    if (!query) throw new Error("Invalid UPI payment link.");

    const schemes = {
      phonepe: "phonepe://upi/pay?",
      gpay: "gpay://upi/pay?",
      paytm: "paytm://upi/pay?",
      bhim: "bhim://upi/pay?",
      cred: "credpay://upi/pay?",
    };

    const scheme = schemes[String(app || "").trim().toLowerCase()];
    if (!scheme) throw new Error("This UPI app is not supported.");

    // Preserve the backend-generated payment payload exactly.
    void transactionId;
    return `${scheme}${query}`;
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

/*
 * ============================================================
 * JUICE ROBO — LEGACY API ADAPTER
 * ============================================================
 *
 * Existing backend:
 *
 * https://tptest.juicerobo.com/tporder/api
 *
 * IMPORTANT:
 * - Uses the existing /v1/... API.
 * - Uses the original submitOrder payload.
 * - Does NOT use the newer FastAPI payment endpoints.
 * - Payment is handed off through the existing UPI flow.
 * - iOS UPI handoff is handled from App.jsx using:
 *       window.location.href = "upi://pay..."
 *
 * ============================================================
 */

const API_BASE =
  "https://tptest.juicerobo.com/tporder/api";

const DEFAULT_ORG_ID =
  "d2006bfc-95df-4925-a617-6d10d06b99bc";

/*
 * Existing Juice Robo test credentials.
 */
const JR_API_KEY =
  "fd272156-8768-47ec-80e5-6779309e6cac";

const JR_API_KEY_SECRET =
  "e844933d-9f44-4e4b-b0fe-e7bfc771ce99";


/* ============================================================
   STORAGE
   ============================================================ */

function readJson(key, fallback = null) {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    const parsed =
      JSON.parse(raw);

    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}


function writeJson(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    // Ignore local-storage errors.
  }
}


function getUserSnapshot() {
  return (
    readJson(
      "juice_robo_user",
      null
    ) ||
    readJson(
      "user",
      null
    ) ||
    {}
  );
}


/* ============================================================
   ORGANIZATION
   ============================================================ */

function getOrgId() {
  const stored =
    localStorage.getItem(
      "ORG_ID"
    ) ||
    localStorage.getItem(
      "juice_robo_org_id"
    );

  if (stored) {
    return String(stored)
      .replace(/^"|"$/g, "");
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const queryOrg =
    params.get("o_id") ||
    params.get("org_id");

  if (queryOrg) {
    localStorage.setItem(
      "ORG_ID",
      queryOrg
    );

    return queryOrg;
  }

  localStorage.setItem(
    "ORG_ID",
    DEFAULT_ORG_ID
  );

  return DEFAULT_ORG_ID;
}


/* ============================================================
   STORE
   ============================================================ */

function getStoreId() {
  return String(
    localStorage.getItem(
      "store_Id"
    ) ||
      localStorage.getItem(
        "juice_robo_store_id"
      ) ||
      ""
  ).replace(
    /^"|"$/g,
    ""
  );
}


/* ============================================================
   GENERIC HELPERS
   ============================================================ */

function unwrap(value) {
  let result = value;

  for (
    let i = 0;
    i < 5;
    i += 1
  ) {
    if (
      result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      result.data !== undefined
    ) {
      result =
        result.data;

      continue;
    }

    break;
  }

  return result;
}


function asArray(value) {
  const result =
    unwrap(value);

  if (Array.isArray(result)) {
    return result;
  }

  if (
    result &&
    typeof result === "object"
  ) {
    const keys = [
      "items",
      "products",
      "locations",
      "outlets",
      "machines",
      "orders",
      "results",
      "storesData",
      "stores",
      "storeSpot",
    ];

    for (const key of keys) {
      if (
        Array.isArray(
          result[key]
        )
      ) {
        return result[key];
      }
    }
  }

  return [];
}


function firstDefined(
  ...values
) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}


/* ============================================================
   ERROR HANDLING
   ============================================================ */

function normalizeError(
  data,
  status
) {
  const value =
    unwrap(data);

  if (
    value &&
    typeof value === "object"
  ) {
    if (
      typeof value.message ===
      "string"
    ) {
      return value.message;
    }

    if (
      typeof value.error ===
      "string"
    ) {
      return value.error;
    }

    if (
      typeof value.description ===
      "string"
    ) {
      return value.description;
    }

    if (
      Array.isArray(
        value.errors
      )
    ) {
      return value.errors
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.message ||
              item?.msg ||
              JSON.stringify(item)
        )
        .join(" ");
    }
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return value;
  }

  return (
    `Juice Robo request failed (${status})`
  );
}


/* ============================================================
   HTTP REQUEST
   ============================================================ */

async function request(
  path,
  options = {}
) {
  const url =
    `${API_BASE}${path}`;

  const headers = {
    Accept:
      "application/json",

    "JR-API-KEY":
      JR_API_KEY,

    "JR-API-KEY-SECRET":
      JR_API_KEY_SECRET,

    ...(options.body !== undefined
      ? {
          "Content-Type":
            "application/json",
        }
      : {}),

    ...(options.headers || {}),
  };

  const method =
    options.method || "GET";

  console.log(
    "[Juice Robo] API REQUEST:",
    {
      method,
      url,
      headers: {
        "JR-API-KEY":
          JR_API_KEY
            ? "[SET]"
            : "[MISSING]",

        "JR-API-KEY-SECRET":
          JR_API_KEY_SECRET
            ? "[SET]"
            : "[MISSING]",

        "Content-Type":
          headers["Content-Type"] ||
          "",
      },
      body:
        options.body || null,
    }
  );

  let response;

  try {
    response =
      await fetch(
        url,
        {
          ...options,
          headers,
        }
      );
  } catch (error) {
    console.error(
      "[Juice Robo] NETWORK ERROR:",
      error
    );

    throw new Error(
      "Unable to connect to the Juice Robo API. Check the internet connection."
    );
  }

  /*
   * Read the response body exactly once.
   *
   * This is important because response.json()
   * and response.text() cannot both consume the
   * same response body.
   */
  let rawResponse = "";

  try {
    rawResponse =
      await response.text();
  } catch (error) {
    console.error(
      "[Juice Robo] RESPONSE READ ERROR:",
      error
    );
  }

  /*
   * Try to convert JSON responses into objects.
   * If the backend sends plain text, keep the
   * original text.
   */
  let data = null;

  if (rawResponse) {
    try {
      data =
        JSON.parse(
          rawResponse
        );
    } catch {
      data =
        rawResponse;
    }
  }

  console.log(
    "[Juice Robo] API RESPONSE:",
    {
      method,
      url,
      status:
        response.status,
      statusText:
        response.statusText,
      ok:
        response.ok,
      contentType:
        response.headers.get(
          "content-type"
        ) || "",
      rawResponse,
      data,
    }
  );

  if (!response.ok) {
    const message =
      normalizeError(
        data,
        response.status
      );

    console.error(
      "[Juice Robo] API REQUEST FAILED:",
      {
        method,
        url,
        status:
          response.status,
        statusText:
          response.statusText,
        response:
          data,
        rawResponse,
      }
    );

    throw new Error(
      message
    );
  }

  return data;
}
/* ============================================================
   PRODUCT NORMALIZATION
   ============================================================ */

function normalizeProduct(
  item
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const variants =
    Array.isArray(
      item.lstVariants
    )
      ? item.lstVariants
      : [];

  const variant =
    variants.find(
      (entry) =>
        String(
          entry?.variantName ||
            ""
        ).toLowerCase() ===
        "full"
    ) ||
    variants[0] ||
    item;

  const name =
    String(
      firstDefined(
        item.name,
        item.itemName,
        item.productName,
        "Sugarcane Juice"
      )
    );

  const variantName =
    String(
      firstDefined(
        variant?.variantName,
        "Full"
      )
    );

  const price =
    Number(
      firstDefined(
        variant?.unitPrice,
        variant?.unit_price,
        variant?.price,
        item?.price,
        0
      )
    );

  const variantId =
    firstDefined(
      variant?.variantId,
      variant?.variant_id,
      variant?.id,
      item?.id
    );

  const image =
    firstDefined(
      variant?.variantPhoto,
      variant?.variant_photo,
      variant?.photo,
      item?.image,
      item?.image_url,
      ""
    );

  const productType =
    String(
      firstDefined(
        item.productType,
        item.product_type,
        variant?.productType,
        ""
      )
    );

  return {
    ...item,

    id:
      String(
        variantId ?? ""
      ),

    itemId:
      String(
        firstDefined(
          item.id,
          variantId,
          ""
        )
      ),

    name,

    productType,

    variantName,

    displayName:
      productType
        ? `${name} ${productType}`
        : name,

    description:
      String(
        firstDefined(
          variant?.variantDesc,
          item.description,
          item.desc,
          "Fresh sugarcane juice"
        )
      ),

    price,

    image_url:
      image,

    image,

    is_available:
      item.is_available !==
        false &&
      item.isAvailable !==
        false,

    isAvailable:
      item.is_available !==
        false &&
      item.isAvailable !==
        false,

    storeId:
      firstDefined(
        item.storeId,
        variant?.storeId,
        getStoreId()
      ),

    /*
     * Keep the original API object.
     * This is required when building submitOrder.
     */
    _legacyItem:
      item,

    _variant:
      variant,
  };
}


/* ============================================================
   LOCATION NORMALIZATION
   ============================================================ */

function normalizeLocation(
  item,
  parent = null
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const storeId =
    firstDefined(
      item.locId,
      item.storeId,
      item.storeID,
      item.store_id,
      item.id
    );

  if (
    storeId === undefined ||
    storeId === null ||
    String(storeId).trim() === ""
  ) {
    return null;
  }

  const outletParent =
    parent &&
    typeof parent === "object"
      ? parent
      : {};

  const name =
    String(
      firstDefined(
        item.storeName,
        item.outletName,
        item.name,
        outletParent.outletName,
        "Juice Robo"
      )
    );

  const address =
    String(
      firstDefined(
        item.locAddress,
        item.outletDesc,
        item.address,
        item.description,
        outletParent.outletDesc,
        ""
      )
    );

  const image =
    firstDefined(
      item.outletPhoto,
      item.image,
      outletParent.outletPhoto,
      null
    );

  const isActive =
    item.isActive !==
      false &&
    item.active !==
      false;

  return {
    ...item,

    id:
      String(storeId),

    storeId:
      String(storeId),

    name,

    address,

    image,

    isActive,

    is_active:
      isActive,

    _legacyStore:
      item,

    _legacyOutlet:
      item,
  };
}


/* ============================================================
   MACHINE NORMALIZATION
   ============================================================ */

function normalizeMachine(
  item,
  fallbackLocation = null
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const id =
    firstDefined(
      item.id,
      item.machineId,
      item.machine_id,
      item.storeId,
      item.store_id,
      item.locationId
    );

  const machineCode =
    String(
      firstDefined(
        item.machineCode,
        item.machine_code,
        item.code,
        item.storeCode,
        `JR-${String(
          id || "001"
        )}`
      )
    );

  return {
    ...item,

    id:
      String(id ?? ""),

    machineCode,

    machine_code:
      machineCode,

    /*
     * Do not use the machine UUID as the visible name.
     */
    name:
      String(
        firstDefined(
          item.displayName,
          item.machineName,
          "Juice Robo Machine"
        )
      ),

    locationId:
      String(
        firstDefined(
          item.locationId,
          item.location_id,
          fallbackLocation?.id,
          ""
        )
      ),

    location_id:
      String(
        firstDefined(
          item.location_id,
          item.locationId,
          fallbackLocation?.id,
          ""
        )
      ),

    firmwareVersion:
      String(
        firstDefined(
          item.firmwareVersion,
          item.firmware_version,
          ""
        )
      ),

    status:
      String(
        firstDefined(
          item.status,
          "ONLINE"
        )
      ).toUpperCase(),
  };
}


/* ============================================================
   ORDER NORMALIZATION
   ============================================================ */

function normalizeOrder(
  item
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const nested =
    unwrap(item) || {};

  const orderNumber =
    firstDefined(
      nested.order_code,
      nested.order_number,
      nested.orderNumber,
      nested.id,
      ""
    );

  const collectionCode =
    firstDefined(
      nested.collection_code,
      nested.collectionCode,
      nested.pickup_code,
      nested.pickupCode,
      ""
    );

  const rawItems =
    Array.isArray(
      nested.items
    )
      ? nested.items
      : Array.isArray(
          nested.cartItems
        )
        ? nested.cartItems
        : [];

  const items =
    rawItems.map(
      (entry) => ({
        ...entry,

        id:
          firstDefined(
            entry.id,
            entry.product_id,
            entry.productId,
            entry.variantId
          ),

        product_id:
          firstDefined(
            entry.product_id,
            entry.productId,
            entry.variantId
          ),

        name:
          String(
            firstDefined(
              entry.product_name,
              entry.itemName,
              entry.name,
              entry.variantName,
              "Juice"
            )
          ),

        product_type:
          String(
            firstDefined(
              entry.product_type,
              entry.productType,
              entry.variantName,
              ""
            )
          ),

        price:
          Number(
            firstDefined(
              entry.unit_price,
              entry.unitPrice,
              entry.price,
              0
            )
          ),

        quantity:
          Number(
            entry.quantity || 1
          ),

        subtotal:
          Number(
            firstDefined(
              entry.subtotal,
              Number(
                entry.unitPrice ||
                  entry.price ||
                  0
              ) *
                Number(
                  entry.quantity ||
                    1
                ),
              0
            )
          ),
      })
    );

  const total =
    Number(
      firstDefined(
        nested.total_amount,
        nested.totalAmount,
        nested.grandTotal,
        nested.amount,
        nested.total,
        0
      )
    );

  return {
    ...nested,

    id:
      firstDefined(
        nested.id,
        nested.order_id,
        nested.orderId,
        orderNumber
      ),

    order_id:
      firstDefined(
        nested.order_id,
        nested.orderId,
        nested.id,
        orderNumber
      ),

    order_number:
      String(orderNumber),

    order_code:
      String(
        firstDefined(
          nested.order_code,
          nested.order_number,
          nested.orderNumber,
          ""
        )
      ),

    collection_code:
      String(collectionCode),

    collectionCode:
      String(collectionCode),

    total_amount:
      total,

    totalAmount:
      total,

    total,

    status:
      String(
        firstDefined(
          nested.status,
          "CONFIRMED"
        )
      ),

    payment_status:
      String(
        firstDefined(
          nested.payment_status,
          nested.paymentStatus,
          "PENDING"
        )
      ),

    paymentStatus:
      String(
        firstDefined(
          nested.paymentStatus,
          nested.payment_status,
          "PENDING"
        )
      ),

    created_at:
      firstDefined(
        nested.created_at,
        nested.createdAt,
        new Date().toISOString()
      ),

    createdAt:
      firstDefined(
        nested.createdAt,
        nested.created_at,
        new Date().toISOString()
      ),

    items,
  };
}


/* ============================================================
   AUTH NORMALIZATION
   ============================================================ */

function normalizeAuth(response) {
  const data = unwrap(response) || {};

  const token = firstDefined(
    data?.accessToken,
    data?.access_token,
    data?.token,
    response?.accessToken,
    response?.access_token,
    response?.token
  );

  const rawUser =
    data?.user ||
    data?.customer ||
    data;

  const user = {
    ...(rawUser && typeof rawUser === "object"
      ? rawUser
      : {}),

    id: firstDefined(
      rawUser?.id,
      rawUser?.userId,
      rawUser?.user_id
    ),

    name: firstDefined(
      rawUser?.name,
      [
        rawUser?.firstName,
        rawUser?.lastName,
      ]
        .filter(Boolean)
        .join(" ")
    ),

    firstname: firstDefined(
      rawUser?.firstname,
      rawUser?.firstName
    ),

    lastname: firstDefined(
      rawUser?.lastname,
      rawUser?.lastName
    ),

    email: firstDefined(
      rawUser?.email,
      rawUser?.userEmail
    ),

    phone: firstDefined(
      rawUser?.phone,
      rawUser?.userName
    ),
  };

  if (token) {
    const normalizedToken = String(token);

    localStorage.setItem(
      "juice_robo_token",
      normalizedToken
    );

    localStorage.setItem(
      "_token",
      JSON.stringify(token)
    );
  }

  if (Object.keys(user).length > 0) {
    writeJson(
      "juice_robo_user",
      user
    );

    writeJson(
      "user",
      user
    );
  }

  return {
    ...response,
    ...data,

    access_token: token || "",
    accessToken: token || "",

    user,
  };
}


/* ============================================================
   UUID
   ============================================================ */

function generateUuidV4() {
  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
  ) {
    return crypto.randomUUID();
  }

  const bytes =
    new Uint8Array(16);

  if (
    typeof crypto !==
      "undefined" &&
    typeof crypto.getRandomValues ===
      "function"
  ) {
    crypto.getRandomValues(
      bytes
    );
  } else {
    for (
      let i = 0;
      i < bytes.length;
      i += 1
    ) {
      bytes[i] =
        Math.floor(
          Math.random() * 256
        );
    }
  }

  bytes[6] =
    (bytes[6] & 0x0f) |
    0x40;

  bytes[8] =
    (bytes[8] & 0x3f) |
    0x80;

  const hex =
    Array.from(
      bytes,
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0")
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
   LEGACY VARIANT HELPERS
   ============================================================ */

function getVariant(
  item
) {
  return (
    item?._variant ||
    item?.variant ||
    item?._legacyVariant ||
    item ||
    {}
  );
}


function getVariantId(
  item
) {
  const variant =
    getVariant(item);

  return firstDefined(
    variant?.variantId,
    variant?.variant_id,
    variant?.id,
    item?.variantId,
    item?.variant_id,
    item?.id,
    ""
  );
}


function getProductName(
  item
) {
  const variant =
    getVariant(item);

  return String(
    firstDefined(
      item?.itemName,
      item?.name,
      item?.productName,
      item?.displayName,
      variant?.itemName,
      variant?.productName,
      "Sugarcane Juice"
    )
  );
}


function getVariantName(
  item
) {
  const variant =
    getVariant(item);

  return String(
    firstDefined(
      item?.variantName,
      variant?.variantName,
      "Full"
    )
  );
}


function getVariantDescription(
  item
) {
  const variant =
    getVariant(item);

  return String(
    firstDefined(
      item?.variantDesc,
      item?.description,
      item?.desc,
      variant?.variantDesc,
      variant?.description,
      "Fresh sugarcane juice"
    )
  );
}


function getPrice(
  item
) {
  const variant =
    getVariant(item);

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


function getPhoto(
  item
) {
  const variant =
    getVariant(item);

  return firstDefined(
    variant?.variantPhoto,
    variant?.variant_photo,
    variant?.photo,
    item?.variantPhoto,
    item?.variant_photo,
    item?.image,
    item?.image_url,
    ""
  );
}


/* ============================================================
   BUILD EXACT LEGACY ORDER PAYLOAD
   ============================================================ */

function buildLegacyOrderPayload(
  payload = {}
) {
  const customer =
    payload?.customer ||
    payload?.user ||
    getUserSnapshot();

  const sourceItems =
    Array.isArray(
      payload?.cartItems
    )
      ? payload.cartItems
      : Array.isArray(
          payload?.items
        )
        ? payload.items
        : [];

  if (!sourceItems.length) {
    throw new Error(
      "Your Juice Robo cart is empty."
    );
  }

  /*
   * ORIGINAL LEGACY CONTRACT
   *
   * {
   *   cartId,
   *   storeId,
   *   updatedBy,
   *   cartItems: [...]
   * }
   *
   * Each cart item is deliberately reduced
   * to the original backend fields.
   */

  const cartId =
    payload?.cartId ||
    generateUuidV4();

  const storeId =
    String(
      payload?.storeId ||
        payload?.store_id ||
        getStoreId() ||
        "TS0005"
    );

  const updatedBy =
    String(
      firstDefined(
        payload?.updatedBy,
        customer?.firstname,
        customer?.firstName,
        customer?.name,
        ""
      )
    );

  const cartItems =
    sourceItems.map(
      (item) => {
        const variant =
          getVariant(item);

        return {
          variantId:
            getVariantId(item),

          itemName:
            getProductName(item),

          variantName:
            getVariantName(item),

          variantDesc:
            getVariantDescription(
              item
            ),

          unitPrice:
            getPrice(item),

          /*
           * Juice Robo legacy API expects
           * taxInclusive=true for these products.
           */
          taxInclusive:
            variant?.taxInclusive ??
            item?.taxInclusive ??
            true,

          taxRate:
            Number(
              variant?.taxRate ??
                item?.taxRate ??
                12
            ),

          quantity:
            Math.max(
              1,
              Number(
                item?.quantity ||
                  variant?.quantity ||
                  1
              )
            ),

          variantPhoto:
            getPhoto(item),
        };
      }
    );

  const legacyPayload = {
    cartId:
      String(cartId),

    storeId,

    updatedBy,

    cartItems,
  };

  console.log(
    "[Juice Robo] EXACT legacy submitOrder payload:",
    legacyPayload
  );

  return legacyPayload;
}


/* ============================================================
   API
   ============================================================ */

export const api = {

  baseUrl:
    API_BASE,

  config: {
    baseUrl:
      API_BASE,

    orgId:
      getOrgId,
  },


  /* ==========================================================
     AUTH
     ========================================================== */

  login:
    async (payload = {}) => {
      const response =
        await request(
          "/v1/auth/signin",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                userName:
                  String(
                    payload?.userName ||
                      payload?.username ||
                      payload?.email ||
                      payload?.phone ||
                      payload?.identifier ||
                      ""
                  ).trim(),

                password:
                  String(
                    payload?.password ||
                      ""
                  ),
              }),
          }
        );

      return normalizeAuth(
        response
      );
    },


  register:
    async (payload = {}) => {
      const fullName =
        String(
          payload?.name ||
            ""
        ).trim();

      const parts =
        fullName
          .split(/\s+/)
          .filter(Boolean);

      const firstName =
        payload?.firstName ||
        parts[0] ||
        "";

      const lastName =
        payload?.lastName ||
        parts
          .slice(1)
          .join(" ") ||
        firstName;

      const response =
        await request(
          "/v1/auth/registerUser",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                firstName,

                lastName,

                userName:
                  payload?.userName ||
                  payload?.phone ||
                  "",

                userEmail:
                  payload?.userEmail ||
                  payload?.email ||
                  "",

                password:
                  payload?.password ||
                  "",

                confirmPassword:
                  payload?.confirmPassword ||
                  payload?.password ||
                  "",

                city:
                  payload?.city ||
                  "",

                state:
                  payload?.state ||
                  "",

                country:
                  payload?.country ||
                  "",
              }),
          }
        );

      return normalizeAuth(
        response
      );
    },


  /* ==========================================================
     PROFILE
     ========================================================== */

  profile:
    async () => {
      const user =
        getUserSnapshot();

      if (!user?.id) {
        return user;
      }

      try {
        const response =
          await request(
            `/user/${encodeURIComponent(
              user.id
            )}`
          );

        const data =
          unwrap(response) ||
          {};

        const merged = {
          ...user,
          ...data,

          id:
            firstDefined(
              data?.id,
              user?.id
            ),

          name:
            firstDefined(
              data?.name,
              [
                data?.firstName,
                data?.lastName,
              ]
                .filter(Boolean)
                .join(" "),
              user?.name,
              "Juice Lover"
            ),

          email:
            firstDefined(
              data?.email,
              data?.userEmail,
              user?.email,
              ""
            ),

          phone:
            firstDefined(
              data?.phone,
              data?.userName,
              user?.phone,
              ""
            ),
        };

        writeJson(
          "juice_robo_user",
          merged
        );

        return merged;
      } catch {
        return user;
      }
    },


  currentUser:
    async () =>
      api.profile(),


  users:
    async () => {
      try {
        return asArray(
          await request(
            "/v1/users"
          )
        );
      } catch {
        return [];
      }
    },


  createUser:
    async (payload = {}) => {
      if (
        payload?.password
      ) {
        return api.register(
          payload
        );
      }

      const existing =
        getUserSnapshot();

      const customer = {
        ...existing,

        name:
          payload?.name ||
          existing?.name ||
          "",

        phone:
          payload?.phone ||
          existing?.phone ||
          "",

        email:
          payload?.email ||
          existing?.email ||
          "",
      };

      writeJson(
        "juice_robo_user",
        customer
      );

      return customer;
    },


  createCustomer:
    async (payload = {}) => {
      const customer = {
        ...getUserSnapshot(),

        name:
          String(
            payload?.name ||
              ""
          ).trim(),

        phone:
          String(
            payload?.phone ||
              ""
          ).replace(
            /\D/g,
            ""
          ),

        email:
          String(
            payload?.email ||
              ""
          ).trim(),
      };

      writeJson(
        "juice_robo_user",
        customer
      );

      return customer;
    },


  updateProfile:
    async (payload = {}) => {
      const user =
        getUserSnapshot();

      if (!user?.id) {
        const next = {
          ...user,
          ...payload,
        };

        writeJson(
          "juice_robo_user",
          next
        );

        return next;
      }

      const response =
        await request(
          "/user/edit",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                _method:
                  "patch",

                id:
                  user.id,

                ...payload,
              }),
          }
        );

      const normalized =
        unwrap(response) ||
        {};

      const next = {
        ...user,
        ...normalized,
        ...payload,
      };

      writeJson(
        "juice_robo_user",
        next
      );

      return next;
    },


  /* ==========================================================
     PRODUCTS
     ========================================================== */

  products:
    async () => {
      let storeId =
        getStoreId();

      if (!storeId) {
        const locations =
          await api.locations();

        storeId =
          locations?.[0]?.storeId ||
          locations?.[0]?.id ||
          "";

        if (storeId) {
          localStorage.setItem(
            "store_Id",
            String(storeId)
          );
        }
      }

      if (!storeId) {
        throw new Error(
          "No Juice Robo store is available."
        );
      }

      const response =
        await request(
          `/v1/itemmaster/items/${encodeURIComponent(
            storeId
          )}`
        );

      return asArray(response)
        .map(
          normalizeProduct
        )
        .filter(Boolean);
    },


  getProducts:
    async () =>
      api.products(),


  /* ==========================================================
     LOCATIONS
     ========================================================== */

  locations:
    async () => {
      const response =
        await request(
          `/v1/getoutlets/${encodeURIComponent(
            getOrgId()
          )}`
        );

      const rawResponse =
        unwrap(response);

      let rawLocations =
        asArray(response);

      if (
        !rawLocations.length &&
        rawResponse &&
        typeof rawResponse ===
          "object" &&
        Array.isArray(
          rawResponse.storeSpot
        )
      ) {
        rawLocations =
          rawResponse.storeSpot;
      }

      const locations =
        rawLocations
          .map(
            (item) =>
              normalizeLocation(
                item,
                rawResponse
              )
          )
          .filter(Boolean);

      console.log(
        "[Juice Robo] Parsed locations:",
        locations
      );

      if (
        locations.length
      ) {
        const current =
          getStoreId();

        const stillExists =
          locations.some(
            (location) =>
              String(
                location.storeId
              ) ===
              String(current)
          );

        if (!stillExists) {
          localStorage.setItem(
            "store_Id",
            String(
              locations[0].storeId
            )
          );
        }
      }

      return locations;
    },


  getLocations:
    async () =>
      api.locations(),


  /* ==========================================================
     MACHINES
     ========================================================== */

  machines:
    async () => {
      const locations =
        await api.locations();

      return locations
        .map(
          (location) =>
            normalizeMachine(
              {
                id:
                  location.storeId,

                storeId:
                  location.storeId,

                displayName:
                  "Juice Robo Machine",

                status:
                  "ONLINE",
              },
              location
            )
        )
        .filter(Boolean);
    },


  getMachines:
    async () =>
      api.machines(),


  /* ==========================================================
     CREATE ORDER
     ========================================================== */

  createOrder:
    async (payload = {}) => {
      /*
       * Build the EXACT payload expected by the
       * original Juice Robo backend.
       */
      const legacyPayload =
        buildLegacyOrderPayload(
          payload
        );

      console.log(
        "========================================"
      );

      console.log(
        "[Juice Robo] SUBMITTING LEGACY ORDER"
      );

      console.log(
        "[Juice Robo] URL:",
        `${API_BASE}/v1/submitOrder`
      );

      console.log(
        "[Juice Robo] PAYLOAD:",
        JSON.stringify(
          legacyPayload,
          null,
          2
        )
      );

      console.log(
        "========================================"
      );

      const response =
        await request(
          "/v1/submitOrder",
          {
            method:
              "POST",

            body:
              JSON.stringify(
                legacyPayload
              ),
          }
        );

      console.log(
        "[Juice Robo] submitOrder SUCCESS:",
        response
      );

      return normalizeOrder(
        response
      );
    },


  /* ==========================================================
     ORDERS
     ========================================================== */

  orders:
    async (params = {}) => {
      const query =
        new URLSearchParams();

      Object.entries(
        params
      ).forEach(
        ([key, value]) => {
          if (
            value !== undefined &&
            value !== null &&
            value !== ""
          ) {
            query.set(
              key,
              String(value)
            );
          }
        }
      );

      const suffix =
        query.toString()
          ? `?${query.toString()}`
          : "";

      const response =
        await request(
          `/v1/orders${suffix}`
        );

      return asArray(response)
        .map(
          normalizeOrder
        )
        .filter(Boolean);
    },


  getOrders:
    async () =>
      api.orders(),


  order:
    async (orderId) => {
      if (
        orderId ===
          undefined ||
        orderId ===
          null ||
        orderId ===
          ""
      ) {
        throw new Error(
          "Order ID is required."
        );
      }

      const response =
        await request(
          `/order/${encodeURIComponent(
            orderId
          )}`
        );

      return normalizeOrder(
        response
      );
    },


  getOrder:
    async (orderId) =>
      api.order(orderId),


  /* ==========================================================
     PAYMENT COMPATIBILITY
     ========================================================== */

  createPaymentOrder:
    async () => {
      throw new Error(
        "The legacy Juice Robo backend does not use /payments/create-order."
      );
    },


  verifyPayment:
    async () => {
      throw new Error(
        "The legacy Juice Robo backend does not use /payments/verify."
      );
    },
};


/* ============================================================
   EXPORTS
   ============================================================ */

export {
  API_BASE,
  DEFAULT_ORG_ID,
};

export default api;


console.log(
  "[Juice Robo] Legacy API adapter loaded:",
  API_BASE
);
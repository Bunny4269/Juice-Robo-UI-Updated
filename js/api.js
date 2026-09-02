/*
 * JUICE ROBO — UPDATED UI / LEGACY API ADAPTER
 *
 * This file makes the redesigned React UI use the existing
 * Juice Robo backend:
 *
 *   https://tptest.juicerobo.com/tporder/api
 *
 * IMPORTANT:
 * - Do NOT use localhost:8000 in this build.
 * - The legacy backend uses /v1/... endpoints.
 * - Payment is handled by the existing Juice Robo UPI flow.
 * - Do not add the newer FastAPI /payments endpoints here.
 *
 * Environment variables required for Vite:
 *
 *   VITE_JR_API_KEY=your-existing-api-key
 *   VITE_JR_API_KEY_SECRET=your-existing-api-secret
 *
 * Keep the real values in .env / deployment environment.
 */

const API_BASE =
  "https://tptest.juicerobo.com/tporder/api";

const DEFAULT_ORG_ID =
  "d2006bfc-95df-4925-a617-6d10d06b99bc";

const JR_API_KEY =
  import.meta.env.VITE_JR_API_KEY || "";

const JR_API_KEY_SECRET =
  import.meta.env.VITE_JR_API_KEY_SECRET || "";

/* ============================================================
   STORAGE
   ============================================================ */

function readJson(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

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
    // Ignore local-storage failures.
  }
}

function getUserSnapshot() {
  return (
    readJson("juice_robo_user", null) ||
    readJson("user", null) ||
    {}
  );
}

function getOrgId() {
  const stored =
    localStorage.getItem("ORG_ID") ||
    localStorage.getItem("juice_robo_org_id");

  if (stored) {
    return String(stored).replace(
      /^"|"$/g,
      ""
    );
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

function getStoreId() {
  return String(
    localStorage.getItem("store_Id") ||
      localStorage.getItem("juice_robo_store_id") ||
      ""
  ).replace(/^"|"$/g, "");
}

/* ============================================================
   GENERIC HELPERS
   ============================================================ */

function unwrap(value) {
  let result = value;

  for (let i = 0; i < 5; i += 1) {
    if (
      result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      result.data !== undefined
    ) {
      result = result.data;
      continue;
    }

    break;
  }

  return result;
}

function asArray(value) {
  const result = unwrap(value);

  if (Array.isArray(result)) {
    return result;
  }

  if (
    result &&
    typeof result === "object"
  ) {
    for (const key of [
      "items",
      "products",
      "locations",
      "outlets",
      "machines",
      "orders",
      "results",
    ]) {
      if (Array.isArray(result[key])) {
        return result[key];
      }
    }
  }

  return [];
}

function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}

function normalizeError(data, status) {
  const value = unwrap(data);

  if (
    value &&
    typeof value === "object"
  ) {
    if (typeof value.message === "string") {
      return value.message;
    }

    if (typeof value.error === "string") {
      return value.error;
    }

    if (typeof value.description === "string") {
      return value.description;
    }

    if (Array.isArray(value.errors)) {
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

  return `Juice Robo request failed (${status})`;
}

/* ============================================================
   REQUEST
   ============================================================ */

async function request(
  path,
  options = {}
) {
  const url =
    `${API_BASE}${path}`;

  const headers = {
    Accept: "application/json",

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

  console.log(
    `[Juice Robo] ${options.method || "GET"} ${url}`
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
      "[Juice Robo] Network error:",
      error
    );

    throw new Error(
      "Unable to connect to the Juice Robo API. Check the internet connection."
    );
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let data = null;

  try {
    if (
      contentType.includes(
        "application/json"
      )
    ) {
      data =
        await response.json();
    } else {
      const text =
        await response.text();

      data =
        text || null;
    }
  } catch {
    data = null;
  }

  console.log(
    "[Juice Robo] Response:",
    {
      status: response.status,
      url,
      data,
    }
  );

  if (!response.ok) {
    throw new Error(
      normalizeError(
        data,
        response.status
      )
    );
  }

  return data;
}

/* ============================================================
   NORMALIZATION
   ============================================================ */

function normalizeProduct(
  item
) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const variants =
    Array.isArray(item.lstVariants)
      ? item.lstVariants
      : [];

  const variant =
    variants.find(
      (entry) =>
        String(
          entry?.variantName || ""
        ).toLowerCase() === "full"
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

    id: String(
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

    image_url: image,

    image: image,

    is_available:
      item.is_available !== false &&
      item.isAvailable !== false,

    isAvailable:
      item.is_available !== false &&
      item.isAvailable !== false,

    storeId:
      firstDefined(
        item.storeId,
        variant?.storeId,
        getStoreId()
      ),

    _legacyItem:
      item,

    _variant:
      variant,
  };
}

function normalizeLocation(
  item
) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const storeId =
    firstDefined(
      item.storeId,
      item.store_id,
      item.id
    );

  const name =
    String(
      firstDefined(
        item.name,
        item.outletName,
        item.storeName,
        "Juice Robo"
      )
    );

  const address =
    String(
      firstDefined(
        item.address,
        item.outletDesc,
        item.storeAddress,
        ""
      )
    );

  return {
    ...item,

    id:
      String(
        storeId ?? ""
      ),

    storeId:
      String(
        storeId ?? ""
      ),

    name,

    address,

    isActive:
      item.isActive !== false &&
      item.is_active !== false,

    is_active:
      item.isActive !== false &&
      item.is_active !== false,

    icon:
      item.icon || "▦",
  };
}

function normalizeMachine(
  item,
  fallbackLocation = null
) {
  if (!item || typeof item !== "object") {
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
        `JR-${String(id || "001")}`
      )
    );

  return {
    ...item,

    id:
      String(
        id ?? ""
      ),

    machineCode,

    machine_code:
      machineCode,

    name:
      String(
        firstDefined(
          item.name,
          machineCode,
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

function normalizeOrder(
  item
) {
  if (!item || typeof item !== "object") {
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
    Array.isArray(nested.items)
      ? nested.items
      : Array.isArray(nested.cartItems)
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
          "PAID"
        )
      ),

    paymentStatus:
      String(
        firstDefined(
          nested.paymentStatus,
          nested.payment_status,
          "PAID"
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

function normalizeAuth(
  response
) {
  const data =
    unwrap(response) || {};

  const token =
    firstDefined(
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
    ...(
      rawUser &&
      typeof rawUser === "object"
        ? rawUser
        : {}
    ),

    id:
      firstDefined(
        rawUser?.id,
        rawUser?.userId,
        rawUser?.user_id
      ),

    name:
      firstDefined(
        rawUser?.name,
        [
          rawUser?.firstName,
          rawUser?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
      ),

    firstname:
      firstDefined(
        rawUser?.firstname,
        rawUser?.firstName
      ),

    lastname:
      firstDefined(
        rawUser?.lastname,
        rawUser?.lastName
      ),

    email:
      firstDefined(
        rawUser?.email,
        rawUser?.userEmail
      ),

    phone:
      firstDefined(
        rawUser?.phone,
        rawUser?.userName
      ),
  };

  if (token) {
    localStorage.setItem(
      "juice_robo_token",
      String(token)
    );

    localStorage.setItem(
      "_token",
      JSON.stringify(token)
    );
  }

  if (
    Object.keys(user).length > 0
  ) {
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

    access_token:
      token || "",

    accessToken:
      token || "",

    user,
  };
}

/* ============================================================
   LEGACY ORDER PAYLOAD
   ============================================================ */

function buildLegacyOrderPayload(
  payload = {}
) {
  const storeId =
    payload?.storeId ||
    payload?.store_id ||
    payload?.location_id ||
    getStoreId();

  const customer =
    payload?.customer ||
    payload?.user ||
    getUserSnapshot();

  const sourceItems =
    Array.isArray(payload?.cartItems)
      ? payload.cartItems
      : Array.isArray(payload?.items)
        ? payload.items
        : [];

  if (!storeId) {
    throw new Error(
      "No Juice Robo store is selected."
    );
  }

  if (!sourceItems.length) {
    throw new Error(
      "Your Juice Robo cart is empty."
    );
  }

  const cartId =
    payload?.cartId ||
    (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `JR-${Date.now()}`
    );

  return {
    cartId:
      String(cartId),

    storeId:
      String(storeId),

    updatedBy:
      String(
        firstDefined(
          customer?.firstname,
          customer?.firstName,
          customer?.name,
          payload?.updatedBy,
          ""
        )
      ),

    cartItems:
      sourceItems.map(
        (item) => {
          const variant =
            item?._variant ||
            item?.variant ||
            item;

          return {
            variantId:
              Number(
                firstDefined(
                  variant?.variantId,
                  variant?.variant_id,
                  item?.variantId,
                  item?.id,
                  item?.product_id,
                  0
                )
              ),

            itemName:
              String(
                firstDefined(
                  variant?.itemName,
                  item?.itemName,
                  item?.name,
                  "Juice"
                )
              ),

            variantName:
              String(
                firstDefined(
                  variant?.variantName,
                  item?.variantName,
                  item?.product_type,
                  "Full"
                )
              ),

            variantDesc:
              String(
                firstDefined(
                  variant?.variantDesc,
                  item?.description,
                  item?.desc,
                  ""
                )
              ),

            unitPrice:
              Number(
                firstDefined(
                  variant?.unitPrice,
                  variant?.unit_price,
                  variant?.price,
                  item?.unitPrice,
                  item?.price,
                  0
                )
              ),

            taxInclusive:
              Boolean(
                variant?.taxInclusive ??
                  item?.taxInclusive ??
                  true
              ),

            taxRate:
              Number(
                firstDefined(
                  variant?.taxRate,
                  item?.taxRate,
                  12
                )
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
              variant?.variantPhoto ||
              item?.variantPhoto ||
              item?.image_url ||
              item?.image ||
              null,
          };
        }
      ),
  };
}

/* ============================================================
   API
   ============================================================ */

export const api = {
  baseUrl: API_BASE,

  config: {
    baseUrl: API_BASE,

    orgId:
      getOrgId,
  },

  /* ----------------------------------------------------------
     AUTH
     ---------------------------------------------------------- */

  login:
    async (payload = {}) => {
      const response =
        await request(
          "/v1/auth/signin",
          {
            method: "POST",

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
        parts.slice(1).join(" ") ||
        firstName;

      const response =
        await request(
          "/v1/auth/registerUser",
          {
            method: "POST",

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

  /* ----------------------------------------------------------
     CUSTOMER / PROFILE
     ---------------------------------------------------------- */

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
          unwrap(response) || {};

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
    async () => api.profile(),

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
      /*
       * Legacy customer creation is not the same as the newer
       * FastAPI /users endpoint. Reuse the legacy registration
       * endpoint when a password is supplied; otherwise keep
       * the checkout customer locally.
       */
      if (payload?.password) {
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

      /*
       * The legacy submitOrder endpoint identifies the customer
       * from the order payload. It does not require the newer
       * FastAPI customer endpoint.
       */
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
            method: "POST",

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
        unwrap(response) || {};

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

  /* ----------------------------------------------------------
     PRODUCTS
     ---------------------------------------------------------- */

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

  /* ----------------------------------------------------------
     LOCATIONS / OUTLETS
     ---------------------------------------------------------- */

  locations:
    async () => {
      const response =
        await request(
          `/v1/getoutlets/${encodeURIComponent(
            getOrgId()
          )}`
        );

      const locations =
        asArray(response)
          .map(
            normalizeLocation
          )
          .filter(Boolean);

      if (locations.length) {
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

      console.log(
        "[Juice Robo] Parsed locations:",
        locations
      );

      return locations;
    },

  getLocations:
    async () =>
      api.locations(),

  /* ----------------------------------------------------------
     MACHINES
     ---------------------------------------------------------- */

  machines:
    async () => {
      /*
       * The legacy API exposes the physical outlet/store
       * through the outlet response rather than the newer
       * /machines endpoint.
       */
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

                name:
                  location.name,

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

  /* ----------------------------------------------------------
     ORDERS
     ---------------------------------------------------------- */

  createOrder:
    async (payload = {}) => {
      const legacyPayload =
        buildLegacyOrderPayload(
          payload
        );

      console.log(
        "[Juice Robo] Legacy order payload:",
        legacyPayload
      );

      const response =
        await request(
          "/v1/submitOrder",
          {
            method: "POST",

            body:
              JSON.stringify(
                legacyPayload
              ),
          }
        );

      return normalizeOrder(
        response
      );
    },

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
        orderId === undefined ||
        orderId === null ||
        orderId === ""
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

  /* ----------------------------------------------------------
     PAYMENT COMPATIBILITY
     ----------------------------------------------------------

     IMPORTANT:
     The legacy backend does NOT expose the newer:
       /payments/create-order
       /payments/verify

     The redesigned UI must therefore use the existing UPI
     handoff after /v1/submitOrder.

     These functions intentionally fail instead of silently
     calling the wrong backend.
     ---------------------------------------------------------- */

  createPaymentOrder:
    async () => {
      throw new Error(
        "The existing Juice Robo API uses the legacy UPI payment flow. Do not call the newer /payments/create-order endpoint."
      );
    },

  verifyPayment:
    async () => {
      throw new Error(
        "The existing Juice Robo API does not expose /payments/verify. Use the legacy UPI payment flow."
      );
    },
};

export {
  API_BASE,
  DEFAULT_ORG_ID,
};

export default api;

console.log(
  "[Juice Robo] Legacy API adapter loaded:",
  API_BASE
);

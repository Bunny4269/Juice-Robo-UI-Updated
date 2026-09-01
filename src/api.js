/* =========================================================
   JUICE ROBO — FRONTEND API ADAPTER
   LEGACY TEST BACKEND
   =========================================================
   
   GENERAL API:
   https://tptest.juicerobo.com/tporder/api

   ORDER MASTER API:
   https://tptest.juicerobo.com/tpordermaster/api

   CURRENT ORDER FLOW:
     1. POST /v1/addcart
     2. POST /v1/order/submit
   ========================================================= */


/* =========================================================
   LOCAL JUICE ROBO DEVELOPMENT AUTH API
   =========================================================

const LOCAL_API_BASE =
  "http://127.0.0.1:8000";


/* =========================================================
   LEGACY JUICE ROBO API
   ========================================================= */

const API_BASE =
  "https://tptest.juicerobo.com/tporder/api";

const ORDER_API_BASE =
  "https://tptest.juicerobo.com/tpordermaster/api";


/* =========================================================
   DEFAULT ORGANIZATION
   ========================================================= */

const DEFAULT_ORG_ID =
  "d2006bfc-95df-4925-a617-6d10d06b99bc";


/* =========================================================
   EXISTING JUICE ROBO TEST CREDENTIALS
   ========================================================= */

const JR_API_KEY =
  "fd272156-8768-47ec-80e5-6779309e6cac";

const JR_API_KEY_SECRET =
  "e844933d-9f44-4e4b-b0fe-e7bfc771ce99";


/* =========================================================
   HELPERS
   ========================================================= */

function cleanStoredValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/^"|"$/g, "");
}


function firstDefined(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value !== ""
  );
}


function getStoredToken() {
  return (
    cleanStoredValue(
      localStorage.getItem(
        "juice_robo_token"
      )
    ) ||
    cleanStoredValue(
      localStorage.getItem(
        "_token"
      )
    )
  );
}


/* =========================================================
   ORGANIZATION
   ========================================================= */

function getOrgId() {
  const stored =
    cleanStoredValue(
      localStorage.getItem("ORG_ID")
    ) ||
    cleanStoredValue(
      localStorage.getItem(
        "juice_robo_org_id"
      )
    );

  if (stored) {
    return stored;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const queryOrg =
    cleanStoredValue(
      params.get("o_id")
    ) ||
    cleanStoredValue(
      params.get("org_id")
    );

  if (queryOrg) {
    localStorage.setItem(
      "ORG_ID",
      queryOrg
    );

    localStorage.setItem(
      "juice_robo_org_id",
      queryOrg
    );

    return queryOrg;
  }

  const pathParts =
    window.location.pathname
      .split("/")
      .filter(Boolean);

  const possibleOrg =
    pathParts.find(
      (part) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          part
        )
    );

  if (possibleOrg) {
    localStorage.setItem(
      "ORG_ID",
      possibleOrg
    );

    localStorage.setItem(
      "juice_robo_org_id",
      possibleOrg
    );

    return possibleOrg;
  }

  localStorage.setItem(
    "ORG_ID",
    DEFAULT_ORG_ID
  );

  localStorage.setItem(
    "juice_robo_org_id",
    DEFAULT_ORG_ID
  );

  return DEFAULT_ORG_ID;
}


/* =========================================================
   STORE
   ========================================================= */

function getStoreId() {
  return cleanStoredValue(
    localStorage.getItem(
      "store_Id"
    ) ||
    localStorage.getItem(
      "juice_robo_store_id"
    )
  );
}


function saveStoreId(storeId) {
  const value =
    cleanStoredValue(
      storeId
    );

  if (!value) {
    return "";
  }

  /*
   * Never save a generated/fake store ID.
   */
  if (
    value
      .toLowerCase()
      .startsWith("store-")
  ) {
    console.warn(
      "[Juice Robo] Refusing fake store ID:",
      value
    );

    return "";
  }

  localStorage.setItem(
    "store_Id",
    value
  );

  localStorage.setItem(
    "juice_robo_store_id",
    value
  );

  return value;
}


/* =========================================================
   USER
   ========================================================= */

function getUserSnapshot() {
  const keys = [
    "juice_robo_user",
    "user",
  ];

  for (const key of keys) {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      continue;
    }

    try {
      const parsed =
        JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return parsed;
      }
    } catch {
      return {
        firstname:
          cleanStoredValue(raw),
      };
    }
  }

  return {};
}


/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

function unwrap(data) {
  let current =
    data;

  for (
    let i = 0;
    i < 5;
    i += 1
  ) {
    if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current) &&
      current.data !== undefined
    ) {
      current =
        current.data;

      continue;
    }

    break;
  }

  return current;
}


function extractArray(
  response,
  keys = []
) {
  const direct =
    unwrap(response);

  if (Array.isArray(direct)) {
    return direct;
  }

  const candidates = [
    response,
    direct,
  ];

  for (const candidate of candidates) {
    if (
      !candidate ||
      typeof candidate !== "object" ||
      Array.isArray(candidate)
    ) {
      continue;
    }

    for (const key of keys) {
      const value =
        candidate[key];

      if (Array.isArray(value)) {
        return value;
      }

      if (
        value &&
        typeof value === "object"
      ) {
        const nested =
          unwrap(value);

        if (Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }

  return [];
}


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
      typeof value.message === "string"
    ) {
      return value.message;
    }

    if (
      typeof value.error === "string"
    ) {
      return value.error;
    }

    if (
      typeof value.detail === "string"
    ) {
      return value.detail;
    }

    if (
      Array.isArray(value.errors)
    ) {
      return value.errors
        .map((error) =>
          typeof error === "string"
            ? error
            : error?.message ||
              error?.msg ||
              JSON.stringify(error)
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

  if (status === 401) {
    return (
      "Juice Robo API authentication failed (401)."
    );
  }

  if (status === 403) {
    return (
      "Juice Robo API access was forbidden (403)."
    );
  }

  return (
    `Juice Robo request failed (${status}).`
  );
}

/* =========================================================
   REQUEST HEADERS
   ========================================================= */

function buildHeaders(
  options = {}
) {
  const headers = {
    Accept:
      "application/json",

    "JR-API-KEY":
      JR_API_KEY,

    "JR-API-KEY-SECRET":
      JR_API_KEY_SECRET,

    ...(options.headers || {}),
  };


  /* =======================================================
     CONTENT TYPE
     ======================================================= */

  if (
    options.body !== undefined
  ) {
    headers[
      "Content-Type"
    ] =
      "application/json";
  }


  /* =======================================================
     BEARER AUTHENTICATION
     =======================================================

     Existing Juice Robo login returns:

       accessToken

     normalizeAuth() stores it in:

       juice_robo_token

     The token must then be sent with authenticated
     Juice Robo API requests.

     IMPORTANT:

     Login itself must NOT send an old Bearer token.

     Therefore requests can explicitly disable it with:

       skipAuth: true
     ======================================================= */

  if (
    !options.skipAuth
  ) {

    const token =
      getStoredToken();


    if (token) {

      headers[
        "Authorization"
      ] =
        `Bearer ${token}`;
    }
  }


  return headers;
}
/* =========================================================
   GENERIC REQUEST
   ========================================================= */

async function request(
  path,
  options = {},
  baseUrl = API_BASE
) {
  const cleanBase =
    String(baseUrl)
      .replace(
        /\/+$/,
        ""
      );


  const cleanPath =
    String(path).startsWith("/")
      ? String(path)
      : `/${String(path)}`;


  const url =
    `${cleanBase}${cleanPath}`;


  const headers =
    buildHeaders(
      options
    );


  console.log(
    `[Juice Robo] ${
      options.method ||
      "GET"
    } ${url}`
  );


  console.log(
    "[Juice Robo] Authentication configured:",
    {
      hasApiKey:
        Boolean(
          JR_API_KEY
        ),

      hasApiSecret:
        Boolean(
          JR_API_KEY_SECRET
        ),

      hasAuthorization:
        Boolean(
          headers.Authorization
        ),
    }
  );


  let response;


  try {

    /*
     * Do not pass our internal skipAuth option
     * into the browser fetch() API.
     */

    const {
      skipAuth,
      ...fetchOptions
    } = options;


    response =
      await fetch(
        url,
        {
          ...fetchOptions,

          headers,
        }
      );

  } catch (
    error
  ) {

    console.error(
      "[Juice Robo] Network error:",
      error
    );


    throw new Error(
      "Unable to connect to the Juice Robo test API. Check the internet connection."
    );
  }


  const contentType =
    response.headers.get(
      "content-type"
    ) || "";


  let data =
    null;


  try {

    if (
      contentType
        .toLowerCase()
        .includes(
          "application/json"
        )
    ) {

      data =
        await response.json();

    } else {

      const text =
        await response.text();

      data =
        text ||
        null;
    }

  } catch (
    error
  ) {

    console.error(
      "[Juice Robo] Response parsing error:",
      error
    );
  }


  console.log(
    "[Juice Robo] Response:",
    {
      status:
        response.status,

      url,

      data,
    }
  );


  if (
    !response.ok
  ) {

    throw new Error(
      normalizeError(
        data,
        response.status
      )
    );
  }


  return data;
}


/* =========================================================
   PRODUCT NORMALIZATION
   ========================================================= */

function normalizeProduct(item) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  const variants =
    Array.isArray(
      item?.lstVariants
    )
      ? item.lstVariants
      : Array.isArray(
          item?.variants
        )
      ? item.variants
      : [];

  const availableVariant =
    variants.find(
      (variant) =>
        String(
          variant?.variantName || ""
        )
          .trim()
          .toLowerCase() ===
        "full"
    ) ||
    variants.find(
      (variant) =>
        Number(
          firstDefined(
            variant?.unitPrice,
            variant?.price,
            0
          )
        ) >= 0
    ) ||
    variants[0];

  if (!availableVariant) {
    console.warn(
      "[Juice Robo] Product has no usable variant:",
      item
    );

    return null;
  }

  const rawName =
    String(
      firstDefined(
        item?.name,
        availableVariant?.itemName,
        "Juice"
      )
    );

  const description =
    String(
      firstDefined(
        item?.desc,
        item?.description,
        availableVariant?.variantDesc,
        "Fresh sugarcane juice."
      )
    );

  /*
   * The legacy API may return "Juice" for
   * every item. Search all product text.
   */
  const searchText =
    [
      item?.name,
      item?.desc,
      item?.description,
      availableVariant?.itemName,
      availableVariant?.variantName,
      availableVariant?.variantDesc,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  let displayName =
    rawName;

  if (
    searchText.includes("ginger") &&
    searchText.includes("lemon")
  ) {
    displayName =
      "Ginger + Lemon Sugarcane Juice";
  } else if (
    searchText.includes("mixed")
  ) {
    displayName =
      "Ginger + Lemon Sugarcane Juice";
  } else if (
    searchText.includes("ginger")
  ) {
    displayName =
      "Ginger Sugarcane Juice";
  } else if (
    searchText.includes("lemon")
  ) {
    displayName =
      "Lemon Sugarcane Juice";
  } else if (
    rawName
      .toLowerCase()
      .includes("plain")
  ) {
    displayName =
      "Plain Sugarcane Juice";
  }

  const assetBase =
    `${import.meta.env.BASE_URL}assets/`;

  let imageUrl =
    `${assetBase}plain-juice.jpg`;

  /*
   * Check Ginger + Lemon FIRST.
   */
  if (
    searchText.includes("ginger") &&
    searchText.includes("lemon")
  ) {
    imageUrl =
      `${assetBase}ginger-lemon-juice.jpg`;
  } else if (
    searchText.includes("mixed")
  ) {
    imageUrl =
      `${assetBase}ginger-lemon-juice.jpg`;
  } else if (
    searchText.includes("ginger")
  ) {
    imageUrl =
      `${assetBase}ginger-juice.jpg`;
  } else if (
    searchText.includes("lemon")
  ) {
    imageUrl =
      `${assetBase}lemon-juice.jpg`;
  }

  const variantId =
    Number(
      firstDefined(
        availableVariant?.variantId,
        availableVariant?.id,
        item?.variantId,
        item?.id,
        0
      )
    );

  if (!variantId) {
    console.warn(
      "[Juice Robo] Product has no valid legacy variant ID:",
      item
    );

    return null;
  }

  return {
    id:
      variantId,

    itemId:
      item?.id,

    name:
      displayName,

    description:
      description,

    price:
      Number(
        firstDefined(
          availableVariant?.unitPrice,
          availableVariant?.price,
          item?.price,
          item?.unitPrice,
          0
        )
      ),

    image_url:
      imageUrl,

    is_available:
      availableVariant?.isAvailable !==
        false &&
      item?.isAvailable !==
        false,

    isAvailable:
      availableVariant?.isAvailable !==
        false &&
      item?.isAvailable !==
        false,

    storeId:
      item?.storeId ||
      getStoreId(),

    productType:
      rawName,

    _legacyItem:
      item,

    _variant:
      availableVariant,

    variants:
      variants,
  };
}


function normalizeProducts(
  response
) {
  const data =
    extractArray(
      response,
      [
        "items",
        "products",
        "result",
      ]
    );

  return data
    .map(normalizeProduct)
    .filter(Boolean);
}


/* =========================================================
   OUTLET NORMALIZATION
   ========================================================= */

function normalizeOutlets(
  response
) {
  const unwrapped =
    unwrap(response);

  let stores =
    extractArray(
      response,
      [
        "storesData",
        "stores",
        "outlets",
        "locations",
        "result",
        "storeSpot",
      ]
    );

  /*
   * Observed legacy response:
   *
   * {
   *   outletName,
   *   outletDesc,
   *   outletPhoto,
   *   storeSpot: [...]
   * }
   */
  if (
    !stores.length &&
    unwrapped &&
    typeof unwrapped === "object" &&
    Array.isArray(
      unwrapped.storeSpot
    )
  ) {
    stores =
      unwrapped.storeSpot;
  }

  const parent =
    unwrapped &&
    typeof unwrapped === "object"
      ? unwrapped
      : {};

  return stores
    .map(
      (outlet, index) => {
        const storeId =
          cleanStoredValue(
            firstDefined(
              outlet?.locId,
              outlet?.storeId,
              outlet?.storeID,
              outlet?.store_id,
              outlet?.id
            )
          );

        /*
         * Never invent a fake ID.
         */
        if (!storeId) {
          console.warn(
            "[Juice Robo] Outlet has no real store ID:",
            outlet
          );

          return null;
        }

        const isActive =
          outlet?.isActive !== false &&
          outlet?.active !== false;

        return {
          id:
            storeId,

          storeId:
            storeId,

          name:
            firstDefined(
              outlet?.storeName,
              outlet?.outletName,
              outlet?.name,
              parent?.outletName,
              `Juice Robo ${index + 1}`
            ),

          address:
            firstDefined(
              outlet?.locAddress,
              outlet?.outletDesc,
              outlet?.address,
              outlet?.description,
              parent?.outletDesc,
              "Juice Robo collection point"
            ),

          image:
            firstDefined(
              outlet?.outletPhoto,
              outlet?.image,
              parent?.outletPhoto,
              null
            ),

          is_active:
            isActive,

          isActive:
            isActive,

          _legacyStore:
            outlet,

          _legacyOutlet:
            outlet,
        };
      }
    )
    .filter(Boolean);
}


/* =========================================================
   MACHINE NORMALIZATION
   ========================================================= */

function normalizeMachines(
  locations
) {
  return locations.map(
    (location) => ({
      /*
       * Legacy machine identity is represented
       * by the real store ID.
       */
      id:
        String(
          location.storeId
        ),

      machine_code:
        String(
          location.storeId
        ),

      machineCode:
        String(
          location.storeId
        ),

      name:
        location.name,

      location_id:
        String(
          location.id
        ),

      locationId:
        String(
          location.id
        ),

      firmware_version:
        "LEGACY",

      firmwareVersion:
        "LEGACY",

      status:
        "ONLINE",

      last_seen_at:
        null,

      lastSeenAt:
        null,
    })
  );
}


/* =========================================================
   ORDER NORMALIZATION
   ========================================================= */

function normalizeOrder(
  rawOrder
) {
  const order =
    unwrap(rawOrder) || {};

  const nestedOrder =
    order?.order &&
    typeof order.order === "object"
      ? order.order
      : order;

  const orderNumber =
    firstDefined(
      nestedOrder?.order_number,
      nestedOrder?.orderNumber,
      nestedOrder?.orderId,
      nestedOrder?.id,
      nestedOrder?.orderCode,
      rawOrder?.message,
      ""
    );

  const collectionCode =
    firstDefined(
      nestedOrder?.collection_code,
      nestedOrder?.collectionCode,
      nestedOrder?.pickupCode,
      nestedOrder?.collectionId,
      nestedOrder?.token,
      nestedOrder?.orderPin,
      nestedOrder?.order_pin,
      "----"
    );

  const items =
    Array.isArray(
      nestedOrder?.items
    )
      ? nestedOrder.items
      : Array.isArray(
          nestedOrder?.cartItems
        )
      ? nestedOrder.cartItems
      : [];

  const normalizedItems =
    items.map(
      (item) => ({
        product_id:
          Number(
            firstDefined(
              item?.product_id,
              item?.productId,
              item?.variantId,
              item?.id,
              0
            )
          ),

        product_name:
          String(
            firstDefined(
              item?.product_name,
              item?.productName,
              item?.itemName,
              item?.variantName,
              "Juice"
            )
          ),

        quantity:
          Number(
            firstDefined(
              item?.quantity,
              1
            )
          ),

        unit_price:
          Number(
            firstDefined(
              item?.unit_price,
              item?.unitPrice,
              item?.price,
              0
            )
          ),

        subtotal:
          Number(
            firstDefined(
              item?.subtotal,
              Number(
                firstDefined(
                  item?.unitPrice,
                  item?.price,
                  0
                )
              ) *
              Number(
                firstDefined(
                  item?.quantity,
                  1
                )
              ),
              0
            )
          ),
      })
    );

  const total =
    Number(
      firstDefined(
        nestedOrder?.total_amount,
        nestedOrder?.totalAmount,
        nestedOrder?.grandTotal,
        nestedOrder?.netBill,
        nestedOrder?.amount,
        0
      )
    );

  return {
    ...nestedOrder,

    id:
      firstDefined(
        nestedOrder?.id,
        nestedOrder?.orderId,
        orderNumber
      ),

    order_id:
      firstDefined(
        nestedOrder?.order_id,
        nestedOrder?.orderId,
        nestedOrder?.id,
        ""
      ),

    order_number:
      String(
        orderNumber
      ),

    collection_code:
      String(
        collectionCode
      ),

    collectionCode:
      String(
        collectionCode
      ),

    total_amount:
      total,

    totalAmount:
      total,

    status:
      String(
        firstDefined(
          nestedOrder?.status,
          nestedOrder?.orderStatus,
          "PENDING"
        )
      ),

    payment_status:
      String(
        firstDefined(
          nestedOrder?.payment_status,
          nestedOrder?.paymentStatus,
          "PENDING"
        )
      ),

    created_at:
      firstDefined(
        nestedOrder?.created_at,
        nestedOrder?.createdAt,
        new Date().toISOString()
      ),

    items:
      normalizedItems,
  };
}


/* =========================================================
   AUTH NORMALIZATION
   ========================================================= */

function normalizeAuth(
  response
) {
  const data =
    unwrap(response) || {};

  const accessToken =
    firstDefined(
      data?.accessToken,
      data?.access_token,
      data?.token,
      response?.accessToken,
      response?.access_token,
      response?.token
    );

  const userData =
    data?.user &&
    typeof data.user === "object"
      ? data.user
      : data;

  if (accessToken) {
    const user = {
      ...userData,

      id:
        firstDefined(
          userData?.id,
          userData?.userId,
          data?.id,
          ""
        ),

      name:
        firstDefined(
          userData?.name,
          [
            userData?.firstName,
            userData?.lastName,
          ]
            .filter(Boolean)
            .join(" "),
          ""
        ),

      firstname:
        firstDefined(
          userData?.firstName,
          userData?.firstname,
          ""
        ),

      lastname:
        firstDefined(
          userData?.lastName,
          userData?.lastname,
          ""
        ),

      email:
        firstDefined(
          userData?.email,
          userData?.userEmail,
          ""
        ),

      phone:
        firstDefined(
          userData?.phone,
          userData?.userName,
          ""
        ),
    };

    localStorage.setItem(
      "juice_robo_token",
      String(accessToken)
    );

    localStorage.setItem(
      "_token",
      JSON.stringify(accessToken)
    );

    localStorage.setItem(
      "juice_robo_user",
      JSON.stringify(user)
    );

    localStorage.setItem(
      "user",
      JSON.stringify(user)
    );

    return {
      ...response,
      ...data,

      access_token:
        accessToken,

      accessToken:
        accessToken,

      user:
        user,
    };
  }

  return response;
}


/* =========================================================
   ORDER PAYLOAD
   ========================================================= */

function buildLegacyOrderPayload(
  payload = {}
) {
  const storeId =
    cleanStoredValue(
      firstDefined(
        payload?.storeId,
        payload?.store_id,
        payload?.location_id,
        payload?.machine_id,
        getStoreId()
      )
    );

  const customer =
    payload?.customer ||
    payload?.user ||
    getUserSnapshot();

  const cartItems =
    Array.isArray(
      payload?.cartItems
    )
      ? payload.cartItems
      : Array.isArray(
          payload?.items
        )
      ? payload.items
      : [];

  if (!storeId) {
    throw new Error(
      "No Juice Robo store is selected."
    );
  }

  if (
    storeId
      .toLowerCase()
      .startsWith("store-")
  ) {
    throw new Error(
      `Invalid Juice Robo store ID: ${storeId}`
    );
  }

  if (!cartItems.length) {
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
      cartItems.map(
        (item) => {
          const variant =
            item?._variant ||
            item?.variant ||
            item;

          const variantId =
            Number(
              firstDefined(
                variant?.variantId,
                variant?.id,
                item?.variantId,
                item?.id,
                item?.product_id,
                0
              )
            );

          const quantity =
            Math.max(
              1,
              Number(
                firstDefined(
                  item?.quantity,
                  variant?.quantity,
                  1
                )
              )
            );

          if (!variantId) {
            throw new Error(
              "A Juice Robo cart item is missing its variant ID."
            );
          }

          return {
            variantId:
              variantId,

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
                  "Full"
                )
              ),

            variantDesc:
              String(
                firstDefined(
                  variant?.variantDesc,
                  item?.description,
                  ""
                )
              ),

            unitPrice:
              Number(
                firstDefined(
                  variant?.unitPrice,
                  variant?.price,
                  item?.price,
                  item?.unitPrice,
                  0
                )
              ),

            taxInclusive:
              Boolean(
                variant?.taxInclusive ??
                item?.taxInclusive ??
                false
              ),

            taxRate:
              Number(
                firstDefined(
                  variant?.taxRate,
                  item?.taxRate,
                  0
                )
              ),

            quantity:
              quantity,

            variantPhoto:
              variant?.variantPhoto ||
              item?.variantPhoto ||
              null,
          };
        }
      ),
  };
}


/* =========================================================
   EXPORTED API
   ========================================================= */

export const api = {

  /* =======================================================
     PRODUCTS
     ======================================================= */

  products:
    async () => {
      let storeId =
        getStoreId();

      if (!storeId) {
        const locations =
          await api.locations();

        if (!locations.length) {
          throw new Error(
            "No Juice Robo outlet is available for this organization."
          );
        }

        storeId =
          saveStoreId(
            locations[0].storeId
          );

        if (!storeId) {
          throw new Error(
            "Juice Robo returned an invalid store ID."
          );
        }
      }

      if (
        storeId
          .toLowerCase()
          .startsWith("store-")
      ) {
        localStorage.removeItem(
          "store_Id"
        );

        localStorage.removeItem(
          "juice_robo_store_id"
        );

        const locations =
          await api.locations();

        if (!locations.length) {
          throw new Error(
            "No valid Juice Robo outlet is available."
          );
        }

        storeId =
          saveStoreId(
            locations[0].storeId
          );
      }

      console.log(
        "[Juice Robo] Loading products for store:",
        storeId
      );

      const response =
        await request(
          `/v1/itemmaster/items/${encodeURIComponent(
            storeId
          )}`
        );

      return normalizeProducts(
        response
      );
    },


  /* =======================================================
     LOCATIONS
     ======================================================= */

  locations:
    async () => {
      const orgId =
        getOrgId();

      console.log(
        "[Juice Robo] Loading outlets for ORG_ID:",
        orgId
      );

      const response =
        await request(
          `/v1/getoutlets/${encodeURIComponent(
            orgId
          )}`
        );

      const locations =
        normalizeOutlets(
          response
        );

      if (locations.length) {
        const currentStore =
          getStoreId();

        const exists =
          locations.some(
            (location) =>
              String(
                location.storeId
              ) ===
              String(
                currentStore
              )
          );

        if (!exists) {
          saveStoreId(
            locations[0].storeId
          );
        }
      }

      console.log(
        "[Juice Robo] Parsed locations:",
        locations
      );

      return locations;
    },


  /* =======================================================
     MACHINES
     ======================================================= */

  machines:
    async () => {
      const locations =
        await api.locations();

      return normalizeMachines(
        locations
      );
    },


  /* =======================================================
     LOGIN
     ======================================================= */

  login:
    async (
      payload = {}
    ) => {
      const response =
        await request(
          "/v1/auth/signin",
          {
            method:
              "POST",

            body:
              JSON.stringify({
                userName:
                  payload?.userName ||
                  payload?.username ||
                  payload?.email ||
                  payload?.phone ||
                  "",

                password:
                  payload?.password ||
                  "",
              }),
          }
        );

      return normalizeAuth(
        response
      );
    },


  /* =======================================================
   REGISTER
   =======================================================

   NEW USER REGISTRATION:

   React
      ↓
   Local FastAPI
      ↓
   SQLite
      ↓
   users.xlsx

   IMPORTANT:

   New users MUST NOT be sent to:

   /v1/auth/registerUser

   That endpoint belongs to the existing Juice Robo
   backend and caused the "Web Username is already taken"
   problem for newly created development users.

   Existing users continue to use the legacy API during
   LOGIN.
   ======================================================= */

register:
  async (
    payload = {}
  ) => {

    /* =====================================================
       READ USER DETAILS
       ===================================================== */

    const name =
      String(
        payload?.name ||
        ""
      ).trim();


    const phone =
      String(
        payload?.phone ||
        ""
      )
        .replace(
          /\D/g,
          ""
        );


    const email =
      String(
        payload?.email ||
        payload?.userEmail ||
        ""
      )
        .trim()
        .toLowerCase();


    const password =
      String(
        payload?.password ||
        ""
      );


    /* =====================================================
       VALIDATION
       ===================================================== */

    if (!name) {
      throw new Error(
        "Enter your full name."
      );
    }


    if (!phone) {
      throw new Error(
        "Enter your phone number."
      );
    }


    if (
      phone.length !==
      10
    ) {
      throw new Error(
        "Enter a valid 10-digit phone number."
      );
    }


    if (!email) {
      throw new Error(
        "Enter your email address."
      );
    }


    if (!password) {
      throw new Error(
        "Enter your password."
      );
    }


    if (
      password.length <
      6
    ) {
      throw new Error(
        "Password must contain at least 6 characters."
      );
    }


    /* =====================================================
       DEBUG
       ===================================================== */

    console.log(
      "[Juice Robo] LOCAL registration:",
      {
        name,
        phone,
        email,
      }
    );


    console.log(
      "[Juice Robo] LOCAL registration URL:",
      `${LOCAL_API_BASE}/api/auth/register`
    );


    /* =====================================================
       LOCAL FASTAPI REGISTRATION
       ===================================================== */

    const response =
      await request(
        "/api/auth/register",
        {
          method:
            "POST",

          body:
            JSON.stringify({
              name:
                name,

              email:
                email,

              phone:
                phone,

              password:
                password,
            }),
        },
        LOCAL_API_BASE
      );


    /* =====================================================
       DEBUG RESPONSE
       ===================================================== */

    console.log(
      "[Juice Robo] LOCAL registration response:",
      response
    );


    /* =====================================================
       NORMALIZE RESPONSE
       ===================================================== */

    return normalizeAuth(
      response
    );
  },


  /* =======================================================
     PROFILE
     ======================================================= */

  profile:
    async () => {
      const user =
        getUserSnapshot();

      if (user?.id) {
        try {
          const response =
            await request(
              `/user/${encodeURIComponent(
                user.id
              )}`
            );

          const data =
            unwrap(response);

          if (
            data &&
            typeof data === "object"
          ) {
            const normalized = {
              ...user,
              ...data,

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

            localStorage.setItem(
              "juice_robo_user",
              JSON.stringify(
                normalized
              )
            );

            localStorage.setItem(
              "user",
              JSON.stringify(
                normalized
              )
            );

            return normalized;
          }
        } catch (error) {
          console.warn(
            "[Juice Robo] Profile endpoint unavailable; using stored profile.",
            error
          );
        }
      }

      return {
        ...user,

        name:
          user?.name ||
          [
            user?.firstname,
            user?.lastname,
          ]
            .filter(Boolean)
            .join(" ") ||
          "Juice Lover",

        email:
          user?.email ||
          "",

        phone:
          user?.phone ||
          "",
      };
    },


  /* =======================================================
     UPDATE PROFILE
     ======================================================= */

  updateProfile:
    async (
      payload = {}
    ) => {
      const user =
        getUserSnapshot();

      if (!user?.id) {
        const next = {
          ...user,
          ...payload,
        };

        localStorage.setItem(
          "juice_robo_user",
          JSON.stringify(next)
        );

        localStorage.setItem(
          "user",
          JSON.stringify(next)
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
        unwrap(response);

      if (
        normalized &&
        typeof normalized === "object"
      ) {
        localStorage.setItem(
          "juice_robo_user",
          JSON.stringify(
            normalized
          )
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            normalized
          )
        );
      }

      return normalized;
    },


  /* =======================================================
     ORDERS
     ======================================================= */

  orders:
    async () => {
      const response =
        await request(
          "/v1/orders"
        );

      const data =
        extractArray(
          response,
          [
            "orders",
            "result",
          ]
        );

      return data.map(
        normalizeOrder
      );
    },


  /* =======================================================
     SINGLE ORDER
     ======================================================= */

  order:
    async (
      id
    ) => {
      if (
        id === undefined ||
        id === null ||
        id === ""
      ) {
        throw new Error(
          "Order ID is required."
        );
      }

      const response =
        await request(
          `/order/${encodeURIComponent(
            id
          )}`
        );

      return normalizeOrder(
        response
      );
    },
    /* =======================================================
   CREATE ORDER
   =======================================================

   JUICE ROBO ORDER MASTER FLOW

   1. POST /v1/addcart
   2. Read the REAL cartId returned by the backend
   3. POST /v1/order/submit using that REAL cartId

   IMPORTANT:
   The cartId generated by the frontend is only a request
   identifier.

   The cartId returned by /addcart is the authoritative
   backend cart ID and MUST be used for order submission.
   ======================================================= */

createOrder:
  async (
    payload = {}
  ) => {

    console.log(
      "[Juice Robo] createOrder payload:",
      payload
    );


    /*
     * -------------------------------------------------------
     * BUILD LEGACY PAYLOAD
     * -------------------------------------------------------
     */

    const legacyPayload =
      buildLegacyOrderPayload(
        payload
      );


    /*
     * -------------------------------------------------------
     * FRONTEND REQUEST CART ID
     * -------------------------------------------------------
     *
     * This is only sent to /addcart.
     *
     * The backend may return a different cart ID.
     */

    const requestedCartId =
      String(
        legacyPayload.cartId
      );


    /*
     * -------------------------------------------------------
     * ADD CART
     * -------------------------------------------------------
     */

    const addCartPayload = {

      cartId:
        requestedCartId,

      locId:
        String(
          legacyPayload.storeId
        ),

      cartItems:
        legacyPayload.cartItems.map(
          (
            item
          ) => ({

            variantId:
              Number(
                item.variantId
              ),

            quantity:
              Number(
                item.quantity
              ),

          })
        ),

    };


    console.log(
      "[Juice Robo] ADD CART payload:",
      addCartPayload
    );


    const cartResponse =
      await request(
        "/v1/addcart",
        {
          method:
            "POST",

          body:
            JSON.stringify(
              addCartPayload
            ),
        },
        ORDER_API_BASE
      );


    console.log(
      "[Juice Robo] ADD CART response:",
      cartResponse
    );


    /*
     * -------------------------------------------------------
     * EXTRACT REAL BACKEND CART ID
     * -------------------------------------------------------
     */

    const addCartData =
      unwrap(
        cartResponse
      );


    let realCartId = "";


    if (
      typeof addCartData ===
      "string"
    ) {

      realCartId =
        addCartData.trim();

    } else if (
      addCartData &&
      typeof addCartData ===
      "object"
    ) {

      realCartId =
        String(
          firstDefined(

            addCartData?.cartId,

            addCartData?.cart_id,

            addCartData?.id,

            addCartData?.data,

            ""

          ) || ""
        ).trim();

    }


    /*
     * Some Juice Robo responses place the value directly
     * under response.data rather than after unwrap().
     */

    if (
      !realCartId
    ) {

      realCartId =
        String(
          firstDefined(

            cartResponse?.cartId,

            cartResponse?.cart_id,

            cartResponse?.id,

            cartResponse?.data,

            ""

          ) || ""
        ).trim();

    }


    /*
     * -------------------------------------------------------
     * VALIDATE REAL CART ID
     * -------------------------------------------------------
     */

    if (
      !realCartId
    ) {

      console.error(
        "[Juice Robo] ADD CART succeeded but no real cart ID was returned.",
        cartResponse
      );


      throw new Error(
        "Juice Robo created the cart but did not return a cart ID."
      );

    }


    console.log(
      "[Juice Robo] REAL BACKEND CART ID:",
      realCartId
    );


    /*
     * -------------------------------------------------------
     * IMPORTANT DEBUG
     * -------------------------------------------------------
     *
     * This lets us confirm whether the backend replaced the
     * frontend-generated cart ID.
     */

    console.log(
      "[Juice Robo] Cart ID comparison:",
      {
        requestedCartId:
          requestedCartId,

        backendCartId:
          realCartId,

        changed:
          requestedCartId !==
          realCartId,
      }
    );


    /*
     * -------------------------------------------------------
     * SUBMIT ORDER
     * -------------------------------------------------------
     *
     * USE THE BACKEND CART ID.
     *
     * NOT requestedCartId.
     */

    const submitPayload = {

      cartId:
        realCartId,

    };


    console.log(
      "[Juice Robo] ORDER SUBMIT payload:",
      submitPayload
    );


    const orderResponse =
      await request(
        "/v1/order/submit",
        {
          method:
            "POST",

          body:
            JSON.stringify(
              submitPayload
            ),
        },
        ORDER_API_BASE
      );


    console.log(
      "[Juice Robo] ORDER SUBMIT response:",
      orderResponse
    );


    /*
     * -------------------------------------------------------
     * CHECK BACKEND ORDER RESPONSE
     * -------------------------------------------------------
     */

    const submitStatus =
      Number(
        orderResponse?.status ??
        200
      );


    const submitMessage =
      String(
        orderResponse?.message ||
        ""
      ).trim();


    /*
     * The API currently appears to return:
     *
     * status: -1
     * message: "Invalid Cart Details"
     *
     * even though HTTP itself is 200.
     *
     * Therefore we MUST inspect the API-level status too.
     */

    if (
      submitStatus < 0
    ) {

      console.error(
        "[Juice Robo] ORDER SUBMIT rejected by backend:",
        orderResponse
      );


      throw new Error(
        submitMessage ||
        "Juice Robo rejected the cart while submitting the order."
      );

    }


    /*
     * -------------------------------------------------------
     * NORMALIZE REAL ORDER
     * -------------------------------------------------------
     */

    const normalized =
      normalizeOrder(
        orderResponse
      );


    /*
     * -------------------------------------------------------
     * RETURN COMPLETE RESULT
     * -------------------------------------------------------
     */

    return {

      ...normalized,


      /*
       * REAL backend cart ID
       */

      cartId:
        realCartId,


      /*
       * Keep the original request ID for debugging.
       */

      requestedCartId:
        requestedCartId,


      /*
       * Raw responses are useful while we are integrating
       * the legacy backend.
       */

      rawCartResponse:
        cartResponse,

      rawOrderResponse:
        orderResponse,


      /*
       * ORDER ID
       */

      orderId:
        firstDefined(

          orderResponse?.orderId,

          orderResponse?.order_id,

          orderResponse?.id,

          normalized?.order_id,

          normalized?.id,

          ""

        ),


      /*
       * TRANSACTION ID
       */

      transactionId:
        firstDefined(

          orderResponse?.transactionId,

          orderResponse?.transaction_id,

          normalized?.transactionId,

          ""

        ),


      /*
       * COLLECTION / PICKUP CODE
       */

      orderPin:
        firstDefined(

          orderResponse?.orderPin,

          orderResponse?.order_pin,

          normalized?.orderPin,

          ""

        ),


      collection_code:
        firstDefined(

          orderResponse?.collection_code,

          orderResponse?.collectionCode,

          orderResponse?.pickupCode,

          orderResponse?.orderPin,

          orderResponse?.order_pin,

          normalized?.collection_code,

          ""

        ),


      /*
       * PAYMENT STATUS
       */

      payment_status:
        firstDefined(

          orderResponse?.payment_status,

          orderResponse?.paymentStatus,

          normalized?.payment_status,

          "PENDING"

        ),


      /*
       * ORDER STATUS
       */

      status:
        firstDefined(

          orderResponse?.orderStatus,

          orderResponse?.order_status,

          orderResponse?.status,

          normalized?.status,

          "PENDING_PAYMENT"

        ),


      /*
       * TOTAL
       */

      total_amount:
        Number(
          firstDefined(

            orderResponse?.netBill,

            orderResponse?.total_amount,

            orderResponse?.totalAmount,

            orderResponse?.grandTotal,

            normalized?.total_amount,

            0

          )
        ),

    };

  },
    /* =======================================================
     CREATE ORDER
     =======================================================

     JUICE ROBO ORDER FLOW

     STEP 1:
       POST /v1/addcart

     STEP 2:
       Read the REAL cart ID returned by the backend.

     STEP 3:
       POST /v1/order/submit using that REAL cart ID.

     IMPORTANT:
       The cartId generated by the frontend is only the
       initial/request cart ID.

       The cartId returned by /v1/addcart is authoritative.
     ======================================================= */

  createOrder:
    async (
      payload = {}
    ) => {

      console.log(
        "[Juice Robo] Starting REAL order creation..."
      );

      console.log(
        "[Juice Robo] Incoming order payload:",
        payload
      );


      /* =====================================================
         BUILD LEGACY CART PAYLOAD
         ===================================================== */

      const legacyPayload =
        buildLegacyOrderPayload(
          payload
        );


      /*
       * This is the cart ID initially generated by the
       * frontend / buildLegacyOrderPayload().
       *
       * DO NOT use this ID for order submission unless the
       * backend returns the same ID.
       */

      const requestedCartId =
        String(
          legacyPayload?.cartId ||
          ""
        ).trim();


      if (!requestedCartId) {

        throw new Error(
          "Unable to create the Juice Robo cart."
        );
      }


      /* =====================================================
         VALIDATE STORE
         ===================================================== */

      const storeId =
        String(
          legacyPayload?.storeId ||
          ""
        ).trim();


      if (!storeId) {

        throw new Error(
          "No Juice Robo collection location is selected."
        );
      }


      /* =====================================================
         VALIDATE CART ITEMS
         ===================================================== */

      const legacyItems =
        Array.isArray(
          legacyPayload?.cartItems
        )
          ? legacyPayload.cartItems
          : [];


      if (!legacyItems.length) {

        throw new Error(
          "Your Juice Robo cart is empty."
        );
      }


      /* =====================================================
         STEP 1 — ADD CART
         ===================================================== */

      const addCartPayload = {

        cartId:
          requestedCartId,

        locId:
          storeId,

        cartItems:
          legacyItems.map(
            (
              item
            ) => ({

              variantId:
                Number(
                  item?.variantId ||
                  0
                ),

              quantity:
                Number(
                  item?.quantity ||
                  1
                ),

            })
          ),

      };


      console.log(
        "[Juice Robo] ADD CART URL:",
        `${ORDER_API_BASE}/v1/addcart`
      );


      console.log(
        "[Juice Robo] ADD CART payload:",
        addCartPayload
      );


      const cartResponse =
        await request(
          "/v1/addcart",
          {
            method:
              "POST",

            body:
              JSON.stringify(
                addCartPayload
              ),
          },
          ORDER_API_BASE
        );


      console.log(
        "[Juice Robo] ADD CART response:",
        cartResponse
      );


      /* =====================================================
         STEP 2 — EXTRACT REAL BACKEND CART ID
         ===================================================== */

      let backendCartId = "";


      /*
       * Current Juice Robo test API response observed:
       *
       * {
       *   status: 200,
       *   message: "Loaded successfully",
       *   data: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
       * }
       *
       * Therefore response.data can itself be the cart ID.
       */

      if (
        typeof cartResponse?.data ===
        "string"
      ) {

        backendCartId =
          cartResponse.data.trim();

      }


      /*
       * Support object responses as well.
       */

      if (
        !backendCartId &&
        cartResponse?.data &&
        typeof cartResponse.data ===
          "object"
      ) {

        backendCartId =
          String(
            firstDefined(

              cartResponse.data?.cartId,

              cartResponse.data?.cart_id,

              cartResponse.data?.id,

              ""

            ) || ""
          ).trim();

      }


      /*
       * Additional compatibility fields.
       */

      if (
        !backendCartId
      ) {

        backendCartId =
          String(
            firstDefined(

              cartResponse?.cartId,

              cartResponse?.cart_id,

              cartResponse?.id,

              ""

            ) || ""
          ).trim();

      }


      /*
       * Some response wrappers may expose the actual
       * response through `result`.
       */

      if (
        !backendCartId &&
        cartResponse?.result
      ) {

        backendCartId =
          String(
            firstDefined(

              cartResponse.result?.cartId,

              cartResponse.result?.cart_id,

              cartResponse.result?.id,

              cartResponse.result?.data,

              ""

            ) || ""
          ).trim();

      }


      /* =====================================================
         VALIDATE BACKEND CART ID
         ===================================================== */

      if (
        !backendCartId
      ) {

        console.error(
          "[Juice Robo] ADD CART succeeded but no backend cart ID was returned.",
          cartResponse
        );


        throw new Error(
          "Juice Robo created the cart but did not return a cart ID."
        );
      }


      console.log(
        "[Juice Robo] REAL BACKEND CART ID:",
        backendCartId
      );


      /* =====================================================
         CART ID COMPARISON
         ===================================================== */

      console.log(
        "[Juice Robo] Cart ID comparison:",
        {
          requestedCartId:
            requestedCartId,

          backendCartId:
            backendCartId,

          changed:
            requestedCartId !==
            backendCartId,
        }
      );


      /* =====================================================
         STEP 3 — SUBMIT ORDER
         =====================================================

         IMPORTANT:

         Use backendCartId.

         NEVER use requestedCartId here.
         ===================================================== */

      const submitPayload = {

        cartId:
          backendCartId,

      };


      console.log(
        "[Juice Robo] ORDER SUBMIT URL:",
        `${ORDER_API_BASE}/v1/order/submit`
      );


      console.log(
        "[Juice Robo] ORDER SUBMIT payload:",
        submitPayload
      );


      const orderResponse =
        await request(
          "/v1/order/submit",
          {
            method:
              "POST",

            body:
              JSON.stringify(
                submitPayload
              ),
          },
          ORDER_API_BASE
        );


      console.log(
        "[Juice Robo] ORDER SUBMIT response:",
        orderResponse
      );


      /* =====================================================
         CHECK API-LEVEL STATUS
         =====================================================

         The Juice Robo API can return HTTP 200 while the
         actual application status is -1.

         Example:

         {
           status: -1,
           message: "Invalid Cart Details"
         }

         Therefore HTTP success alone is not enough.
         ===================================================== */

      const apiStatus =
        Number(
          orderResponse?.status
        );


      const apiMessage =
        String(
          orderResponse?.message ||
          ""
        ).trim();


      if (
        Number.isFinite(
          apiStatus
        ) &&
        apiStatus < 0
      ) {

        console.error(
          "[Juice Robo] ORDER SUBMIT rejected:",
          {
            status:
              apiStatus,

            message:
              apiMessage,

            cartId:
              backendCartId,

            response:
              orderResponse,
          }
        );


        throw new Error(
          apiMessage ||
          "Juice Robo rejected the cart while creating the order."
        );
      }


      /* =====================================================
         NORMALIZE ORDER
         ===================================================== */

      const normalized =
        normalizeOrder(
          orderResponse
        );


      /* =====================================================
         BUILD FINAL ORDER RESULT
         ===================================================== */

      const result = {

        ...normalized,


        /*
         * REAL backend cart ID.
         */

        cartId:
          backendCartId,


        /*
         * Original frontend/request cart ID.
         *
         * Kept only for debugging.
         */

        requestedCartId:
          requestedCartId,


        /*
         * Raw API responses.
         */

        rawCartResponse:
          cartResponse,

        rawOrderResponse:
          orderResponse,


        /* ---------------------------------------------------
           ORDER ID
           --------------------------------------------------- */

        orderId:
          firstDefined(

            orderResponse?.orderId,

            orderResponse?.order_id,

            orderResponse?.id,

            orderResponse?.data?.orderId,

            orderResponse?.data?.order_id,

            orderResponse?.data?.id,

            normalized?.orderId,

            normalized?.order_id,

            normalized?.id,

            ""

          ),


        /* ---------------------------------------------------
           TRANSACTION ID
           --------------------------------------------------- */

        transactionId:
          firstDefined(

            orderResponse?.transactionId,

            orderResponse?.transaction_id,

            orderResponse?.data?.transactionId,

            orderResponse?.data?.transaction_id,

            normalized?.transactionId,

            ""

          ),


        /* ---------------------------------------------------
           ORDER NUMBER
           --------------------------------------------------- */

        order_number:
          firstDefined(

            orderResponse?.order_number,

            orderResponse?.orderNumber,

            orderResponse?.data?.order_number,

            orderResponse?.data?.orderNumber,

            normalized?.order_number,

            normalized?.orderNumber,

            ""

          ),


        /* ---------------------------------------------------
           COLLECTION / PICKUP CODE
           --------------------------------------------------- */

        orderPin:
          firstDefined(

            orderResponse?.orderPin,

            orderResponse?.order_pin,

            orderResponse?.pickupCode,

            orderResponse?.pickup_code,

            orderResponse?.data?.orderPin,

            orderResponse?.data?.order_pin,

            orderResponse?.data?.pickupCode,

            normalized?.orderPin,

            ""

          ),


        collection_code:
          firstDefined(

            orderResponse?.collection_code,

            orderResponse?.collectionCode,

            orderResponse?.pickupCode,

            orderResponse?.pickup_code,

            orderResponse?.orderPin,

            orderResponse?.order_pin,

            orderResponse?.data?.collection_code,

            orderResponse?.data?.collectionCode,

            orderResponse?.data?.pickupCode,

            orderResponse?.data?.orderPin,

            orderResponse?.data?.order_pin,

            normalized?.collection_code,

            normalized?.collectionCode,

            ""

          ),


        /* ---------------------------------------------------
           PAYMENT STATUS
           --------------------------------------------------- */

        payment_status:
          firstDefined(

            orderResponse?.payment_status,

            orderResponse?.paymentStatus,

            orderResponse?.data?.payment_status,

            orderResponse?.data?.paymentStatus,

            normalized?.payment_status,

            normalized?.paymentStatus,

            "PENDING"

          ),


        /* ---------------------------------------------------
           ORDER STATUS
           --------------------------------------------------- */

        status:
          firstDefined(

            orderResponse?.orderStatus,

            orderResponse?.order_status,

            orderResponse?.data?.orderStatus,

            orderResponse?.data?.order_status,

            orderResponse?.status,

            normalized?.status,

            "PENDING_PAYMENT"

          ),


        /* ---------------------------------------------------
           TOTAL
           --------------------------------------------------- */

        total_amount:
          Number(
            firstDefined(

              orderResponse?.netBill,

              orderResponse?.total_amount,

              orderResponse?.totalAmount,

              orderResponse?.grandTotal,

              orderResponse?.data?.netBill,

              orderResponse?.data?.total_amount,

              orderResponse?.data?.totalAmount,

              orderResponse?.data?.grandTotal,

              normalized?.total_amount,

              normalized?.totalAmount,

              0

            )
          ),

      };


      console.log(
        "[Juice Robo] REAL ORDER CREATED:",
        result
      );


      return result;
    },


  /* =======================================================
     PAYMENT COMPATIBILITY
     =======================================================

     The frontend redesign currently has a payment UI
     placeholder.

     The old Juice Robo test backend does not expose the
     new Razorpay create/verify APIs.

     These methods intentionally remain unavailable.
     ======================================================= */

  createPaymentOrder:
    async () => {

      throw new Error(
        "The legacy Juice Robo test API does not expose the new Razorpay order API."
      );
    },


  verifyPayment:
    async () => {

      throw new Error(
        "The legacy Juice Robo test API does not expose the new Razorpay verification API."
      );
    },


  /* =======================================================
     DEBUG CONFIG
     ======================================================= */

  config: {

    baseUrl:
      API_BASE,

    orderBaseUrl:
      ORDER_API_BASE,

    orgId:
      getOrgId,

    storeId:
      getStoreId,

    hasApiKey:
      Boolean(
        JR_API_KEY
      ),

    hasApiSecret:
      Boolean(
        JR_API_KEY_SECRET
      ),

    hasAuthorization:
      false,

  },

};


/* =========================================================
   NAMED EXPORTS
   ========================================================= */

export {
  API_BASE,
  ORDER_API_BASE,
  DEFAULT_ORG_ID,
};


/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default api;


/* =========================================================
   LOAD MESSAGE
   ========================================================= */

console.log(
  "[Juice Robo] Frontend API adapter loaded."
);

console.log(
  "[Juice Robo] API_BASE:",
  API_BASE
);

console.log(
  "[Juice Robo] ORDER_API_BASE:",
  ORDER_API_BASE
);

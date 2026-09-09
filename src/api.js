/* ============================================================
   API BASE URLS
   ============================================================ */

const API_BASE =
  "https://tptest.juicerobo.com/tporder/api";

const ORDER_API_BASE =
  "https://tptest.juicerobo.com/tpordermaster/api";


/* ============================================================
   DEFAULT ORGANIZATION
   ============================================================ */

const DEFAULT_ORG_ID =
  "d2006bfc-95df-4925-a617-6d10d06b99bc";


/* ============================================================
   JUICE ROBO API CREDENTIALS
   ============================================================ */

const JR_API_KEY =
  import.meta.env.VITE_JR_API_KEY ||
  import.meta.env.VITE_JUICE_ROBO_API_KEY ||
  "";

const JR_API_KEY_SECRET =
  import.meta.env.VITE_JR_API_KEY_SECRET ||
  import.meta.env.VITE_JR_API_SECRET ||
  import.meta.env.VITE_JUICE_ROBO_API_KEY_SECRET ||
  "";


/* ============================================================
   STORAGE HELPERS
   ============================================================ */

function clean(value) {
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


function readJson(
  key,
  fallback = null
) {
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


function writeJson(
  key,
  value
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    // Ignore local-storage errors.
  }
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
   STORED USER
   ============================================================ */

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
   STORED TOKEN
   ============================================================ */

function getStoredToken() {
  return (
    clean(
      localStorage.getItem(
        "juice_robo_access_token"
      )
    ) ||
    clean(
      localStorage.getItem(
        "juice_robo_token"
      )
    ) ||
    clean(
      localStorage.getItem(
        "_token"
      )
    )
  );
}


/* ============================================================
   STORE ID
   ============================================================ */

function getStoreId() {
  return (
    clean(
      localStorage.getItem(
        "store_Id"
      )
    ) ||
    clean(
      localStorage.getItem(
        "juice_robo_store_id"
      )
    )
  );
}


function saveStoreId(
  storeId
) {
  const value =
    clean(storeId);

  if (value) {
    localStorage.setItem(
      "store_Id",
      value
    );

    localStorage.setItem(
      "juice_robo_store_id",
      value
    );
  }

  return value;
}


/* ============================================================
   ORGANIZATION ID
   ============================================================ */

function getOrgId() {
  const stored =
    clean(
      localStorage.getItem(
        "ORG_ID"
      )
    ) ||
    clean(
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
    clean(
      params.get("o_id")
    ) ||
    clean(
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


  const possibleOrg =
    window.location.pathname
      .split("/")
      .filter(Boolean)
      .find(
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


/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

function unwrap(
  value
) {
  let result =
    value;

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


function asArray(
  value
) {
  const result =
    unwrap(value);

  if (
    Array.isArray(result)
  ) {
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
      "result",
    ];


    for (
      const key of keys
    ) {
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


/* ============================================================
   ERROR NORMALIZATION
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
        .map(
          (item) =>
            typeof item ===
            "string"
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


  if (status === 401) {
    return (
      "Juice Robo authentication failed (401). " +
      "Check the configured API credentials and stored login session."
    );
  }

  if (status === 403) {
    return (
      "Juice Robo access was forbidden (403)."
    );
  }

  return (
    `Juice Robo request failed (${status})`
  );
}


/* ============================================================
   GENERIC REQUEST
   ============================================================ */

async function request(
  path,
  options = {},
  baseUrl = API_BASE
) {
  const cleanBase =
    String(baseUrl)
      .replace(/\/+$/, "");


  const cleanPath =
    String(path).startsWith("/")
      ? String(path)
      : `/${String(path)}`;


  const url =
    `${cleanBase}${cleanPath}`;


  /*
   * Juice Robo legacy API credentials.
   *
   * A logged-in session may also have an access token.
   * Send that token as Bearer authentication unless this
   * request explicitly uses skipAuth (the login request).
   */
  const storedToken =
    getStoredToken();

  const bearerToken =
    storedToken
      ? (
          /^Bearer\s/i.test(storedToken)
            ? storedToken
            : `Bearer ${storedToken}`
        )
      : "";

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

    ...(options.skipAuth
      ? {}
      : bearerToken
        ? {
            Authorization:
              bearerToken,
          }
        : {}),

    ...(options.headers || {}),
  };

  if (options.skipAuth) {
    delete headers.Authorization;
    delete headers.authorization;
  }

  const method =
    options.method ||
    "GET";


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
        options.body ||
        null,
    }
  );


  let response;


  try {
    const fetchOptions = {
      ...options,
      headers,
    };

    delete fetchOptions.skipAuth;

    response =
      await fetch(
        url,
        fetchOptions
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


  let rawResponse =
    "";


  try {
    rawResponse =
      await response.text();

  } catch (error) {
    console.error(
      "[Juice Robo] RESPONSE READ ERROR:",
      error
    );
  }


  let data =
    null;


  if (
    rawResponse
  ) {
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
      data,
    }
  );


  if (
    !response.ok
  ) {
    const message =
      normalizeError(
        data,
        response.status
      );


    const error =
      new Error(
        message
      );


    error.status =
      response.status;

    error.data =
      data;

    error.url =
      url;


    throw error;
  }


  return data;
}


/* ============================================================
   PRODUCT HELPERS
   ============================================================ */
function getVariant(item) {
  if (
    item?._variant &&
    typeof item._variant === "object"
  ) {
    return item._variant;
  }

  if (
    item?.variant &&
    typeof item.variant === "object"
  ) {
    return item.variant;
  }

  const variants =
    Array.isArray(item?.lstVariants)
      ? item.lstVariants
      : Array.isArray(item?.variants)
        ? item.variants
        : [];

  return (
    variants.find(
      (variant) =>
        variant &&
        variant.quantity !== 0 &&
        variant.isAvailable !== false &&
        variant.is_available !== false
    ) ||
    variants[0] ||
    item
  );
}
/* ============================================================
    PRODUCT NORMALIZATION
    ============================================================ */
function normalizeProduct(item) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return null;
  }

  /*
   * The Item Master API currently returns variants in
   * `lstVariants`. Keep support for `variants` as well.
   */
  const variants =
    Array.isArray(item?.lstVariants)
      ? item.lstVariants
      : Array.isArray(item?.variants)
        ? item.variants
        : [];

  const availableVariant =
    getVariant(item);

  /*
   * IMPORTANT:
   * The backend's variantId is the identifier required by
   * the Order Master cart API.
   */
  const variantId =
    Number(
      firstDefined(
        availableVariant?.variantId,
        availableVariant?.variant_id,
        availableVariant?.id,
        item?.variantId,
        item?.variant_id,
        item?.id,
        item?.itemId,
        0
      )
    );

  if (!variantId) {
    console.warn(
      "[Juice Robo] Product skipped — no variantId:",
      item
    );

    return null;
  }

  const displayName =
    String(
      firstDefined(
        item?.itemName,
        item?.displayName,
        item?.name,
        item?.productName,
        availableVariant?.variantName,
        availableVariant?.name,
        "Product"
      )
    ).trim();

  const description =
    String(
      firstDefined(
        item?.desc,
        item?.displayDescription,
        item?.itemDesc,
        item?.description,
        availableVariant?.variantDesc,
        availableVariant?.description,
        ""
      )
    ).trim();

  const price =
    Number(
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

  const imageUrl =
    firstDefined(
      availableVariant?.variantPhoto,
      availableVariant?.image_url,
      availableVariant?.image,
      item?.itemPhoto,
      item?.itemImage,
      item?.image_url,
      item?.image,
      item?.photo,
      null
    );

  const storeId =
    clean(
      firstDefined(
        item?.storeId,
        item?.store_id,
        getStoreId()
      )
    );

  /*
   * Do not treat quantity === 0 as unavailable.
   *
   * The current Item Master response uses quantity: 0,
   * while the product itself is still returned by the API.
   */
  const isAvailable =
    availableVariant?.isAvailable !== false &&
    availableVariant?.is_available !== false &&
    item?.isAvailable !== false &&
    item?.is_available !== false;

  return {
    /*
     * Preserve the complete backend item.
     */
    ...item,

    /*
     * Frontend-compatible identifiers.
     */
    id:
      variantId,

    itemId:
      firstDefined(
        item?.itemId,
        item?.item_id,
        null
      ),

    variantId,

    /*
     * Frontend display fields.
     */
    name:
      displayName,

    displayName:
      displayName,

    itemName:
      firstDefined(
        item?.itemName,
        displayName
      ),

    description,

    displayDescription:
      description,

    desc:
      firstDefined(
        item?.desc,
        description
      ),

    /*
     * Real backend price.
     */
    price,

    unitPrice:
      price,

    /*
     * Image fields.
     */
    image_url:
      imageUrl,

    image:
      imageUrl,

    /*
     * Availability.
     */
    is_available:
      isAvailable,

    isAvailable:
      isAvailable,

    /*
     * Selected location.
     */
    storeId,

    /*
     * Preserve the backend variant collection.
     */
    lstVariants:
      variants,

    variants,

    /*
     * Preserve useful raw references.
     */
    _variant:
      availableVariant,

    _legacyItem:
      item,
  };
}


/*
 * Normalize the complete Item Master response.
 *
 * Supported response shapes:
 *
 * {
 *   status: 200,
 *   message: "Loaded successfully",
 *   data: [...]
 * }
 *
 * or directly [...]
 */
function normalizeProducts(response) {
  const items =
    asArray(response);

  return items
    .map(
      (item) =>
        normalizeProduct(item)
    )
    .filter(Boolean);
}

/* ============================================================
   LOCATION HELPERS
   ============================================================ */

function normalizeLocation(
  outlet,
  index = 0
) {
  if (
    !outlet ||
    typeof outlet !==
      "object"
  ) {
    return null;
  }


  /*
   * The locations API returns store identifiers as `locId`
   * inside `data.storesData[]`.
   *
   * Keep all location/store identifiers dynamic. Do not
   * hardcode the outlet or machine values in the frontend.
   */
  const storeId =
    clean(
      firstDefined(
        outlet?.locId,
        outlet?.locID,
        outlet?.locationId,
        outlet?.location_id,
        outlet?.storeId,
        outlet?.storeID,
        outlet?.store_id,
        outlet?.id
      )
    );


  if (!storeId) {
    return null;
  }


  return {
    id:
      storeId,

    storeId,

    name:
      String(
        firstDefined(
          outlet?.storeName,
          outlet?.name,
          outlet?.outletName,
          `Juice Robo ${index + 1}`
        )
      ),

    address:
      String(
        firstDefined(
          outlet?.locAddress,
          outlet?.address,
          outlet?.description,
          outlet?.outletDesc,
          ""
        )
      ),

    is_active:
      outlet?.isActive !==
        false &&
      outlet?.active !==
        false,

    image:
      firstDefined(
        outlet?.outletPhoto,
        outlet?.image,
        null
      ),

    /*
     * Preserve the original location fields returned by the API.
     */
    locId:
      firstDefined(
        outlet?.locId,
        outlet?.locID,
        null
      ),

    storeName:
      firstDefined(
        outlet?.storeName,
        null
      ),

    locAddress:
      firstDefined(
        outlet?.locAddress,
        null
      ),

    _legacyOutlet:
      outlet,
  };
}


function normalizeOutlets(
  response
) {
  return asArray(
    response
  )
    .map(
      (outlet, index) =>
        normalizeLocation(
          outlet,
          index
        )
    )
    .filter(Boolean);
}


/* ============================================================
   MACHINE HELPERS
   ============================================================ */

function normalizeMachine(
  location
) {
  const machineId =
    clean(
      firstDefined(
        location?.storeId,
        location?.locId,
        location?.id
      )
    );

  if (
    !machineId
  ) {
    return null;
  }


  return {
    id:
      String(
        machineId
      ),

    machine_code:
      String(
        machineId
      ),

    name:
      location.name,

    location_id:
      String(
        location.id ||
        machineId
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

    _legacyLocation:
      location,
  };
}


function normalizeMachines(
  locations
) {
  return (
    Array.isArray(
      locations
    )
      ? locations
          .map(
            normalizeMachine
          )
          .filter(Boolean)
      : []
  );
}


/* ============================================================
   ORDER HELPERS
   ============================================================ */

function normalizeOrder(
  rawOrder
) {
  const order =
    unwrap(rawOrder) || {};


  if (
    !order ||
    typeof order !==
      "object"
  ) {
    return null;
  }


  const id =
    firstDefined(
      order?.id,
      order?.orderId,
      order?.order_id,
      order?.orderNumber,
      order?.order_number,
      ""
    );


  const cartId =
    firstDefined(
      order?.cartId,
      order?.cart_id,
      ""
    );


  const transactionId =
    firstDefined(
      order?.transactionId,
      order?.transaction_id,
      ""
    );


  const orderPin =
    firstDefined(
      order?.orderPin,
      order?.order_pin,
      order?.pickupCode,
      order?.pickup_code,
      order?.collection_code,
      ""
    );


  const paymentStatus =
    firstDefined(
      order?.payment_status,
      order?.paymentStatus,
      "PENDING"
    );


  const status =
    firstDefined(
      order?.orderStatus,
      order?.order_status,
      order?.status,
      "PENDING"
    );


  const total =
    Number(
      firstDefined(
        order?.netBill,
        order?.total_amount,
        order?.totalAmount,
        order?.grandTotal,
        0
      )
    );


  return {
    ...order,

    id,

    orderId:
      firstDefined(
        order?.orderId,
        order?.order_id,
        id
      ),

    order_id:
      firstDefined(
        order?.order_id,
        order?.orderId,
        id
      ),

    orderNumber:
      firstDefined(
        order?.orderNumber,
        order?.order_number,
        id
      ),

    order_number:
      firstDefined(
        order?.order_number,
        order?.orderNumber,
        id
      ),

    cartId,

    transactionId,

    transaction_id:
      transactionId,

    orderPin,

    order_pin:
      orderPin,

    collection_code:
      firstDefined(
        order?.collection_code,
        order?.collectionCode,
        orderPin,
        ""
      ),

    payment_status:
      paymentStatus,

    paymentStatus,

    status,

    total_amount:
      total,

    totalAmount:
      total,
  };
}


/* ============================================================
   LEGACY ORDER ITEM BUILDER
   ============================================================ */

function buildLegacyCartItems(
  sourceItems
) {
  return sourceItems
    .map(
      (item) => {
        const variant =
          getVariant(item);


        const variantId =
          Number(
            firstDefined(
              item?.variantId,
              item?.variant_id,
              item?.id,
              item?._variant?.variantId,
              item?._variant?.variant_id,
              item?._variant?.id,
              variant?.variantId,
              variant?.variant_id,
              variant?.id,
              0
            )
          );


        if (
          !variantId
        ) {
          throw new Error(
            "A Juice Robo cart item is missing its variant ID."
          );
        }


        const quantity =
          Math.max(
            1,
            Number(
              item?.quantity ||
              variant?.quantity ||
              1
            )
          );


        return {
          variantId,

          quantity,
        };
      }
    );
}


/* ============================================================
   LEGACY ORDER PAYLOAD
   ============================================================ */

function buildLegacyOrderPayload(
  payload = {}
) {
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


  if (
    !sourceItems.length
  ) {
    throw new Error(
      "Your Juice Robo cart is empty."
    );
  }


  const storeId =
    clean(
      firstDefined(
        payload?.storeId,
        payload?.store_id,
        payload?.locationId,
        payload?.location_id,
        getStoreId()
      )
    );


  if (
    !storeId
  ) {
    throw new Error(
      "No Juice Robo collection location is selected."
    );
  }


  const customer =
    payload?.customer ||
    payload?.user ||
    getUserSnapshot();


  const cartId =
    clean(
      payload?.cartId
    ) ||
    (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
        ? crypto.randomUUID()
        : `JR-${Date.now()}`
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


        const variantId =
          Number(
            firstDefined(
              item?.variantId,
              item?.variant_id,
              item?.id,
              item?._variant?.variantId,
              item?._variant?.variant_id,
              item?._variant?.id,
              variant?.variantId,
              variant?.variant_id,
              variant?.id,
              0
            )
          );


        if (
          !variantId
        ) {
          throw new Error(
            "A Juice Robo cart item is missing its variant ID."
          );
        }


        return {
          variantId,

          itemName:
            String(
              firstDefined(
                item?.itemName,
                item?.name,
                variant?.itemName,
                variant?.name,
                "Juice"
              )
            ),

          variantName:
            String(
              firstDefined(
                item?.variantName,
                item?.product_type,
                variant?.variantName,
                variant?.name,
                "Full"
              )
            ),

          variantDesc:
            String(
              firstDefined(
                item?.variantDesc,
                item?.description,
                item?.desc,
                variant?.variantDesc,
                variant?.description,
                ""
              )
            ),

          unitPrice:
            Number(
              firstDefined(
                item?.unitPrice,
                item?.unit_price,
                item?.price,
                variant?.unitPrice,
                variant?.unit_price,
                variant?.price,
                0
              )
            ),

          taxInclusive:
            Boolean(
              item?.taxInclusive ??
              variant?.taxInclusive ??
              true
            ),

          taxRate:
            Number(
              firstDefined(
                item?.taxRate,
                variant?.taxRate,
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
            firstDefined(
              item?.variantPhoto,
              item?.image_url,
              item?.image,
              variant?.variantPhoto,
              variant?.image_url,
              variant?.image,
              null
            ),
        };
      }
    );


  return {
    cartId:
      String(cartId),

    storeId,

    updatedBy,

    cartItems,
  };
}
/* ============================================================
   AUTH RESPONSE NORMALIZATION
   ============================================================ */

function normalizeAuth(response) {
  const data = unwrap(response) || {};

  const token =
    clean(
      firstDefined(
        data?.token,
        data?.accessToken,
        data?.access_token,
        data?.jwt,
        data?.idToken,
        data?.data?.token,
        data?.data?.accessToken,
        data?.data?.access_token
      )
    );

  const user =
    data?.user ||
    data?.userData ||
    data?.customer ||
    data?.profile ||
    data?.data?.user ||
    (
      data &&
      typeof data === "object"
        ? data
        : {}
    );

  const normalizedUser = {
    ...user,

    id:
      firstDefined(
        user?.id,
        user?.userId,
        user?.user_id,
        data?.userId,
        data?.user_id,
        null
      ),

    name:
      firstDefined(
        user?.name,
        user?.fullName,
        user?.full_name,
        [
          user?.firstName,
          user?.lastName,
        ]
          .filter(Boolean)
          .join(" "),
        user?.firstname,
        "Juice Lover"
      ),

    firstname:
      firstDefined(
        user?.firstname,
        user?.firstName,
        ""
      ),

    lastname:
      firstDefined(
        user?.lastname,
        user?.lastName,
        ""
      ),

    email:
      firstDefined(
        user?.email,
        user?.userEmail,
        user?.user_email,
        data?.email,
        data?.userEmail,
        ""
      ),

    phone:
      firstDefined(
        user?.phone,
        user?.mobile,
        user?.mobileNumber,
        user?.userName,
        user?.username,
        ""
      ),

    userName:
      firstDefined(
        user?.userName,
        user?.username,
        user?.email,
        user?.phone,
        ""
      ),
  };


  /*
   * Save authentication information.
   */

  if (token) {
    localStorage.setItem(
      "juice_robo_access_token",
      token
    );

    localStorage.setItem(
      "juice_robo_token",
      token
    );

    localStorage.setItem(
      "_token",
      token
    );
  }


  writeJson(
    "juice_robo_user",
    normalizedUser
  );

  writeJson(
    "user",
    normalizedUser
  );


  /*
   * Preserve the complete backend response
   * for debugging / future compatibility.
   */

  writeJson(
    "juice_robo_auth_response",
    data
  );


  return {
    ...data,

    token,

    accessToken:
      token,

    access_token:
      token,

    user:
      normalizedUser,

    userData:
      normalizedUser,

    isAuthenticated:
      Boolean(token),

    raw:
      data,
  };
}
/* ============================================================
   API
   ============================================================ */

export const api = {

  baseUrl:
    API_BASE,

  orderBaseUrl:
    ORDER_API_BASE,


  /* ==========================================================
     AUTHENTICATION
     ========================================================== */

  login: async (payload = {}) => {
  const identifier = String(
    firstDefined(
      payload?.identifier,
      payload?.userName,
      payload?.username,
      payload?.email,
      payload?.phone,
      ""
    )
  ).trim();

  const password = String(
    payload?.password || ""
  );

  if (!identifier) {
    throw new Error(
      "Enter your email address or phone number."
    );
  }

  if (!password) {
    throw new Error(
      "Enter your password."
    );
  }

  const loginPayload = {
    userName: identifier,
    password: password,
  };

  console.log(
    "[Juice Robo] LOGIN URL:",
    `${API_BASE}/v1/auth/signin`
  );

  console.log(
    "[Juice Robo] LOGIN payload:",
    {
      userName: identifier,
      hasPassword: Boolean(password),
    }
  );

  const response = await request(
    "/v1/auth/signin",
    {
      method: "POST",
      body: JSON.stringify(loginPayload),
      skipAuth: true,
    },
    API_BASE
  );

  console.log(
    "[Juice Robo] LOGIN API RESPONSE:",
    response
  );

  const normalized = normalizeAuth(
    response
  );

  console.log(
    "[Juice Robo] LOGIN NORMALIZED:",
    {
      hasToken: Boolean(
        normalized?.token
      ),
      user: normalized?.user,
    }
  );

  return normalized;
},


  /* ==========================================================
     REGISTRATION
     ========================================================== */

  register:
    async (
      payload = {}
    ) => {
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
        String(
          payload?.firstName ||
          parts[0] ||
          ""
        ).trim();


      const lastName =
        String(
          payload?.lastName ||
          parts.slice(1).join(" ") ||
          firstName
        ).trim();


      const userName =
        String(
          payload?.userName ||
          payload?.phone ||
          ""
        ).trim();


      const userEmail =
        String(
          payload?.userEmail ||
          payload?.email ||
          ""
        ).trim();


      const password =
        String(
          payload?.password ||
          ""
        );


      if (
        !firstName
      ) {
        throw new Error(
          "Enter your full name."
        );
      }


      if (
        !userName
      ) {
        throw new Error(
          "Enter your phone number."
        );
      }


      if (
        !userEmail
      ) {
        throw new Error(
          "Enter your email address."
        );
      }


      if (
        !password
      ) {
        throw new Error(
          "Enter your password."
        );
      }


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

                userName,

                userEmail,

                password,

                confirmPassword:
                  payload?.confirmPassword ||
                  password,

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
     PRODUCTS
     ========================================================== */

  products: async (
  requestedStoreId = ""
) => {
  let storeId =
    clean(
      requestedStoreId
    );

  if (!storeId) {
    storeId =
      getStoreId();
  }

  if (!storeId) {
    const locations =
      await api.locations();

    if (!locations.length) {
      throw new Error(
        "No Juice Robo collection location is available."
      );
    }

    storeId =
      saveStoreId(
        locations[0].storeId
      );
  }

  console.log(
    "[Juice Robo] Loading products:",
    {
      storeId,
      url:
        `${API_BASE}/v1/itemmaster/items/${encodeURIComponent(
          storeId
        )}`,
    }
  );

  const response =
    await request(
      `/v1/itemmaster/items/${encodeURIComponent(
        storeId
      )}`
    );

  console.log(
    "[Juice Robo] Raw products API response:",
    response
  );

  const normalized =
    normalizeProducts(
      response
    );

  console.log(
    "[Juice Robo] Normalized products:",
    normalized
  );

  return normalized;
},


  getProducts:
    async (
      storeId = ""
    ) =>
      api.products(
        storeId
      ),


  /* ==========================================================
     LOCATIONS
     ========================================================== */

  locations:
    async () => {
      const orgId =
        getOrgId();


      console.log(
        "[Juice Robo] Loading locations:",
        {
          orgId,
          url:
            `${API_BASE}/v1/getoutlets/${encodeURIComponent(
              orgId
            )}`,
        }
      );


      const response =
        await request(
          `/v1/getoutlets/${encodeURIComponent(
            orgId
          )}`
        );


      console.log(
        "[Juice Robo] Raw locations API response:",
        response
      );


      const locations =
        normalizeOutlets(
          response
        );


      if (
        locations.length
      ) {
        const currentStore =
          getStoreId();


        const stillExists =
          locations.some(
            (location) =>
              String(
                location.storeId
              ) ===
              String(
                currentStore
              )
          );


        if (
          !stillExists
        ) {
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


  getLocations:
    async () =>
      api.locations(),


  /* ==========================================================
     MACHINES
     ========================================================== */

  machines:
    async (
      providedLocations = null
    ) => {
      const locations =
        Array.isArray(
          providedLocations
        )
          ? providedLocations
          : await api.locations();

      return normalizeMachines(
        locations
      );
    },


  getMachines:
    async () =>
      api.machines(),


  /* ==========================================================
     PROFILE
     ========================================================== */

  profile:
    async () => {
      const user =
        getUserSnapshot();


      if (
        !user?.id
      ) {
        return {
          ...user,

          name:
            user?.name ||
            "Juice Lover",

          email:
            user?.email ||
            user?.userEmail ||
            "",

          phone:
            user?.phone ||
            user?.userName ||
            "",
        };
      }


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
          typeof data ===
            "object"
        ) {
          const normalized = {
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
            normalized
          );


          writeJson(
            "user",
            normalized
          );


          return normalized;
        }

      } catch (error) {
        console.warn(
          "[Juice Robo] Profile endpoint unavailable; using stored profile.",
          error
        );
      }


      return {
        ...user,

        name:
          user?.name ||
          [
            user?.firstname,
            user?.firstName,
            user?.lastname,
            user?.lastName,
          ]
            .filter(Boolean)
            .join(" ") ||
          "Juice Lover",

        email:
          user?.email ||
          user?.userEmail ||
          "",

        phone:
          user?.phone ||
          user?.userName ||
          "",
      };
    },


  getProfile:
    async () =>
      api.profile(),


  /* ==========================================================
     UPDATE PROFILE
     ========================================================== */

  updateProfile:
    async (
      payload = {}
    ) => {
      const user =
        getUserSnapshot();


      if (
        !user?.id
      ) {
        const next = {
          ...user,
          ...payload,
        };


        writeJson(
          "juice_robo_user",
          next
        );


        writeJson(
          "user",
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
        unwrap(response);


      if (
        normalized &&
        typeof normalized ===
          "object"
      ) {
        writeJson(
          "juice_robo_user",
          normalized
        );

        writeJson(
          "user",
          normalized
        );
      }


      return normalized;
    },


  /* ==========================================================
     ORDERS
     ========================================================== */

  // The production/test Orders page uses the Order Master
  // recent-orders endpoint, not /tporder/api/v1/orders.


  orders:
    async (
      params = {}
    ) => {
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


      const queryString =
        query.toString();


      const suffix =
        queryString
          ? `?${queryString}`
          : "";


      const storedToken =
        getStoredToken();

      const authorization =
        storedToken
          ? (/^Bearer\s/i.test(storedToken)
              ? storedToken
              : `Bearer ${storedToken}`)
          : "";

      const response =
        await request(
          `/v1/order/recent${suffix}`,
          authorization
            ? {
                headers: {
                  Authorization: authorization,
                },
              }
            : {},
          ORDER_API_BASE
        );


      return asArray(
        response
      )
        .map(
          normalizeOrder
        )
        .filter(Boolean);
    },


  getOrders:
    async () =>
      api.orders(),


  /* ==========================================================
     SINGLE ORDER
     ========================================================== */

  order:
    async (
      orderId
    ) => {
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
    async (
      orderId
    ) =>
      api.order(
        orderId
      ),


  /* ==========================================================
     ORDER MASTER — ADD CART
     ========================================================== */

  addCart:
    async (
      payload = {}
    ) => {
      const locId =
        clean(
          firstDefined(
            payload?.locId,
            payload?.locationId,
            payload?.location_id,
            payload?.storeId,
            payload?.store_id,
            getStoreId()
          )
        );


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


      if (
        !locId
      ) {
        throw new Error(
          "No Juice Robo collection location is selected."
        );
      }


      if (
        !sourceItems.length
      ) {
        throw new Error(
          "Your Juice Robo cart is empty."
        );
      }


      const cartItems =
        buildLegacyCartItems(
          sourceItems
        );


      const cartPayload = {
        locId:
          String(locId),

        cartItems,
      };


      console.log(
        "[Juice Robo] ADD CART URL:",
        `${ORDER_API_BASE}/v1/addcart`
      );


      console.log(
        "[Juice Robo] ADD CART payload:",
        cartPayload
      );


      return request(
        "/v1/addcart",
        {
          method:
            "POST",

          body:
            JSON.stringify(
              cartPayload
            ),
        },
        ORDER_API_BASE
      );
    },


  /* ==========================================================
     ORDER MASTER — GET CART
     ========================================================== */

  cart:
    async () =>
      request(
        "/v1/cart",
        {},
        ORDER_API_BASE
      ),


  getCart:
    async () =>
      api.cart(),


  /* ==========================================================
     ORDER MASTER — SUBMIT CART
     ========================================================== */

  submitOrder:
    async (
      cartId
    ) => {
      if (
        !cartId
      ) {
        throw new Error(
          "Juice Robo cart ID was not returned."
        );
      }


      const payload = {
        cartId:
          String(cartId),
      };


      console.log(
        "[Juice Robo] ORDER SUBMIT URL:",
        `${ORDER_API_BASE}/v1/order/submit`
      );


      console.log(
        "[Juice Robo] ORDER SUBMIT payload:",
        payload
      );


      return request(
        "/v1/order/submit",
        {
          method:
            "POST",

          body:
            JSON.stringify(
              payload
            ),
        },
        ORDER_API_BASE
      );
    },


  /* ==========================================================
     CREATE ORDER
     ========================================================== */

  createOrder:
    async (
      payload = {}
    ) => {
      console.log(
        "[Juice Robo] createOrder payload:",
        payload
      );


      const legacyPayload =
        buildLegacyOrderPayload(
          payload
        );


      const cartId =
        String(
          legacyPayload.cartId
        );


      const addCartPayload = {
        cartId,

        locId:
          String(
            legacyPayload.storeId
          ),

        cartItems:
          legacyPayload.cartItems.map(
            (item) => ({
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


      /*
       * EXISTING ORDER MASTER API
       */

      console.log(
        "[Juice Robo] ADD CART URL:",
        `${ORDER_API_BASE}/v1/addcart`
      );


      console.log(
        "[Juice Robo] ADD CART payload:",
        addCartPayload
      );


      const addCartResponse =
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
        addCartResponse
      );


      /*
       * SUBMIT CART
       */

      const submitPayload = {
        cartId,
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
        submitResponse
      );


      const normalized =
        normalizeOrder(
          submitResponse
        );


      return {
        ...normalized,

        cartId,

        addCartResponse,

        submitResponse,

        items:
          payload?.cartItems ||
          payload?.items ||
          [],
      };
    },


  /* ==========================================================
     PAYMENT COMPATIBILITY
     ========================================================== */

  createPaymentOrder:
    async () => {
      throw new Error(
        "The existing Juice Robo legacy API does not expose the newer Razorpay create-order API."
      );
    },


  verifyPayment:
    async () => {
      throw new Error(
        "The existing Juice Robo legacy API does not expose the newer Razorpay verification API."
      );
    },


  /* ==========================================================
     DEBUG CONFIG
     ========================================================== */

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


/* ============================================================
   NAMED EXPORTS
   ============================================================ */

export {
  API_BASE,
  ORDER_API_BASE,
  DEFAULT_ORG_ID,
};


/* ============================================================
   DEFAULT EXPORT
   ============================================================ */

export default api;


/* ============================================================
   STARTUP LOG
   ============================================================ */

console.log(
  "[Juice Robo] API adapter loaded."
);

console.log(
  "[Juice Robo] API_BASE:",
  API_BASE
);

console.log(
  "[Juice Robo] ORDER_API_BASE:",
  ORDER_API_BASE
);

console.log(
  "[Juice Robo] JR API KEY:",
  JR_API_KEY
    ? "[SET]"
    : "[MISSING]"
);

console.log(
  "[Juice Robo] JR API SECRET:",
  JR_API_KEY_SECRET
    ? "[SET]"
    : "[MISSING]"
);
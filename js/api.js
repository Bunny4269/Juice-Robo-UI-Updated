/* =========================================================
   JUICE ROBO API
   LEGACY TEST BACKEND ADAPTER
   =========================================================

   This adapter talks directly to the existing Juice Robo
   test backend.

   GENERAL API:
   https://tptest.juicerobo.com/tporder/api

   ORDER MASTER API:
   https://tptest.juicerobo.com/tpordermaster/api

   IMPORTANT:
   - Uses the existing Juice Robo API credentials.
   - Does NOT use localhost:8000.
   - Does NOT use the FastAPI backend.
   - Does NOT use Authorization: Bearer.
   - Does NOT invent fake store IDs.
   - Product IDs are legacy variant IDs.
   ========================================================= */


/* =========================================================
   API BASE URLS
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
   LEGACY JUICE ROBO CREDENTIALS
   =========================================================

   These are the existing test credentials used by the
   previous working Juice Robo implementation.

   NOTE:
   These credentials are exposed to the browser because this
   is a frontend application. They should be moved behind a
   server-side proxy before production deployment.
   ========================================================= */

const JR_API_KEY =
  "fd272156-8768-47ec-80e5-6779309e6cac";

const JR_API_KEY_SECRET =
  "e844933d-9f44-4e4b-b0fe-e7bfc771ce99";


/* =========================================================
   GENERAL HELPERS
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


/* =========================================================
   STORED TOKEN
   ========================================================= */

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
   ORGANIZATION ID
   ========================================================= */

function getOrgId() {

  const storedOrgId =
    cleanStoredValue(
      localStorage.getItem(
        "ORG_ID"
      )
    ) ||
    cleanStoredValue(
      localStorage.getItem(
        "juice_robo_org_id"
      )
    );

  if (storedOrgId) {
    return storedOrgId;
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const queryOrgId =
    cleanStoredValue(
      params.get("o_id")
    ) ||
    cleanStoredValue(
      params.get("org_id")
    );


  if (queryOrgId) {

    localStorage.setItem(
      "ORG_ID",
      queryOrgId
    );

    localStorage.setItem(
      "juice_robo_org_id",
      queryOrgId
    );

    return queryOrgId;
  }


  const pathParts =
    window.location.pathname
      .split("/")
      .filter(Boolean);


  const possibleOrgId =
    pathParts.find(
      (part) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          part
        )
    );


  if (possibleOrgId) {

    localStorage.setItem(
      "ORG_ID",
      possibleOrgId
    );

    localStorage.setItem(
      "juice_robo_org_id",
      possibleOrgId
    );

    return possibleOrgId;
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
   STORE ID
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
   * Never save generated fake IDs.
   */

  if (
    value
      .toLowerCase()
      .startsWith("store-")
  ) {

    console.warn(
      "[Juice Robo] Refusing to save fake store ID:",
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
   STORED USER
   ========================================================= */

function getUserSnapshot() {

  const candidates = [
    "juice_robo_user",
    "user",
  ];


  for (
    const key of candidates
  ) {

    const raw =
      localStorage.getItem(
        key
      );


    if (!raw) {
      continue;
    }


    try {

      const parsed =
        JSON.parse(raw);


      if (
        parsed &&
        typeof parsed ===
          "object"
      ) {

        return parsed;
      }

    } catch {

      return {
        firstname:
          cleanStoredValue(
            raw
          ),
      };
    }
  }


  return {};
}


/* =========================================================
   RESPONSE UNWRAPPER
   ========================================================= */

function unwrap(data) {

  let current =
    data;


  /*
   * Some Juice Robo responses contain one or more
   * { data: ... } wrappers.
   */

  for (
    let i = 0;
    i < 5;
    i += 1
  ) {

    if (
      current &&
      typeof current ===
        "object" &&
      !Array.isArray(
        current
      ) &&
      current.data !==
        undefined
    ) {

      current =
        current.data;

      continue;
    }


    break;
  }


  return current;
}


/* =========================================================
   ARRAY EXTRACTION
   ========================================================= */

function extractArray(
  response,
  possibleKeys = []
) {

  const direct =
    unwrap(
      response
    );


  if (
    Array.isArray(
      direct
    )
  ) {

    return direct;
  }


  const candidates = [
    response,
    direct,
  ];


  for (
    const candidate of
      candidates
  ) {

    if (
      !candidate ||
      typeof candidate !==
        "object" ||
      Array.isArray(
        candidate
      )
    ) {

      continue;
    }


    for (
      const key of
        possibleKeys
    ) {

      const value =
        candidate[key];


      if (
        Array.isArray(
          value
        )
      ) {

        return value;
      }


      if (
        value &&
        typeof value ===
          "object"
      ) {

        const nested =
          unwrap(
            value
          );


        if (
          Array.isArray(
            nested
          )
        ) {

          return nested;
        }
      }
    }
  }


  return [];
}


/* =========================================================
   ERROR NORMALIZATION
   ========================================================= */

function normalizeError(
  data,
  status
) {

  if (
    data &&
    typeof data ===
      "object"
  ) {

    if (
      typeof data.message ===
        "string"
    ) {

      return data.message;
    }


    if (
      typeof data.error ===
        "string"
    ) {

      return data.error;
    }


    if (
      typeof data.detail ===
        "string"
    ) {

      return data.detail;
    }


    if (
      Array.isArray(
        data.errors
      )
    ) {

      return data.errors
        .map(
          (error) => {

            if (
              typeof error ===
                "string"
            ) {

              return error;
            }


            return (
              error?.message ||
              error?.msg ||
              JSON.stringify(
                error
              )
            );
          }
        )
        .join(" ");
    }
  }


  if (
    typeof data ===
      "string" &&
    data.trim()
  ) {

    return data;
  }


  if (
    status === 401
  ) {

    return (
      "Juice Robo API authentication failed (401). " +
      "The configured legacy API credentials were rejected."
    );
  }


  if (
    status === 403
  ) {

    return (
      "Juice Robo API access was forbidden (403)."
    );
  }


  return (
    `Juice Robo request failed (${status})`
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

    /*
     * These are the original Juice Robo authentication
     * headers.
     */

    "JR-API-KEY":
      JR_API_KEY,

    "JR-API-KEY-SECRET":
      JR_API_KEY_SECRET,

    ...(options.headers || {}),
  };


  if (
    options.body !==
      undefined
  ) {

    headers[
      "Content-Type"
    ] =
      "application/json";
  }


  /*
   * IMPORTANT:
   *
   * Do NOT automatically add:
   *
   * Authorization: Bearer ...
   *
   * The legacy Juice Robo API uses the JR headers above.
   */

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

  const headers =
    buildHeaders(
      options
    );


  const cleanBase =
    String(
      baseUrl
    ).replace(
      /\/+$/,
      ""
    );


  const cleanPath =
    String(
      path
    ).startsWith("/")
      ? String(path)
      : `/${String(path)}`;


  const url =
    `${cleanBase}${cleanPath}`;


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
          headers.Authorization ||
          headers.authorization
        ),
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

  } catch (
    error
  ) {

    console.error(
      "[Juice Robo] Network error:",
      error
    );


    throw new Error(
      "Unable to connect to the Juice Robo backend. Check your internet connection."
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
        text || null;
    }

  } catch (
    parseError
  ) {

    console.error(
      "[Juice Robo] Response parsing error:",
      parseError
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

function normalizeProduct(
  item
) {

  if (
    !item ||
    typeof item !==
      "object"
  ) {

    return null;
  }


  const variants =
    Array.isArray(
      item.lstVariants
    )
      ? item.lstVariants
      : Array.isArray(
          item.variants
        )
      ? item.variants
      : [];


  const availableVariant =
    variants.find(
      (variant) =>
        String(
          variant?.variantName ||
            ""
        )
          .trim()
          .toLowerCase() ===
        "full"
    ) ||
    variants.find(
      (variant) =>
        variant &&
        Number(
          firstDefined(
            variant?.unitPrice,
            variant?.price,
            0
          )
        ) >= 0
    ) ||
    variants[0];


  if (
    !availableVariant
  ) {

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
   * IMPORTANT:
   *
   * Some legacy responses return "Juice" for every product.
   * Therefore use ALL product text when selecting the name
   * and image.
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
    searchText.includes(
      "ginger"
    ) &&
    searchText.includes(
      "lemon"
    )
  ) {

    displayName =
      "Ginger + Lemon Sugarcane Juice";

  } else if (
    searchText.includes(
      "mixed"
    )
  ) {

    displayName =
      "Ginger + Lemon Sugarcane Juice";

  } else if (
    searchText.includes(
      "ginger"
    )
  ) {

    displayName =
      "Ginger Sugarcane Juice";

  } else if (
    searchText.includes(
      "lemon"
    )
  ) {

    displayName =
      "Lemon Sugarcane Juice";

  } else if (
    rawName
      .toLowerCase()
      .includes(
        "plain"
      )
  ) {

    displayName =
      "Plain Sugarcane Juice";
  }


  /*
   * Vite BASE_URL keeps these working with:
   *
   * /order_now/
   */

  const assetBase =
    `${import.meta.env.BASE_URL}assets/`;


  let imageUrl =
    `${assetBase}plain-juice.jpg`;


  if (
    searchText.includes(
      "ginger"
    ) &&
    searchText.includes(
      "lemon"
    )
  ) {

    imageUrl =
      `${assetBase}ginger-lemon-juice.jpg`;

  } else if (
    searchText.includes(
      "mixed"
    )
  ) {

    imageUrl =
      `${assetBase}ginger-lemon-juice.jpg`;

  } else if (
    searchText.includes(
      "ginger"
    )
  ) {

    imageUrl =
      `${assetBase}ginger-juice.jpg`;

  } else if (
    searchText.includes(
      "lemon"
    )
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


  const storeId =
    cleanStoredValue(
      firstDefined(
        item?.storeId,
        item?.locId,
        getStoreId()
      )
    );


  return {

    /*
     * CRITICAL:
     *
     * The cart uses the legacy variant ID.
     */

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
      storeId,

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


/* =========================================================
   PRODUCT LIST
   ========================================================= */

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
    .map(
      normalizeProduct
    )
    .filter(Boolean);
}


/* =========================================================
   OUTLET NORMALIZATION
   ========================================================= */

function normalizeOutlets(
  response
) {

  const unwrapped =
    unwrap(
      response
    );


  /*
   * Historical Juice Robo response can be:

   {
     outletName,
     outletDesc,
     storeSpot: [
       ...
     ]
   }

   or:

   {
     storesData: [...]
   }

   or:

   data: {
     storesData: [...]
   }
   */


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
   * Explicit support for the observed legacy response:
   *
   * {
   *   outletName: "...",
   *   outletDesc: "...",
   *   storeSpot: [...]
   * }
   */

  if (
    !stores.length &&
    unwrapped &&
    typeof unwrapped ===
      "object"
  ) {

    if (
      Array.isArray(
        unwrapped.storeSpot
      )
    ) {

      stores =
        unwrapped.storeSpot;
    }
  }


  /*
   * Some older responses put the actual store object
   * directly inside storeSpot.
   */

  return stores
    .map(
      (
        outlet,
        index
      ) => {

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
         * Never invent a store ID.
         */

        if (
          !storeId
        ) {

          console.warn(
            "[Juice Robo] Outlet has no real store ID:",
            outlet
          );

          return null;
        }


        const parent =
          unwrapped &&
          typeof unwrapped ===
            "object"
            ? unwrapped
            : {};


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
            outlet?.isActive !==
              false &&
            outlet?.active !==
              false,

          isActive:
            outlet?.isActive !==
              false &&
            outlet?.active !==
              false,

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
   MACHINES
   ========================================================= */

function normalizeMachines(
  locations
) {

  return locations.map(
    (location) => ({

      /*
       * Legacy system uses the real store ID as the
       * collection machine identifier.
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
    unwrap(
      rawOrder
    ) || {};


  const nestedOrder =
    order?.order &&
    typeof order.order ===
      "object"
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
          "confirmed"
        )
      ),

    payment_status:
      String(
        firstDefined(
          nestedOrder?.payment_status,
          nestedOrder?.paymentStatus,
          "PAID"
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
    unwrap(
      response
    ) || {};


  const accessToken =
    firstDefined(
      data?.accessToken,
      data?.access_token,
      data?.token,
      response?.accessToken,
      response?.access_token,
      response?.token
    );


  if (
    !accessToken
  ) {

    return response;
  }


  const user = {

    ...data,

    name:
      firstDefined(
        data?.name,
        [
          data?.firstName,
          data?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
      ) || "",

    firstname:
      data?.firstName,

    lastname:
      data?.lastName,

    email:
      firstDefined(
        data?.email,
        data?.userEmail,
        ""
      ),

    phone:
      firstDefined(
        data?.phone,
        data?.userName,
        ""
      ),
  };


  localStorage.setItem(
    "juice_robo_token",
    String(
      accessToken
    )
  );


  localStorage.setItem(
    "_token",
    JSON.stringify(
      accessToken
    )
  );


  localStorage.setItem(
    "juice_robo_user",
    JSON.stringify(
      user
    )
  );


  localStorage.setItem(
    "user",
    JSON.stringify(
      user
    )
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


  if (
    !storeId
  ) {

    throw new Error(
      "No Juice Robo store is selected."
    );
  }


  if (
    storeId
      .toLowerCase()
      .startsWith(
        "store-"
      )
  ) {

    throw new Error(
      `Invalid Juice Robo store ID: ${storeId}`
    );
  }


  if (
    !cartItems.length
  ) {

    throw new Error(
      "Your Juice Robo cart is empty."
    );
  }


  const cartId =
    payload?.cartId ||
    (
      typeof crypto !==
        "undefined" &&
      typeof crypto.randomUUID ===
        "function"
        ? crypto.randomUUID()
        : `JR-${Date.now()}`
    );


  return {

    cartId:
      String(
        cartId
      ),

    storeId:
      String(
        storeId
      ),

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


          if (
            !variantId
          ) {

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


      /*
       * If no store is saved, load the outlets first.
       */

      if (
        !storeId
      ) {

        const locations =
          await api.locations();


        if (
          !locations.length
        ) {

          throw new Error(
            "No Juice Robo outlet is available for this organization."
          );
        }


        storeId =
          saveStoreId(
            locations[0].storeId
          );


        if (
          !storeId
        ) {

          throw new Error(
            "Juice Robo returned an invalid store ID."
          );
        }
      }


      /*
       * Never use fake generated store IDs.
       */

      if (
        storeId
          .toLowerCase()
          .startsWith(
            "store-"
          )
      ) {

        localStorage.removeItem(
          "store_Id"
        );

        localStorage.removeItem(
          "juice_robo_store_id"
        );


        const locations =
          await api.locations();


        if (
          !locations.length
        ) {

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


      if (
        locations.length
      ) {

        const currentStore =
          getStoreId();


        const currentExists =
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
          !currentExists
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
     ======================================================= */

  register:
    async (
      payload = {}
    ) => {

      const name =
        String(
          payload?.name ||
          ""
        ).trim();


      const nameParts =
        name
          .split(/\s+/)
          .filter(Boolean);


      const firstName =
        payload?.firstName ||
        nameParts[0] ||
        "";


      const lastName =
        payload?.lastName ||
        nameParts
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

                firstName:

                  firstName,

                lastName:

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


  /* =======================================================
     PROFILE
     ======================================================= */

  profile:
    async () => {

      const user =
        getUserSnapshot();


      if (
        user?.id
      ) {

        try {

          const response =
            await request(
              `/user/${encodeURIComponent(
                user.id
              )}`
            );


          const data =
            unwrap(
              response
            );


          if (
            data &&
            typeof data ===
              "object"
          ) {

            const normalized = {

              ...user,

              ...data,

              name:
                data.name ||
                [
                  data.firstName,
                  data.lastName,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                user.name ||
                "Juice Lover",

              email:
                data.email ||
                data.userEmail ||
                user.email ||
                "",

              phone:
                data.phone ||
                data.userName ||
                user.phone ||
                "",
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

        } catch (
          error
        ) {

          console.warn(
            "[Juice Robo] Profile endpoint unavailable:",
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


      if (
        !user?.id
      ) {

        const next = {

          ...user,

          ...payload,
        };


        localStorage.setItem(
          "juice_robo_user",
          JSON.stringify(
            next
          )
        );


        localStorage.setItem(
          "user",
          JSON.stringify(
            next
          )
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


      return unwrap(
        response
      );
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
        id ===
          undefined ||
        id ===
          null ||
        id ===
          ""
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

     CURRENT TEST ORDER MASTER FLOW:

       1. POST /tpordermaster/api/v1/addcart
       2. POST /tpordermaster/api/v1/order/submit

     ======================================================= */

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


      /*
       * ADD CART
       */

      const addCartPayload = {

        cartId:

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


      console.log(
        "[Juice Robo] ADD CART:",
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
       * SUBMIT ORDER
       */

      const submitPayload = {

        cartId:
          cartId,
      };


      console.log(
        "[Juice Robo] ORDER SUBMIT:",
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


      const normalized =
        normalizeOrder(
          orderResponse
        );


      return {

        ...normalized,

        cartId:
          cartId,

        rawCartResponse:
          cartResponse,

        rawOrderResponse:
          orderResponse,

        orderId:
          firstDefined(
            orderResponse?.orderId,
            orderResponse?.order_id,
            orderResponse?.id,
            normalized?.id,
            ""
          ),

        transactionId:
          firstDefined(
            orderResponse?.transactionId,
            orderResponse?.transaction_id,
            normalized?.transactionId,
            ""
          ),

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

        payment_status:
          firstDefined(
            orderResponse?.payment_status,
            orderResponse?.paymentStatus,
            normalized?.payment_status,
            "PENDING"
          ),

        status:
          firstDefined(
            orderResponse?.orderStatus,
            orderResponse?.order_status,
            orderResponse?.status,
            normalized?.status,
            "PENDING_PAYMENT"
          ),

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
     LEGACY PAYMENT COMPATIBILITY
     ======================================================= */

  createPaymentOrder:
    async () => {

      throw new Error(
        "The legacy Juice Robo API does not expose the new Razorpay order API."
      );
    },


  verifyPayment:
    async () => {

      throw new Error(
        "The legacy Juice Robo API does not expose the new Razorpay verification API."
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
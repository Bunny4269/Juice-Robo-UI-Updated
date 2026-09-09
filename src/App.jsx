import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import "./App.css";

import LoginScreen from "./screens/LoginScreen/LoginScreen";

import HomeScreen from "./screens/HomeScreen/HomeScreen";
import MenuScreen from "./screens/MenuScreen/MenuScreen";
import CartScreen from "./screens/CartScreen/CartScreen";
import LocationMachineScreen from "./screens/LocationMachineScreen/LocationMachineScreen";
import LocationConfirmationScreen from "./screens/LocationConfirmationScreen/LocationConfirmationScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen/ProductDetailScreen";
import PaymentScreen from "./screens/PaymentScreen/PaymentScreen";
import ConfirmationScreen from "./screens/ConfirmationScreen/ConfirmationScreen";
import PaymentSuccessScreen from "./screens/PaymentSuccessScreen/PaymentSuccessScreen";
import HistoryScreen from "./screens/HistoryScreen/HistoryScreen";
import ProfileScreen from "./screens/ProfileScreen/ProfileScreen";

const ASSET_BASE =
  `${import.meta.env.BASE_URL}assets/`;

const PRODUCT_IMAGES = {
  plain: `${ASSET_BASE}plain-juice.jpg`,
  lemon: `${ASSET_BASE}lemon-juice.jpg`,
  ginger: `${ASSET_BASE}ginger-juice.jpg`,
  "ginger-lemon":
    `${ASSET_BASE}ginger-lemon-juice.jpg`,
};

const STORAGE = {
  loggedIn: "juice_robo_logged_in",
  token: "juice_robo_token",
  accessToken: "juice_robo_access_token",
  user: "juice_robo_user",
  legacyUser: "user",
  customer: "juice_robo_customer",
  location: "juice_robo_location",
  machine: "juice_robo_machine",
  orders: "juice_robo_orders",
  screen: "juice_robo_current_screen",
};

const GST_RATE = 0.12;

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

function cartKey(user) {
  return `juice_robo_cart_${userKey(user)}`;
}

function ordersKey(user) {
  return `juice_robo_orders_${userKey(user)}`;
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
            ? Math.floor(parsedQuantity)
            : 1,
      };
    });
}

function readCart(user) {
  const scoped =
    readJSON(
      cartKey(user),
      null
    );

  if (Array.isArray(scoped)) {
    return normalizeCart(scoped);
  }

  return normalizeCart(
    readJSON(
      "juice_robo_cart",
      []
    )
  );
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

function productText(product = {}) {
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

  return String(
    [
      product?.name,
      product?.desc,
      product?.description,
      product?.itemName,
      product?.productName,
      product?.product_name,
      product?.productType,
      product?.product_type,

      ...variants.flatMap(
        (variant) => [
          variant?.itemName,
          variant?.variantName,
          variant?.variantDesc,
        ]
      ),
    ]
      .filter(
        (value) =>
          value !== null &&
          value !== undefined &&
          String(value).trim() !== ""
      )
      .join(" ")
  ).toLowerCase();
}

function resolveProductImage(
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

  const apiImage =
    product?.image_url ||
    product?.imageUrl ||
    product?.image ||
    product?.itemPhoto ||
    variant?.variantPhoto ||
    "";

  if (apiImage) {
    const value =
      String(apiImage).trim();

    if (
      value.startsWith(
        "http://"
      ) ||
      value.startsWith(
        "https://"
      ) ||
      value.startsWith(
        "data:"
      ) ||
      value.startsWith(
        "blob:"
      )
    ) {
      return value;
    }

    if (
      value.startsWith("/")
    ) {
      return value;
    }

    return `${ASSET_BASE}${value.replace(
      /^\.?\//,
      ""
    )}`;
  }

  const text =
    productText(product);

  if (
    text.includes("ginger") &&
    text.includes("lemon")
  ) {
    return PRODUCT_IMAGES[
      "ginger-lemon"
    ];
  }

  if (text.includes("ginger")) {
    return PRODUCT_IMAGES.ginger;
  }

  if (text.includes("lemon")) {
    return PRODUCT_IMAGES.lemon;
  }

  return PRODUCT_IMAGES.plain;
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
  return `₹${Number(
    value || 0
  ).toFixed(0)}`;
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

  return {
    ...product,

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
      Math.max(
        1,
        Number(quantity || 1)
      ),
  };
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const loggedIn =
    Boolean(
      localStorage.getItem(
        STORAGE.loggedIn
      )
    ) &&
    Boolean(
      localStorage.getItem(
        STORAGE.accessToken
      ) ||
        localStorage.getItem(
          STORAGE.token
        )
    );

  /*
   * Public browsing:
   * Logged-out users start on the Menu so they can browse
   * products before signing in.
   */
  const [screen, setScreenState] =
    useState(() => {
      const savedScreen =
        localStorage.getItem(
          STORAGE.screen
        );

      /*
       * Preserve the exact screen across browser refreshes.
       * Logged-out users may only resume on the public Menu;
       * authenticated users may resume any previously stored screen.
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
        ? "location"
        : "menu";
    });

  function setScreen(nextScreen) {
    setScreenState(nextScreen);

    try {
      localStorage.setItem(
        STORAGE.screen,
        String(nextScreen)
      );
    } catch {
      // Ignore storage errors.
    }
  }

  useEffect(() => {
    /*
     * Keep the persisted screen synchronized with the current
     * React screen. This also covers screens changed by code paths
     * that run during authentication or logout.
     */
    try {
      localStorage.setItem(
        STORAGE.screen,
        String(screen)
      );
    } catch {
      // Ignore storage errors.
    }
  }, [screen]);

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
        localStorage.getItem(
          STORAGE.location
        ) || ""
    );

  const [selectedMachineId, setSelectedMachineId] =
    useState(
      () =>
        localStorage.getItem(
          STORAGE.machine
        ) || ""
    );

  const [cart, setCart] =
    useState(() =>
      readCart(
        getStoredUser()
      )
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
      loggedIn
    );

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [toast, setToast] =
    useState("");

  const [order, setOrder] =
    useState(null);

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
        null
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
        ) || null
      );
    }, [
      machines,
      selectedMachineId,
    ]);

  /* =======================================================
     CART TOTALS
     ======================================================= */

  const safeCart =
    normalizeCart(cart);

  const cartCount =
    useMemo(
      () =>
        safeCart.reduce(
          (sum, item) => {
            const quantity = Number(
              item?.quantity || 0
            );

            return (
              sum +
              (
                Number.isFinite(quantity) &&
                quantity > 0
                  ? Math.floor(quantity)
                  : 0
              )
            );
          },
          0
        ),
      [safeCart]
    );

  const subtotal =
    useMemo(
      () =>
        safeCart.reduce(
          (sum, item) =>
            sum +
            Number(
              item.price ||
                item.unitPrice ||
                0
            ) *
              Number(
                item.quantity || 1
              ),
          0
        ),
      [safeCart]
    );

  const gst =
    subtotal *
    GST_RATE;

  const finalTotal =
    subtotal + gst;

  const cartTotal =
    finalTotal;

  /* =======================================================
     INITIAL DATA LOAD
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      /*
       * Locations, machines and products are loaded for public
       * browsing as well. Authentication is required only for
       * authenticated actions such as adding to cart/checkout.
       */
      setLoading(true);
      setError("");

      try {
        const loadedLocations =
          await api.locations();

        if (cancelled) return;

        setLocations(
          loadedLocations
        );

        setError("");

        let locationId =
          localStorage.getItem(
            STORAGE.location
          ) || "";

        const savedExists =
          locationId &&
          loadedLocations.some(
            (location) =>
              String(
                location.id
              ) ===
              String(
                locationId
              )
          );

        if (
          !savedExists &&
          loadedLocations.length
        ) {
          locationId =
            String(
              loadedLocations[0].id
            );

          setSelectedLocationId(
            locationId
          );

          localStorage.setItem(
            STORAGE.location,
            locationId
          );
        }

        const selectedInitialLocation =
          loadedLocations.find(
            (location) =>
              String(
                location.id
              ) ===
              String(
                locationId
              )
          );

        const storeId =
          selectedInitialLocation?.storeId ||
          selectedInitialLocation?.store_id ||
          selectedInitialLocation?.locId ||
          selectedInitialLocation?.id ||
          "";

        if (storeId) {
          const loadedProducts =
            await api.products(
              storeId
            );

          if (!cancelled) {
            setProducts(
              Array.isArray(
                loadedProducts
              )
                ? loadedProducts
                : []
            );

            setError("");
          }
        }

        const loadedMachines =
          await api.machines(
            loadedLocations
          );

        if (!cancelled) {
          setMachines(
            loadedMachines
          );

          const savedMachine =
            localStorage.getItem(
              STORAGE.machine
            );

          const getMachineId = (machine) =>
            String(
              machine?.id ??
                machine?.machineId ??
                machine?.machine_id ??
                ""
            );

          const getMachineLocationIds = (machine) =>
            [
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

          const selectedLocationMachine =
            loadedMachines.find(
              (machine) =>
                getMachineLocationIds(
                  machine
                ).includes(
                  String(
                    locationId
                  )
                )
            );

          const savedMachineObject =
            loadedMachines.find(
              (machine) =>
                getMachineId(
                  machine
                ) ===
                String(
                  savedMachine ||
                    ""
                )
            );

          const initialMachine =
            selectedLocationMachine ||
            savedMachineObject ||
            loadedMachines[0] ||
            null;

          if (initialMachine) {
            const machineId =
              getMachineId(
                initialMachine
              );

            if (machineId) {
              setSelectedMachineId(
                machineId
              );

              localStorage.setItem(
                STORAGE.machine,
                machineId
              );
            }
          } else {
            setSelectedMachineId(
              ""
            );

            localStorage.removeItem(
              STORAGE.machine
            );
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          console.error(
            "[Juice Robo] Initial data load failed:",
            loadError
          );

          setError(
            errorText(loadError)
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

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

      setCart(
        readCart(
          loggedUser
        )
      );

      setHistoryOrders(
        readOrders(
          loggedUser
        )
      );

      const loadedLocations =
        await api.locations();

      setLocations(
        loadedLocations
      );

      let nextLocationId =
        localStorage.getItem(
          STORAGE.location
        ) || "";

      const validLocation =
        loadedLocations.find(
          (location) =>
            String(
              location.id
            ) ===
            String(
              nextLocationId
            )
        );

      if (!validLocation) {
        nextLocationId =
          String(
            loadedLocations[0]?.id ||
              ""
          );

        if (nextLocationId) {
          localStorage.setItem(
            STORAGE.location,
            nextLocationId
          );

          setSelectedLocationId(
            nextLocationId
          );
        }
      }

      const nextLocation =
        loadedLocations.find(
          (location) =>
            String(
              location.id
            ) ===
            String(
              nextLocationId
            )
        );

      const storeId =
        nextLocation?.storeId ||
        nextLocation?.store_id ||
        nextLocation?.locId ||
        nextLocation?.id;

      if (storeId) {
        const loadedProducts =
          await api.products(
            storeId
          );

        setProducts(
          loadedProducts
        );
      }

      const loadedMachines =
        await api.machines(
          loadedLocations
        );

      setMachines(
        loadedMachines
      );

      setScreen(
        "location"
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

      const loadedProducts =
        await api.products(
          storeId
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

    setSelectedLocationId(
      id
    );

    localStorage.setItem(
      STORAGE.location,
      id
    );

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

    localStorage.setItem(
      STORAGE.machine,
      id
    );

    showToast(
      `${machine?.name || "Machine"} selected`
    );
  }

  function continueToMenu() {
    if (!selectedLocationId) {
      showToast(
        "Select a collection location"
      );
      return;
    }

    if (!selectedMachineId) {
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
    setSelectedProduct(
      product
    );

    const variants =
      Array.isArray(
        product?.lstVariants
      )
        ? product.lstVariants
        : [];

    const firstVariant =
      variants[0] || null;

    setSelectedVariant(
      firstVariant
    );

    const existing =
      safeCart.find(
        (item) =>
          String(
            item?.productId ??
              item?.itemId ??
              item?.id
          ) ===
          String(
            product?.id
          )
      );

    setQuantity(
      Math.max(
        1,
        Number(
          existing?.quantity ||
            1
        )
      )
    );

    setScreen(
      "product"
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
  }

  function addProductToCart(
    product,
    variant,
    nextQuantity = 1
  ) {
    const item =
      makeCartItem(
        product,
        variant,
        nextQuantity
      );

    setCart(
      (current) => {
        const exists =
          current.find(
            (entry) =>
              String(
                entry.id
              ) ===
              String(
                item.id
              )
          );

        if (exists) {
          return current.map(
            (entry) =>
              String(
                entry.id
              ) ===
              String(
                item.id
              )
                ? {
                    ...entry,
                    ...item,
                    quantity:
                      item.quantity,
                  }
                : entry
          );
        }

        return [
          ...current,
          item,
        ];
      }
    );

    showToast(
      `${displayProductName(
        product
      )} added to cart`
    );

    closeProduct();

    setScreen(
      "menu"
    );
  }

  function handleAddToCart(
    product,
    variant,
    nextQuantity
  ) {
    /*
     * Menu/product browsing is public, but adding an item to the
     * cart requires authentication. Send the user to Sign In
     * instead of adding the item while logged out.
     */
    if (!loggedIn) {
      showToast(
        "Please sign in to add items to your cart"
      );

      closeProduct();
      setScreen(
        "login"
      );
      return;
    }

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

    addProductToCart(
      product,
      actualVariant,
      actualQuantity
    );
  }

  /* =======================================================
     CART
     ======================================================= */

  function updateQuantity(
    productId,
    nextQuantity
  ) {
    const value =
      Number(
        nextQuantity
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {
      removeProduct(
        productId
      );
      return;
    }

    setCart(
      (current) =>
        current.map(
          (item) =>
            String(
              item.id
            ) ===
            String(
              productId
            )
              ? {
                  ...item,
                  quantity:
                    value,
                }
              : item
        )
    );
  }

  function removeProduct(
    productId
  ) {
    setCart(
      (current) =>
        current.filter(
          (item) =>
            String(
              item.id
            ) !==
            String(
              productId
            )
        )
    );

    showToast(
      "Item removed from cart"
    );
  }

  function clearCart() {
    setCart([]);
    showToast(
      "Cart cleared"
    );
  }

  /* =======================================================
     CHECKOUT
     ======================================================= */

  function startCheckout() {
    if (!loggedIn) {
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

    if (
      !selectedLocationId ||
      !selectedMachineId
    ) {
      showToast(
        "Select your collection location and machine first"
      );

      setScreen(
        "location"
      );

      return;
    }

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

    setScreen(
      "payment"
    );
  }

  /* =======================================================
     PAYMENT / ORDER
     ======================================================= */

  async function handlePayment() {
    if (!safeCart.length) {
      showToast(
        "Your cart is empty"
      );

      setScreen(
        "cart"
      );

      return;
    }

    if (!selectedLocationId) {
      showToast(
        "Please select a collection location"
      );

      setScreen(
        "location"
      );

      return;
    }

    if (!selectedMachineId) {
      showToast(
        "Please select a Juice Robo machine"
      );

      setScreen(
        "location"
      );

      return;
    }

    try {
      setBusy(true);
      setError("");

      const created =
        await api.createOrder({
          storeId:
            selectedLocation?.storeId ||
            selectedLocation?.id,

          locationId:
            selectedLocation?.id,

          machineId:
            selectedMachine?.id,

          cartItems:
            safeCart,
        });

      const normalizedOrder = {
        ...created,

        items:
          safeCart,

        subtotal,

        gst,

        total_amount:
          finalTotal,

        location:
          selectedLocation,

        machine:
          selectedMachine,

        createdAt:
          created?.created_at ||
          created?.createdAt ||
          new Date().toISOString(),

        payment_status:
          created?.payment_status ||
          "PENDING",

        status:
          created?.status ||
          "PENDING",
      };

      setOrder(
        normalizedOrder
      );

      setHistoryOrders(
        (current) => [
          normalizedOrder,
          ...current.filter(
            (item) =>
              String(
                item?.id
              ) !==
              String(
                normalizedOrder?.id
              )
          ),
        ]
      );

      setScreen(
        "confirmation"
      );

      showToast(
        "Order created successfully"
      );
    } catch (paymentError) {
      console.error(
        "[Juice Robo] Order/payment error:",
        paymentError
      );

      showToast(
        errorText(
          paymentError
        ) ||
          "Unable to place the order."
      );

      setError(
        errorText(
          paymentError
        )
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     HISTORY
     ======================================================= */

  async function refreshOrders() {
    try {
      const backendOrders =
        await api.orders();

      if (
        Array.isArray(
          backendOrders
        ) &&
        backendOrders.length
      ) {
        setHistoryOrders(
          backendOrders
        );
      }
    } catch (ordersError) {
      console.warn(
        "[Juice Robo] Backend order history unavailable; using local history.",
        ordersError
      );
    }
  }

  function openOrderHistory() {
    refreshOrders();
    setScreen(
      "history"
    );
  }

  function clearOrderHistory() {
    if (
      !window.confirm(
        "Clear your locally saved order history?"
      )
    ) {
      return;
    }

    localStorage.removeItem(
      STORAGE.orders
    );

    localStorage.removeItem(
      ordersKey(user)
    );

    setHistoryOrders(
      []
    );

    showToast(
      "Order history cleared"
    );
  }

  /* =======================================================
     MOBILE VIEWPORT
     ======================================================= */

  const MOBILE_BREAKPOINT = 1024;

  const getMobileViewport = () => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    ).matches;
  };

  const [
    isMobileViewport,
    setIsMobileViewport,
  ] = useState(
    getMobileViewport
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery =
      window.matchMedia(
        `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
      );

    const handleViewportChange = (event) => {
      setIsMobileViewport(
        event.matches
      );
    };

    if (
      typeof mediaQuery.addEventListener ===
      "function"
    ) {
      mediaQuery.addEventListener(
        "change",
        handleViewportChange
      );

      return () => {
        mediaQuery.removeEventListener(
          "change",
          handleViewportChange
        );
      };
    }

    mediaQuery.addListener(
      handleViewportChange
    );

    return () => {
      mediaQuery.removeListener(
        handleViewportChange
      );
    };
  }, []);

/* =======================================================
   DESKTOP BLOCK
   ======================================================= */

if (!isMobileViewport) {
  return (
    <div className="jr-desktop-block" role="status" aria-live="polite">
      <div className="jr-desktop-block-content">
        <div className="jr-desktop-device-icon" aria-hidden="true">
          <svg
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            focusable="false"
          >
            <rect
              x="17"
              y="7"
              width="30"
              height="50"
              rx="7"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />

            <rect
              x="22"
              y="13"
              width="20"
              height="34"
              rx="2"
              fill="currentColor"
              opacity="0.08"
            />

            <circle
              cx="32"
              cy="51"
              r="2"
              fill="currentColor"
            />
          </svg>
        </div>

        <span className="jr-desktop-block-eyebrow">
          JUICE ROBO
        </span>

        <h1>Mobile Only</h1>

        <p>
          This site is optimised for mobile devices.
          <br />
          Please access Juice Robo using your mobile phone.
        </p>
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
        <div className="jr-mobile-frame">
          <div className="jr-loading">
            <img
              src={`${ASSET_BASE}app_logo.jpg`}
              alt="Juice Robo"
              className="jr-loading-image"
              style={{
                width: "180px",
                height: "180px",
                maxWidth: "180px",
                maxHeight: "180px",
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
            />

            <div className="jr-loader" />

            <p>
              Loading Juice Robo…
            </p>
          </div>
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
            onContinueWithoutLogin={() =>
              setScreen(
                "menu"
              )
            }
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
      <div className="jr-mobile-frame">

        {/* ===================================================
            HEADER
           =================================================== */}

        <Header
          cartCount={
            cartCount
          }

          location={
            selectedLocation
          }

          machine={
            selectedMachine
          }

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

          onCart={() => {
            if (!loggedIn) {
              showToast(
                "Please sign in to view your cart"
              );

              setScreen(
                "login"
              );

              return;
            }

            setScreen(
              "cart"
            );
          }}

          onProfile={() => {
            if (!loggedIn) {
              showToast(
                "Please sign in to view your profile"
              );

              setScreen(
                "login"
              );

              return;
            }

            setScreen(
              "profile"
            );
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

              onClear={
                clearOrderHistory
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
            />
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

              onProfile={() =>
                setScreen(
                  "profile"
                )
              }
            />
          )}

          {/* =================================================
              MENU
             ================================================= */}

          {screen === "menu" && (
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

              quantity={
                quantity
              }

              setQuantity={
                setQuantity
              }

              onVariantChange={
                setSelectedVariant
              }

              onBack={() => {
                closeProduct();

                setScreen(
                  "menu"
                );
              }}

              onAddToCart={
                handleAddToCart
              }

              formatMoney={
                money
              }

              money={
                money
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
            />
          )}

          {/* =================================================
              LOCATION CONFIRMATION
             ================================================= */}

          {screen === "location-confirmation" && (
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
          )}

          {/* =================================================
              PAYMENT
             ================================================= */}

          {screen === "payment" && (
            <PaymentScreen
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

              location={
                selectedLocation
              }

              machine={
                selectedMachine
              }

              onBack={() =>
                setScreen(
                  "location-confirmation"
                )
              }

              onPay={
                handlePayment
              }

              money={
                money
              }

              busy={
                busy
              }

              error={
                error
              }
            />
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
            />
          )}

          {/* =================================================
              PAYMENT SUCCESS
             ================================================= */}

          {screen === "payment-success" && (
            <PaymentSuccessScreen
              order={
                order
              }

              location={
                selectedLocation
              }

              machine={
                selectedMachine
              }

              total={
                finalTotal
              }

              onHome={() =>
                setScreen(
                  "home"
                )
              }

              onMenu={() =>
                setScreen(
                  "menu"
                )
              }

              onHistory={
                openOrderHistory
              }

              money={
                money
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
          screen !== "payment-success" && (
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

              loggedIn={
                loggedIn
              }

              onRequireSignIn={() => {
                showToast(
                  "Please sign in to view your cart"
                );

                setScreen(
                  "login"
                );
              }}
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
            <div
              className="jr-global-error"
              role="alert"
              aria-live="polite"
              style={{
                position: "fixed",
                left: "16px",
                right: "16px",
                bottom: "92px",
                zIndex: 1200,
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minHeight: "46px",
                padding: "10px 12px",
                borderRadius: "14px",
                boxSizing: "border-box",
              }}
            >
              <span className="jr-global-error-icon">
                !
              </span>

              <span className="jr-global-error-text">
                {error}
              </span>

              <button
                type="button"
                className="jr-global-error-close"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                ×
              </button>
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
  location,
  machine,
  locations = [],
  machines = [],
  selectedLocationId,
  selectedMachineId,
  onLocation,
  onMachine,
  onCart,
  onProfile,
}) {
  const [open, setOpen] = useState(false);

  const clean = (value) =>
    String(value ?? "")
      .replace(/\bundefined\b/gi, "")
      .replace(/\bnull\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  const locationId = (item) =>
    String(
      item?.id ??
        item?.storeId ??
        item?.store_id ??
        item?.locId ??
        item?.locationId ??
        item?.location_id ??
        item?.outletId ??
        item?.outlet_id ??
        ""
    );

  const locationName = (item) =>
    clean(
      item?.outletName ??
        item?.locationName ??
        item?.storeName ??
        item?.name ??
        item?.outlet?.name ??
        item?.location?.name ??
        item?.store?.name
    );

  const machineId = (item) =>
    String(
      item?.id ??
        item?.machineId ??
        item?.machine_id ??
        ""
    );

  const machineName = (item) =>
    clean(
      item?.machineName ??
        item?.machine_name ??
        item?.name ??
        item?.machineCode ??
        item?.machine_code ??
        item?.code
    );

  const currentLocationName =
    locationName(location) || "Choose location";

  const currentMachineName =
    machineName(machine) || "Choose machine";

  const availableMachines = machines.filter((item) => {
    if (!selectedLocationId) return true;

    const ids = [
      item?.locationId,
      item?.location_id,
      item?.storeId,
      item?.store_id,
      item?.locId,
      item?.outletId,
      item?.outlet_id,
      item?.location?.id,
      item?.store?.id,
      item?.outlet?.id,
    ]
      .filter(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
      .map((value) => String(value));

    return ids.includes(String(selectedLocationId));
  });

  const machineOptions =
    availableMachines.length
      ? availableMachines
      : machine
        ? [machine]
        : [];

  function chooseLocation(item) {
    if (typeof onLocation === "function") {
      onLocation(item);
    }
    setOpen(false);
  }

  function chooseMachine(item) {
    if (typeof onMachine === "function") {
      onMachine(item);
    }
    setOpen(false);
  }

  return (
    <header className="jr-header">
      <div className="jr-header-selection">
        <div
          className="jr-header-location-icon"
          aria-hidden="true"
          role="img"
          aria-label="Location"
        >
          <span className="jr-location-pin">📍</span>
        </div>

        {/* ONE COMBINED LOCATION + MACHINE DROPDOWN */}
        <div className="jr-combined-picker">
          <button
            type="button"
            className={`jr-combined-picker-trigger ${open ? "open" : ""}`}
            onClick={() => setOpen((value) => !value)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label="Choose location and machine"
          >
            <span className="jr-combined-picker-copy">
              <span className="jr-combined-picker-line">
                <small>LOCATION</small>
                <strong>{currentLocationName}</strong>
              </span>

              <span className="jr-combined-picker-line machine-line">
                <small>MACHINE</small>
                <strong>{currentMachineName}</strong>
              </span>
            </span>

            <svg
              className="jr-combined-picker-chevron"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 9L12 14L17 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {open && (
            <div className="jr-combined-picker-menu">
              <div className="jr-combined-picker-section">
                <div className="jr-combined-picker-section-title">
                  LOCATION
                </div>

                {locations.length ? (
                  locations.map((item, index) => {
                    const id = locationId(item);
                    const active =
                      String(id) === String(selectedLocationId || "");

                    return (
                      <button
                        type="button"
                        className={`jr-combined-picker-option ${active ? "active" : ""}`}
                        key={id || `location-${index}`}
                        onClick={() => chooseLocation(item)}
                      >
                        <span>{locationName(item) || "Unnamed location"}</span>
                        {active && (
                          <span className="jr-combined-picker-check">✓</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="jr-combined-picker-empty">
                    No locations available
                  </div>
                )}
              </div>

              <div className="jr-combined-picker-divider" />

              <div className="jr-combined-picker-section">
                <div className="jr-combined-picker-section-title">
                  MACHINE
                </div>

                {machineOptions.length ? (
                  machineOptions.map((item, index) => {
                    const id = machineId(item);
                    const active =
                      String(id) === String(selectedMachineId || "");

                    return (
                      <button
                        type="button"
                        className={`jr-combined-picker-option ${active ? "active" : ""}`}
                        key={id || `machine-${index}`}
                        onClick={() => chooseMachine(item)}
                      >
                        <span>{machineName(item) || "Unnamed machine"}</span>
                        {active && (
                          <span className="jr-combined-picker-check">✓</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="jr-combined-picker-empty">
                    No machines available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="jr-header-actions">
        <button
          type="button"
          className="jr-profile-button"
          onClick={onProfile}
          aria-label="Profile"
        >
          <svg className="jr-header-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="7.5" r="3.15" fill="currentColor" />
            <path d="M5.5 20C5.9 15.9 8.2 13.7 12 13.7C15.8 13.7 18.1 15.9 18.5 20" fill="currentColor" />
          </svg>
        </button>

        <button
          type="button"
          className="jr-cart-button"
          onClick={onCart}
          aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
        >
          <svg className="jr-header-action-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4.2 5.2H6.25L7.75 15.1H17.55L19.15 8H7.05" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9.15" cy="19" r="1.35" fill="currentColor" />
            <circle cx="16.25" cy="19" r="1.35" fill="currentColor" />
          </svg>

          {cartCount > 0 && (
            <span className="jr-cart-badge">{cartCount}</span>
          )}
        </button>
      </div>
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
  loggedIn,
  onRequireSignIn,
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
      className="jr-bottom-nav jr-bottom-nav-two"
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

      <button
        type="button"
        className={
          screen === "cart"
            ? "active"
            : ""
        }
        onClick={() => {
          if (!loggedIn) {
            onRequireSignIn?.();
            return;
          }

          setScreen(
            "cart"
          );
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
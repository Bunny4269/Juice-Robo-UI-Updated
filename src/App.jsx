import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import "./App.css";

/* =========================================================
   JUICE ROBO — CUSTOMER WEBSITE
   =========================================================
   Flow:

   LOGIN / SIGNUP
        ↓
   MACHINE / LOCATION
        ↓
   MENU
        ↓
   PRODUCT
        ↓
   CART
        ↓
   PAYMENT
        ↓
   CONFIRMATION
        ↓
   ORDER HISTORY
   ========================================================= */

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;

const PRODUCT_IMAGES = {
  plain: `${ASSET_BASE}plain-juice.jpg`,
  lemon: `${ASSET_BASE}lemon-juice.jpg`,
  ginger: `${ASSET_BASE}ginger-juice.jpg`,
  "ginger-lemon": `${ASSET_BASE}ginger-lemon-juice.jpg`,
};

const STORAGE = {
  token: "juice_robo_token",
  user: "juice_robo_user",
  legacyUser: "user",
  customer: "juice_robo_customer",
  loggedIn: "juice_robo_logged_in",
  location: "juice_robo_location",
  machine: "juice_robo_machine",
};

const EMPTY_CUSTOMER = {
  name: "",
  phone: "",
  email: "",
  loginIdentifier: "",
  password: "",
  confirmPassword: "",
};

/* =========================================================
   PRODUCT HELPERS
   ========================================================= */

function productText(product = {}) {
  return [
    product?.name,
    product?.description,
    product?.productName,
    product?.productType,
    product?.type,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function productImage(product = {}) {
  const text = productText(product);

  if (
    text.includes("ginger") &&
    text.includes("lemon")
  ) {
    return PRODUCT_IMAGES["ginger-lemon"];
  }

  if (text.includes("ginger")) {
    return PRODUCT_IMAGES.ginger;
  }

  if (text.includes("lemon")) {
    return PRODUCT_IMAGES.lemon;
  }

  return PRODUCT_IMAGES.plain;
}

function displayProductName(product = {}) {
  const text = productText(product);

  if (
    text.includes("ginger") &&
    text.includes("lemon")
  ) {
    return "Sugarcane Juice with Ginger + Lemon";
  }

  if (text.includes("ginger")) {
    return "Sugarcane Juice with Ginger";
  }

  if (text.includes("lemon")) {
    return "Sugarcane Juice with Lemon";
  }

  return "Plain Sugarcane Juice";
}

function displayDescription(product = {}) {
  const text = productText(product);

  if (
    text.includes("ginger") &&
    text.includes("lemon")
  ) {
    return "A refreshing blend of ginger, lemon and fresh sugarcane.";
  }

  if (text.includes("ginger")) {
    return "Fresh sugarcane juice with a zing of ginger.";
  }

  if (text.includes("lemon")) {
    return "Fresh sugarcane juice with a refreshing lemon twist.";
  }

  return "Freshly prepared plain sugarcane juice.";
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

/* =========================================================
   TAX
   ========================================================= */

const GST_RATE = 0.12;

function calculateGST(subtotal) {
  return Number(subtotal || 0) * GST_RATE;
}

function calculateFinalTotal(subtotal) {
  const amount = Number(subtotal || 0);

  return (
    amount +
    calculateGST(amount)
  );
}

/* =========================================================
   LOCATION HELPERS
   ========================================================= */

function getLocationId(location) {
  return String(
    location?.storeId ||
      location?.id ||
      ""
  );
}

/* =========================================================
   STORAGE HELPERS
   ========================================================= */

function readJSON(
  key,
  fallback = {}
) {
  try {
    const value =
      localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getStoredUser() {
  const user =
    readJSON(
      STORAGE.user,
      null
    ) ||
    readJSON(
      STORAGE.legacyUser,
      null
    );

  return user &&
    typeof user === "object"
    ? user
    : {};
}

function getUserKey(user) {
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

function cartStorageKey(user) {
  return `juice_robo_cart_${getUserKey(user)}`;
}

function orderStorageKey(user) {
  return `juice_robo_orders_${getUserKey(user)}`;
}

function normalizeCart(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(
      (item) =>
        item &&
        typeof item === "object"
    )
    .map((item) => ({
      ...item,
      quantity: Math.max(
        1,
        Number(item.quantity || 1)
      ),
    }));
}

function readUserCart(user) {
  try {
    return normalizeCart(
      JSON.parse(
        localStorage.getItem(
          cartStorageKey(user)
        ) || "[]"
      )
    );
  } catch {
    return [];
  }
}

function readUserOrders(user) {
  try {
    const orders =
      JSON.parse(
        localStorage.getItem(
          orderStorageKey(user)
        ) || "[]"
      );

    return Array.isArray(orders)
      ? orders
      : [];
  } catch {
    return [];
  }
}

function saveUserOrders(
  user,
  orders
) {
  localStorage.setItem(
    orderStorageKey(user),
    JSON.stringify(orders)
  );
}

/* =========================================================
   AUTH ERROR HELPERS
   ========================================================= */

function getErrorMessage(error) {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error.trim();
  }

  if (
    typeof error?.message ===
    "string"
  ) {
    return error.message.trim();
  }

  if (
    typeof error?.detail ===
    "string"
  ) {
    return error.detail.trim();
  }

  if (
    typeof error?.error ===
    "string"
  ) {
    return error.error.trim();
  }

  return "";
}

function getFriendlyLoginError(
  error
) {
  const message =
    getErrorMessage(error);

  const lower =
    message.toLowerCase();

  if (
    lower.includes("disabled") ||
    lower.includes(
      "user is disabled"
    ) ||
    lower.includes(
      "not active"
    ) ||
    lower.includes("inactive") ||
    lower.includes(
      "deactivated"
    )
  ) {
    return "Your account is not active yet. Please contact the Juice Robo administrator.";
  }

  if (
    lower.includes(
      "bad credentials"
    ) ||
    lower.includes(
      "invalid credentials"
    ) ||
    lower.includes(
      "invalid credential"
    ) ||
    lower.includes(
      "wrong password"
    ) ||
    lower.includes(
      "incorrect password"
    ) ||
    lower.includes(
      "invalid username"
    ) ||
    lower.includes(
      "invalid user"
    ) ||
    lower.includes("unauthorized")
  ) {
    return "Incorrect email/phone number or password.";
  }

  if (
    lower.includes("network") ||
    lower.includes(
      "failed to fetch"
    ) ||
    lower.includes("timeout") ||
    lower.includes(
      "connection"
    ) ||
    lower.includes(
      "unable to connect"
    )
  ) {
    return "Unable to connect to Juice Robo. Please check your connection and try again.";
  }

  if (
    lower.includes("(500)") ||
    lower.includes("500") ||
    lower.includes(
      "internal server error"
    ) ||
    lower.includes(
      "server error"
    )
  ) {
    return "Juice Robo sign-in service returned a server error. Please try again or contact the administrator.";
  }

  return (
    message ||
    "Unable to sign in. Please check your details and try again."
  );
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  /* =======================================================
     MOBILE VIEWPORT
     ======================================================= */

  const [
    isMobileViewport,
    setIsMobileViewport,
  ] = useState(() =>
    window.matchMedia(
      "(max-width: 768px)"
    ).matches
  );

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(max-width: 768px)"
      );

    const updateViewport = () => {
      setIsMobileViewport(
        mediaQuery.matches
      );
    };

    updateViewport();

    mediaQuery.addEventListener?.(
      "change",
      updateViewport
    );

    return () => {
      mediaQuery.removeEventListener?.(
        "change",
        updateViewport
      );
    };
  }, []);

  /* =======================================================
     STORED SESSION
     ======================================================= */

  const storedUser =
    getStoredUser();

  const hasToken =
    Boolean(
      localStorage.getItem(
        STORAGE.token
      )
    );

  /* =======================================================
     SCREEN
     ======================================================= */

  const [
    screen,
    setScreen,
  ] = useState(() =>
    hasToken
      ? "menu"
      : "login"
  );

  const [
    authMode,
    setAuthMode,
  ] = useState("login");

  /* =======================================================
     USER
     ======================================================= */

  const [
    user,
    setUser,
  ] = useState(
    storedUser
  );

  /* =======================================================
     CUSTOMER
     ======================================================= */

  const [
    customer,
    setCustomer,
  ] = useState(() => ({
    ...EMPTY_CUSTOMER,

    name:
      storedUser?.name ||
      storedUser?.firstname ||
      storedUser?.firstName ||
      "",

    phone:
      storedUser?.phone ||
      storedUser?.userName ||
      "",

    email:
      storedUser?.email ||
      storedUser?.userEmail ||
      "",

    loginIdentifier:
      storedUser?.email ||
      storedUser?.userEmail ||
      storedUser?.phone ||
      storedUser?.userName ||
      "",
  }));

  /* =======================================================
     API DATA
     ======================================================= */

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    locations,
    setLocations,
  ] = useState([]);

  const [
    machines,
    setMachines,
  ] = useState([]);

  /* =======================================================
     UI STATE
     ======================================================= */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    authError,
    setAuthError,
  ] = useState("");

  /* =======================================================
     LOCATION
     ======================================================= */

  const [
    selectedLocationId,
    setSelectedLocationId,
  ] = useState(
    () =>
      localStorage.getItem(
        STORAGE.location
      ) || ""
  );

  const [
    selectedMachineId,
    setSelectedMachineId,
  ] = useState(
    () =>
      localStorage.getItem(
        STORAGE.machine
      ) || ""
  );

  /* =======================================================
     PRODUCT SHEET
     ======================================================= */

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState(null);

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  /* =======================================================
     CART + ORDERS
     ======================================================= */

  const [
    cart,
    setCart,
  ] = useState(() =>
    hasToken
      ? readUserCart(
          storedUser
        )
      : []
  );

  const [
    orders,
    setOrders,
  ] = useState(() =>
    hasToken
      ? readUserOrders(
          storedUser
        )
      : []
  );

  /* =======================================================
     TOAST
     ======================================================= */

  const [
    toast,
    setToast,
  ] = useState("");

  /* =======================================================
     PAYMENT
     ======================================================= */

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("upi");

  const [
    paymentStatus,
    setPaymentStatus,
  ] = useState("idle");

  const [
    completedOrder,
    setCompletedOrder,
  ] = useState(null);

  /* =======================================================
     DERIVED LOCATION
     ======================================================= */

  const selectedLocation =
    useMemo(
      () =>
        locations.find(
          (location) =>
            getLocationId(
              location
            ) ===
            String(
              selectedLocationId
            )
        ),
      [
        locations,
        selectedLocationId,
      ]
    );

  const selectedMachine =
    useMemo(
      () =>
        machines.find(
          (machine) =>
            String(
              machine?.id
            ) ===
            String(
              selectedMachineId
            )
        ),
      [
        machines,
        selectedMachineId,
      ]
    );

  /* =======================================================
     CART COUNT
     ======================================================= */

  const cartCount =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.quantity || 0
            ),
          0
        ),
      [cart]
    );

  /* =======================================================
     CART SUBTOTAL
     ======================================================= */

  const cartTotal =
    useMemo(
      () =>
        cart.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.price || 0
            ) *
              Number(
                item.quantity || 0
              ),
          0
        ),
      [cart]
    );

  /* =======================================================
     GST
     ======================================================= */

  const gstAmount =
    useMemo(
      () =>
        calculateGST(
          cartTotal
        ),
      [cartTotal]
    );

  /* =======================================================
     FINAL TOTAL
     ======================================================= */

  const finalTotal =
    useMemo(
      () =>
        calculateFinalTotal(
          cartTotal
        ),
      [cartTotal]
    );

  /* =======================================================
     MOBILE GUARD
     ======================================================= */

  if (!isMobileViewport) {
    return (
      <MobileOnlyScreen />
    );
  }

  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(message) {
    setToast(message);

    window.clearTimeout(
      window.__juiceRoboToast
    );

    window.__juiceRoboToast =
      window.setTimeout(() => {
        setToast("");
      }, 2400);
  }

  /* =======================================================
     NORMALIZE AUTHENTICATED USER
     ======================================================= */

  function applyAuthenticatedUser(
    authResponse
  ) {
    const responseData =
      authResponse || {};

    const responseUser =
      responseData?.user ||
      responseData?.data?.user ||
      (
        responseData?.data &&
        typeof responseData.data ===
          "object"
          ? responseData.data
          : null
      );

    const source =
      responseUser &&
      typeof responseUser ===
        "object"
        ? responseUser
        : responseData;

    const firstName =
      source?.firstName ||
      source?.firstname ||
      "";

    const lastName =
      source?.lastName ||
      source?.lastname ||
      "";

    const fullName =
      [
        firstName,
        lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

    const normalized = {
      ...user,
      ...source,

      id:
        source?.id ||
        source?.userId ||
        source?.user_id ||
        user?.id ||
        "",

      name:
        source?.name ||
        fullName ||
        user?.name ||
        customer?.name ||
        "Juice Lover",

      firstname:
        firstName ||
        user?.firstname ||
        "",

      lastname:
        lastName ||
        user?.lastname ||
        "",

      email:
        source?.email ||
        source?.userEmail ||
        user?.email ||
        customer?.email ||
        "",

      phone:
        source?.phone ||
        source?.userName ||
        user?.phone ||
        customer?.phone ||
        "",

      userName:
        source?.userName ||
        source?.username ||
        user?.userName ||
        customer?.phone ||
        "",

      userEmail:
        source?.userEmail ||
        source?.email ||
        user?.userEmail ||
        customer?.email ||
        "",
    };

    setUser(normalized);

    setCustomer(
      (current) => ({
        ...current,

        name:
          normalized.name ||
          current.name ||
          "",

        phone:
          normalized.phone ||
          current.phone ||
          "",

        email:
          normalized.email ||
          current.email ||
          "",

        loginIdentifier:
          normalized.email ||
          normalized.phone ||
          normalized.userName ||
          "",
      })
    );

    localStorage.setItem(
      STORAGE.user,
      JSON.stringify(
        normalized
      )
    );

    localStorage.setItem(
      STORAGE.legacyUser,
      JSON.stringify(
        normalized
      )
    );

    localStorage.setItem(
      STORAGE.loggedIn,
      "true"
    );

    return normalized;
  }

  /* =======================================================
     CLEAR AUTH SESSION
     ======================================================= */

  function clearAuthSession() {
    localStorage.removeItem(
      STORAGE.token
    );

    localStorage.removeItem(
      "_token"
    );

    localStorage.removeItem(
      STORAGE.loggedIn
    );

    setUser({});

    setCart([]);

    setOrders([]);
  }

  /* =======================================================
     LOGIN
     ======================================================= */

  async function handleLogin(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setAuthError("");

    const identifier =
      String(
        customer?.loginIdentifier ||
          ""
      ).trim();

    const password =
      String(
        customer?.password ||
          ""
      );

    if (!identifier) {
      setAuthError(
        "Enter your email address or phone number."
      );
      return;
    }

    if (!password) {
      setAuthError(
        "Enter your password."
      );
      return;
    }

    try {
      setBusy(true);

      console.log(
        "[Juice Robo] Attempting login:",
        {
          identifier,
          hasPassword:
            Boolean(password),
        }
      );

      const response =
        await api.login({
          userName:
            identifier,
          password:
            password,
        });

      console.log(
        "[Juice Robo] Login response:",
        response
      );

      const token =
        response?.accessToken ||
        response?.access_token ||
        response?.token ||
        localStorage.getItem(
          STORAGE.token
        );

      if (!token) {
        throw new Error(
          "Login succeeded but the Juice Robo API did not return an authentication token."
        );
      }

      localStorage.setItem(
        STORAGE.token,
        token
      );

      localStorage.setItem(
        STORAGE.loggedIn,
        "true"
      );

      const nextUser =
        applyAuthenticatedUser(
          response
        );

      setCart(
        readUserCart(
          nextUser
        )
      );

      setOrders(
        readUserOrders(
          nextUser
        )
      );

      setCustomer(
        (current) => ({
          ...current,
          password: "",
          confirmPassword: "",
        })
      );

      setAuthError("");

      setScreen(
        "menu"
      );

      showToast(
        `Welcome, ${
          nextUser?.name ||
          "Juice Lover"
        }`
      );
    } catch (e) {
      console.error(
        "[Juice Robo] Login failed:",
        e
      );

      clearAuthSession();

      setAuthError(
        getFriendlyLoginError(e)
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     SIGNUP
     ======================================================= */

  async function handleSignup(
    event
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setAuthError("");

    const name =
      String(
        customer?.name || ""
      ).trim();

    const phone =
      String(
        customer?.phone || ""
      ).replace(
        /\D/g,
        ""
      );

    const email =
      String(
        customer?.email || ""
      ).trim();

    const password =
      String(
        customer?.password || ""
      );

    const confirmPassword =
      String(
        customer?.confirmPassword ||
          ""
      );

    if (!name) {
      setAuthError(
        "Enter your full name."
      );
      return;
    }

    if (!phone) {
      setAuthError(
        "Enter your 10-digit phone number."
      );
      return;
    }

    if (phone.length !== 10) {
      setAuthError(
        "Enter a valid 10-digit phone number."
      );
      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      setAuthError(
        "Please enter a valid email address."
      );
      return;
    }

    if (password.length < 6) {
      setAuthError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setAuthError(
        "Passwords do not match."
      );
      return;
    }

    try {
      setBusy(true);

      console.log(
        "[Juice Robo] Creating account:",
        {
          name,
          phone,
          email,
        }
      );

      const response =
        await api.register({
          name,
          phone,
          email,
          userName:
            phone,
          userEmail:
            email,
          password,
          confirmPassword,
        });

      console.log(
        "[Juice Robo] Registration response:",
        response
      );

      const registrationToken =
        response?.accessToken ||
        response?.access_token ||
        response?.token ||
        localStorage.getItem(
          STORAGE.token
        );

      if (registrationToken) {
        localStorage.setItem(
          STORAGE.token,
          registrationToken
        );

        localStorage.setItem(
          STORAGE.loggedIn,
          "true"
        );

        const nextUser =
          applyAuthenticatedUser(
            response
          );

        setCart(
          readUserCart(
            nextUser
          )
        );

        setOrders(
          readUserOrders(
            nextUser
          )
        );

        setCustomer(
          (current) => ({
            ...current,
            password: "",
            confirmPassword: "",
            loginIdentifier: "",
          })
        );

        setScreen(
          "menu"
        );

        showToast(
          `Welcome, ${
            nextUser?.name ||
            name
          }`
        );

        return;
      }

      clearAuthSession();

      setCustomer({
        ...EMPTY_CUSTOMER,

        name,
        phone,
        email,

        loginIdentifier:
          phone,
      });

      setAuthMode(
        "login"
      );

      setAuthError("");

      showToast(
        "Account created successfully. Please sign in."
      );
    } catch (e) {
      console.error(
        "[Juice Robo] Registration failed:",
        e
      );

      const message =
        getErrorMessage(e);

      const lower =
        message.toLowerCase();

      if (
        lower.includes(
          "already exists"
        ) ||
        lower.includes(
          "already registered"
        ) ||
        lower.includes(
          "duplicate"
        )
      ) {
        setAuthError(
          "An account with these details already exists. Please sign in."
        );
      } else if (
        lower.includes(
          "username"
        ) &&
        (
          lower.includes(
            "length"
          ) ||
          lower.includes(
            "size"
          ) ||
          lower.includes(
            "between"
          )
        )
      ) {
        setAuthError(
          "Please enter a valid 10-digit phone number."
        );
      } else if (
        lower.includes(
          "email"
        )
      ) {
        setAuthError(
          "Please enter a valid email address."
        );
      } else if (
        lower.includes(
          "password"
        )
      ) {
        setAuthError(
          "Please check your password and try again."
        );
      } else {
        setAuthError(
          message ||
            "Unable to create your account. Please try again."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     LOGOUT
     ======================================================= */

  function logout() {
    localStorage.removeItem(
      STORAGE.token
    );

    localStorage.removeItem(
      "_token"
    );

    localStorage.removeItem(
      STORAGE.loggedIn
    );

    localStorage.removeItem(
      STORAGE.user
    );

    localStorage.removeItem(
      STORAGE.legacyUser
    );

    localStorage.removeItem(
      STORAGE.customer
    );

    setUser({});

    setCustomer({
      ...EMPTY_CUSTOMER,
    });

    setCart([]);

    setOrders([]);

    setAuthError("");

    setAuthMode(
      "login"
    );

    setScreen(
      "login"
    );

    showToast(
      "You have been signed out."
    );
  }

  /* =======================================================
     PROFILE
     ======================================================= */

  async function openProfile() {
    setScreen(
      "profile"
    );

    try {
      const profile =
        await api.profile();

      if (
        profile &&
        typeof profile ===
          "object"
      ) {
        const nextUser = {
          ...user,
          ...profile,
        };

        setUser(
          nextUser
        );

        setCustomer(
          (current) => ({
            ...current,
            ...nextUser,
          })
        );

        localStorage.setItem(
          STORAGE.user,
          JSON.stringify(
            nextUser
          )
        );

        localStorage.setItem(
          STORAGE.legacyUser,
          JSON.stringify(
            nextUser
          )
        );
      }
    } catch (e) {
      console.warn(
        "[Juice Robo] Unable to load profile:",
        e
      );
    }
  }

  /* =======================================================
     SAVE PROFILE
     ======================================================= */

  async function saveProfile(
    event
  ) {
    event.preventDefault();

    setAuthError("");

    try {
      setBusy(true);

      const payload = {
        name:
          String(
            customer?.name ||
              ""
          ).trim(),

        phone:
          String(
            customer?.phone ||
              ""
          ).trim(),

        email:
          String(
            customer?.email ||
              ""
          ).trim(),
      };

      const updated =
        await api.updateProfile(
          payload
        );

      const nextUser = {
        ...user,
        ...(updated || {}),
        ...payload,
      };

      setUser(
        nextUser
      );

      setCustomer(
        (current) => ({
          ...current,
          ...payload,
        })
      );

      localStorage.setItem(
        STORAGE.user,
        JSON.stringify(
          nextUser
        )
      );

      localStorage.setItem(
        STORAGE.legacyUser,
        JSON.stringify(
          nextUser
        )
      );

      showToast(
        "Profile updated."
      );
    } catch (e) {
      console.error(
        "[Juice Robo] Profile update error:",
        e
      );

      setAuthError(
        getErrorMessage(e) ||
          "Unable to update your profile."
      );
    } finally {
      setBusy(false);
    }
  }

  /* =======================================================
     CLEAR ORDER HISTORY
     ======================================================= */

  function clearOrderHistory() {
    if (!orders.length) {
      showToast(
        "There are no orders to clear."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Clear all saved orders from your history?"
      );

    if (!confirmed) {
      return;
    }

    try {
      saveUserOrders(
        user,
        []
      );

      setOrders([]);

      setCompletedOrder(
        null
      );

      showToast(
        "Order history cleared."
      );
    } catch (e) {
      console.error(
        "[Juice Robo] Unable to clear order history:",
        e
      );

      showToast(
        "Unable to clear order history."
      );
    }
  }

  /* =======================================================
     LOCATION
     ======================================================= */

  function selectLocation(
    location
  ) {
    const id =
      getLocationId(
        location
      );

    setSelectedLocationId(
      id
    );

    setSelectedMachineId(
      ""
    );

    localStorage.setItem(
      STORAGE.location,
      id
    );

    localStorage.removeItem(
      STORAGE.machine
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
        machine?.id ||
          ""
      );

    setSelectedMachineId(
      id
    );

    localStorage.setItem(
      STORAGE.machine,
      id
    );

    showToast(
      `${
        machine?.name ||
        "Machine"
      } selected`
    );
  }

  /* =======================================================
     PRODUCT
     ======================================================= */

  function openProduct(
    product
  ) {
    setSelectedProduct(
      product
    );

    const existing =
      cart.find(
        (item) =>
          String(
            item.id
          ) ===
          String(
            product.id
          )
      );

    setQuantity(
      existing
        ? Number(
            existing.quantity ||
              1
          )
        : 1
    );
  }

  function closeProduct() {
    setSelectedProduct(
      null
    );

    setQuantity(1);
  }

  /* =======================================================
     ADD PRODUCT
     ======================================================= */

  function addProduct(
    product,
    nextQuantity
  ) {
    const qty =
      Math.max(
        1,
        Number(
          nextQuantity || 1
        )
      );

    setCart(
      (current) => {
        const exists =
          current.find(
            (item) =>
              String(
                item.id
              ) ===
              String(
                product.id
              )
          );

        if (exists) {
          return current.map(
            (item) =>
              String(
                item.id
              ) ===
              String(
                product.id
              )
                ? {
                    ...item,
                    quantity:
                      qty,
                  }
                : item
          );
        }

        return [
          ...current,

          {
            ...product,
            quantity:
              qty,
          },
        ];
      }
    );
  }

  /* =======================================================
     CONFIRM PRODUCT
     ======================================================= */

  function confirmProduct() {
    if (
      !selectedProduct
    ) {
      return;
    }

    addProduct(
      selectedProduct,
      quantity
    );

    showToast(
      `${displayProductName(
        selectedProduct
      )} added`
    );

    closeProduct();
  }

  /* =======================================================
     REMOVE PRODUCT
     ======================================================= */

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
  }

  /* =======================================================
     UPDATE QUANTITY
     ======================================================= */

  function updateQuantity(
    productId,
    nextQuantity
  ) {
    const qty =
      Number(
        nextQuantity
      );

    if (qty <= 0) {
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
                    qty,
                }
              : item
        )
    );
  }

  /* =======================================================
     START CHECKOUT
     ======================================================= */

  function startCheckout() {
    if (!cart.length) {
      showToast(
        "Your cart is empty."
      );

      setScreen(
        "menu"
      );

      return;
    }

    if (!selectedLocationId) {
      showToast(
        "Select a collection location."
      );

      setScreen(
        "machine"
      );

      return;
    }

    if (!selectedMachineId) {
      showToast(
        "Select a Juice Robo machine."
      );

      setScreen(
        "machine"
      );

      return;
    }

    setPaymentMethod(
      "upi"
    );

    setPaymentStatus(
      "idle"
    );

    setCompletedOrder(
      null
    );

    setScreen(
      "payment"
    );
  }

  /* =======================================================
     DEMO PAYMENT
     ======================================================= */

  function completeDemoPayment() {
    if (!cart.length) {
      showToast(
        "Your cart is empty."
      );

      setScreen(
        "menu"
      );

      return;
    }

    if (
      paymentStatus ===
      "processing"
    ) {
      return;
    }

    setPaymentStatus(
      "processing"
    );

    window.setTimeout(
      () => {
        const collectionCode =
          String(
            Math.floor(
              1000 +
                Math.random() *
                  9000
            )
          );

        const orderId =
          `JR-${Date.now()}`;

        const order = {
          id:
            orderId,

          order_number:
            orderId,

          status:
            "READY_FOR_COLLECTION",

          payment_status:
            "PAID",

          subtotal:
            cartTotal,

          gst_rate:
            12,

          gst_amount:
            gstAmount,

          total_amount:
            finalTotal,

          collection_code:
            collectionCode,

          collectionCode:
            collectionCode,

          location_id:
            selectedLocationId,

          machine_id:
            selectedMachineId,

          location_name:
            selectedLocation?.name ||
            "Juice Robo",

          machine_name:
            selectedMachine?.name ||
            "Juice Robo Machine",

          payment_method:
            paymentMethod,

          items:
            cart.map(
              (item) => {
                const unitPrice =
                  Number(
                    item.price ||
                      0
                  );

                const itemQuantity =
                  Number(
                    item.quantity ||
                      1
                  );

                return {
                  product_id:
                    item.id,

                  product_name:
                    item.displayName ||
                    displayProductName(
                      item
                    ),

                  quantity:
                    itemQuantity,

                  unit_price:
                    unitPrice,

                  subtotal:
                    unitPrice *
                    itemQuantity,
                };
              }
            ),

          created_at:
            new Date().toISOString(),
        };

        setCompletedOrder(
          order
        );

        setOrders(
          (current) => {
            const next =
              [
                order,
                ...current,
              ].slice(
                0,
                40
              );

            saveUserOrders(
              user,
              next
            );

            return next;
          }
        );

        setCart([]);

        setPaymentStatus(
          "success"
        );

        setScreen(
          "confirmation"
        );

        showToast(
          "Payment successful."
        );
      },
      1200
    );
  }

  /* =======================================================
     INITIAL DATA LOAD
     ======================================================= */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [
          productResponse,
          locationResponse,
          machineResponse,
        ] = await Promise.all([
          api.products(),
          api.locations(),
          api.machines(),
        ]);

        if (cancelled) {
          return;
        }

        const normalizedProducts =
          (
            Array.isArray(
              productResponse
            )
              ? productResponse
              : []
          ).map(
            (product) => {
              const image =
                productImage(
                  product
                );

              return {
                ...product,

                image,

                image_url:
                  image,

                displayName:
                  displayProductName(
                    product
                  ),

                displayDescription:
                  displayDescription(
                    product
                  ),
              };
            }
          );

        setProducts(
          normalizedProducts
        );

        setLocations(
          Array.isArray(
            locationResponse
          )
            ? locationResponse
            : []
        );

        setMachines(
          Array.isArray(
            machineResponse
          )
            ? machineResponse
            : []
        );
      } catch (e) {
        if (!cancelled) {
          console.error(
            "[Juice Robo] Load error:",
            e
          );

          setError(
            getErrorMessage(e) ||
              "Unable to load Juice Robo."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =======================================================
     SAVE CART
     ======================================================= */

  useEffect(() => {
    if (
      !user ||
      !getUserKey(user)
    ) {
      return;
    }

    localStorage.setItem(
      cartStorageKey(user),
      JSON.stringify(
        normalizeCart(cart)
      )
    );
  }, [
    cart,
    user,
  ]);

  /* =======================================================
     SAVE USER
     ======================================================= */

  useEffect(() => {
    if (
      !user ||
      !Object.keys(user).length
    ) {
      return;
    }

    localStorage.setItem(
      STORAGE.user,
      JSON.stringify(
        user
      )
    );

    localStorage.setItem(
      STORAGE.legacyUser,
      JSON.stringify(
        user
      )
    );

    localStorage.setItem(
      STORAGE.customer,
      JSON.stringify({
        ...customer,

        name:
          user?.name ||
          customer?.name ||
          "",

        phone:
          user?.phone ||
          customer?.phone ||
          "",

        email:
          user?.email ||
          customer?.email ||
          "",
      })
    );
  }, [
    user,
    customer,
  ]);

  /* =======================================================
     SAVE LOCATION
     ======================================================= */

  useEffect(() => {
    if (selectedLocationId) {
      localStorage.setItem(
        STORAGE.location,
        selectedLocationId
      );
    }
  }, [
    selectedLocationId,
  ]);

  /* =======================================================
     SAVE MACHINE
     ======================================================= */

  useEffect(() => {
    if (selectedMachineId) {
      localStorage.setItem(
        STORAGE.machine,
        selectedMachineId
      );
    }
  }, [
    selectedMachineId,
  ]);

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <LoadingScreen />
    );
  }

  /* =======================================================
     LOAD ERROR
     ======================================================= */

  if (
    error &&
    !products.length &&
    !locations.length
  ) {
    return (
      <div className="jr-app">

        <div className="jr-error-screen">

          <div className="jr-error-icon">
            !
          </div>

          <h1>
            Something went wrong
          </h1>

          <p>
            {error}
          </p>

          <button
            className="jr-button jr-button-primary"
            onClick={() =>
              window.location.reload()
            }
            type="button"
          >
            TRY AGAIN
          </button>

        </div>

      </div>
    );
  }

  /* =======================================================
     LOGIN / SIGNUP
     ======================================================= */

  if (
    screen === "login"
  ) {
    return (
      <div className="jr-app">

        <div className="jr-mobile-frame">

          <AuthScreen
            mode={
              authMode
            }
            setMode={(
              mode
            ) => {
              setAuthMode(
                mode
              );

              setAuthError("");
            }}
            customer={
              customer
            }
            setCustomer={
              setCustomer
            }
            onLogin={
              handleLogin
            }
            onSignup={
              handleSignup
            }
            busy={
              busy
            }
            error={
              authError
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
     MAIN APPLICATION
     ======================================================= */

  return (
    <div className="jr-app">

      <div className="jr-mobile-frame">

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
          user={
            user
          }
          onCart={() =>
            setScreen(
              "cart"
            )
          }
          onAccount={
            openProfile
          }
          onLocation={() =>
            setScreen(
              "machine"
            )
          }
        />

        {/* ===================================================
            MENU
            =================================================== */}

        {screen ===
          "menu" && (
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
            user={
              user
            }
            onProduct={
              openProduct
            }
          />
        )}

        {/* ===================================================
            MACHINE
            =================================================== */}

        {screen ===
          "machine" && (
          <MachineScreen
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
            onContinue={() =>
              setScreen(
                "menu"
              )
            }
          />
        )}

        {/* ===================================================
            CART
            =================================================== */}

        {screen ===
          "cart" && (
          <CartScreen
            cart={
              cart
            }
            total={
              cartTotal
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
            onLocation={() =>
              setScreen(
                "machine"
              )
            }
            onCheckout={
              startCheckout
            }
          />
        )}

        {/* ===================================================
            PAYMENT
            =================================================== */}

        {screen ===
          "payment" && (
          <PaymentScreen
            cart={
              cart
            }
            total={
              cartTotal
            }
            gst={
              gstAmount
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
            paymentMethod={
              paymentMethod
            }
            setPaymentMethod={
              setPaymentMethod
            }
            paymentStatus={
              paymentStatus
            }
            onBack={() => {
              if (
                paymentStatus !==
                "processing"
              ) {
                setPaymentStatus(
                  "idle"
                );

                setScreen(
                  "cart"
                );
              }
            }}
            onPay={
              completeDemoPayment
            }
          />
        )}

        {/* ===================================================
            CONFIRMATION
            =================================================== */}

        {screen ===
          "confirmation" && (
          <ConfirmationScreen
            order={
              completedOrder
            }
            location={
              selectedLocation
            }
            machine={
              selectedMachine
            }
            onHome={() => {
              setCompletedOrder(
                null
              );

              setPaymentStatus(
                "idle"
              );

              setScreen(
                "menu"
              );
            }}
          />
        )}

        {/* ===================================================
            PROFILE
            =================================================== */}

        {screen ===
          "profile" && (
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
              orders
            }
            onSave={
              saveProfile
            }
            onLogout={
              logout
            }
            onBack={() =>
              setScreen(
                "menu"
              )
            }
            busy={
              busy
            }
            error={
              authError
            }
            onOrders={() =>
              setScreen(
                "history"
              )
            }
          />
        )}

        {/* ===================================================
            HISTORY
            =================================================== */}

        {screen ===
          "history" && (
          <HistoryScreen
            orders={
              orders
            }
            onBack={() =>
              setScreen(
                "profile"
              )
            }
            onClear={
              clearOrderHistory
            }
          />
        )}

        {/* ===================================================
            BOTTOM NAV
            =================================================== */}

        {screen !==
          "confirmation" && (
          <BottomBar
            screen={
              screen
            }
            cartCount={
              cartCount
            }
            onMenu={() =>
              setScreen(
                "menu"
              )
            }
            onMachine={() =>
              setScreen(
                "machine"
              )
            }
            onCart={() =>
              setScreen(
                "cart"
              )
            }
            onAccount={
              openProfile
            }
          />
        )}

        {/* ===================================================
            PRODUCT SHEET
            =================================================== */}

        {selectedProduct && (
          <ProductSheet
            product={
              selectedProduct
            }
            quantity={
              quantity
            }
            setQuantity={
              setQuantity
            }
            onClose={
              closeProduct
            }
            onConfirm={
              confirmProduct
            }
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

      </div>

    </div>
  );
}

/* =========================================================
   MOBILE ONLY
   ========================================================= */

function MobileOnlyScreen() {
  return (
    <div className="jr-mobile-only-screen">

      <div className="jr-mobile-only-card">

        <div className="jr-mobile-only-logo">
          JR
        </div>

        <span className="jr-mobile-only-eyebrow">
          JUICE ROBO
        </span>

        <h1>
          Mobile Only
        </h1>

        <p>
          This website is optimized
          for mobile devices. Please
          access it on your mobile phone.
        </p>

      </div>

    </div>
  );
}

/* =========================================================
   AUTH SCREEN
   ========================================================= */

function AuthScreen({
  mode,
  setMode,
  customer,
  setCustomer,
  onLogin,
  onSignup,
  busy,
  error,
}) {
  const signup =
    mode === "signup";

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  function update(
    field,
    value
  ) {
    setCustomer(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  return (
    <main className="jr-login-screen">

      <div className="jr-login-brand">

        <div className="jr-login-logo">
          JR
        </div>

        <span>
          JUICE ROBO
        </span>

      </div>

      <div className="jr-login-copy">

        <span className="jr-eyebrow">
          {signup
            ? "CREATE YOUR ACCOUNT"
            : "WELCOME BACK"}
        </span>

        <h1>
          {signup ? (
            <>
              Fresh juice,
              <br />
              <em>
                starts here.
              </em>
            </>
          ) : (
            <>
              Welcome
              <br />
              <em>
                back.
              </em>
            </>
          )}
        </h1>

        <p>
          {signup
            ? "Create your Juice Robo account and order fresh juice whenever you want."
            : "Sign in to continue your Juice Robo experience."}
        </p>

      </div>

      <form
        className="jr-auth-form"
        onSubmit={
          signup
            ? onSignup
            : onLogin
        }
      >

        {signup && (
          <label>
            FULL NAME

            <input
              type="text"
              value={
                customer?.name || ""
              }
              onChange={(event) =>
                update(
                  "name",
                  event.target.value
                )
              }
              placeholder="Enter your name"
              autoComplete="name"
              disabled={busy}
            />
          </label>
        )}

        {signup && (
          <label>
            PHONE NUMBER

            <input
              type="tel"
              value={
                customer?.phone || ""
              }
              onChange={(event) =>
                update(
                  "phone",
                  event.target.value
                )
              }
              placeholder="10-digit phone number"
              autoComplete="tel"
              inputMode="numeric"
              disabled={busy}
            />
          </label>
        )}

        {signup && (
          <label>
            EMAIL

            <input
              type="email"
              value={
                customer?.email || ""
              }
              onChange={(event) =>
                update(
                  "email",
                  event.target.value
                )
              }
              placeholder="Enter your email"
              autoComplete="email"
              disabled={busy}
            />
          </label>
        )}

        {!signup && (
          <label>
            EMAIL OR PHONE NUMBER

            <input
              type="text"
              value={
                customer?.loginIdentifier || ""
              }
              onChange={(event) =>
                update(
                  "loginIdentifier",
                  event.target.value
                )
              }
              placeholder="Email or phone number"
              autoComplete="username"
              disabled={busy}
            />
          </label>
        )}

        <label>
          PASSWORD

          <div className="jr-password-field">

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={
                customer?.password || ""
              }
              onChange={(event) =>
                update(
                  "password",
                  event.target.value
                )
              }
              placeholder={
                signup
                  ? "Create a password"
                  : "Enter your password"
              }
              autoComplete={
                signup
                  ? "new-password"
                  : "current-password"
              }
              disabled={busy}
            />

            <button
              className="jr-password-toggle"
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
              disabled={busy}
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword
                ? "◉"
                : "◌"}
            </button>

          </div>
        </label>

        {signup && (
          <label>
            CONFIRM PASSWORD

            <div className="jr-password-field">

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={
                  customer?.confirmPassword || ""
                }
                onChange={(event) =>
                  update(
                    "confirmPassword",
                    event.target.value
                  )
                }
                placeholder="Repeat your password"
                autoComplete="new-password"
                disabled={busy}
              />

              <button
                className="jr-password-toggle"
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
                disabled={busy}
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showConfirmPassword
                  ? "◉"
                  : "◌"}
              </button>

            </div>
          </label>
        )}

        {error && (
          <div className="jr-form-error">
            {error}
          </div>
        )}

        <button
          className="jr-button jr-button-primary jr-full"
          type="submit"
          disabled={busy}
        >
          {busy
            ? "PLEASE WAIT..."
            : signup
            ? "CREATE ACCOUNT"
            : "SIGN IN"}

          {!busy && (
            <span>
              →
            </span>
          )}
        </button>

      </form>

      <div className="jr-auth-switch">

        {signup
          ? "Already have an account?"
          : "New to Juice Robo?"}

        <button
          type="button"
          onClick={() =>
            setMode(
              signup
                ? "login"
                : "signup"
            )
          }
          disabled={busy}
        >
          {signup
            ? "SIGN IN"
            : "CREATE ACCOUNT"}
        </button>

      </div>

      <div className="jr-login-note">
        Your account keeps your
        Juice Robo experience
        personal to you.
      </div>

    </main>
  );
}

/* =========================================================
   HEADER
   ========================================================= */

function Header({
  cartCount,
  location,
  machine,
  user,
  onCart,
  onAccount,
  onLocation,
}) {
  const firstName =
    String(
      user?.name ||
        "there"
    )
      .trim()
      .split(/\s+/)[0];

  return (
    <header className="jr-header">

      <button
        className="jr-header-location"
        type="button"
        onClick={onLocation}
      >

        <span className="jr-header-location-icon">
          ⌖
        </span>

        <span className="jr-header-location-copy">

          <small>
            COLLECT FROM
          </small>

          <strong>
            {location?.name ||
              "Choose location"}
          </strong>

          <em>
            {machine?.name ||
              "Select machine"}
          </em>

        </span>

        <span className="jr-header-chevron">
          ˅
        </span>

      </button>

      <div className="jr-header-actions">

        <button
          className="jr-header-profile"
          type="button"
          onClick={onAccount}
          aria-label="Account"
        >
          {String(
            firstName ||
              "P"
          )
            .charAt(0)
            .toUpperCase()}
        </button>

        <button
          className="jr-header-cart"
          type="button"
          onClick={onCart}
          aria-label="Cart"
        >
          🛒

          {cartCount > 0 && (
            <b>
              {cartCount}
            </b>
          )}

        </button>

      </div>

    </header>
  );
}

/* =========================================================
   MENU SCREEN
   ========================================================= */

function MenuScreen({
  products,
  selectedLocation,
  selectedMachine,
  user,
  onProduct,
}) {
  const firstName =
    String(
      user?.name ||
        "there"
    )
      .trim()
      .split(/\s+/)[0];

  return (
    <main className="jr-content">

      <section className="jr-welcome">

        <div>

          <span className="jr-eyebrow">
            WELCOME BACK,{" "}
            {firstName.toUpperCase()}
          </span>

          <h1>
            Your favourite
            <br />
            <em>
              juice, your way.
            </em>
          </h1>

          <p>
            Pick your juice,
            choose your quantity
            and collect it fresh
            from your Juice Robo
            machine.
          </p>

        </div>

        <div className="jr-welcome-icon">
          🧃
        </div>

      </section>

      <button
        className="jr-selected-machine-banner"
        type="button"
      >

        <span>
          ⌖
        </span>

        <div>

          <small>
            COLLECTING FROM
          </small>

          <strong>
            {selectedLocation?.name ||
              "Choose a location"}
          </strong>

          <small>
            {selectedMachine?.name ||
              "Choose a machine"}
          </small>

        </div>

      </button>

      <section className="jr-menu-section">

        <div className="jr-section-heading">

          <div>

            <span className="jr-eyebrow">
              AVAILABLE JUICES
            </span>

            <h2>
              What are you craving?
            </h2>

          </div>

          <span className="jr-count">
            {products.length}
          </span>

        </div>

        <p className="jr-section-subtitle">
          Choose your favourite
          fresh juice.
        </p>

        <div className="jr-products">

          {products.length ? (
            products.map(
              (product) => (
                <ProductCard
                  key={
                    product.id
                  }
                  product={
                    product
                  }
                  onSelect={
                    onProduct
                  }
                />
              )
            )
          ) : (
            <div className="jr-empty">

              <span>
                🧃
              </span>

              <h3>
                No juices available
              </h3>

              <p>
                Please try again later.
              </p>

            </div>
          )}

        </div>

      </section>

    </main>
  );
}

/* =========================================================
   PRODUCT CARD
   ========================================================= */

function ProductCard({
  product,
  onSelect,
}) {
  const name =
    product.displayName ||
    displayProductName(product);

  const description =
    product.displayDescription ||
    displayDescription(product);

  const image =
    product.image ||
    product.image_url ||
    productImage(product);

  return (
    <button
      className="jr-product-card"
      type="button"
      onClick={() =>
        onSelect(product)
      }
      aria-label={`Select ${name}`}
    >

      {/* ===================================================
          PRODUCT IMAGE
          =================================================== */}

      <div className="jr-product-image-wrap">

        <img
          src={image}
          alt={name}
          className="jr-product-image"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src =
              productImage(product);
          }}
        />

        <span className="jr-fresh-badge">
          ● FRESH
        </span>

      </div>


      {/* ===================================================
          PRODUCT INFORMATION
          =================================================== */}

      <div className="jr-product-info">

        <div>

          <span className="jr-product-type">
            SUGARCANE JUICE
          </span>

          <h3>
            {name}
          </h3>

          <p>
            {description}
          </p>

        </div>


        {/* =================================================
            PRICE + ADD
            ================================================= */}

        <div className="jr-product-footer">

          <strong>
            {money(product.price)}
          </strong>

          <span className="jr-select-circle">
            +
          </span>

        </div>

      </div>

    </button>
  );
} 
/* =========================================================
   MACHINE SCREEN
   ========================================================= */

function MachineScreen({
  locations,
  machines,
  selectedLocationId,
  selectedMachineId,
  onLocation,
  onMachine,
  onContinue,
}) {
  return (
    <main className="jr-content jr-page jr-location-page">

      <span className="jr-eyebrow">
        COLLECTION POINT
      </span>

      <h1 className="jr-page-title">
        Choose your
        <br />
        <em>
          Juice Robo.
        </em>
      </h1>

      <p className="jr-page-description">
        Select where you want
        to collect your juice
        and then choose the
        available machine.
      </p>

      <section className="jr-flow-section">

        <div className="jr-flow-heading">

          <span>
            01
          </span>

          <div>

            <strong>
              SELECT LOCATION
            </strong>

            <small>
              Where will you
              collect your juice?
            </small>

          </div>

        </div>

        <div className="jr-choice-list">

          {locations.map(
            (location) => {

              const id =
                getLocationId(
                  location
                );

              const active =
                String(id) ===
                String(
                  selectedLocationId
                );

              return (
                <button
                  className={
                    active
                      ? "jr-choice active"
                      : "jr-choice"
                  }
                  key={id}
                  type="button"
                  onClick={() =>
                    onLocation(
                      location
                    )
                  }
                >

                  <span className="jr-choice-icon">
                    ⌖
                  </span>

                  <span className="jr-choice-copy">

                    <strong>
                      {location?.name ||
                        "Juice Robo"}
                    </strong>

                    <small>
                      {location?.address ||
                        "Collection point"}
                    </small>

                  </span>

                  <span className="jr-choice-check">
                    {active
                      ? "✓"
                      : ""}
                  </span>

                </button>
              );
            }
          )}

        </div>

      </section>

      <section className="jr-flow-section">

        <div className="jr-flow-heading">

          <span>
            02
          </span>

          <div>

            <strong>
              SELECT MACHINE
            </strong>

            <small>
              Choose your Juice
              Robo machine.
            </small>

          </div>

        </div>

        <div className="jr-machine-list">

          {machines.map(
            (machine) => {

              const id =
                String(
                  machine?.id ||
                    ""
                );

              const active =
                id ===
                String(
                  selectedMachineId
                );

              return (
                <button
                  className={
                    active
                      ? "jr-machine-card active"
                      : "jr-machine-card"
                  }
                  key={id}
                  type="button"
                  onClick={() =>
                    onMachine(
                      machine
                    )
                  }
                >

                  <span className="jr-machine-icon">
                    🧃
                  </span>

                  <span className="jr-machine-copy">

                    <strong>
                      {machine?.name ||
                        "Juice Robo Machine"}
                    </strong>

                    <small>
                      {machine?.status ||
                        "ONLINE"}
                    </small>

                  </span>

                  <span className="jr-machine-status">

                    {active ? (
                      <>
                        <span>
                          ●
                        </span>

                        SELECTED
                      </>
                    ) : (
                      "SELECT"
                    )}

                  </span>

                </button>
              );
            }
          )}

        </div>

      </section>

      <button
        className="jr-button jr-button-primary jr-full"
        type="button"
        disabled={
          !selectedLocationId ||
          !selectedMachineId
        }
        onClick={
          onContinue
        }
      >
        CONTINUE TO MENU

        <span>
          →
        </span>
      </button>

    </main>
  );
}

/* =========================================================
   PRODUCT SHEET
   ========================================================= */

function ProductSheet({
  product,
  quantity,
  setQuantity,
  onClose,
  onConfirm,
}) {
  const name =
    product.displayName ||
    displayProductName(
      product
    );

  const description =
    product.displayDescription ||
    displayDescription(
      product
    );

  const unitPrice =
    Number(
      product?.price ||
        0
    );

  const total =
    unitPrice *
    Number(
      quantity || 1
    );

  return (
    <div
      className="jr-sheet-backdrop"
      onClick={
        onClose
      }
    >

      <section
        className="jr-product-sheet"
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >

        <div className="jr-sheet-image-wrap">

          <img
            src={
              product.image ||
              product.image_url ||
              productImage(
                product
              )
            }
            alt={name}
          />

          <button
            className="jr-sheet-close"
            onClick={
              onClose
            }
            type="button"
            aria-label="Close"
          >
            ×
          </button>

        </div>

        <div className="jr-sheet-body">

          <span className="jr-eyebrow">
            FRESH SUGARCANE JUICE
          </span>

          <h2>
            {name}
          </h2>

          <p>
            {description}
          </p>

          <div className="jr-sheet-price">

            <span>
              Price per juice
            </span>

            <strong>
              {money(
                unitPrice
              )}
            </strong>

          </div>

          <div className="jr-quantity-row">

            <div>

              <span>
                QUANTITY
              </span>

              <small>
                How many would
                you like?
              </small>

            </div>

            <QuantityControl
              value={
                quantity
              }
              onChange={
                setQuantity
              }
            />

          </div>

          <div className="jr-sheet-total">

            <span>
              TOTAL
            </span>

            <strong>
              {money(
                total
              )}
            </strong>

          </div>

          <button
            className="jr-button jr-button-primary jr-full"
            type="button"
            onClick={
              onConfirm
            }
          >
            ADD TO CART

            <span>
              →
            </span>

          </button>

        </div>

      </section>

    </div>
  );
}

/* =========================================================
   QUANTITY CONTROL
   ========================================================= */

function QuantityControl({
  value,
  onChange,
}) {
  const quantity =
    Math.max(
      1,
      Number(
        value || 1
      )
    );

  return (
    <div className="jr-quantity-control">

      <button
        type="button"
        onClick={() =>
          onChange(
            Math.max(
              1,
              quantity - 1
            )
          )
        }
        aria-label="Decrease quantity"
      >
        −
      </button>

      <strong>
        {quantity}
      </strong>

      <button
        type="button"
        onClick={() =>
          onChange(
            quantity + 1
          )
        }
        aria-label="Increase quantity"
      >
        +
      </button>

    </div>
  );
}

/* =========================================================
   CART QUANTITY CONTROL
   ========================================================= */

function CartQuantityControl({
  value,
  onUpdate,
  onRemove,
}) {
  const quantity =
    Math.max(
      1,
      Number(
        value
      ) || 1
    );

  function decrease() {
    if (
      quantity === 1
    ) {
      onRemove();
      return;
    }

    onUpdate(
      quantity - 1
    );
  }

  return (
    <div className="jr-quantity-control">

      <button
        type="button"
        onClick={
          decrease
        }
        aria-label={
          quantity === 1
            ? "Remove item from cart"
            : "Decrease quantity"
        }
      >
        −
      </button>

      <strong>
        {quantity}
      </strong>

      <button
        type="button"
        onClick={() =>
          onUpdate(
            quantity + 1
          )
        }
        aria-label="Increase quantity"
      >
        +
      </button>

    </div>
  );
}
/* =========================================================
   CART SCREEN
   ========================================================= */

function CartScreen({
  cart,
  total,
  location,
  machine,
  onBack,
  onUpdate,
  onRemove,
  onLocation,
  onCheckout,
}) {
  const subtotal =
    Number(total || 0);

  const gstAmount =
    subtotal * 0.12;

  const finalTotal =
    subtotal + gstAmount;

  const itemCount =
    cart.reduce(
      (sum, item) =>
        sum +
        Number(
          item?.quantity || 0
        ),
      0
    );

  return (
    <main className="jr-content jr-page jr-cart-page">

      {/* ===================================================
          TOP LINE
          =================================================== */}

      <div className="jr-cart-topline">

        <button
          className="jr-back-link"
          onClick={
            onBack
          }
          type="button"
        >
          ← Continue shopping
        </button>

        <span className="jr-eyebrow">
          REVIEW ORDER
        </span>

      </div>


      {/* ===================================================
          PAGE TITLE
          =================================================== */}

      <h1 className="jr-page-title">

        Your

        <br />

        <em>
          order.
        </em>

      </h1>


      {/* ===================================================
          EMPTY CART
          =================================================== */}

      {!cart.length ? (

        <div className="jr-empty">

          <span>
            🧃
          </span>

          <h3>
            Your cart is empty
          </h3>

          <p>
            Choose a juice from
            the menu.
          </p>

          <button
            className="jr-button jr-button-primary"
            type="button"
            onClick={
              onBack
            }
          >
            BROWSE JUICES

            <span>
              →
            </span>

          </button>

        </div>

      ) : (

        <>

          {/* =================================================
              CART ITEMS
              ================================================= */}

          <div className="jr-cart-list">

            {cart.map(
              (item) => {

                const itemName =
                  item?.displayName ||
                  displayProductName(
                    item
                  );

                const itemImage =
                  item?.image ||
                  item?.image_url ||
                  productImage(
                    item
                  );

                const itemPrice =
                  Number(
                    item?.price || 0
                  );

                const itemQuantity =
                  Math.max(
                    1,
                    Number(
                      item?.quantity || 1
                    )
                  );

                const itemTotal =
                  itemPrice *
                  itemQuantity;

                return (

                  <section
                    className="jr-cart-item"
                    key={
                      item?.id
                    }
                  >

                    {/* =====================================
                        PRODUCT IMAGE
                        ===================================== */}

                    <div className="jr-cart-item-image">

                      <img
                        src={
                          itemImage
                        }
                        alt={
                          itemName
                        }
                      />

                    </div>


                    {/* =====================================
                        PRODUCT INFORMATION
                        ===================================== */}

                    <div className="jr-cart-item-copy">

                      <strong className="jr-cart-item-name">
                        {itemName}
                      </strong>

                      <span className="jr-cart-item-price">
                        {money(
                          itemPrice
                        )}
                      </span>


                      <CartQuantityControl
                        value={
                          itemQuantity
                        }
                        onUpdate={(
                          nextQuantity
                        ) =>
                          onUpdate(
                            item.id,
                            nextQuantity
                          )
                        }
                        onRemove={() =>
                          onRemove(
                            item.id
                          )
                        }
                      />

                    </div>


                    {/* =====================================
                        ITEM TOTAL + REMOVE
                        ===================================== */}

                    <div className="jr-cart-item-total">

                      <strong>
                        {money(
                          itemTotal
                        )}
                      </strong>

                      <button
                        className="jr-cart-remove"
                        type="button"
                        onClick={() =>
                          onRemove(
                            item.id
                          )
                        }
                        aria-label={
                          `Remove ${itemName}`
                        }
                      >
                        ×
                      </button>

                    </div>

                  </section>

                );

              }
            )}

          </div>


          {/* =================================================
              COLLECTION
              ================================================= */}

          <button
            className="jr-collection-card"
            type="button"
            onClick={
              onLocation
            }
          >

            <span className="jr-collection-icon">
              ⌖
            </span>


            <span className="jr-collection-copy">

              <small>
                COLLECTION
              </small>

              <strong>
                {location?.name ||
                  "Choose location"}
              </strong>

              <small>
                {machine?.name ||
                  "Choose machine"}
              </small>

            </span>


            <b className="jr-collection-arrow">
              →
            </b>

          </button>


          {/* =================================================
              ORDER SUMMARY
              ================================================= */}

          <div className="jr-order-summary">

            {/* ITEMS */}

            <div className="jr-summary-row">

              <span>
                ITEMS
              </span>

              <strong>
                {itemCount}
              </strong>

            </div>


            {/* SUBTOTAL */}

            <div className="jr-summary-row">

              <span>
                SUBTOTAL
              </span>

              <strong>
                {money(
                  subtotal
                )}
              </strong>

            </div>


            {/* GST */}

            <div className="jr-summary-row">

              <span>
                GST (12%)
              </span>

              <strong>
                {money(
                  gstAmount
                )}
              </strong>

            </div>


            {/* FINAL TOTAL */}

            <div className="jr-summary-total">

              <span>
                TOTAL TO PAY
              </span>

              <strong>
                {money(
                  finalTotal
                )}
              </strong>

            </div>

          </div>


          {/* =================================================
              PLACE ORDER
              ================================================= */}

          <button
            className="jr-button jr-button-primary jr-full"
            onClick={
              onCheckout
            }
            type="button"
          >

            PLACE ORDER

            <span>
              →
            </span>

          </button>

        </>

      )}

    </main>
  );
}
/* =========================================================
   PROFILE SCREEN
   ========================================================= */

function ProfileScreen({
  user,
  customer,
  setCustomer,
  orders,
  onSave,
  onLogout,
  onBack,
  busy,
  error,
  onOrders,
}) {
  const name =
    user?.name ||
    user?.firstname ||
    "Juice Lover";

  const firstName =
    String(
      name
    )
      .trim()
      .split(/\s+/)[0];

  const initial =
    String(
      name
    )
      .trim()
      .split(/\s+/)
      .map(
        (part) =>
          part?.[0] || ""
      )
      .join("")
      .slice(
        0,
        2
      )
      .toUpperCase();

  function update(
    field,
    value
  ) {
    setCustomer(
      (current) => ({
        ...current,
        [field]:
          value,
      })
    );
  }

  return (
    <main className="jr-content jr-page jr-profile-page">

      <button
        className="jr-back-link"
        onClick={
          onBack
        }
        type="button"
      >
        ← Back to menu
      </button>

      <span className="jr-eyebrow">
        YOUR ACCOUNT
      </span>

      <h1 className="jr-page-title">

        Hello,

        <br />

        <em>
          {firstName}.
        </em>

      </h1>

      <section className="jr-profile-hero">

        <div className="jr-profile-avatar">
          {initial}
        </div>

        <div>

          <strong>
            {name}
          </strong>

          <small>
            {user?.email ||
              user?.phone ||
              "Juice Robo member"}
          </small>

        </div>

      </section>

      <section className="jr-account-card">

        <div className="jr-account-card-heading">

          <div>

            <span className="jr-eyebrow">
              PROFILE
            </span>

            <strong>
              Your details
            </strong>

          </div>

        </div>

        <form
          className="jr-form"
          onSubmit={
            onSave
          }
        >

          <label>

            FULL NAME

            <input
              type="text"
              value={
                customer?.name ||
                ""
              }
              onChange={(event) =>
                update(
                  "name",
                  event.target.value
                )
              }
            />

          </label>

          <label>

            PHONE NUMBER

            <input
              type="tel"
              value={
                customer?.phone ||
                ""
              }
              onChange={(event) =>
                update(
                  "phone",
                  event.target.value
                )
              }
            />

          </label>

          <label>

            EMAIL

            <input
              type="email"
              value={
                customer?.email ||
                ""
              }
              onChange={(event) =>
                update(
                  "email",
                  event.target.value
                )
              }
            />

          </label>

          {error && (
            <div className="jr-form-error">
              {error}
            </div>
          )}

          <button
            className="jr-button jr-button-primary jr-full"
            type="submit"
            disabled={
              busy
            }
          >

            {busy
              ? "SAVING..."
              : "SAVE PROFILE"}

            {!busy && (
              <span>
                →
              </span>
            )}

          </button>

        </form>

      </section>

      <button
        className="jr-account-action"
        type="button"
        onClick={
          onOrders
        }
      >

        <span>
          ▣
        </span>

        <div>

          <strong>
            My orders
          </strong>

          <small>
            {orders.length} saved order
            {orders.length === 1
              ? ""
              : "s"}
          </small>

        </div>

        <b>
          →
        </b>

      </button>

      <button
        className="jr-account-action jr-account-action-danger"
        type="button"
        onClick={
          onLogout
        }
      >

        <span>
          ↪
        </span>

        <div>

          <strong>
            Sign out
          </strong>

          <small>
            Sign out of this
            Juice Robo account
          </small>

        </div>

        <b>
          →
        </b>

      </button>

    </main>
  );
}

/* =========================================================
   HISTORY SCREEN
   ========================================================= */

function HistoryScreen({
  orders,
  onBack,
  onClear,
}) {
  return (
    <main className="jr-content jr-page">

      <div className="jr-history-header">

        <button
          className="jr-back-link"
          onClick={
            onBack
          }
          type="button"
        >
          ← Account
        </button>

        <div className="jr-history-actions">

          <span className="jr-eyebrow">
            ORDER HISTORY
          </span>

          {orders.length > 0 && (
            <button
              className="jr-clear-orders"
              type="button"
              onClick={
                onClear
              }
              aria-label="Clear order history"
              title="Clear order history"
            >
              🗑
            </button>
          )}

        </div>

      </div>

      <h1 className="jr-page-title">

        My

        <br />

        <em>
          orders.
        </em>

      </h1>

      {!orders.length ? (
        <div className="jr-empty">

          <span>
            🧃
          </span>

          <h3>
            No orders yet
          </h3>

          <p>
            Your completed
            Juice Robo orders
            will appear here.
          </p>

        </div>
      ) : (
        <div className="jr-history-list">

          {orders.map(
            (
              order,
              index
            ) => {

              const orderId =
                order?.order_number ||
                order?.orderId ||
                order?.id ||
                "Juice Robo order";

              const status =
                order?.status ||
                "CONFIRMED";

              const orderTotal =
                order?.total_amount ??
                order?.totalAmount ??
                0;

              const collectionCode =
                order?.collection_code ||
                order?.collectionCode ||
                "";

              return (
                <section
                  className="jr-history-card"
                  key={
                    order?.id ||
                    order?.order_id ||
                    orderId ||
                    index
                  }
                >

                  <div>

                    <small>
                      ORDER
                    </small>

                    <strong>
                      {orderId}
                    </strong>

                  </div>

                  <div>

                    <small>
                      STATUS
                    </small>

                    <strong>
                      {String(
                        status
                      ).replace(
                        /_/g,
                        " "
                      )}
                    </strong>

                  </div>

                  <div>

                    <small>
                      TOTAL
                    </small>

                    <strong>
                      {money(
                        orderTotal
                      )}
                    </strong>

                  </div>

                  {collectionCode && (
                    <div className="jr-history-code">

                      <small>
                        COLLECTION CODE
                      </small>

                      <strong>
                        {String(
                          collectionCode
                        )}
                      </strong>

                    </div>
                  )}

                </section>
              );
            }
          )}

        </div>
      )}

    </main>
  );
}

/* =========================================================
   PAYMENT SCREEN
   ========================================================= */

function PaymentScreen({
  cart,
  total,
  gst,
  finalTotal,
  location,
  machine,
  paymentMethod,
  setPaymentMethod,
  paymentStatus,
  onBack,
  onPay,
}) {
  const isProcessing =
    paymentStatus ===
    "processing";

  const subtotal =
    Number(
      total || 0
    );

  const calculatedGST =
    Number(
      gst ??
        subtotal * 0.12
    );

  const calculatedFinalTotal =
    Number(
      finalTotal ??
        subtotal +
          calculatedGST
    );

  const methods = [
    {
      id: "upi",
      icon: "↗",
      title: "UPI",
      subtitle:
        "Google Pay · PhonePe · Paytm",
    },

    {
      id: "card",
      icon: "▣",
      title: "Cards",
      subtitle:
        "Credit or debit card",
    },

    {
      id: "netbanking",
      icon: "⌂",
      title: "Netbanking",
      subtitle:
        "Pay directly from your bank",
    },

    {
      id: "wallet",
      icon: "◈",
      title: "Wallets",
      subtitle:
        "Available supported wallets",
    },
  ];

  return (
    <main className="jr-content jr-page jr-payment-page">

      <div className="jr-payment-topline">

        <button
          className="jr-back-link"
          onClick={
            onBack
          }
          type="button"
          disabled={
            isProcessing
          }
        >
          ← Review order
        </button>

        <span className="jr-eyebrow">
          PAYMENT
        </span>

      </div>

      <h1 className="jr-page-title">

        Almost

        <br />

        <em>
          there.
        </em>

      </h1>

      <section className="jr-payment-placeholder">

        <div className="jr-payment-icon">
          {isProcessing
            ? "…"
            : "₹"}
        </div>

        <h2>
          {isProcessing
            ? "Processing payment"
            : "Secure payment"}
        </h2>

        <p>
          Choose a payment
          method and complete
          your Juice Robo order.
        </p>

        <div className="jr-payment-methods">

          {methods.map(
            (method) => {

              const active =
                paymentMethod ===
                method.id;

              return (
                <button
                  className={
                    active
                      ? "jr-payment-method active"
                      : "jr-payment-method"
                  }
                  key={
                    method.id
                  }
                  type="button"
                  onClick={() =>
                    setPaymentMethod(
                      method.id
                    )
                  }
                  disabled={
                    isProcessing
                  }
                >

                  <span className="jr-payment-method-icon">
                    {method.icon}
                  </span>

                  <span className="jr-payment-method-copy">

                    <strong>
                      {method.title}
                    </strong>

                    <small>
                      {method.subtitle}
                    </small>

                  </span>

                  {active && (
                    <span className="jr-payment-check">
                      ✓
                    </span>
                  )}

                </button>
              );
            }
          )}

        </div>

        <div className="jr-payment-details">

          <span>

            <small>
              COLLECT FROM
            </small>

            <strong>
              {location?.name ||
                "Selected location"}
            </strong>

          </span>

          <span>

            <small>
              MACHINE
            </small>

            <strong>
              {machine?.name ||
                "Selected machine"}
            </strong>

          </span>

        </div>

        <div className="jr-payment-breakdown">

          <div className="jr-payment-row">

            <span>
              SUBTOTAL
            </span>

            <strong>
              {money(
                subtotal
              )}
            </strong>

          </div>

          <div className="jr-payment-row">

            <span>
              GST (12%)
            </span>

            <strong>
              {money(
                calculatedGST
              )}
            </strong>

          </div>

          <div className="jr-payment-total">

            <span>
              TOTAL TO PAY
            </span>

            <strong>
              {money(
                calculatedFinalTotal
              )}
            </strong>

          </div>

        </div>

        <button
          className="jr-button jr-button-primary jr-full"
          type="button"
          onClick={
            onPay
          }
          disabled={
            !cart.length ||
            isProcessing
          }
        >

          {isProcessing
            ? "PROCESSING PAYMENT..."
            : `PAY ${money(
                calculatedFinalTotal
              )}`}

          {!isProcessing && (
            <span>
              →
            </span>
          )}

        </button>

        <div className="jr-payment-demo-note">

          <strong>
            FRONTEND TEST MODE
          </strong>

          <span>
            This button simulates
            a successful payment
            for UI testing only.
            No real money is charged.
          </span>

        </div>

      </section>

    </main>
  );
}

/* =========================================================
   CONFIRMATION SCREEN
   ========================================================= */

function ConfirmationScreen({
  order,
  location,
  machine,
  onHome,
}) {
  const rawCode =
    order?.collection_code ||
    order?.collectionCode ||
    order?.orderPin ||
    "";

  const code =
    String(
      rawCode
    )
      .replace(
        /\D/g,
        ""
      )
      .slice(
        -4
      )
      .padStart(
        4,
        "0"
      );

  const total =
    Number(
      order?.total_amount ||
        order?.totalAmount ||
        0
    );

  const paymentMethod =
    String(
      order?.payment_method ||
        order?.paymentMethod ||
        "UPI"
    ).toUpperCase();

  return (
    <main className="jr-content jr-page jr-confirmation">

      <div className="jr-success-icon">
        ✓
      </div>

      <span className="jr-eyebrow">
        PAYMENT SUCCESSFUL
      </span>

      <h1 className="jr-page-title">

        Your juice is

        <br />

        <em>
          booked!
        </em>

      </h1>

      <p className="jr-page-description">

        Your payment was completed
        and your order is ready for
        collection.

      </p>

      <section className="jr-code-card">

        <span>
          YOUR COLLECTION CODE
        </span>

        <div className="jr-code-digits">

          {code
            .split("")
            .map(
              (
                digit,
                index
              ) => (
                <span
                  className="jr-code-digit"
                  key={`${digit}-${index}`}
                >
                  {digit}
                </span>
              )
            )}

        </div>

        <small>

          Enter this 4-digit code
          on{" "}

          {machine?.name ||
            "your Juice Robo machine"}

          {" "}
          to begin preparation.

        </small>

      </section>

      <section className="jr-confirmation-card">

        <div>

          <small>
            COLLECT FROM
          </small>

          <strong>
            {location?.name ||
              "Juice Robo"}
          </strong>

          <span>
            {machine?.name ||
              "Selected machine"}
          </span>

        </div>

      </section>

      <section className="jr-confirmation-card">

        <div>

          <small>
            PAYMENT
          </small>

          <strong>
            {money(
              total
            )}
          </strong>

          <span>
            Paid successfully ·{" "}
            {paymentMethod}
          </span>

        </div>

      </section>

      <button
        className="jr-button jr-button-primary jr-full"
        onClick={
          onHome
        }
        type="button"
      >

        ORDER AGAIN

        <span>
          →
        </span>

      </button>

    </main>
  );
}

/* =========================================================
   BOTTOM NAVIGATION
   ========================================================= */

function BottomBar({
  screen,
  cartCount,
  onMenu,
  onMachine,
  onCart,
  onAccount,
}) {
  return (
    <nav className="jr-bottom-bar">

      <button
        className={
          screen === "menu"
            ? "active"
            : ""
        }
        onClick={
          onMenu
        }
        type="button"
        aria-label="Home"
      >

        <span>
          ⌂
        </span>

        <small>
          Home
        </small>

      </button>

      <button
        className={
          screen === "machine"
            ? "active"
            : ""
        }
        onClick={
          onMachine
        }
        type="button"
        aria-label="Machine"
      >

        <span>
          ⌖
        </span>

        <small>
          Machine
        </small>

      </button>

      <button
        className={
          screen === "cart"
            ? "active"
            : ""
        }
        onClick={
          onCart
        }
        type="button"
        aria-label="Order"
      >

        <span className="jr-nav-cart">

          🛒

          {cartCount > 0 && (
            <b>
              {cartCount}
            </b>
          )}

        </span>

        <small>
          Order
        </small>

      </button>

      <button
        className={
          screen === "profile" ||
          screen === "history"
            ? "active"
            : ""
        }
        onClick={
          onAccount
        }
        type="button"
        aria-label="Account"
      >

        <span>
          ●
        </span>

        <small>
          Account
        </small>

      </button>

    </nav>
  );
}

/* =========================================================
   TOAST
   ========================================================= */

function Toast({
  message,
}) {
  if (!message) {
    return null;
  }

  return (
    <div className="jr-toast">

      <span className="jr-toast-check">
        ✓
      </span>

      {message}

    </div>
  );
}

/* =========================================================
   LOADING
   ========================================================= */

function LoadingScreen() {
  return (
    <div className="jr-app">

      <div className="jr-loading">

        <div className="jr-loading-logo">
          JR
        </div>

        <strong>
          JUICE ROBO
        </strong>

        <span>
          Loading fresh picks...
        </span>

        <div className="jr-loader" />

      </div>

    </div>
  );
}

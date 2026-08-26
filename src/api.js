const API_BASE = "http://127.0.0.1:8000/api";

/* =========================================================
   GENERIC API REQUEST
   ========================================================= */

async function request(path, options = {}) {
  const token = localStorage.getItem("juice_robo_token");

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,
        headers,
      }
    );
  } catch (error) {
    console.error(
      `Juice Robo API connection failed: ${API_BASE}${path}`,
      error
    );

    throw new Error(
      "Unable to connect to Juice Robo server. Make sure the backend is running on port 8000."
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  let data;

  try {
    if (
      contentType.includes(
        "application/json"
      )
    ) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  } catch (error) {
    console.error(
      "Failed to read API response:",
      error
    );

    data = null;
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    if (
      data &&
      typeof data === "object"
    ) {
      message =
        data.detail ||
        data.message ||
        data.error ||
        message;
    } else if (
      typeof data === "string" &&
      data.trim()
    ) {
      message = data;
    }

    throw new Error(message);
  }

  return data;
}

/* =========================================================
   JUICE ROBO API
   ========================================================= */

export const api = {
  /* =======================================================
     PRODUCTS
     ======================================================= */

  products: () =>
    request("/products"),

  /* =======================================================
     LOCATIONS
     ======================================================= */

  locations: () =>
    request("/locations"),

  /* =======================================================
     MACHINES
     ======================================================= */

  machines: () =>
    request("/machines"),

  /* =======================================================
     AUTHENTICATION
     ======================================================= */

  register: (payload) =>
    request(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  login: (payload) =>
    request(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  /* =======================================================
     PROFILE
     ======================================================= */

  profile: () =>
    request("/profile"),

  updateProfile: (payload) =>
    request(
      "/profile",
      {
        method: "PUT",
        body: JSON.stringify(payload),
      }
    ),

  /* =======================================================
     ORDERS
     ======================================================= */

  orders: () =>
    request("/orders"),

  order: (id) =>
    request(`/orders/${id}`),

  createOrder: (payload) =>
    request(
      "/orders",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),

  /* =======================================================
     PAYMENT
     ======================================================= */

  /*
   * Creates the Razorpay payment order from the
   * Juice Robo backend.
   *
   * IMPORTANT:
   * The backend calculates the actual amount.
   * The frontend does NOT send an amount here.
   */

  createPaymentOrder: (orderId) =>
    request(
      "/payments/create-order",
      {
        method: "POST",
        body: JSON.stringify({
          order_id: Number(orderId),
        }),
      }
    ),

  /*
   * Verifies the Razorpay payment on the backend.
   *
   * The backend verifies the Razorpay signature
   * using the Razorpay secret key.
   */

  verifyPayment: ({
    orderId,
    razorpayPaymentId,
    razorpayOrderId,
    razorpaySignature,
  }) =>
    request(
      "/payments/verify",
      {
        method: "POST",
        body: JSON.stringify({
          order_id: Number(orderId),
          razorpay_payment_id:
            razorpayPaymentId,
          razorpay_order_id:
            razorpayOrderId,
          razorpay_signature:
            razorpaySignature,
        }),
      }
    ),
};
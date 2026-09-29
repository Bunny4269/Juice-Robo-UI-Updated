/**
 * Shared Authenticated HTTP Client
 * Securely uses Vite environment variables without exposing string literal secrets.
 */

const API_BASE = String(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_JR_API_BASE ||
    "https://tptest.juicerobo.com/tporder/api"
).replace(/\/+$/, "");

const ORDER_API_BASE = String(
  import.meta.env.VITE_ORDER_API_BASE_URL ||
    import.meta.env.VITE_JR_ORDER_API_BASE ||
    "https://tptest.juicerobo.com/tpordermaster/api"
).replace(/\/+$/, "");

export function getApiBaseUrl() {
  return API_BASE;
}

export function getOrderApiBaseUrl() {
  return ORDER_API_BASE;
}

export function getAuthHeaders(options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  const apiKey = import.meta.env.VITE_JR_API_KEY;
  const apiSecret = import.meta.env.VITE_JR_API_KEY_SECRET;

  if (apiKey) headers["JR-API-KEY"] = apiKey;
  if (apiSecret) headers["JR-API-KEY-SECRET"] = apiSecret;

  if (options.body !== undefined && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  return headers;
}

export async function request(path, options = {}, baseUrl = API_BASE) {
  const cleanBase = String(baseUrl).replace(/\/+$/, "");
  const cleanPath = String(path).startsWith("/") ? String(path) : `/${path}`;
  const url = `${cleanBase}${cleanPath}`;
  const headers = getAuthHeaders(options);

  const fetchOptions = {
    ...options,
    headers,
  };
  delete fetchOptions.token;

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    throw new Error(
      "Unable to connect to the server. Please check your internet connection."
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

  if (!response.ok) {
    const errorMsg =
      (data && typeof data === "object" && (data.message || data.error || data.detail)) ||
      `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

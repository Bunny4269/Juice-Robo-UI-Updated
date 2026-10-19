/**
 * Dynamic Outlet Configuration & Resolution for Juice Robo & HCK
 *
 * Strict Requirement:
 * NO outlet IDs, machine IDs, outlet names, or outlet-specific mappings
 * must be hardcoded for HCK in the frontend.
 *
 * All HCK outlets and machines are resolved dynamically via:
 * 1. Manually entered/edited URL (e.g. /order_now/hck/outlet/{outletId}/machine/{machineId}/)
 * 2. Scanned QR code containing a URL, JSON, query params, or outlet UUID.
 */

export const BASE_PATH = "/order_now";

export function buildMenuItemsUrl(menuLocationId) {
  const id = String(menuLocationId || "").trim();
  return id ? `${BASE_PATH}/menu-items/${encodeURIComponent(id)}` : `${BASE_PATH}/`;
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return UUID_REGEX.test(String(value || "").trim());
}

export const OUTLET_CONFIG = Object.freeze({
  jr: {
    id: "jr",
    name: "Juice Robo",
    menuLocationId: "f9eef7a2-bbf5-4a98-a1ce-ceb69b171996",
    outletId: "jr",
    outletApiUrl: null,
    itemsApiUrl:
      "https://tptest.juicerobo.com/tporder/api/v1/itemmaster/items/f9eef7a2-bbf5-4a98-a1ce-ceb69b171996",
  },
  hck: {
    id: "hck",
    name: "HCK Helmet Cleaning",
    // Strictly NO hardcoded outletId or menuLocationId!
    // Outlets and machines are resolved dynamically from URL or QR code.
  },
});

export const OUTLET_ID_TO_KEY = Object.freeze({
  jr: "jr",
});

/**
 * Resolves an outlet segment, key, or UUID to a known system category ("jr", "hck").
 * Arbitrary UUIDs default to "hck" for dynamic resolution.
 */
export function resolveOutletKey(segment = "") {
  const raw = String(segment || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();

  if (
    lower === "jr" ||
    lower === "juicerobo" ||
    lower === "juice-robo" ||
    lower === "juice robo"
  ) {
    return "jr";
  }

  if (
    lower === "hck" ||
    lower === "helmet" ||
    lower === "helmet cleaning kiosk" ||
    lower === "helmet-cleaning-kiosk"
  ) {
    return "hck";
  }

  // Check JR menu UUID
  if (
    OUTLET_CONFIG.jr.menuLocationId &&
    OUTLET_CONFIG.jr.menuLocationId.toLowerCase() === lower
  ) {
    return "jr";
  }

  // Any other UUID represents an HCK dynamic outlet
  if (isUuid(raw)) {
    return "hck";
  }

  return "";
}

/**
 * Parses any incoming URL pathname into normalized route segments.
 * Supports:
 * - /order_now/hck/outlet/{outletId}/
 * - /order_now/hck/outlet/{outletId}/machine/{machineId}/
 * - /order_now/hck/outlet/{outletId}/{screen}/
 * - /order_now/hck/outlet/{outletId}/machine/{machineId}/{screen}/
 * - /order_now/hck/{outletId}/...
 * - /order_now/{outletUuid}/...
 * - /order_now/jr/...
 * - /order_now/ or /order_now/scan/
 */
export function parseOutletUrl(pathname = "") {
  let sub = String(pathname || "")
    .replace(/\/+/g, "/")
    .trim();

  if (sub.startsWith(BASE_PATH)) {
    sub = sub.slice(BASE_PATH.length);
  }
  sub = sub.replace(/^\/+|\/+$/g, "");

  if (!sub || sub === "scan") {
    return {
      outlet: null,
      isHck: false,
      outletId: "",
      machineId: "",
      screen: "scan",
      param: "",
      isMenuItemCode: false,
    };
  }

  const segments = sub.split("/").filter(Boolean);
  const first = (segments[0] || "").trim().toLowerCase();

  // Legacy-compatible local route: /order_now/menu-items/{menuLocationId}
  // The menu location UUID determines the brand via the existing resolver.
  if (first === "menu-items" && segments[1]) {
    let menuLocationId = segments[1].trim();
    try {
      menuLocationId = decodeURIComponent(menuLocationId);
    } catch {
      // Keep the original segment if URI decoding fails.
    }
    const outletKey = resolveOutletKey(menuLocationId);
    if (!outletKey) {
      return {
        outlet: null,
        isHck: false,
        outletId: "",
        machineId: "",
        screen: "scan",
        param: "",
        isMenuItemCode: false,
      };
    }
    return {
      outlet: outletKey,
      isHck: outletKey === "hck",
      outletId: menuLocationId,
      machineId: "",
      screen: "menu",
      param: menuLocationId,
      isMenuItemCode: true,
    };
  }

  const ROOT_SCREENS = new Set([
    "scan",
    "login",
    "location",
    "cart",
    "profile",
    "history",
    "orders",
    "my_orders",
  ]);

  if (ROOT_SCREENS.has(first)) {
    return {
      outlet: null,
      isHck: false,
      outletId: "",
      machineId: "",
      screen: first === "my_orders" || first === "orders" ? "history" : first,
      param: "",
      isMenuItemCode: false,
    };
  }

  let isHck = false;
  let outletId = "";
  let machineId = "";
  let subRouteSegments = [];

  if (first === "hck") {
    isHck = true;
    const rest = segments.slice(1);
    if (!rest.length) {
      return {
        outlet: "hck",
        isHck: true,
        outletId: "",
        machineId: "",
        screen: "scan",
        param: "",
        isMenuItemCode: false,
      };
    }

    let cursor = 0;
    if (rest[cursor]?.toLowerCase() === "outlet") {
      cursor += 1;
      outletId = rest[cursor] || "";
      cursor += 1;
    } else {
      outletId = rest[cursor] || "";
      cursor += 1;
    }

    if (rest[cursor]?.toLowerCase() === "machine") {
      cursor += 1;
      machineId = rest[cursor] || "";
      cursor += 1;
    }

    subRouteSegments = rest.slice(cursor);
  } else if (first === "jr" || first === "juicerobo") {
    isHck = false;
    outletId = "jr";
    let cursor = 1;
    if (segments[cursor]?.toLowerCase() === "machine") {
      cursor += 1;
      machineId = segments[cursor] || "";
      cursor += 1;
    }
    subRouteSegments = segments.slice(cursor);
  } else if (isUuid(segments[0])) {
    // Direct UUID segment: /order_now/{outletUuid}/...
    isHck = true;
    outletId = segments[0];
    let cursor = 1;
    if (segments[cursor]?.toLowerCase() === "machine") {
      cursor += 1;
      machineId = segments[cursor] || "";
      cursor += 1;
    }
    subRouteSegments = segments.slice(cursor);
  } else {
    // Unrecognized route prefix
    return {
      outlet: null,
      isHck: false,
      outletId: "",
      machineId: "",
      screen: "scan",
      param: "",
      isMenuItemCode: false,
    };
  }

  // Parse screen from remaining segments
  const subRoute = subRouteSegments.join("/");
  let screen = "menu";
  let param = "";
  let isMenuItemCode = false;

  if (!subRoute || subRoute === "menu" || subRoute === "home") {
    screen = "menu";
  } else if (subRoute === "cart") {
    screen = "cart";
  } else if (subRoute === "profile") {
    screen = "profile";
  } else if (
    subRoute === "my_orders" ||
    subRoute === "history" ||
    subRoute === "orders"
  ) {
    screen = "history";
  } else if (subRoute.startsWith("menu-items/")) {
    screen = "menu";
    param = subRoute.slice("menu-items/".length).trim();
    isMenuItemCode = true;
  } else if (subRoute.startsWith("menu/")) {
    screen = "product";
    param = subRoute.slice("menu/".length).trim();
  } else if (subRoute === "location") {
    screen = "location";
  } else if (
    subRoute === "location-confirmation" ||
    subRoute === "confirmation" ||
    subRoute === "checkout"
  ) {
    screen = "location-confirmation";
  } else if (subRoute === "upi-payment" || subRoute === "payment") {
    screen = "upi-payment";
  } else if (subRoute === "payment-success") {
    screen = "payment-success";
  } else if (subRoute === "payment-failure") {
    screen = "payment-failure";
  } else if (subRoute === "login") {
    screen = "login";
  } else {
    screen = "menu";
  }

  return {
    outlet: outletId || (isHck ? "hck" : "jr"),
    isHck,
    outletId,
    machineId,
    screen,
    param,
    isMenuItemCode,
  };
}

/**
 * Builds the canonical URL for an HCK outlet and optional machine.
 */
export function buildHckUrl(
  outletId = "",
  machineId = "",
  screenName = "menu",
  param = ""
) {
  const cleanOutletId = String(outletId || "").trim();
  const cleanMachineId = String(machineId || "").trim();

  let sub = "menu";
  switch (screenName) {
    case "menu":
    case "home":
      sub = "menu";
      break;
    case "cart":
      sub = "cart";
      break;
    case "profile":
      sub = "profile";
      break;
    case "history":
      sub = "my_orders";
      break;
    case "product":
      sub = param ? `menu/${encodeURIComponent(param)}` : "menu";
      break;
    case "location-confirmation":
    case "confirmation":
      sub = "location-confirmation";
      break;
    case "upi-payment":
      sub = "upi-payment";
      break;
    case "payment-success":
      sub = "payment-success";
      break;
    case "payment-failure":
      sub = "payment-failure";
      break;
    case "login":
      sub = "login";
      break;
    default:
      sub = "menu";
  }

  const machinePart = cleanMachineId
    ? `machine/${encodeURIComponent(cleanMachineId)}/`
    : "";
  return `${BASE_PATH}/hck/outlet/${encodeURIComponent(cleanOutletId)}/${machinePart}${sub}/`;
}

/**
 * Resolves a scanned QR value (URL, JSON, UUID, or key) to its canonical
 * outlet and machine identifiers and returns the target navigation URL.
 * Strictly NO hardcoded outlet IDs or machine IDs.
 */
export function resolveScannedOutlet(rawValue = "") {
  if (!rawValue) return null;

  // Handle object payload directly
  if (typeof rawValue === "object") {
    const rawOutletId =
      rawValue?.outletId ||
      rawValue?.outlet_id ||
      rawValue?.outlet ||
      rawValue?.orgId ||
      rawValue?.id ||
      rawValue?.key ||
      "";
    const rawMachineId =
      rawValue?.machineId ||
      rawValue?.machine_id ||
      rawValue?.locId ||
      rawValue?.locationId ||
      rawValue?.storeId ||
      "";
    const isJr =
      resolveOutletKey(rawOutletId) === "jr" ||
      String(rawValue?.key).toLowerCase() === "jr";

    if (isJr) {
      return {
        outletId: "jr",
        machineId: rawMachineId,
        isHck: false,
        key: "jr",
        name: "Juice Robo",
        targetUrl: buildMenuItemsUrl(OUTLET_CONFIG.jr.menuLocationId),
      };
    }

    if (rawOutletId) {
      const cleanOutlet = String(rawOutletId).trim();
      const cleanMachine = String(rawMachineId).trim();
      return {
        outletId: cleanOutlet,
        machineId: cleanMachine,
        isHck: true,
        key: "hck",
        name: "HCK Helmet Cleaning",
        targetUrl: buildMenuItemsUrl(cleanOutlet),
      };
    }
    return null;
  }

  const value = String(rawValue || "").trim();
  if (!value) return null;

  // 1. Check if payload is a JSON string
  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      const parsed = JSON.parse(value);
      return resolveScannedOutlet(parsed);
    } catch {}
  }

  // 2. Check if payload is a complete URL
  try {
    const parsedUrl = new URL(value);
    const pathname = parsedUrl.pathname || "";

    // 2a. Parse using parseOutletUrl
    const parsed = parseOutletUrl(pathname);
    if (parsed.outletId) {
      const machineParam =
        parsedUrl.searchParams.get("machineId") ||
        parsedUrl.searchParams.get("machine_id") ||
        parsedUrl.searchParams.get("locId");
      const machine = parsed.machineId || machineParam || "";
      return {
        outletId: parsed.outletId,
        machineId: machine,
        isHck: parsed.isHck,
        key: parsed.isHck ? "hck" : "jr",
        name: parsed.isHck ? "HCK Helmet Cleaning" : "Juice Robo",
        targetUrl: buildMenuItemsUrl(parsed.isHck ? parsed.outletId : (parsed.param || OUTLET_CONFIG.jr.menuLocationId)),
      };
    }

    // 2b. Check API URL format: /getoutlets/<outletId>
    const apiMatch = pathname.match(/\/getoutlets\/([^/?#]+)/i);
    if (apiMatch?.[1]) {
      const outId = decodeURIComponent(apiMatch[1]).trim();
      return {
        outletId: outId,
        machineId: "",
        isHck: true,
        key: "hck",
        name: "HCK Helmet Cleaning",
        targetUrl: buildMenuItemsUrl(outId),
      };
    }

    // 2c. Check search params
    const queryOutletId =
      parsedUrl.searchParams.get("outletId") ||
      parsedUrl.searchParams.get("outlet_id") ||
      parsedUrl.searchParams.get("outlet");
    const queryMachineId =
      parsedUrl.searchParams.get("machineId") ||
      parsedUrl.searchParams.get("machine_id") ||
      parsedUrl.searchParams.get("locId");

    if (queryOutletId) {
      const cleanOut = queryOutletId.trim();
      const cleanMach = (queryMachineId || "").trim();
      const isJr = cleanOut.toLowerCase() === "jr";
      return {
        outletId: cleanOut,
        machineId: cleanMach,
        isHck: !isJr,
        key: isJr ? "jr" : "hck",
        name: isJr ? "Juice Robo" : "HCK Helmet Cleaning",
        targetUrl: isJr
          ? buildMenuItemsUrl(OUTLET_CONFIG.jr.menuLocationId)
          : buildMenuItemsUrl(cleanOut),
      };
    }
  } catch {
    // Not a full URL, continue to path and identifier checks
  }

  // 3. Relative path check (e.g. /order_now/hck/outlet/...)
  if (value.includes("order_now")) {
    const parsed = parseOutletUrl(value);
    if (parsed.outletId) {
      return {
        outletId: parsed.outletId,
        machineId: parsed.machineId,
        isHck: parsed.isHck,
        key: parsed.isHck ? "hck" : "jr",
        name: parsed.isHck ? "HCK Helmet Cleaning" : "Juice Robo",
        targetUrl: buildMenuItemsUrl(parsed.isHck ? parsed.outletId : (parsed.param || OUTLET_CONFIG.jr.menuLocationId)),
      };
    }
  }

  // 4. Raw UUID check (treat as HCK outlet identifier)
  if (isUuid(value)) {
    return {
      outletId: value,
      machineId: "",
      isHck: true,
      key: "hck",
      name: "HCK Helmet Cleaning",
      targetUrl: buildMenuItemsUrl(value),
    };
  }

  // 5. Short key check
  const lower = value.toLowerCase();
  if (lower === "jr" || lower === "juicerobo") {
    return {
      outletId: "jr",
      machineId: "",
      isHck: false,
      key: "jr",
      name: "Juice Robo",
      targetUrl: buildMenuItemsUrl(OUTLET_CONFIG.jr.menuLocationId),
    };
  }
  if (lower === "hck") {
    return {
      outletId: "hck",
      machineId: "",
      isHck: true,
      key: "hck",
      name: "HCK Helmet Cleaning",
      targetUrl: `${BASE_PATH}/scan`,
    };
  }

  return null;
}

export function getCanonicalOutletUuid(outletOrKey = "") {
  const raw = String(outletOrKey || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "jr") return "jr";
  return raw;
}

export function isValidOutlet(outletOrKey = "") {
  return Boolean(resolveOutletKey(outletOrKey));
}

export function getOutletConfig(outletOrKey = "") {
  const key = resolveOutletKey(outletOrKey);
  return key ? OUTLET_CONFIG[key] : null;
}

/*
 * JUICE ROBO — PROFILE UTILITIES
 *
 * Helper functions for profile information extraction, formatting,
 * name derivation, and validation.
 */

export function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

export function isGenericName(value) {
  const normalized = clean(value).toLowerCase();
  return (
    !normalized ||
    normalized === "juice lover" ||
    normalized === "guest user" ||
    normalized === "guest" ||
    normalized === "member"
  );
}

export function nameFromEmail(email) {
  const normalizedEmail = clean(email).toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return "";
  }

  const localPart = normalizedEmail
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!localPart) {
    return "";
  }

  return localPart
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getEmail(user, customer, profileData) {
  const candidates = [
    profileData?.email,
    profileData?.userEmail,
    user?.email,
    user?.userEmail,
    customer?.email,
    customer?.userEmail,
    user?.loginIdentifier,
    customer?.loginIdentifier,
    user?.userName,
    user?.username,
    customer?.userName,
    customer?.username,
  ];

  // Prioritize candidates that contain "@"
  const validEmail = candidates.map(clean).find((c) => c && c.includes("@"));
  if (validEmail) {
    return validEmail;
  }

  return (
    clean(profileData?.email) ||
    clean(user?.email) ||
    clean(customer?.email) ||
    ""
  );
}

export function getDisplayName(user, customer, email, profileData) {
  const backendName =
    clean(profileData?.name) ||
    clean(profileData?.fullName) ||
    [clean(profileData?.firstName), clean(profileData?.lastName)]
      .filter(Boolean)
      .join(" ") ||
    clean(user?.name) ||
    clean(user?.fullName) ||
    [clean(user?.firstName), clean(user?.lastName)]
      .filter(Boolean)
      .join(" ") ||
    clean(user?.firstname) ||
    clean(customer?.fullName) ||
    clean(customer?.name);

  if (backendName && !isGenericName(backendName)) {
    return backendName;
  }

  const derived = nameFromEmail(email);
  if (derived) {
    return derived;
  }

  return !isGenericName(backendName) ? backendName : "";
}

export function getPhone(user, customer, profileData) {
  const candidates = [
    profileData?.phone,
    profileData?.mobile,
    user?.phone,
    user?.mobile,
    customer?.phone,
    customer?.mobile,
  ];

  const candidate = candidates.map(clean).find(Boolean) || "";
  if (candidate && !candidate.includes("@")) {
    return candidate;
  }
  return "";
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/*
 * Performance timing safety guard.
 * Prevents "Cannot read properties of undefined (reading 'startTime')"
 * when React 19 image bandwidth estimator (estimateBandwidth) or browser DevTools
 * soft-navigation heuristics iterates over performance entries.
 */
if (
  typeof window !== "undefined" &&
  window.performance &&
  typeof window.performance.getEntriesByType === "function"
) {
  const origGetEntriesByType = window.performance.getEntriesByType.bind(
    window.performance
  );
  window.performance.getEntriesByType = function (type) {
    try {
      const entries = origGetEntriesByType(type);
      if (!Array.isArray(entries)) return entries;
      return entries.filter(
        (entry) => Boolean(entry && typeof entry.startTime === "number")
      );
    } catch {
      return [];
    }
  };
}

if (
  typeof window !== "undefined" &&
  window.performance &&
  typeof window.performance.getEntries === "function"
) {
  const origGetEntries = window.performance.getEntries.bind(
    window.performance
  );
  window.performance.getEntries = function () {
    try {
      const entries = origGetEntries();
      if (!Array.isArray(entries)) return entries;
      return entries.filter(
        (entry) => Boolean(entry && typeof entry.startTime === "number")
      );
    } catch {
      return [];
    }
  };
}

if (
  typeof window !== "undefined" &&
  typeof window.PerformanceObserverEntryList !== "undefined" &&
  window.PerformanceObserverEntryList.prototype
) {
  const proto = window.PerformanceObserverEntryList.prototype;
  const origGetEntries = proto.getEntries;
  if (typeof origGetEntries === "function") {
    proto.getEntries = function (...args) {
      try {
        const entries = origGetEntries.apply(this, args);
        return Array.isArray(entries)
          ? entries.filter(
              (entry) => Boolean(entry && typeof entry.startTime === "number")
            )
          : entries;
      } catch {
        return [];
      }
    };
  }
  const origGetByType = proto.getEntriesByType;
  if (typeof origGetByType === "function") {
    proto.getEntriesByType = function (...args) {
      try {
        const entries = origGetByType.apply(this, args);
        return Array.isArray(entries)
          ? entries.filter(
              (entry) => Boolean(entry && typeof entry.startTime === "number")
            )
          : entries;
      } catch {
        return [];
      }
    };
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Juice Robo root element (#root) was not found.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

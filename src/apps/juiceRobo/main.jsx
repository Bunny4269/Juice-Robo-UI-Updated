import React from "react";
import ReactDOM from "react-dom/client";
import JuiceRoboApp from "./JuiceRoboApp.jsx";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Juice Robo root element (#root) was not found.");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <JuiceRoboApp />
  </React.StrictMode>
);

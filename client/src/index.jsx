// client/src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import { initObservability } from "./observability";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import axios from "axios";

// Automatically attach session token to all axios requests
axios.interceptors.request.use(
  (config) => {
    const token = window.localStorage.getItem("certificate-studio-session");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

initObservability();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

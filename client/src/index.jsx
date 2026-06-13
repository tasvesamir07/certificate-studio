// client/src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./i18n";
import { initObservability } from "./observability";

initObservability();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

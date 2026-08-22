import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

const AdminApp = lazy(() => import("./AdminApp.jsx").then((module) => ({ default: module.AdminApp })));
const RootApp = location.pathname.startsWith("/admin") ? AdminApp : App;
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<div className="loading-screen"><span className="spinner" />OneShowTools</div>}>
      <RootApp />
    </Suspense>
  </React.StrictMode>,
);

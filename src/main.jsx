import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { LegalPage, resolveLegalDocument } from "./LegalPage.jsx";
import "./styles.css";

const AdminApp = lazy(() => import("./AdminApp.jsx").then((module) => ({ default: module.AdminApp })));
const legalDocument = resolveLegalDocument(location.pathname);
const RootApp = location.pathname.startsWith("/admin") ? AdminApp : App;
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<div className="loading-screen"><span className="spinner" />OneShowTools</div>}>
      {legalDocument ? <LegalPage type={legalDocument} /> : <RootApp />}
    </Suspense>
  </React.StrictMode>,
);

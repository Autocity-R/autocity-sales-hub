
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import TestContract from "./pages/TestContract.tsx";
import { DigitalSignaturePage } from "./components/contracts/DigitalSignaturePage.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/test-contract" element={<TestContract />} />
        <Route path="/contract/sign/:token" element={<DigitalSignaturePage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

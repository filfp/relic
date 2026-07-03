import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { App } from "./App";
import { Dashboard } from "./pages/Dashboard";
import { SpecPage } from "./pages/SpecPage";
import { FixPage } from "./pages/FixPage";
import { Docs } from "./pages/Docs";
import "./theme.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "spec/:id", element: <SpecPage /> },
      { path: "fix/:id", element: <FixPage /> },
      { path: "docs", element: <Docs /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

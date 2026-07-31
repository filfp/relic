import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { App } from "./App";
import { ArtifactPage } from "./pages/ArtifactPage";
import { Catalog } from "./pages/Catalog";
import { Components } from "./pages/Components";
import { DocumentPage } from "./pages/DocumentPage";
import { Maintenance } from "./pages/Maintenance";
import "./theme.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Catalog /> },
      { path: "document/*", element: <DocumentPage /> },
      { path: "artifact/*", element: <ArtifactPage /> },
      { path: "maintenance", element: <Maintenance /> },
      { path: "components", element: <Components /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

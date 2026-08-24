import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { pathFromRoute, projectFromLocation } from "./api";
import { ArtifactPage } from "./pages/ArtifactPage";
import { Catalog } from "./pages/Catalog";
import { Components } from "./pages/Components";
import { DocumentPage } from "./pages/DocumentPage";
import { Maintenance } from "./pages/Maintenance";
import "./theme.css";

const pathname = window.location.pathname;
const documentPath = pathFromRoute(pathname, "/document/");
const artifactPath = pathFromRoute(pathname, "/artifact/");
const project = projectFromLocation(window.location.search);

let page;
if (pathname === "/") page = <Catalog />;
else if (documentPath) page = <DocumentPage path={documentPath} project={project} />;
else if (artifactPath) page = <ArtifactPage path={artifactPath} project={project} />;
else if (pathname === "/maintenance") page = <Maintenance />;
else if (pathname === "/components") page = <Components />;
else {
  window.history.replaceState(null, "", "/");
  page = <Catalog />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App currentPath={window.location.pathname}>{page}</App>
  </StrictMode>
);

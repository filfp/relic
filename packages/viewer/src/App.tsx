import { useEffect, useState, type ReactNode } from "react";

export function App({
  currentPath,
  children,
}: {
  currentPath: string;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem("relic-theme") ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("relic-theme", theme);
  }, [theme]);

  return (
    <>
      <header className="rl-header">
        <a href="/" className="brand">relic</a>
        <span className="title">Knowledge frontier</span>
        <nav>
          <a href="/" className={`rl-btn${currentPath === "/" ? " active" : ""}`}>
            catalog
          </a>
          <a href="/maintenance" className={`rl-btn${currentPath === "/maintenance" ? " active" : ""}`}>
            maintenance
          </a>
          <a href="/components" className={`rl-btn${currentPath === "/components" ? " active" : ""}`}>
            components
          </a>
        </nav>
        <button
          className="rl-btn"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Toggle theme"
        >
          {theme === "dark" ? "☀" : "🌙"}
        </button>
      </header>
      <main className="rl-main">
        {children}
      </main>
    </>
  );
}

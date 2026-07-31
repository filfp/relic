import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

export function App() {
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
        <Link to="/" className="brand">relic</Link>
        <span className="title">Knowledge frontier</span>
        <nav>
          <NavLink to="/" end className={({ isActive }) => `rl-btn${isActive ? " active" : ""}`}>
            catalog
          </NavLink>
          <NavLink to="/maintenance" className={({ isActive }) => `rl-btn${isActive ? " active" : ""}`}>
            maintenance
          </NavLink>
          <NavLink to="/components" className={({ isActive }) => `rl-btn${isActive ? " active" : ""}`}>
            components
          </NavLink>
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
        <Outlet />
      </main>
    </>
  );
}

import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

export function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("relic-theme") ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("relic-theme", theme);
  }, [theme]);

  return (
    <>
      <header className="rl-header">
        <Link to="/" className="brand">relic</Link>
        <span className="title">Spec Viewer</span>
        <nav>
          <NavLink to="/" end className={({ isActive }) => `rl-btn${isActive ? " active" : ""}`}>specs</NavLink>
          <NavLink to="/docs" className={({ isActive }) => `rl-btn${isActive ? " active" : ""}`}>docs</NavLink>
        </nav>
        <button className="rl-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme">
          {theme === "dark" ? "☀" : "🌙"}
        </button>
      </header>
      <main className="rl-main">
        <Outlet />
      </main>
    </>
  );
}

import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";
import "./Layout.css";

function Layout() {
  return (
    <div className="layout">
      <header className="app-header">
        <span className="app-header-logo" aria-hidden="true">
          RWR
        </span>
        <div className="app-header-text">
          <span className="app-header-title">RWR</span>
          <span className="app-header-sub">Run Walk Random</span>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

export default Layout;

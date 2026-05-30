import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";
import "./Layout.css";

function Layout() {
  return (
    <div className="device-shell">
      <div className="layout">
        <main className="layout-main">
          <Outlet />
        </main>
        <TabBar />
      </div>
    </div>
  );
}

export default Layout;

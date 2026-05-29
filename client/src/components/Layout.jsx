import { Outlet } from "react-router-dom";
import TabBar from "./TabBar";
import "./Layout.css";

function Layout() {
  return (
    <div className="layout">
      <main className="layout-main">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}

export default Layout;

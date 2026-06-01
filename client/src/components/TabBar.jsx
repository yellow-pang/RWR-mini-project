import { NavLink } from "react-router-dom";
import Icon from "./Icon";
import "./TabBar.css";

const items = [
  { to: "/", label: "홈", icon: "home", end: true },
  { to: "/favorites", label: "즐겨찾기", icon: "heart" },
  { to: "/history", label: "이력", icon: "history" },
];

function TabBar() {
  return (
    <nav className="tab-bar" aria-label="하단 탭 메뉴">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `tab-item${isActive ? " active" : ""}`}
        >
          <Icon name={item.icon} size={25} />
          <span className="tab-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default TabBar;

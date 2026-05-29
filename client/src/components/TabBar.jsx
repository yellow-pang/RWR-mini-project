import { NavLink } from 'react-router-dom'
import './TabBar.css'

function TabBar() {
  return (
    <nav className="tab-bar" aria-label="하단 탭 메뉴">
      <NavLink
        to="/"
        end
        className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
      >
        <span className="tab-icon" aria-hidden="true">🏠</span>
        <span className="tab-label">홈</span>
      </NavLink>

      <NavLink
        to="/favorites"
        className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
      >
        <span className="tab-icon" aria-hidden="true">⭐</span>
        <span className="tab-label">즐겨찾기</span>
      </NavLink>

      <NavLink
        to="/history"
        className={({ isActive }) => `tab-item${isActive ? ' active' : ''}`}
      >
        <span className="tab-icon" aria-hidden="true">🕐</span>
        <span className="tab-label">최근</span>
      </NavLink>
    </nav>
  )
}

export default TabBar

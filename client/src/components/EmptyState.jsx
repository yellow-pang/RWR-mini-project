import { useNavigate } from "react-router-dom";

/**
 * EmptyState — 빈 목록 상태 공용 컴포넌트
 * @param {string} icon - 이모지 아이콘
 * @param {string} title - 제목 텍스트
 * @param {string} description - 보조 설명
 * @param {string} [linkLabel] - 링크 버튼 텍스트
 * @param {string} [linkTo] - 링크 버튼 이동 경로
 */
function EmptyState({ icon, title, description, linkLabel, linkTo }) {
  const navigate = useNavigate();

  return (
    <div className="empty-state">
      {icon && <span className="empty-state-icon">{icon}</span>}
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-desc">{description}</p>
      {linkLabel && linkTo && (
        <button
          className="btn-primary empty-state-btn"
          onClick={() => navigate(linkTo)}
        >
          {linkLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;

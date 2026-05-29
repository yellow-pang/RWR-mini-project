import { useNavigate } from "react-router-dom";

function EmptyState({ title, description, linkLabel, linkTo }) {
  const navigate = useNavigate();

  return (
    <div className="empty-state">
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

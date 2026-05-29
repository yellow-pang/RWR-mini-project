import { useNavigate } from "react-router-dom";
import "./CourseCard.css";

function CourseCard({ course, isFavorite, onFavoriteToggle, showDate, date }) {
  const navigate = useNavigate();

  function handleDetail() {
    navigate(`/courses/${course.id}`, { state: { course } });
  }

  return (
    <div className="course-card">
      <div className="course-card-header">
        <h2 className="course-title">{course.title}</h2>
        <button
          className={`favorite-btn${isFavorite ? " active" : ""}`}
          onClick={onFavoriteToggle}
          aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          {isFavorite ? "저장됨" : "저장"}
        </button>
      </div>

      <div className="course-meta">
        <span className="course-badge">{course.distance}km</span>
        <span className="course-badge">{course.time}분</span>
        <span className="course-badge">{course.type}</span>
        {course.mood && (
          <span className="course-badge mood">{course.mood}</span>
        )}
      </div>

      {showDate && date && <p className="history-date">{date}</p>}

      <p className="course-description">{course.description}</p>

      <div className="course-reason-box">
        <span className="course-reason-label">추천 이유</span>
        <p className="course-reason-text">{course.reason}</p>
      </div>

      <button className="btn-detail" onClick={handleDetail}>
        상세 보기
      </button>
    </div>
  );
}

export default CourseCard;

import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useCourse, MOCK_COURSE } from "../context/CourseContext";
import CourseInfo from "../components/CourseInfo";

function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCourse } = useCourse();

  // location.state → context → 목 데이터 순으로 폴백
  const course = location.state?.course ?? currentCourse ?? MOCK_COURSE;

  const [isFavorite, setIsFavorite] = useState(false);

  function handleFavoriteToggle() {
    // Step 05에서 API 연결
    setIsFavorite((prev) => !prev);
  }

  return (
    <div className="page detail-page">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← 뒤로
        </button>
        <button
          className={`favorite-btn${isFavorite ? " active" : ""}`}
          onClick={handleFavoriteToggle}
          aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          {isFavorite ? "♥" : "♡"}
        </button>
      </div>

      <div className="detail-title-area">
        <h1 className="page-title">{course.title}</h1>
        <div className="course-meta detail-meta">
          <span className="course-badge">{course.distance}km</span>
          <span className="course-badge">{course.time}분</span>
          <span className="course-badge">{course.type}</span>
          {course.mood && (
            <span className="course-badge mood">{course.mood}</span>
          )}
        </div>
      </div>

      <CourseInfo course={course} />
    </div>
  );
}

export default DetailPage;

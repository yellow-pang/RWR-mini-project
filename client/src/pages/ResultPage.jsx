import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCourse, MOCK_COURSE } from "../context/CourseContext";
import CourseCard from "../components/CourseCard";

function ResultPage() {
  const navigate = useNavigate();
  const { conditions, currentCourse, setCurrentCourse } = useCourse();

  // Use mock data until Step 05 connects the Express API.
  const course = currentCourse ?? MOCK_COURSE;

  const [isFavorite, setIsFavorite] = useState(false);

  function handleFavoriteToggle() {
    // Step 05 will persist this through the favorites API.
    setIsFavorite((prev) => !prev);
  }

  function handleRecommendAgain() {
    // Step 05 will request another course with the same conditions.
    setCurrentCourse(MOCK_COURSE);
  }

  return (
    <div className="page result-page">
      <div className="result-header">
        <button className="btn-back" onClick={() => navigate("/")}>
          조건 변경
        </button>
        <h1 className="page-title">추천 코스</h1>
        {conditions.distance && (
          <div className="condition-badges">
            <span className="condition-badge">{conditions.distance}km</span>
            <span className="condition-badge">{conditions.time}분</span>
            <span className="condition-badge">{conditions.type}</span>
          </div>
        )}
      </div>

      <CourseCard
        course={course}
        isFavorite={isFavorite}
        onFavoriteToggle={handleFavoriteToggle}
      />

      <button
        className="btn-primary btn-recommend-again"
        onClick={handleRecommendAgain}
      >
        다시 추천
      </button>
    </div>
  );
}

export default ResultPage;

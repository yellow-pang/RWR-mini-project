import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCourse, MOCK_COURSE } from "../context/CourseContext";
import CourseCard from "../components/CourseCard";

function ResultPage() {
  const navigate = useNavigate();
  const { conditions, currentCourse, setCurrentCourse } = useCourse();

  // 결과 화면에 진입했을 때 코스가 없으면 목 데이터 사용
  const course = currentCourse ?? MOCK_COURSE;

  const [isFavorite, setIsFavorite] = useState(false);

  function handleFavoriteToggle() {
    // Step 05에서 API 연결
    setIsFavorite((prev) => !prev);
  }

  function handleRecommendAgain() {
    // Step 05에서 실제 API 연결 — 현재는 동일 목 데이터 유지
    setCurrentCourse(MOCK_COURSE);
  }

  return (
    <div className="page result-page">
      <div className="result-header">
        <button className="btn-back" onClick={() => navigate("/")}>
          ← 조건 변경
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
        🔄 다시 추천
      </button>
    </div>
  );
}

export default ResultPage;

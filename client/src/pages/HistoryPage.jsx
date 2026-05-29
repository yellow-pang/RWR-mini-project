import { useState } from "react";
import EmptyState from "../components/EmptyState";
import CourseCard from "../components/CourseCard";

// Step 05에서 API 연결 — 현재는 빈 배열로 EmptyState 확인
const MOCK_HISTORY = [];

function HistoryPage() {
  const [history] = useState(MOCK_HISTORY);
  const [favorites, setFavorites] = useState([]);

  function handleFavoriteToggle(courseId) {
    // Step 05에서 API 연결
    setFavorites((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  }

  return (
    <div className="page history-page">
      <h1 className="page-title">최근 추천</h1>

      {history.length === 0 ? (
        <EmptyState
          icon="🏃"
          title="추천 이력이 없어요"
          description="코스를 추천받으면 여기에 기록됩니다"
          linkLabel="코스 추천받기"
          linkTo="/"
        />
      ) : (
        <div className="card-list">
          {history.map((item) => (
            <CourseCard
              key={item.id}
              course={item}
              isFavorite={favorites.includes(item.id)}
              onFavoriteToggle={() => handleFavoriteToggle(item.id)}
              showDate
              date={item.recommendedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryPage;

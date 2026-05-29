import { useState } from "react";
import EmptyState from "../components/EmptyState";
import CourseCard from "../components/CourseCard";

// Step 05 will replace this empty list with GET /api/history.
const MOCK_HISTORY = [];

function HistoryPage() {
  const [history] = useState(MOCK_HISTORY);
  const [favorites, setFavorites] = useState([]);

  function handleFavoriteToggle(courseId) {
    // Step 05 will persist this through the favorites API.
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
          title="추천 이력이 없습니다"
          description="코스를 추천받으면 최근 10개의 기록이 이곳에 표시됩니다."
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

import { useState } from "react";
import EmptyState from "../components/EmptyState";
import CourseCard from "../components/CourseCard";

// Step 05에서 API 연결 — 현재는 빈 배열로 EmptyState 확인
const MOCK_FAVORITES = [];

function FavoritesPage() {
  const [favorites, setFavorites] = useState(MOCK_FAVORITES);

  function handleFavoriteToggle(courseId) {
    // Step 05에서 API 연결
    setFavorites((prev) => prev.filter((f) => f.id !== courseId));
  }

  return (
    <div className="page favorites-page">
      <h1 className="page-title">즐겨찾기</h1>

      {favorites.length === 0 ? (
        <EmptyState
          icon="♡"
          title="저장된 즐겨찾기가 없어요"
          description="마음에 드는 코스를 저장해 보세요"
          linkLabel="코스 추천받기"
          linkTo="/"
        />
      ) : (
        <div className="card-list">
          {favorites.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isFavorite
              onFavoriteToggle={() => handleFavoriteToggle(course.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FavoritesPage;

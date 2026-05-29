import { useState } from "react";
import EmptyState from "../components/EmptyState";
import CourseCard from "../components/CourseCard";

// Step 05 will replace this empty list with GET /api/favorites.
const MOCK_FAVORITES = [];

function FavoritesPage() {
  const [favorites, setFavorites] = useState(MOCK_FAVORITES);

  function handleFavoriteToggle(courseId) {
    // Step 05 will persist deletion through the favorites API.
    setFavorites((prev) => prev.filter((f) => f.id !== courseId));
  }

  return (
    <div className="page favorites-page">
      <h1 className="page-title">즐겨찾기</h1>

      {favorites.length === 0 ? (
        <EmptyState
          title="저장된 즐겨찾기가 없습니다"
          description="마음에 드는 코스를 저장하면 이곳에서 다시 확인할 수 있습니다."
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

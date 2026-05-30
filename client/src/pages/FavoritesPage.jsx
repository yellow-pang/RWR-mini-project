import { useEffect, useState } from "react";
import { getFriendlyErrorMessage } from "../api/client";
import { fetchFavorites, removeFavorite } from "../api/favorites";
import CourseCard from "../components/CourseCard";
import EmptyState from "../components/EmptyState";
import Icon from "../components/Icon";
import { getUserId } from "../utils/userId";

function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadFavorites() {
      try {
        setIsLoading(true);
        setMessage("");
        const response = await fetchFavorites(getUserId());
        setFavorites(response.data);
      } catch (err) {
        setMessage(
          getFriendlyErrorMessage(
            err,
            "즐겨찾기 목록을 불러오지 못했습니다.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadFavorites();
  }, []);

  async function handleFavoriteRemove(courseId) {
    try {
      setMessage("");
      await removeFavorite(getUserId(), courseId);
      setFavorites((prev) => prev.filter((item) => item.courseId !== courseId));
    } catch (err) {
      setMessage(
        getFriendlyErrorMessage(err, "즐겨찾기를 삭제하지 못했습니다."),
      );
    }
  }

  return (
    <div className="page favorites-page">
      <header className="page-header">
        <span className="header-icon-button" aria-hidden="true">
          <Icon name="menu" size={28} />
        </span>
        <h1 className="page-header-title">즐겨찾기</h1>
        <span className="header-icon-button" aria-hidden="true">
          <Icon name="star" size={25} />
        </span>
      </header>

      {message && <p className="form-error">{message}</p>}
      {isLoading ? (
        <p className="page-desc">즐겨찾기 목록을 불러오는 중입니다...</p>
      ) : favorites.length === 0 ? (
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
              key={course.courseId}
              course={course}
              isFavorite
              onFavoriteToggle={() => handleFavoriteRemove(course.courseId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FavoritesPage;

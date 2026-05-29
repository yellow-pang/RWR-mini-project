import { useEffect, useState } from "react";
import { addFavorite, fetchFavorites, removeFavorite } from "../api/favorites";
import { fetchHistory } from "../api/history";
import EmptyState from "../components/EmptyState";
import CourseCard from "../components/CourseCard";
import { getUserId } from "../utils/userId";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoading(true);
        setMessage("");
        const userId = getUserId();
        const [historyResponse, favoritesResponse] = await Promise.all([
          fetchHistory(userId),
          fetchFavorites(userId).catch(() => ({ data: [] })),
        ]);
        setHistory(historyResponse.data);
        setFavoriteIds(favoritesResponse.data.map((item) => item.courseId));
      } catch (err) {
        setMessage(err.message || "최근 추천 이력을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, []);

  async function handleFavoriteToggle(courseId) {
    try {
      setMessage("");
      const userId = getUserId();
      if (favoriteIds.includes(courseId)) {
        await removeFavorite(userId, courseId);
        setFavoriteIds((prev) => prev.filter((id) => id !== courseId));
      } else {
        await addFavorite(userId, courseId);
        setFavoriteIds((prev) => [...prev, courseId]);
      }
    } catch (err) {
      setMessage(err.message || "즐겨찾기 상태를 변경하지 못했습니다.");
    }
  }

  return (
    <div className="page history-page">
      <h1 className="page-title">최근 추천</h1>

      {message && <p className="form-error">{message}</p>}
      {isLoading ? (
        <p className="page-desc">최근 추천 이력을 불러오는 중입니다...</p>
      ) : history.length === 0 ? (
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
              isFavorite={favoriteIds.includes(item.courseId)}
              onFavoriteToggle={() => handleFavoriteToggle(item.courseId)}
              showDate
              date={formatDate(item.recommendedAt)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryPage;

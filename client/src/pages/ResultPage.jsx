import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRandomCourse } from "../api/courses";
import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from "../api/favorites";
import { addHistory } from "../api/history";
import { useCourse } from "../context/CourseContext";
import { getTypeLabel } from "../utils/courseDisplay";
import { getUserId } from "../utils/userId";
import CourseCard from "../components/CourseCard";

function ResultPage() {
  const navigate = useNavigate();
  const { conditions, currentCourse, setCurrentCourse } = useCourse();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const course = currentCourse;

  useEffect(() => {
    if (!course) return;

    async function loadFavoriteState() {
      try {
        const response = await fetchFavorites(getUserId());
        setIsFavorite(
          response.data.some((item) => item.courseId === course.id),
        );
      } catch {
        setIsFavorite(false);
      }
    }

    loadFavoriteState();
  }, [course]);

  async function handleFavoriteToggle() {
    if (!course) return;

    try {
      setMessage("");
      const userId = getUserId();
      if (isFavorite) {
        await removeFavorite(userId, course.id);
        setIsFavorite(false);
      } else {
        await addFavorite(userId, course.id);
        setIsFavorite(true);
      }
    } catch (err) {
      setMessage(err.message || "즐겨찾기 상태를 변경하지 못했습니다.");
    }
  }

  async function handleRecommendAgain() {
    if (!conditions.distance || isLoading) return;

    try {
      setIsLoading(true);
      setMessage("");
      const userId = getUserId();
      const response = await fetchRandomCourse({
        ...conditions,
        exclude: course?.id,
      });
      setCurrentCourse(response.data);
      await addHistory(userId, response.data.id).catch(() => null);
    } catch (err) {
      setMessage(err.message || "다시 추천할 코스를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!course) {
    return (
      <div className="page result-page">
        <h1 className="page-title">추천 코스</h1>
        <p className="page-desc">아직 추천된 코스가 없습니다.</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          코스 추천받기
        </button>
      </div>
    );
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
            <span className="condition-badge">
              {getTypeLabel(conditions.type)}
            </span>
          </div>
        )}
      </div>

      {message && <p className="form-error">{message}</p>}

      <CourseCard
        course={course}
        isFavorite={isFavorite}
        onFavoriteToggle={handleFavoriteToggle}
      />

      <button
        className="btn-primary btn-recommend-again"
        disabled={isLoading}
        onClick={handleRecommendAgain}
      >
        {isLoading ? "추천 중..." : "다시 추천"}
      </button>
    </div>
  );
}

export default ResultPage;

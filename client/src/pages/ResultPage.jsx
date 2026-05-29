import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { fetchRandomCourse } from "../api/courses";
import CourseCard from "../components/CourseCard";
import { useCourse } from "../hooks/useCourse";
import { useFavoriteStatus } from "../hooks/useFavoriteStatus";
import { getTypeLabel } from "../utils/courseDisplay";
import {
  HISTORY_SAVE_FAILED_MESSAGE,
  saveHistoryQuietly,
} from "../utils/history";

function ResultPage() {
  const navigate = useNavigate();
  const { conditions, currentCourse, setCurrentCourse } = useCourse();
  const [isLoading, setIsLoading] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");

  const course = currentCourse;
  const favorite = useFavoriteStatus(course?.id);

  async function handleRecommendAgain() {
    if (!conditions.distance || isLoading) return;

    try {
      setIsLoading(true);
      setRetryMessage("");
      setHistoryNotice("");
      const response = await fetchRandomCourse({
        ...conditions,
        exclude: course?.id,
      });
      setCurrentCourse(response.data);

      const historySaved = await saveHistoryQuietly(response.data.id);
      if (!historySaved) {
        setHistoryNotice(HISTORY_SAVE_FAILED_MESSAGE);
      }
    } catch (err) {
      setRetryMessage(
        getFriendlyErrorMessage(
          err,
          "다시 추천할 코스를 불러오지 못했습니다.",
        ),
      );
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

      {retryMessage && <p className="form-error">{retryMessage}</p>}
      {favorite.message && <p className="form-error">{favorite.message}</p>}
      {historyNotice && <p className="form-notice">{historyNotice}</p>}
      {favorite.noticeMessage && (
        <p className="form-notice">{favorite.noticeMessage}</p>
      )}

      <CourseCard
        course={course}
        isFavorite={favorite.isFavorite}
        onFavoriteToggle={favorite.toggleFavorite}
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

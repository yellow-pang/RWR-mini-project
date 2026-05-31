import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { fetchRandomCourse } from "../api/courses";
import { createRoundTripRoute } from "../api/routes";
import CourseCard from "../components/CourseCard";
import Icon from "../components/Icon";
import {
  GPS_FALLBACK_NOTICE,
  GPS_PERMISSION_FALLBACK_NOTICE,
  GPS_ROUTE_NOTICE,
  RECOMMENDATION_MODES,
} from "../constants/recommendationModes";
import { useCourse } from "../hooks/useCourse";
import { useFavoriteStatus } from "../hooks/useFavoriteStatus";
import { getTypeLabel } from "../utils/courseDisplay";
import { getCurrentPosition } from "../utils/geolocation";
import {
  HISTORY_SAVE_FAILED_MESSAGE,
  saveHistoryQuietly,
} from "../utils/history";

function ResultPage() {
  const navigate = useNavigate();
  const {
    conditions,
    currentCourse,
    setCurrentCourse,
    recommendationMode,
    recommendationMeta,
    setRecommendationMeta,
  } = useCourse();
  const [isLoading, setIsLoading] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");

  const course = currentCourse;
  const isGeneratedRoute = course?.source === "ors";
  const favorite = useFavoriteStatus(isGeneratedRoute ? null : course?.id);

  async function handleRecommendAgain() {
    if (!conditions.distance || isLoading) return;

    try {
      setIsLoading(true);
      setRetryMessage("");
      setHistoryNotice("");

      let response;

      if (recommendationMode === RECOMMENDATION_MODES.GPS_ROUTE) {
        try {
          const position = await getCurrentPosition();
          response = await createRoundTripRoute({
            ...conditions,
            latitude: position.latitude,
            longitude: position.longitude,
            seed: Date.now(),
          });
          setRecommendationMeta({
            mode: RECOMMENDATION_MODES.GPS_ROUTE,
            usedFallback: false,
            notice: GPS_ROUTE_NOTICE,
          });
        } catch (gpsError) {
          response = await fetchRandomCourse({
            ...conditions,
            exclude: isGeneratedRoute ? undefined : course?.id,
          });
          setRecommendationMeta({
            mode: RECOMMENDATION_MODES.GPS_ROUTE,
            usedFallback: true,
            notice:
              gpsError?.name === "GeolocationError"
                ? GPS_PERMISSION_FALLBACK_NOTICE
                : GPS_FALLBACK_NOTICE,
          });
        }
      } else {
        response = await fetchRandomCourse({
          ...conditions,
          exclude: course?.id,
        });
      }

      setCurrentCourse(response.data);

      const historySaved =
        response.data.source === "ors" ||
        (await saveHistoryQuietly(response.data.id));
      if (!historySaved && response.data.source !== "ors") {
        setHistoryNotice(HISTORY_SAVE_FAILED_MESSAGE);
      }
    } catch (err) {
      setRetryMessage(
        getFriendlyErrorMessage(err, "다시 추천할 코스를 불러오지 못했습니다."),
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (!course) {
    return (
      <div className="page result-page">
        <header className="page-header">
          <button className="btn-back" onClick={() => navigate("/")}>
            <Icon name="back" size={30} />
            뒤로
          </button>
          <h1 className="page-header-title">오늘의 코스 추천</h1>
          <span />
        </header>
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
        <header className="page-header">
          <button className="btn-back" onClick={() => navigate("/")}>
            <Icon name="back" size={30} />
            조건 변경
          </button>
          <h1 className="page-header-title">오늘의 코스 추천</h1>
          <span />
        </header>
        {conditions.distance && (
          <div className="condition-badges">
            <span className="condition-badge">
              <Icon name="pin" size={24} className="icon-green" />
              {conditions.distance}km
            </span>
            <span className="condition-badge">
              <Icon name="clock" size={24} className="icon-green" />
              {conditions.time}분
            </span>
            <span className="condition-badge">
              <Icon name="runner" size={24} className="icon-green" />
              {getTypeLabel(conditions.type)}
            </span>
          </div>
        )}
      </div>

      {retryMessage && <p className="form-error">{retryMessage}</p>}
      {favorite.message && <p className="form-error">{favorite.message}</p>}
      {recommendationMeta?.notice && (
        <p className="form-notice">{recommendationMeta.notice}</p>
      )}
      {historyNotice && <p className="form-notice">{historyNotice}</p>}
      {favorite.noticeMessage && (
        <p className="form-notice">{favorite.noticeMessage}</p>
      )}

      <CourseCard
        course={course}
        isFavorite={favorite.isFavorite}
        onFavoriteToggle={
          isGeneratedRoute ? undefined : favorite.toggleFavorite
        }
        featured
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

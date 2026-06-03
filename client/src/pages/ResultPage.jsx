import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import {
  createAddressPointToPointRoute,
  createAddressRoundTripRoute,
} from "../api/routes";
import CourseCard from "../components/CourseCard";
import Icon from "../components/Icon";
import MapView from "../components/MapView";
import { ROUTE_MODES } from "../constants/recommendationModes";
import { TARGET_MODES } from "../constants/courseOptions";
import { useCourse } from "../hooks/useCourse";
import { useFavoriteStatus } from "../hooks/useFavoriteStatus";
import {
  calculateEstimatedMinutes,
  calculateTargetDistanceKm,
  formatDistanceKm,
  getTypeIconName,
  getTypeLabel,
} from "../utils/courseDisplay";
import {
  HISTORY_SAVE_FAILED_MESSAGE,
  saveHistoryQuietly,
} from "../utils/history";

function createRouteSeed() {
  return Date.now();
}

function ResultPage() {
  const navigate = useNavigate();
  const {
    routeMode,
    conditions,
    currentCourse,
    setCurrentCourse,
    routeLocation,
    destinationLocation,
    detourLevel,
    routeTheme,
    poiPreferences,
    recommendationMeta,
    setRecommendationMeta,
  } = useCourse();
  const [isLoading, setIsLoading] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");
  const [historyNotice, setHistoryNotice] = useState("");

  const course = currentCourse;
  const isGeneratedRoute = course?.source === "ors";
  const isPointToPoint = routeMode === ROUTE_MODES.POINT_TO_POINT;
  const targetMode = conditions.targetMode || TARGET_MODES.DISTANCE;
  const isDistanceTarget = targetMode === TARGET_MODES.DISTANCE;
  const targetDistanceKm =
    isDistanceTarget || !conditions.time || !conditions.type
      ? conditions.distance
      : calculateTargetDistanceKm(conditions.time, conditions.type);
  const estimatedMinutes =
    targetDistanceKm && conditions.type
      ? calculateEstimatedMinutes(targetDistanceKm, conditions.type)
      : null;
  const favorite = useFavoriteStatus(isGeneratedRoute ? null : course?.id);

  function buildRouteRequestPayload(seed) {
    return {
      distance: targetDistanceKm,
      time: estimatedMinutes,
      type: conditions.type,
      targetMode,
      targetDistanceKm,
      targetMinutes: isDistanceTarget ? null : conditions.time,
      estimatedMinutes,
      detourLevel,
      routeTheme,
      poiPreferences,
      seed,
    };
  }

  async function handleRecommendAgain() {
    if (!targetDistanceKm || isLoading) return;

    try {
      setIsLoading(true);
      setRetryMessage("");
      setHistoryNotice("");

      const seed = createRouteSeed();
      const routeRequestPayload = buildRouteRequestPayload(seed);
      const response = isPointToPoint
        ? await createAddressPointToPointRoute({
            ...routeRequestPayload,
            startAddress: routeLocation.address,
            startLatitude: routeLocation.latitude,
            startLongitude: routeLocation.longitude,
            endAddress: destinationLocation.address,
            endLatitude: destinationLocation.latitude,
            endLongitude: destinationLocation.longitude,
            seed,
          })
        : await createAddressRoundTripRoute({
            ...routeRequestPayload,
            address: routeLocation.address,
            latitude: routeLocation.latitude,
            longitude: routeLocation.longitude,
            exclude: isGeneratedRoute ? undefined : course?.id,
          });

      setCurrentCourse(response.data);
      setRecommendationMeta(response.meta || null);

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
        {targetDistanceKm && (
          <div className="condition-badges">
            <span className="condition-badge">
              <Icon
                name={isDistanceTarget ? "pin" : "clock"}
                size={24}
                className="icon-green"
              />
              {isDistanceTarget
                ? `목표 ${formatDistanceKm(targetDistanceKm)}`
                : `목표 ${conditions.time}분`}
            </span>
            <span className="condition-badge">
              <Icon
                name={isDistanceTarget ? "clock" : "pin"}
                size={24}
                className="icon-green"
              />
              {isDistanceTarget
                ? `예상 ${estimatedMinutes}분`
                : `예상 ${formatDistanceKm(targetDistanceKm)}`}
            </span>
            <span className="condition-badge">
              <Icon
                name={getTypeIconName(conditions.type)}
                size={24}
                className="icon-green"
              />
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

      <section className="result-map-section" aria-label="추천 코스 지도">
        <MapView
          lat={course.start_lat}
          lng={course.start_lng}
          routeCoordinates={course.geometry?.coordinates}
          routeMode={course.routeMode}
          title={course.title}
        />
      </section>

      <CourseCard
        course={course}
        isFavorite={favorite.isFavorite}
        onFavoriteToggle={
          isGeneratedRoute ? undefined : favorite.toggleFavorite
        }
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

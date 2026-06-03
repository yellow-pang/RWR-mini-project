import { useNavigate } from "react-router-dom";
import {
  formatDistanceKm,
  formatMinutes,
  formatSignedDistanceKm,
  getMoodLabel,
  getTypeLabel,
} from "../utils/courseDisplay";
import Icon from "./Icon";
import MapView from "./MapView";
import "./CourseCard.css";

function CourseCard({
  course,
  isFavorite,
  onFavoriteToggle,
  showDate,
  date,
  featured = false,
}) {
  const navigate = useNavigate();
  const courseId = course.courseId || course.id;
  const isGeneratedRoute = course.source === "ors";
  const hasFavoriteAction = Boolean(onFavoriteToggle && !isGeneratedRoute);
  const targetSummary = course.targetSummary;
  const poiSummary = course.poiSummary;
  const poiPreferenceLabel = poiSummary?.preferenceLabels?.length
    ? poiSummary.preferenceLabels.join(", ")
    : poiSummary?.themeLabel;

  function handleDetail() {
    navigate(`/courses/${courseId}`, { state: { course } });
  }

  return (
    <div className={`course-card${featured ? " featured" : ""}`}>
      {featured && (
        <MapView
          compact
          lat={course.start_lat}
          lng={course.start_lng}
          routeCoordinates={course.geometry?.coordinates}
          routeMode={course.routeMode}
          title={course.title}
        />
      )}

      <div className="course-card-header">
        <h2 className="course-title">{course.title}</h2>
      </div>

      <div className="course-meta">
        <span className="course-badge">{course.distance}km</span>
        <span className="course-meta-dot" />
        <span className="course-badge">{course.time}분</span>
        <span className="course-meta-dot" />
        <span className="course-badge type">{getTypeLabel(course.type)}</span>
        {course.mood && (
          <span className="course-badge mood">{getMoodLabel(course.mood)}</span>
        )}
        {isGeneratedRoute && (
          <span className="course-badge mood">
            {course.routeMode === "pointToPoint" ? "출발-도착" : "주소 생성"}
          </span>
        )}
      </div>

      {showDate && date && <p className="history-date">{date}</p>}

      {course.description && (
        <p className="course-description">{course.description}</p>
      )}

      {targetSummary && (
        <div className="course-target-box">
          <div className="course-target-row">
            <span>목표 거리</span>
            <strong>{formatDistanceKm(targetSummary.targetDistanceKm)}</strong>
          </div>
          {targetSummary.targetMinutes && (
            <div className="course-target-row">
              <span>목표 시간</span>
              <strong>{targetSummary.targetMinutes}분</strong>
            </div>
          )}
          <div className="course-target-row">
            <span>실제 추천 거리</span>
            <strong>{formatDistanceKm(targetSummary.actualDistanceKm)}</strong>
          </div>
          <div className="course-target-row">
            <span>예상 시간</span>
            <strong>{formatMinutes(targetSummary.actualMinutes)}</strong>
          </div>
          <div className="course-target-row">
            <span>목표와의 차이</span>
            <strong>
              {formatSignedDistanceKm(targetSummary.distanceDeltaKm)}
            </strong>
          </div>
        </div>
      )}

      {course.reason && (
        <div className="course-reason-box">
          <span className="course-reason-label">
            <Icon name="star" size={22} filled />
            추천 이유
          </span>
          <p className="course-reason-text">{course.reason}</p>
        </div>
      )}

      {poiSummary && (
        <div className="course-reason-box poi-reason-box">
          <span className="course-reason-label">
            <Icon name="info" size={22} />
            코스 분위기
          </span>
          <p className="course-reason-text">
            {poiSummary.usedPoi && poiSummary.poiNames?.length
              ? `${poiPreferenceLabel} 분위기에 맞춰 ${poiSummary.poiNames
                  .slice(0, 2)
                  .join(", ")} 근처를 지나는 후보를 참고했습니다.`
              : poiSummary.fallbackReason ||
                "주변 장소 후보가 부족해 기존 랜덤 경유지 방식으로 추천했습니다."}
          </p>
        </div>
      )}

      <div className={`course-actions${hasFavoriteAction ? "" : " single"}`}>
        <button className="btn-detail" onClick={handleDetail}>
          상세 보기
        </button>
        {hasFavoriteAction && (
          <button
            className={`favorite-btn${isFavorite ? " active" : ""}`}
            onClick={onFavoriteToggle}
            aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          >
            <Icon name="heart" size={25} filled={isFavorite} />
            저장
          </button>
        )}
      </div>
    </div>
  );
}

export default CourseCard;

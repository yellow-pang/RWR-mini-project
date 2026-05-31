import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { fetchCourseById } from "../api/courses";
import CourseInfo from "../components/CourseInfo";
import Icon from "../components/Icon";
import MapView from "../components/MapView";
import { useCourse } from "../hooks/useCourse";
import { useFavoriteStatus } from "../hooks/useFavoriteStatus";
import { getMoodLabel, getTypeLabel } from "../utils/courseDisplay";

function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCourse, setCurrentCourse } = useCourse();
  const [course, setCourse] = useState(
    location.state?.course?.description ? location.state.course : currentCourse,
  );
  const [isLoading, setIsLoading] = useState(!course);
  const [message, setMessage] = useState("");
  const isGeneratedRoute = course?.source === "ors";
  const favorite = useFavoriteStatus(isGeneratedRoute ? null : id);

  useEffect(() => {
    async function loadCourse() {
      try {
        setIsLoading(true);
        setMessage("");
        const response = await fetchCourseById(id);
        setCourse(response.data);
        setCurrentCourse(response.data);
      } catch (err) {
        setMessage(
          getFriendlyErrorMessage(err, "코스 상세 정보를 불러오지 못했습니다."),
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (!course?.description) {
      loadCourse();
    }
  }, [course?.description, id, setCurrentCourse]);

  if (isLoading) {
    return (
      <div className="page detail-page">
        <p className="page-desc">코스 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page detail-page">
        <p className="form-error">{message || "코스를 찾을 수 없습니다."}</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          코스 추천받기
        </button>
      </div>
    );
  }

  return (
    <div className="page detail-page">
      <header className="page-header detail-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <Icon name="back" size={30} />
          뒤로
        </button>
        <h1 className="page-header-title">코스 상세</h1>
        {isGeneratedRoute ? (
          <span />
        ) : (
          <button
            className={`header-icon-button detail-heart${favorite.isFavorite ? " active" : ""}`}
            onClick={favorite.toggleFavorite}
            aria-label={favorite.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
          >
            <Icon name="heart" size={29} filled={favorite.isFavorite} />
          </button>
        )}
      </header>

      {message && <p className="form-error">{message}</p>}
      {favorite.message && <p className="form-error">{favorite.message}</p>}
      {favorite.noticeMessage && (
        <p className="form-notice">{favorite.noticeMessage}</p>
      )}

      <MapView
        lat={course.start_lat}
        lng={course.start_lng}
        routeCoordinates={course.geometry?.coordinates}
        title={course.title}
      />

      <section className="detail-title-area">
        <h1 className="page-title">{course.title}</h1>
        <div className="course-meta detail-meta">
          <span className="detail-pill">
            <Icon name="pin" size={20} className="icon-green" />
            {course.distance}km
          </span>
          <span className="detail-pill">
            <Icon name="clock" size={20} className="icon-green" />
            {course.time}분
          </span>
          <span className="detail-pill">
            <Icon name="runner" size={20} className="icon-green" />
            {getTypeLabel(course.type)}
          </span>
          {course.mood && (
            <span className="detail-pill">{getMoodLabel(course.mood)}</span>
          )}
        </div>
      </section>

      <CourseInfo course={course} />

      <button
        className="btn-primary detail-recommend-btn"
        onClick={() => navigate("/")}
      >
        다른 코스 추천받기
      </button>
    </div>
  );
}

export default DetailPage;

import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { fetchCourseById } from "../api/courses";
import CourseInfo from "../components/CourseInfo";
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
  const favorite = useFavoriteStatus(id);

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
          getFriendlyErrorMessage(
            err,
            "코스 상세 정보를 불러오지 못했습니다.",
          ),
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
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          뒤로
        </button>
        <button
          className={`favorite-btn${favorite.isFavorite ? " active" : ""}`}
          onClick={favorite.toggleFavorite}
          aria-label={favorite.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          {favorite.isFavorite ? "저장됨" : "저장"}
        </button>
      </div>

      {message && <p className="form-error">{message}</p>}
      {favorite.message && <p className="form-error">{favorite.message}</p>}
      {favorite.noticeMessage && (
        <p className="form-notice">{favorite.noticeMessage}</p>
      )}

      <div className="detail-title-area">
        <h1 className="page-title">{course.title}</h1>
        <div className="course-meta detail-meta">
          <span className="course-badge">{course.distance}km</span>
          <span className="course-badge">{course.time}분</span>
          <span className="course-badge">{getTypeLabel(course.type)}</span>
          {course.mood && (
            <span className="course-badge mood">
              {getMoodLabel(course.mood)}
            </span>
          )}
        </div>
      </div>

      <CourseInfo course={course} />
    </div>
  );
}

export default DetailPage;

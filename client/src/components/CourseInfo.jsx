import "./CourseInfo.css";

/**
 * CourseInfo — 코스 상세 섹션 (설명/이유/주의/팁)
 * @param {object} course - 코스 데이터
 */
function CourseInfo({ course }) {
  return (
    <div className="course-info">
      <div className="course-info-section">
        <div className="course-info-label">
          <span className="course-info-icon">📍</span>
          <span>코스 소개</span>
        </div>
        <p className="course-info-text">{course.description}</p>
      </div>

      <div className="course-info-section">
        <div className="course-info-label">
          <span className="course-info-icon">💡</span>
          <span>추천 이유</span>
        </div>
        <p className="course-info-text">{course.reason}</p>
      </div>

      <div className="course-info-section danger">
        <div className="course-info-label">
          <span className="course-info-icon">⚠️</span>
          <span>주의사항</span>
        </div>
        <p className="course-info-text">{course.caution}</p>
      </div>

      <div className="course-info-section">
        <div className="course-info-label">
          <span className="course-info-icon">✅</span>
          <span>이용 팁</span>
        </div>
        <p className="course-info-text">{course.tip}</p>
      </div>
    </div>
  );
}

export default CourseInfo;

import { useNavigate } from "react-router-dom";
import { useCourse, MOCK_COURSE } from "../context/CourseContext";

const DISTANCE_OPTIONS = [
  { label: "1km", value: 1 },
  { label: "3km", value: 3 },
  { label: "5km", value: 5 },
];

const TIME_OPTIONS = [
  { label: "15분", value: 15 },
  { label: "30분", value: 30 },
  { label: "60분", value: 60 },
];

const TYPE_OPTIONS = [
  { label: "걷기", value: "걷기" },
  { label: "조깅", value: "조깅" },
  { label: "산책", value: "산책" },
];

function HomePage() {
  const navigate = useNavigate();
  const { conditions, setConditions, setCurrentCourse } = useCourse();

  const allSelected =
    conditions.distance !== null &&
    conditions.time !== null &&
    conditions.type !== null;

  function handleSelect(key, value) {
    setConditions((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    setConditions({ distance: null, time: null, type: null });
  }

  function handleRecommend() {
    // Step 05 will replace this mock course with a real API response.
    setCurrentCourse(MOCK_COURSE);
    navigate("/result");
  }

  return (
    <div className="page home-page">
      <h1 className="page-title">오늘의 코스</h1>
      <p className="page-desc">
        거리, 시간, 이동 유형을 선택하고 랜덤 코스를 추천받으세요.
      </p>

      <section className="condition-section">
        <h2 className="condition-title">거리</h2>
        <div className="chip-group">
          {DISTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`chip${conditions.distance === opt.value ? " selected" : ""}`}
              onClick={() => handleSelect("distance", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="condition-section">
        <h2 className="condition-title">소요 시간</h2>
        <div className="chip-group">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`chip${conditions.time === opt.value ? " selected" : ""}`}
              onClick={() => handleSelect("time", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="condition-section">
        <h2 className="condition-title">이동 유형</h2>
        <div className="chip-group">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`chip${conditions.type === opt.value ? " selected" : ""}`}
              onClick={() => handleSelect("type", opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <button
        className="btn-primary"
        disabled={!allSelected}
        onClick={handleRecommend}
      >
        추천받기
      </button>
      {allSelected && (
        <button className="btn-reset" onClick={handleReset}>
          초기화
        </button>
      )}
    </div>
  );
}

export default HomePage;

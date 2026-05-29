import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { fetchRandomCourse } from "../api/courses";
import {
  DISTANCE_OPTIONS,
  TIME_OPTIONS,
  TYPE_OPTIONS,
} from "../constants/courseOptions";
import { useCourse } from "../hooks/useCourse";
import {
  HISTORY_SAVE_FAILED_MESSAGE,
  saveHistoryQuietly,
} from "../utils/history";

function HomePage() {
  const navigate = useNavigate();
  const { conditions, setConditions, setCurrentCourse } = useCourse();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const allSelected =
    conditions.distance !== null &&
    conditions.time !== null &&
    conditions.type !== null;

  function clearMessages() {
    setErrorMessage("");
    setNoticeMessage("");
  }

  function handleSelect(key, value) {
    clearMessages();
    setConditions((prev) => ({ ...prev, [key]: value }));
  }

  function handleReset() {
    clearMessages();
    setConditions({ distance: null, time: null, type: null });
  }

  async function handleRecommend() {
    if (!allSelected || isLoading) return;

    try {
      setIsLoading(true);
      clearMessages();
      const response = await fetchRandomCourse(conditions);
      setCurrentCourse(response.data);

      const historySaved = await saveHistoryQuietly(response.data.id);
      if (!historySaved) {
        setNoticeMessage(HISTORY_SAVE_FAILED_MESSAGE);
      }

      navigate("/result");
    } catch (err) {
      setErrorMessage(
        getFriendlyErrorMessage(
          err,
          "추천 코스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
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

      {errorMessage && <p className="form-error">{errorMessage}</p>}
      {noticeMessage && <p className="form-notice">{noticeMessage}</p>}

      <button
        className="btn-primary"
        disabled={!allSelected || isLoading}
        onClick={handleRecommend}
      >
        {isLoading ? "추천 중..." : "추천받기"}
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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { fetchRandomCourse } from "../api/courses";
import { createRoundTripRoute } from "../api/routes";
import {
  DISTANCE_OPTIONS,
  TIME_OPTIONS,
  TYPE_OPTIONS,
} from "../constants/courseOptions";
import {
  GPS_FALLBACK_NOTICE,
  GPS_PERMISSION_FALLBACK_NOTICE,
  GPS_ROUTE_NOTICE,
  RECOMMENDATION_MODE_OPTIONS,
  RECOMMENDATION_MODES,
} from "../constants/recommendationModes";
import { useCourse } from "../hooks/useCourse";
import Icon from "../components/Icon";
import {
  HISTORY_SAVE_FAILED_MESSAGE,
  saveHistoryQuietly,
} from "../utils/history";
import { getCurrentPosition } from "../utils/geolocation";

function HomePage() {
  const navigate = useNavigate();
  const {
    conditions,
    setConditions,
    setCurrentCourse,
    recommendationMode,
    setRecommendationMode,
    setRecommendationMeta,
  } = useCourse();
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
    setRecommendationMeta(null);
  }

  async function handleRecommend() {
    if (!allSelected || isLoading) return;

    try {
      setIsLoading(true);
      clearMessages();
      setRecommendationMeta(null);

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
          response = await fetchRandomCourse(conditions);
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
        response = await fetchRandomCourse(conditions);
        setRecommendationMeta({
          mode: RECOMMENDATION_MODES.RANDOM_DB,
          usedFallback: false,
          notice: "",
        });
      }

      setCurrentCourse(response.data);

      const historySaved =
        response.data.source === "ors" ||
        (await saveHistoryQuietly(response.data.id));
      if (!historySaved && response.data.source !== "ors") {
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
      setRecommendationMeta(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page home-page">
      <header className="home-header">
        <span className="header-icon-static" aria-hidden="true">
          <Icon name="menu" size={28} />
        </span>
        <div className="home-brand">
          <span className="home-brand-title">RWR</span>
          <span className="home-brand-sub">Run Walk Random</span>
        </div>
        <span className="header-icon-static" aria-hidden="true">
          <Icon name="bell" size={27} />
        </span>
      </header>

      <h1 className="home-title">오늘은 어디로 걸어볼까요?</h1>

      <section className="condition-section">
        <h2 className="condition-title">
          <Icon name="pin" size={28} className="icon-green" />
          거리
        </h2>
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
        <h2 className="condition-title">
          <Icon name="clock" size={28} className="icon-green" />
          소요 시간
        </h2>
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
        <h2 className="condition-title">
          <Icon name="shoe" size={29} className="icon-green" />
          운동 유형
        </h2>
        <div className="chip-group type-group">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`chip${conditions.type === opt.value ? " selected" : ""}`}
              onClick={() => handleSelect("type", opt.value)}
            >
              <Icon name={opt.value === "walk" ? "foot" : "runner"} size={24} />
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="condition-section">
        <h2 className="condition-title">
          <Icon name="pin" size={28} className="icon-green" />
          추천 방식
        </h2>
        <div className="recommendation-mode-group">
          {RECOMMENDATION_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`recommendation-mode${recommendationMode === opt.value ? " selected" : ""}`}
              onClick={() => {
                clearMessages();
                setRecommendationMeta(null);
                setRecommendationMode(opt.value);
              }}
            >
              <span className="recommendation-mode-label">{opt.label}</span>
              <span className="recommendation-mode-desc">
                {opt.description}
              </span>
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
        {isLoading ? "추천 중..." : "코스 추천받기!"}
      </button>
      <button className="btn-reset" onClick={handleReset}>
        초기화
      </button>
    </div>
  );
}

export default HomePage;

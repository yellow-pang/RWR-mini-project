import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { reverseGeocodeLocation } from "../api/locations";
import { createAddressRoundTripRoute } from "../api/routes";
import {
  DISTANCE_OPTIONS,
  TIME_OPTIONS,
  TYPE_OPTIONS,
} from "../constants/courseOptions";
import {
  GPS_ADDRESS_FALLBACK_NOTICE,
  GPS_ADDRESS_NOTICE,
  GPS_LOCATION_NOTICE,
  GPS_PERMISSION_NOTICE,
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
    routeLocation,
    setRouteLocation,
    setRecommendationMeta,
  } = useCourse();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const allSelected =
    conditions.distance !== null &&
    conditions.time !== null &&
    conditions.type !== null;
  const hasLocation =
    routeLocation.address.trim().length > 0 ||
    (routeLocation.latitude !== null && routeLocation.longitude !== null);
  const canRecommend = allSelected && hasLocation;

  function clearMessages() {
    setErrorMessage("");
    setNoticeMessage("");
  }

  function handleSelect(key, value) {
    clearMessages();
    setConditions((prev) => ({ ...prev, [key]: value }));
  }

  function handleAddressChange(event) {
    clearMessages();
    setRecommendationMeta(null);
    setRouteLocation({
      address: event.target.value,
      latitude: null,
      longitude: null,
      source: "address-input",
    });
  }

  function handleReset() {
    clearMessages();
    setConditions({ distance: null, time: null, type: null });
    setRouteLocation({
      address: "",
      latitude: null,
      longitude: null,
      source: null,
    });
    setRecommendationMeta(null);
  }

  async function handleUseCurrentLocation() {
    if (isLoading) return;

    try {
      setIsLoading(true);
      clearMessages();
      const position = await getCurrentPosition();

      try {
        const response = await reverseGeocodeLocation(position);
        setRouteLocation(response.data);
        setNoticeMessage(GPS_ADDRESS_NOTICE);
      } catch {
        setRouteLocation({
          address: "현재 위치 기준",
          latitude: position.latitude,
          longitude: position.longitude,
          source: "gps",
        });
        setNoticeMessage(GPS_ADDRESS_FALLBACK_NOTICE);
      }
    } catch {
      setNoticeMessage(GPS_PERMISSION_NOTICE);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRecommend() {
    if (!canRecommend || isLoading) return;

    try {
      setIsLoading(true);
      clearMessages();
      setRecommendationMeta(null);

      const response = await createAddressRoundTripRoute({
        ...conditions,
        address: routeLocation.address.trim(),
        latitude: routeLocation.latitude,
        longitude: routeLocation.longitude,
        seed: Date.now(),
      });

      setCurrentCourse(response.data);
      setRecommendationMeta(response.meta || null);

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
          출발 주소
        </h2>
        <div className="address-input-row">
          <input
            className="address-input"
            type="text"
            value={routeLocation.address}
            onChange={handleAddressChange}
            placeholder="예: 서울 성동구 왕십리로 63"
            aria-label="출발 주소"
          />
          <button
            className="btn-location"
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLoading}
          >
            현재 위치
          </button>
        </div>
        {routeLocation.latitude !== null &&
          routeLocation.longitude !== null && (
            <p className="address-helper">{GPS_LOCATION_NOTICE}</p>
          )}
      </section>

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

      {errorMessage && <p className="form-error">{errorMessage}</p>}
      {noticeMessage && <p className="form-notice">{noticeMessage}</p>}

      <button
        className="btn-primary"
        disabled={!canRecommend || isLoading}
        onClick={handleRecommend}
      >
        {isLoading ? "생성 중..." : "코스 생성"}
      </button>
      <button className="btn-reset" onClick={handleReset}>
        초기화
      </button>
    </div>
  );
}

export default HomePage;

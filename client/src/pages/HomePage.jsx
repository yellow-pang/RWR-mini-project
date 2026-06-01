import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { reverseGeocodeLocation, searchAddresses } from "../api/locations";
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
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressQuery, setAddressQuery] = useState(routeLocation.address);
  const [addressResults, setAddressResults] = useState([]);
  const [addressSearchMessage, setAddressSearchMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const allSelected =
    conditions.distance !== null &&
    conditions.time !== null &&
    conditions.type !== null;
  const hasLocation =
    routeLocation.latitude !== null && routeLocation.longitude !== null;
  const canRecommend = allSelected && hasLocation;

  function clearMessages() {
    setErrorMessage("");
    setNoticeMessage("");
  }

  function handleSelect(key, value) {
    clearMessages();
    setConditions((prev) => ({ ...prev, [key]: value }));
  }

  function handleAddressQueryChange(event) {
    clearMessages();
    setAddressSearchMessage("");
    setAddressResults([]);
    setAddressQuery(event.target.value);
    setRecommendationMeta(null);
    setRouteLocation({
      address: "",
      latitude: null,
      longitude: null,
      source: null,
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
    setAddressQuery("");
    setAddressResults([]);
    setAddressSearchMessage("");
    setRecommendationMeta(null);
  }

  async function handleSearchAddress() {
    const query = addressQuery.trim();
    if (query.length < 2 || isSearchingAddress) return;

    try {
      setIsSearchingAddress(true);
      clearMessages();
      setAddressSearchMessage("");
      setAddressResults([]);

      const response = await searchAddresses({ query });
      const results = response.data || [];
      setAddressResults(results);

      if (results.length === 0) {
        setAddressSearchMessage(
          "검색 결과가 없습니다. 도로명이나 건물명을 줄여서 입력해 주세요.",
        );
      }
    } catch (err) {
      setAddressSearchMessage(
        getFriendlyErrorMessage(
          err,
          "주소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        ),
      );
    } finally {
      setIsSearchingAddress(false);
    }
  }

  function handleAddressQueryKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearchAddress();
    }
  }

  function handleSelectAddress(result) {
    clearMessages();
    setAddressSearchMessage("");
    setAddressResults([]);
    setAddressQuery(result.roadAddress || result.address);
    setRouteLocation({
      address: result.roadAddress || result.address,
      latitude: result.latitude,
      longitude: result.longitude,
      source: result.source,
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
        setAddressQuery(response.data.address);
        setAddressResults([]);
        setAddressSearchMessage("");
        setNoticeMessage(GPS_ADDRESS_NOTICE);
      } catch {
        setRouteLocation({
          address: "현재 위치 기준",
          latitude: position.latitude,
          longitude: position.longitude,
          source: "gps",
        });
        setAddressQuery("현재 위치 기준");
        setAddressResults([]);
        setAddressSearchMessage("");
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
        <div className="address-search-grid">
          <input
            className="address-input address-search-input"
            type="text"
            value={addressQuery}
            onChange={handleAddressQueryChange}
            onKeyDown={handleAddressQueryKeyDown}
            placeholder="도로명, 지번, 건물명 검색"
            aria-label="주소 검색어"
          />
          <button
            className="btn-address-search"
            type="button"
            onClick={handleSearchAddress}
            disabled={addressQuery.trim().length < 2 || isSearchingAddress}
          >
            {isSearchingAddress ? "검색 중..." : "검색"}
          </button>
          <div className="selected-address-panel">
            <span className="selected-address-label">선택된 주소</span>
            <span className="selected-address-value">
              {hasLocation
                ? routeLocation.address
                : "검색 결과에서 출발 주소를 선택해 주세요."}
            </span>
          </div>
        </div>
        {addressResults.length > 0 && (
          <div className="address-result-list" aria-label="주소 검색 결과">
            {addressResults.map((result) => (
              <button
                className="address-result-item"
                type="button"
                key={`${result.id}-${result.latitude}-${result.longitude}`}
                onClick={() => handleSelectAddress(result)}
              >
                <span className="address-result-main">
                  {result.roadAddress || result.address}
                </span>
                {result.jibunAddress && (
                  <span className="address-result-sub">
                    지번 {result.jibunAddress}
                  </span>
                )}
                {(result.buildingName || result.region) && (
                  <span className="address-result-meta">
                    {[result.buildingName, result.region]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {addressSearchMessage && (
          <p className="address-search-message">{addressSearchMessage}</p>
        )}
        <button
          className="btn-location"
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLoading}
        >
          현재 위치 사용
        </button>
        <div className="address-helper-row">
          {!hasLocation && (
            <p className="address-helper">
              검색어 입력 후 후보 주소를 선택해야 코스를 생성할 수 있습니다.
            </p>
          )}
          {routeLocation.latitude !== null &&
            routeLocation.longitude !== null && (
              <p className="address-helper">{GPS_LOCATION_NOTICE}</p>
            )}
        </div>
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

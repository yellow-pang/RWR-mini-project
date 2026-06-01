import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { geocodeAddress, reverseGeocodeLocation } from "../api/locations";
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
import {
  getSelectedPostcodeAddress,
  loadPostcodeScript,
} from "../utils/postcode";

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
  const postcodeLayerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [isPostcodeLoading, setIsPostcodeLoading] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [postcodeMessage, setPostcodeMessage] = useState("");
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

  function handleReset() {
    clearMessages();
    setConditions({ distance: null, time: null, type: null });
    setRouteLocation({
      address: "",
      latitude: null,
      longitude: null,
      source: null,
    });
    setPostcodeMessage("");
    setIsPostcodeOpen(false);
    setRecommendationMeta(null);
  }

  async function applyPostcodeAddress(address) {
    if (!address) {
      setPostcodeMessage("선택한 주소를 확인하지 못했습니다.");
      return;
    }

    try {
      setIsGeocodingAddress(true);
      clearMessages();
      setPostcodeMessage("주소 좌표 확인 중...");
      setRecommendationMeta(null);
      setRouteLocation({
        address: "",
        latitude: null,
        longitude: null,
        source: null,
      });

      const response = await geocodeAddress({ address });
      setRouteLocation({
        ...response.data,
        address,
        source: "postcode",
      });
      setPostcodeMessage("");
    } catch (err) {
      setRouteLocation({
        address: "",
        latitude: null,
        longitude: null,
        source: null,
      });
      setPostcodeMessage(
        getFriendlyErrorMessage(
          err,
          "선택한 주소의 좌표를 찾지 못했습니다. 다른 주소를 선택해 주세요.",
        ),
      );
    } finally {
      setIsGeocodingAddress(false);
    }
  }

  function renderPostcodeLayer(Postcode) {
    const layer = postcodeLayerRef.current;
    if (!layer) return;

    layer.innerHTML = "";
    new Postcode({
      oncomplete(data) {
        const selectedAddress = getSelectedPostcodeAddress(data);
        setIsPostcodeOpen(false);
        applyPostcodeAddress(selectedAddress);
      },
      onresize(size) {
        layer.style.height = `${Math.min(size.height, 520)}px`;
      },
      width: "100%",
      height: "100%",
      maxSuggestItems: 5,
    }).embed(layer);
  }

  async function handleOpenPostcode() {
    if (isPostcodeLoading) return;

    try {
      setIsPostcodeLoading(true);
      clearMessages();
      setPostcodeMessage("");
      const Postcode = await loadPostcodeScript();
      setIsPostcodeOpen(true);
      window.requestAnimationFrame(() => renderPostcodeLayer(Postcode));
    } catch (err) {
      setPostcodeMessage(
        err.message ||
          "우편번호 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsPostcodeLoading(false);
    }
  }

  function handleClosePostcode() {
    setIsPostcodeOpen(false);
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
        setPostcodeMessage("");
        setIsPostcodeOpen(false);
        setNoticeMessage(GPS_ADDRESS_NOTICE);
      } catch {
        setRouteLocation({
          address: "현재 위치 기준",
          latitude: position.latitude,
          longitude: position.longitude,
          source: "gps",
        });
        setPostcodeMessage("");
        setIsPostcodeOpen(false);
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

      <section className="condition-section address-section">
        <h2 className="condition-title">
          <Icon name="pin" size={28} className="icon-green" />
          출발 주소
        </h2>
        <div className="address-action-row">
          <button
            className="btn-postcode"
            type="button"
            onClick={handleOpenPostcode}
            disabled={isPostcodeLoading || isGeocodingAddress}
          >
            <Icon name="search" size={21} />
            {isPostcodeLoading ? "불러오는 중..." : "주소 찾기"}
          </button>
          <button
            className="btn-current-location"
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLoading}
          >
            <Icon name="pin" size={21} />
            현재 위치
          </button>
        </div>
        <div className="selected-address-panel">
          <span className="selected-address-label">선택된 주소</span>
          <span className="selected-address-value">
            {hasLocation
              ? routeLocation.address
              : "주소 찾기에서 출발 주소를 선택해 주세요."}
          </span>
        </div>
        {postcodeMessage && (
          <p
            className={
              isGeocodingAddress ? "address-search-message" : "form-error"
            }
          >
            {postcodeMessage}
          </p>
        )}
        <div className="address-helper-row">
          {!hasLocation && (
            <p className="address-helper">
              주소 찾기에서 주소를 선택해야 코스를 생성할 수 있습니다.
            </p>
          )}
          {routeLocation.latitude !== null &&
            routeLocation.longitude !== null && (
              <p className="address-helper">{GPS_LOCATION_NOTICE}</p>
            )}
        </div>
        {isPostcodeOpen && (
          <div className="postcode-overlay" role="dialog" aria-modal="true">
            <div className="postcode-overlay-header">
              <span className="postcode-overlay-title">주소 찾기</span>
              <button
                className="btn-postcode-close"
                type="button"
                onClick={handleClosePostcode}
              >
                닫기
              </button>
            </div>
            <div
              className="postcode-layer"
              ref={postcodeLayerRef}
              aria-label="우편번호 주소 검색"
            />
          </div>
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
        disabled={!canRecommend || isLoading || isGeocodingAddress}
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

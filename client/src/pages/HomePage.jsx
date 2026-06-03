import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFriendlyErrorMessage } from "../api/client";
import { geocodeAddress, reverseGeocodeLocation } from "../api/locations";
import {
  createAddressPointToPointRoute,
  createAddressRoundTripRoute,
} from "../api/routes";
import {
  CUSTOM_DISTANCE_RANGE,
  CUSTOM_TIME_RANGE,
  DETOUR_LEVEL_OPTIONS,
  DETOUR_LEVELS,
  POI_PREFERENCE_LIMIT,
  POI_PREFERENCE_OPTIONS,
  ROUTE_THEMES,
  TARGET_MODE_OPTIONS,
  TARGET_MODES,
  TIME_OPTIONS,
  TYPE_OPTIONS,
  getDistanceOptionsByType,
} from "../constants/courseOptions";
import {
  calculateEstimatedMinutes,
  calculateTargetDistanceKm,
  formatDistanceKm,
  formatMinutes,
  getDistanceRange,
  getTypeIconName,
} from "../utils/courseDisplay";
import {
  GPS_ADDRESS_FALLBACK_NOTICE,
  GPS_ADDRESS_NOTICE,
  GPS_LOCATION_NOTICE,
  GPS_PERMISSION_NOTICE,
  POINT_TO_POINT_DISTANCE_NOTICE,
  ROUTE_MODES,
} from "../constants/recommendationModes";
import { useCourse } from "../hooks/useCourse";
import Icon from "../components/Icon";
import MapView from "../components/MapView";
import {
  HISTORY_SAVE_FAILED_MESSAGE,
  saveHistoryQuietly,
} from "../utils/history";
import { getCurrentPosition } from "../utils/geolocation";
import {
  getSelectedPostcodeAddress,
  loadPostcodeScript,
} from "../utils/postcode";

function createRouteSeed() {
  return Date.now();
}

function HomePage() {
  const navigate = useNavigate();
  const {
    routeMode,
    setRouteMode,
    conditions,
    setConditions,
    setCurrentCourse,
    routeLocation,
    setRouteLocation,
    destinationLocation,
    setDestinationLocation,
    detourLevel,
    setDetourLevel,
    routeTheme,
    setRouteTheme,
    poiPreferences,
    setPoiPreferences,
    swapRouteEndpoints,
    setRecommendationMeta,
  } = useCourse();
  const postcodeLayerRef = useRef(null);
  const [addressTarget, setAddressTarget] = useState("start");
  const [isLoading, setIsLoading] = useState(false);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const [isPostcodeLoading, setIsPostcodeLoading] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [postcodeMessage, setPostcodeMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const targetMode = conditions.targetMode || TARGET_MODES.DISTANCE;
  const isDistanceTarget = targetMode === TARGET_MODES.DISTANCE;
  const targetDistanceKm =
    isDistanceTarget || !conditions.time || !conditions.type
      ? conditions.distance
      : calculateTargetDistanceKm(conditions.time, conditions.type);
  const estimatedMinutes =
    targetDistanceKm && conditions.type
      ? calculateEstimatedMinutes(targetDistanceKm, conditions.type)
      : null;
  const targetRange = targetDistanceKm
    ? getDistanceRange(targetDistanceKm)
    : null;
  const allSelected =
    Boolean(conditions.type) &&
    (isDistanceTarget
      ? conditions.distance !== null
      : conditions.time !== null);
  const hasLocation =
    routeLocation.latitude !== null && routeLocation.longitude !== null;
  const hasDestination =
    destinationLocation.latitude !== null &&
    destinationLocation.longitude !== null;
  const isPointToPoint = routeMode === ROUTE_MODES.POINT_TO_POINT;
  const distanceOptions = getDistanceOptionsByType(conditions.type);
  const mapTitle = routeLocation.address || "선택된 출발 위치";
  const canRecommend =
    allSelected && hasLocation && (!isPointToPoint || hasDestination);

  function getEmptyLocation() {
    return {
      address: "",
      latitude: null,
      longitude: null,
      source: null,
    };
  }

  function clearMessages() {
    setErrorMessage("");
    setNoticeMessage("");
  }

  function handleSelect(key, value) {
    clearMessages();
    setConditions((prev) => {
      if (key === "distance" && value === "custom") {
        return {
          ...prev,
          distance: prev.distance || CUSTOM_DISTANCE_RANGE.defaultValue,
          isCustomDistance: true,
        };
      }

      if (key === "time" && value === "custom") {
        return {
          ...prev,
          time: prev.time || CUSTOM_TIME_RANGE.defaultValue,
          isCustomTime: true,
        };
      }

      if (key === "distance") {
        return { ...prev, distance: value, isCustomDistance: false };
      }

      if (key === "time") {
        return { ...prev, time: value, isCustomTime: false };
      }

      if (key === "type") {
        const nextDistanceOptions = getDistanceOptionsByType(value).filter(
          (option) => option.value !== "custom",
        );
        const hasCurrentDistance = nextDistanceOptions.some(
          (option) => option.value === prev.distance,
        );

        return {
          ...prev,
          type: value,
          distance:
            prev.targetMode === TARGET_MODES.DISTANCE && !hasCurrentDistance
              ? nextDistanceOptions[0]?.value || prev.distance
              : prev.distance,
          isCustomDistance:
            prev.targetMode === TARGET_MODES.DISTANCE && !hasCurrentDistance
              ? false
              : prev.isCustomDistance,
        };
      }

      return { ...prev, [key]: value };
    });
  }

  function handleTargetModeChange(nextTargetMode) {
    clearMessages();
    setConditions((prev) => ({
      ...prev,
      targetMode: nextTargetMode,
    }));
  }

  function handleCustomTargetChange(key, value) {
    clearMessages();
    setConditions((prev) => ({ ...prev, [key]: Number(value) }));
  }

  function handleRouteModeChange(nextRouteMode) {
    clearMessages();
    setRouteMode(nextRouteMode);
    setRecommendationMeta(null);
    setIsPostcodeOpen(false);
    setPostcodeMessage("");
  }

  function handleSwapRouteEndpoints() {
    if (!hasLocation && !hasDestination) return;

    clearMessages();
    setPostcodeMessage("");
    setIsPostcodeOpen(false);
    swapRouteEndpoints();
  }

  function handleReset() {
    clearMessages();
    setConditions({
      targetMode: TARGET_MODES.DISTANCE,
      distance: null,
      time: null,
      type: null,
      isCustomDistance: false,
      isCustomTime: false,
    });
    setRouteMode(ROUTE_MODES.ROUND_TRIP);
    setRouteLocation(getEmptyLocation());
    setDestinationLocation(getEmptyLocation());
    setDetourLevel(DETOUR_LEVELS.MEDIUM);
    setRouteTheme(ROUTE_THEMES.ANY);
    setPoiPreferences([]);
    setPostcodeMessage("");
    setIsPostcodeOpen(false);
    setRecommendationMeta(null);
  }

  function buildRouteRequestPayload(seed) {
    return {
      distance: targetDistanceKm,
      time: estimatedMinutes,
      type: conditions.type,
      targetMode,
      targetDistanceKm,
      targetMinutes: isDistanceTarget ? null : conditions.time,
      estimatedMinutes,
      seed,
      detourLevel,
      routeTheme,
      poiPreferences,
    };
  }

  function handlePoiPreferenceToggle(value) {
    clearMessages();
    setPoiPreferences((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }

      if (prev.length >= POI_PREFERENCE_LIMIT) {
        return prev;
      }

      return [...prev, value];
    });
  }

  async function applyPostcodeAddress(address, target = addressTarget) {
    if (!address) {
      setPostcodeMessage("선택한 주소를 확인하지 못했습니다.");
      return;
    }

    try {
      setIsGeocodingAddress(true);
      clearMessages();
      setPostcodeMessage("주소 좌표 확인 중...");
      setRecommendationMeta(null);
      if (target === "destination") {
        setDestinationLocation(getEmptyLocation());
      } else {
        setRouteLocation(getEmptyLocation());
      }

      const response = await geocodeAddress({ address });
      const nextLocation = {
        ...response.data,
        address,
        source: "postcode",
      };
      if (target === "destination") {
        setDestinationLocation(nextLocation);
      } else {
        setRouteLocation(nextLocation);
      }
      setPostcodeMessage("");
    } catch (err) {
      if (target === "destination") {
        setDestinationLocation(getEmptyLocation());
      } else {
        setRouteLocation(getEmptyLocation());
      }
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

  function renderPostcodeLayer(Postcode, target = addressTarget) {
    const layer = postcodeLayerRef.current;
    if (!layer) return;

    layer.innerHTML = "";
    new Postcode({
      oncomplete(data) {
        const selectedAddress = getSelectedPostcodeAddress(data);
        setIsPostcodeOpen(false);
        applyPostcodeAddress(selectedAddress, target);
      },
      onresize(size) {
        layer.style.height = `${Math.min(size.height, 520)}px`;
      },
      width: "100%",
      height: "100%",
      maxSuggestItems: 5,
    }).embed(layer);
  }

  async function handleOpenPostcode(target = "start") {
    if (isPostcodeLoading) return;

    try {
      setAddressTarget(target);
      setIsPostcodeLoading(true);
      clearMessages();
      setPostcodeMessage("");
      const Postcode = await loadPostcodeScript();
      setIsPostcodeOpen(true);
      window.requestAnimationFrame(() => renderPostcodeLayer(Postcode, target));
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

      const seed = createRouteSeed();
      const routeRequestPayload = buildRouteRequestPayload(seed);
      const response = isPointToPoint
        ? await createAddressPointToPointRoute({
            ...routeRequestPayload,
            startAddress: routeLocation.address.trim(),
            startLatitude: routeLocation.latitude,
            startLongitude: routeLocation.longitude,
            endAddress: destinationLocation.address.trim(),
            endLatitude: destinationLocation.latitude,
            endLongitude: destinationLocation.longitude,
            seed,
          })
        : await createAddressRoundTripRoute({
            ...routeRequestPayload,
            address: routeLocation.address.trim(),
            latitude: routeLocation.latitude,
            longitude: routeLocation.longitude,
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
          <Icon name="runner" size={28} className="icon-green" />
          코스 방식
        </h2>
        <div className="recommendation-mode-group">
          <button
            className={`recommendation-mode${
              routeMode === ROUTE_MODES.ROUND_TRIP ? " selected" : ""
            }`}
            type="button"
            onClick={() => handleRouteModeChange(ROUTE_MODES.ROUND_TRIP)}
          >
            <span className="recommendation-mode-label">순환 코스</span>
            <span className="recommendation-mode-desc">
              출발지로 다시 돌아오는 코스
            </span>
          </button>
          <button
            className={`recommendation-mode${
              isPointToPoint ? " selected" : ""
            }`}
            type="button"
            onClick={() => handleRouteModeChange(ROUTE_MODES.POINT_TO_POINT)}
          >
            <span className="recommendation-mode-label">출발-도착 코스</span>
            <span className="recommendation-mode-desc">
              목적지까지 산책하듯 이동
            </span>
          </button>
        </div>
      </section>

      <section className="condition-section address-section">
        <h2 className="condition-title">
          <Icon name="pin" size={28} className="icon-green" />
          출발지
        </h2>
        <div className="address-action-row">
          <button
            className="btn-postcode"
            type="button"
            onClick={() => handleOpenPostcode("start")}
            disabled={isPostcodeLoading || isGeocodingAddress}
          >
            <Icon name="search" size={21} />
            {isPostcodeLoading && addressTarget === "start"
              ? "불러오는 중..."
              : "주소 찾기"}
          </button>
          <button
            className="btn-current-location"
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLoading}
          >
            <Icon name="pin" size={21} />
            현재 위치를 출발지로 사용
          </button>
        </div>
        <div className="selected-address-panel">
          <span className="selected-address-label">선택된 출발지</span>
          <span className="selected-address-value">
            {hasLocation
              ? routeLocation.address
              : "주소 찾기에서 출발지를 선택해 주세요."}
          </span>
        </div>
        {postcodeMessage && addressTarget === "start" && (
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
              주소 찾기에서 출발지를 선택해야 코스를 생성할 수 있습니다.
            </p>
          )}
          {routeLocation.latitude !== null &&
            routeLocation.longitude !== null && (
              <p className="address-helper">{GPS_LOCATION_NOTICE}</p>
            )}
        </div>
        {isPostcodeOpen && addressTarget === "start" && (
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
          <Icon name="star" size={28} className="icon-green" />
          코스 분위기
        </h2>
        <div className="poi-preference-summary">
          <span className="poi-preference-summary-label">추천 균형 코스</span>
          <span className="poi-preference-summary-desc">
            원하는 분위기가 있으면 아래 토글을 추가로 켜 주세요.
          </span>
        </div>
        <div className="chip-group poi-preference-group">
          {POI_PREFERENCE_OPTIONS.map((opt) => {
            const isSelected = poiPreferences.includes(opt.value);
            const isDisabled =
              !isSelected && poiPreferences.length >= POI_PREFERENCE_LIMIT;

            return (
            <button
              key={opt.value}
              className={`chip poi-preference-chip${
                isSelected ? " selected" : ""
              }`}
              type="button"
              onClick={() => handlePoiPreferenceToggle(opt.value)}
              disabled={isDisabled}
            >
              {opt.label}
            </button>
            );
          })}
        </div>
        <p className="address-search-message">
          최대 {POI_PREFERENCE_LIMIT}개까지 선택할 수 있고, 장소를 목적지로
          고정하지 않고 경유 후보로만 참고합니다.
        </p>
      </section>

      {hasLocation && (
        <section className="condition-section location-preview-section">
          <h2 className="condition-title">
            <Icon name="pin" size={28} className="icon-green" />
            출발 위치 확인
          </h2>
          <MapView
            compact
            lat={routeLocation.latitude}
            lng={routeLocation.longitude}
            title={mapTitle}
          />
          <p className="address-search-message">
            이 위치를 기준으로 코스를 추천합니다.
          </p>
        </section>
      )}

      {isPointToPoint && (
        <section className="condition-section address-section">
          <div className="condition-title-row">
            <h2 className="condition-title">
              <Icon name="pin" size={28} className="icon-green" />
              도착지
            </h2>
            <button
              className="btn-swap-endpoints"
              type="button"
              onClick={handleSwapRouteEndpoints}
              disabled={!hasLocation && !hasDestination}
            >
              <Icon name="back" size={20} />
              출발/도착 바꾸기
            </button>
          </div>
          <div className="address-action-row single-action">
            <button
              className="btn-postcode"
              type="button"
              onClick={() => handleOpenPostcode("destination")}
              disabled={isPostcodeLoading || isGeocodingAddress}
            >
              <Icon name="search" size={21} />
              {isPostcodeLoading && addressTarget === "destination"
                ? "불러오는 중..."
                : "주소 찾기"}
            </button>
          </div>
          <div className="selected-address-panel">
            <span className="selected-address-label">선택된 도착지</span>
            <span className="selected-address-value">
              {hasDestination
                ? destinationLocation.address
                : "주소 찾기에서 도착지를 선택해 주세요."}
            </span>
          </div>
          {!hasDestination && (
            <div className="address-helper-row">
              <p className="address-helper">
                도착지는 주소 검색으로 선택해 주세요.
              </p>
            </div>
          )}
          {postcodeMessage && addressTarget === "destination" && (
            <p
              className={
                isGeocodingAddress ? "address-search-message" : "form-error"
              }
            >
              {postcodeMessage}
            </p>
          )}
          {isPostcodeOpen && addressTarget === "destination" && (
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
      )}

      {isPointToPoint && (
        <section className="condition-section">
          <h2 className="condition-title">
            <Icon name="runner" size={28} className="icon-green" />
            우회 강도
          </h2>
          <div className="recommendation-mode-group detour-level-group">
            {DETOUR_LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`recommendation-mode compact detour-level-option${
                  detourLevel === opt.value ? " selected" : ""
                }`}
                type="button"
                onClick={() => setDetourLevel(opt.value)}
              >
                <span className="recommendation-mode-label">{opt.label}</span>
                <span className="recommendation-mode-desc">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="condition-section">
        <h2 className="condition-title">
          <Icon name="pin" size={28} className="icon-green" />
          추천 기준
        </h2>
        <div className="recommendation-mode-group target-mode-group">
          {TARGET_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`recommendation-mode compact${
                targetMode === opt.value ? " selected" : ""
              }`}
              type="button"
              onClick={() => handleTargetModeChange(opt.value)}
            >
              <span className="recommendation-mode-label">{opt.label}</span>
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
              <Icon name={getTypeIconName(opt.value)} size={24} />
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="condition-section">
        <h2 className="condition-title">
          <Icon
            name={isDistanceTarget ? "pin" : "clock"}
            size={28}
            className="icon-green"
          />
          {isDistanceTarget ? "거리 선택" : "시간 선택"}
        </h2>
        {isDistanceTarget ? (
          <>
            <div className="chip-group target-chip-group">
              {distanceOptions.map((opt) => {
                const isSelected =
                  opt.value === "custom"
                    ? conditions.isCustomDistance
                    : !conditions.isCustomDistance &&
                      conditions.distance === opt.value;
                return (
                  <button
                    key={opt.value}
                    className={`chip${isSelected ? " selected" : ""}`}
                    onClick={() => handleSelect("distance", opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {conditions.isCustomDistance && (
              <div className="custom-target-control">
                <label className="custom-target-label" htmlFor="distance-range">
                  현재 선택: {formatDistanceKm(conditions.distance)}
                </label>
                <input
                  id="distance-range"
                  className="target-range"
                  type="range"
                  min={CUSTOM_DISTANCE_RANGE.min}
                  max={CUSTOM_DISTANCE_RANGE.max}
                  step={CUSTOM_DISTANCE_RANGE.step}
                  value={conditions.distance || CUSTOM_DISTANCE_RANGE.defaultValue}
                  onChange={(event) =>
                    handleCustomTargetChange("distance", event.target.value)
                  }
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="chip-group target-chip-group">
              {TIME_OPTIONS.map((opt) => {
                const isSelected =
                  opt.value === "custom"
                    ? conditions.isCustomTime
                    : !conditions.isCustomTime && conditions.time === opt.value;
                return (
                  <button
                    key={opt.value}
                    className={`chip${isSelected ? " selected" : ""}`}
                    onClick={() => handleSelect("time", opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {conditions.isCustomTime && (
              <div className="custom-target-control">
                <label className="custom-target-label" htmlFor="time-range">
                  현재 선택: {conditions.time}분
                </label>
                <input
                  id="time-range"
                  className="target-range"
                  type="range"
                  min={CUSTOM_TIME_RANGE.min}
                  max={CUSTOM_TIME_RANGE.max}
                  step={CUSTOM_TIME_RANGE.step}
                  value={conditions.time || CUSTOM_TIME_RANGE.defaultValue}
                  onChange={(event) =>
                    handleCustomTargetChange("time", event.target.value)
                  }
                />
              </div>
            )}
          </>
        )}
        {isPointToPoint && (
          <p className="address-search-message">
            {POINT_TO_POINT_DISTANCE_NOTICE}
          </p>
        )}
        {targetDistanceKm && conditions.type && (
          <div className="target-summary-panel">
            <span>
              목표 거리: <strong>{formatDistanceKm(targetDistanceKm)}</strong>
            </span>
            {isDistanceTarget ? (
              <span>
                예상 시간:{" "}
                <strong>
                  {getTypeIconName(conditions.type) &&
                    `${formatMinutes(estimatedMinutes)}`}
                </strong>
              </span>
            ) : (
              <span>
                목표 시간: <strong>{conditions.time}분</strong>
              </span>
            )}
            {!isDistanceTarget && (
              <span>
                예상 거리: <strong>{formatDistanceKm(targetDistanceKm)}</strong>
              </span>
            )}
            {targetRange && (
              <span>
                허용 범위: 약 {formatDistanceKm(targetRange.min)} ~{" "}
                {formatDistanceKm(targetRange.max)}
              </span>
            )}
          </div>
        )}
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

import { useEffect, useRef, useState } from "react";
import MapPreview from "./MapPreview";
import "./MapView.css";

/**
 * 카카오맵 SDK를 이용한 실제 지도 컴포넌트
 * - lat/lng 없거나 SDK 미초기화 시 MapPreview(SVG) fallback
 * - compact=true: ResultPage 카드용 축소 모드 (레벨 4, 인포윈도우 없음)
 * - compact=false: DetailPage용 전체 모드 (레벨 3, 코스명 인포윈도우)
 */
function MapView({ lat, lng, title, routeCoordinates, compact = false }) {
  const containerRef = useRef(null);
  const hasRoute =
    Array.isArray(routeCoordinates) && routeCoordinates.length > 1;
  const routeStart = hasRoute ? routeCoordinates[0] : null;
  const routeLat = routeStart?.[1];
  const routeLng = routeStart?.[0];
  const displayLat = lat ?? routeLat;
  const displayLng = lng ?? routeLng;

  const hasCoords =
    displayLat != null &&
    displayLng != null &&
    !Number.isNaN(Number(displayLat)) &&
    !Number.isNaN(Number(displayLng));

  // window.kakao 존재 여부만 확인 (autoload=false 시 kakao.maps는 load() 콜백 이후에 초기화되므로 kakao?.maps 체크 불가)
  const [sdkFailed] = useState(() => !window.kakao);

  useEffect(() => {
    if (!hasCoords || sdkFailed) return;

    let destroyed = false;

    window.kakao.maps.load(() => {
      if (destroyed || !containerRef.current) return;

      const coords = new window.kakao.maps.LatLng(
        Number(displayLat),
        Number(displayLng),
      );

      const map = new window.kakao.maps.Map(containerRef.current, {
        center: coords,
        level: compact ? 4 : 3,
      });

      const marker = new window.kakao.maps.Marker({
        map,
        position: coords,
      });

      if (!compact && title) {
        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div class="map-infowindow">${title}</div>`,
        });
        infowindow.open(map, marker);
      }

      if (hasRoute) {
        const path = routeCoordinates.map(
          ([routeLngValue, routeLatValue]) =>
            new window.kakao.maps.LatLng(
              Number(routeLatValue),
              Number(routeLngValue),
            ),
        );

        const polyline = new window.kakao.maps.Polyline({
          map,
          path,
          strokeWeight: compact ? 4 : 5,
          strokeColor: "#198c4d",
          strokeOpacity: 0.9,
          strokeStyle: "solid",
        });

        const bounds = new window.kakao.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(point));
        map.setBounds(bounds);
        polyline.setMap(map);
      }
    });

    return () => {
      destroyed = true;
    };
  }, [
    displayLat,
    displayLng,
    title,
    compact,
    hasCoords,
    hasRoute,
    routeCoordinates,
    sdkFailed,
  ]);

  if (!hasCoords || sdkFailed) {
    return <MapPreview compact={compact} />;
  }

  return (
    <div
      ref={containerRef}
      className={`map-view${compact ? " compact" : ""}`}
    />
  );
}

export default MapView;

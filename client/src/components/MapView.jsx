import { useEffect, useRef, useState } from "react";
import MapPreview from "./MapPreview";
import "./MapView.css";

/**
 * 카카오맵 SDK를 이용한 실제 지도 컴포넌트
 * - lat/lng 없거나 SDK 미초기화 시 MapPreview(SVG) fallback
 * - compact=true: ResultPage 카드용 축소 모드 (레벨 4, 인포윈도우 없음)
 * - compact=false: DetailPage용 전체 모드 (레벨 3, 코스명 인포윈도우)
 */
function MapView({ lat, lng, title, compact = false }) {
  const containerRef = useRef(null);

  const hasCoords =
    lat != null &&
    lng != null &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lng));

  // SDK 이용 가능 여부를 마운트 시점에 1회 평가 (effect 내 setState 금지 규칙 준수)
  const [sdkFailed] = useState(() => !window.kakao?.maps);

  useEffect(() => {
    if (!hasCoords || sdkFailed) return;

    let destroyed = false;

    window.kakao.maps.load(() => {
      if (destroyed || !containerRef.current) return;

      const coords = new window.kakao.maps.LatLng(Number(lat), Number(lng));

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
    });

    return () => {
      destroyed = true;
    };
  }, [lat, lng, title, compact, hasCoords, sdkFailed]);

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

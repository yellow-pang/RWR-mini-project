import { useEffect, useRef, useState } from "react";
import MapPreview from "./MapPreview";
import "./MapView.css";

function toRoutePoint(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length < 2) {
    return null;
  }

  const lng = Number(coordinate[0]);
  const lat = Number(coordinate[1]);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return { lat, lng };
}

function getDistanceInMeters(pointA, pointB) {
  const earthRadius = 6371000;
  const latA = (pointA.lat * Math.PI) / 180;
  const latB = (pointB.lat * Math.PI) / 180;
  const deltaLat = ((pointB.lat - pointA.lat) * Math.PI) / 180;
  const deltaLng = ((pointB.lng - pointA.lng) * Math.PI) / 180;

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;

  return (
    earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getBearingInDegrees(pointA, pointB) {
  const latA = (pointA.lat * Math.PI) / 180;
  const latB = (pointB.lat * Math.PI) / 180;
  const deltaLng = ((pointB.lng - pointA.lng) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(latB);
  const x =
    Math.cos(latA) * Math.sin(latB) -
    Math.sin(latA) * Math.cos(latB) * Math.cos(deltaLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function getRouteDirectionMarkers(routeCoordinates, markerCount) {
  const routePoints = routeCoordinates.map(toRoutePoint).filter(Boolean);

  if (routePoints.length < 2) {
    return [];
  }

  const segments = [];
  let totalDistance = 0;

  for (let index = 1; index < routePoints.length; index += 1) {
    const start = routePoints[index - 1];
    const end = routePoints[index];
    const distance = getDistanceInMeters(start, end);

    if (distance <= 0) continue;

    totalDistance += distance;
    segments.push({ start, end, distance, endDistance: totalDistance });
  }

  if (segments.length === 0 || totalDistance <= 0) {
    return [];
  }

  const count = Math.min(markerCount, segments.length);

  return Array.from({ length: count }, (_, index) => {
    const targetDistance = (totalDistance * (index + 1)) / (count + 1);
    const segment =
      segments.find((item) => item.endDistance >= targetDistance) ||
      segments[segments.length - 1];
    const segmentStartDistance = segment.endDistance - segment.distance;
    const ratio = Math.max(
      0,
      Math.min(1, (targetDistance - segmentStartDistance) / segment.distance),
    );

    return {
      lat: segment.start.lat + (segment.end.lat - segment.start.lat) * ratio,
      lng: segment.start.lng + (segment.end.lng - segment.start.lng) * ratio,
      bearing: getBearingInDegrees(segment.start, segment.end),
    };
  });
}

function getRoutePoints(routeCoordinates) {
  return routeCoordinates.map(toRoutePoint).filter(Boolean);
}

function getRouteProgressPoints(routeCoordinates, progressRatio = 0.22) {
  const routePoints = getRoutePoints(routeCoordinates);

  if (routePoints.length < 2) {
    return routePoints;
  }

  const segments = [];
  let totalDistance = 0;

  for (let index = 1; index < routePoints.length; index += 1) {
    const start = routePoints[index - 1];
    const end = routePoints[index];
    const distance = getDistanceInMeters(start, end);

    if (distance <= 0) continue;

    totalDistance += distance;
    segments.push({ start, end, distance, endDistance: totalDistance });
  }

  if (segments.length === 0 || totalDistance <= 0) {
    return routePoints.slice(0, 2);
  }

  const targetDistance = totalDistance * progressRatio;
  const progressPoints = [segments[0].start];

  for (const segment of segments) {
    const segmentStartDistance = segment.endDistance - segment.distance;

    if (segment.endDistance < targetDistance) {
      progressPoints.push(segment.end);
      continue;
    }

    const ratio = Math.max(
      0,
      Math.min(1, (targetDistance - segmentStartDistance) / segment.distance),
    );

    progressPoints.push({
      lat: segment.start.lat + (segment.end.lat - segment.start.lat) * ratio,
      lng: segment.start.lng + (segment.end.lng - segment.start.lng) * ratio,
    });
    break;
  }

  return progressPoints;
}

function createRouteDirectionElement(bearing) {
  const arrowElement = document.createElement("div");
  arrowElement.className = "route-direction-marker";
  arrowElement.style.transform = `rotate(${bearing - 90}deg)`;
  arrowElement.setAttribute("aria-hidden", "true");

  const arrowIcon = document.createElement("span");
  arrowIcon.className = "route-direction-marker-icon";
  arrowElement.appendChild(arrowIcon);

  return arrowElement;
}

function createRouteSequenceElement(label) {
  const sequenceElement = document.createElement("div");
  sequenceElement.className = "route-sequence-marker";
  sequenceElement.textContent = label;
  sequenceElement.setAttribute("aria-hidden", "true");

  return sequenceElement;
}

function createRouteEndpointElement(type, label) {
  const endpointElement = document.createElement("div");
  endpointElement.className = `route-endpoint-marker ${type}`;
  endpointElement.setAttribute("aria-hidden", "true");

  const iconElement = document.createElement("span");
  iconElement.className = "route-endpoint-icon";
  iconElement.textContent = type === "finish" ? "✓" : "▶";

  const labelElement = document.createElement("span");
  labelElement.className = "route-endpoint-label";
  labelElement.textContent = label;

  endpointElement.appendChild(iconElement);
  endpointElement.appendChild(labelElement);

  return endpointElement;
}

function toKakaoLatLng(kakao, point) {
  return new kakao.maps.LatLng(point.lat, point.lng);
}

/**
 * 카카오맵 SDK를 이용한 실제 지도 컴포넌트
 * - lat/lng 없거나 SDK 미초기화 시 MapPreview(SVG) fallback
 * - compact=true: ResultPage 카드용 축소 모드 (레벨 4, 인포윈도우 없음)
 * - compact=false: DetailPage용 전체 모드 (레벨 3, 코스명 인포윈도우)
 */
function MapView({
  lat,
  lng,
  title,
  routeCoordinates,
  routeMode,
  compact = false,
}) {
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
    const mapObjects = [];

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
      let marker = null;

      if (!hasRoute) {
        marker = new window.kakao.maps.Marker({
          map,
          position: coords,
        });
        mapObjects.push(marker);
      }

      if (!hasRoute && !compact && title) {
        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div class="map-infowindow">${title}</div>`,
        });
        infowindow.open(map, marker);
        mapObjects.push(infowindow);
      }

      if (hasRoute) {
        const routePoints = getRoutePoints(routeCoordinates);
        const path = routePoints.map((point) =>
          toKakaoLatLng(window.kakao, point),
        );

        const polyline = new window.kakao.maps.Polyline({
          map,
          path,
          strokeWeight: compact ? 4 : 5,
          strokeColor: "#6dbb87",
          strokeOpacity: 0.82,
          strokeStyle: "solid",
          endArrow: true,
        });
        mapObjects.push(polyline);

        const progressPolyline = new window.kakao.maps.Polyline({
          map,
          path: getRouteProgressPoints(routeCoordinates).map((point) =>
            toKakaoLatLng(window.kakao, point),
          ),
          strokeWeight: compact ? 6 : 7,
          strokeColor: "#198c4d",
          strokeOpacity: 0.96,
          strokeStyle: "solid",
        });
        mapObjects.push(progressPolyline);

        const bounds = new window.kakao.maps.LatLngBounds();
        path.forEach((point) => bounds.extend(point));
        map.setBounds(bounds);
        polyline.setMap(map);
        progressPolyline.setMap(map);

        const startPoint = routePoints[0];
        const finishPoint = routePoints[routePoints.length - 1];
        const isRoundTripEndpoint =
          routeMode !== "pointToPoint" &&
          getDistanceInMeters(startPoint, finishPoint) <= 40;
        const endpointOverlays = [
          {
            point: startPoint,
            type: isRoundTripEndpoint ? "roundtrip" : "start",
            label: isRoundTripEndpoint ? "출발/도착" : "출발",
          },
        ];

        if (!isRoundTripEndpoint) {
          endpointOverlays.push({
            point: finishPoint,
            type: "finish",
            label: "도착",
          });
        }

        endpointOverlays.forEach((endpoint) => {
          const overlay = new window.kakao.maps.CustomOverlay({
            map,
            position: toKakaoLatLng(window.kakao, endpoint.point),
            content: createRouteEndpointElement(endpoint.type, endpoint.label),
            xAnchor: 0.5,
            yAnchor: 1,
            zIndex: 6,
          });

          mapObjects.push(overlay);
        });

        getRouteDirectionMarkers(routeCoordinates, compact ? 3 : 4).forEach(
          (sequenceMarker, index) => {
            const overlay = new window.kakao.maps.CustomOverlay({
              map,
              position: new window.kakao.maps.LatLng(
                sequenceMarker.lat,
                sequenceMarker.lng,
              ),
              content: createRouteSequenceElement(String(index + 1)),
              xAnchor: 0.5,
              yAnchor: 0.5,
              zIndex: 5,
            });

            mapObjects.push(overlay);
          },
        );

        getRouteDirectionMarkers(routeCoordinates, compact ? 4 : 6).forEach(
          (directionMarker) => {
            const overlay = new window.kakao.maps.CustomOverlay({
              map,
              position: new window.kakao.maps.LatLng(
                directionMarker.lat,
                directionMarker.lng,
              ),
              content: createRouteDirectionElement(directionMarker.bearing),
              xAnchor: 0.5,
              yAnchor: 0.5,
              zIndex: 4,
            });

            mapObjects.push(overlay);
          },
        );
      }
    });

    return () => {
      destroyed = true;
      mapObjects.forEach((mapObject) => {
        if (typeof mapObject.setMap === "function") {
          mapObject.setMap(null);
          return;
        }

        if (typeof mapObject.close === "function") {
          mapObject.close();
        }
      });
    };
  }, [
    displayLat,
    displayLng,
    title,
    compact,
    hasCoords,
    hasRoute,
    routeCoordinates,
    routeMode,
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

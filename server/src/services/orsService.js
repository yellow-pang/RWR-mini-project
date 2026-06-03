const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";
const ORS_PROFILE_BY_TYPE = {
  walk: "foot-walking",
  jogging: "foot-walking",
  running: "foot-walking",
};
const POINT_TO_POINT_RETRY_LIMIT = 3;
const METERS_PER_LATITUDE_DEGREE = 111320;

function buildGeneratedCourse({
  route,
  distance,
  time,
  type,
  seed,
  originLabel = "입력 위치",
  destinationLabel,
  title = "주소 기준 랜덤 코스",
  routeMode = "roundTrip",
}) {
  const feature = route.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  const summary = feature?.properties?.summary || {};

  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    const error = new Error("ORS 경로 좌표가 비어 있습니다.");
    error.status = 502;
    throw error;
  }

  const [startLng, startLat] = coordinates[0];
  const distanceKm = summary.distance
    ? Math.max(1, Math.round(summary.distance / 1000))
    : distance;

  return {
    id: `generated-ors-${Date.now()}`,
    title,
    distance: distanceKm,
    time,
    type,
    mood: "city",
    source: "ors",
    routeMode,
    seed,
    start_lat: startLat,
    start_lng: startLng,
    startLabel: originLabel,
    endLabel: destinationLabel || originLabel,
    geometry: {
      type: "LineString",
      coordinates,
    },
    summary: {
      distance: summary.distance || distance * 1000,
      duration: summary.duration || null,
    },
    description:
      routeMode === "pointToPoint"
        ? `${originLabel}에서 ${destinationLabel}까지 ORS가 실제 도로망을 따라 생성한 산책형 이동 코스입니다.`
        : `${originLabel}을 출발점으로 ORS가 실제 도로망을 따라 생성한 순환 운동 코스입니다.`,
    reason:
      routeMode === "pointToPoint"
        ? "출발지와 목적지 사이에 랜덤 경유지를 더해 바로 가는 길보다 여유 있게 걸을 수 있도록 추천합니다."
        : "선택한 거리와 운동 유형을 바탕으로 매일 다른 방향의 코스를 추천합니다.",
    caution:
      "자동 생성 경로이므로 실제 도로 상황, 공사, 보행 가능 여부를 출발 전 지도에서 확인하세요.",
    tip: "휴대폰 배터리와 데이터 연결 상태를 확인하고, 낯선 길에서는 주변을 살피며 이동하세요.",
  };
}

function createSeededRandom(seed) {
  let state = Number(seed) || Date.now();
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function getDistanceInMeters(pointA, pointB) {
  const earthRadius = 6371000;
  const latA = (pointA.latitude * Math.PI) / 180;
  const latB = (pointB.latitude * Math.PI) / 180;
  const deltaLat = ((pointB.latitude - pointA.latitude) * Math.PI) / 180;
  const deltaLng = ((pointB.longitude - pointA.longitude) * Math.PI) / 180;

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;

  return (
    earthRadius * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getWaypointCount(distance, shouldMinimizeDetour) {
  if (shouldMinimizeDetour) return 0;
  if (distance >= 5) return 3;
  if (distance >= 3) return 2;
  return 1;
}

function createRandomWaypoints({ start, end, distance, seed, attempt }) {
  const baseDistanceMeters = getDistanceInMeters(start, end);
  const targetLengthMeters = distance * 1000;
  const shouldMinimizeDetour = baseDistanceMeters * 1.25 >= targetLengthMeters;
  const waypointCount = getWaypointCount(distance, shouldMinimizeDetour);

  if (waypointCount === 0) {
    return {
      waypoints: [],
      shouldMinimizeDetour,
    };
  }

  const random = createSeededRandom((Number(seed) || Date.now()) + attempt * 97);
  const midpoint = {
    latitude: (start.latitude + end.latitude) / 2,
    longitude: (start.longitude + end.longitude) / 2,
  };
  const deltaLat = end.latitude - start.latitude;
  const deltaLng = end.longitude - start.longitude;
  const length = Math.hypot(deltaLat, deltaLng) || 1;
  const perpendicular = {
    latitude: -deltaLng / length,
    longitude: deltaLat / length,
  };
  const remainingMeters = Math.max(
    250,
    targetLengthMeters - baseDistanceMeters,
  );
  const offsetMeters = Math.min(900, Math.max(180, remainingMeters / 3));
  const latOffsetUnit = offsetMeters / METERS_PER_LATITUDE_DEGREE;
  const lngOffsetUnit =
    offsetMeters /
    (METERS_PER_LATITUDE_DEGREE *
      Math.max(0.35, Math.cos((midpoint.latitude * Math.PI) / 180)));

  return {
    shouldMinimizeDetour,
    waypoints: Array.from({ length: waypointCount }, (_, index) => {
      const ratio = (index + 1) / (waypointCount + 1);
      const direction = index % 2 === 0 ? 1 : -1;
      const jitter = 0.65 + random() * 0.75;
      const center = {
        latitude: start.latitude + deltaLat * ratio,
        longitude: start.longitude + deltaLng * ratio,
      };

      return {
        latitude:
          center.latitude + perpendicular.latitude * latOffsetUnit * direction * jitter,
        longitude:
          center.longitude + perpendicular.longitude * lngOffsetUnit * direction * jitter,
      };
    }),
  };
}

async function requestOrsRoute({ profile, coordinates, apiKey }) {
  const response = await fetch(`${ORS_BASE_URL}/${profile}/geojson`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ coordinates }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || "ORS 경로 생성 요청에 실패했습니다.",
    );
    error.status = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return payload;
}

exports.createRoundTrip = async ({
  latitude,
  longitude,
  distance,
  time,
  type,
  seed,
  originLabel,
}) => {
  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey) {
    const error = new Error("ORS_API_KEY가 설정되어 있지 않습니다.");
    error.status = 503;
    throw error;
  }

  const profile = ORS_PROFILE_BY_TYPE[type] || "foot-walking";
  const targetLengthMeters = distance * 1000;

  const response = await fetch(`${ORS_BASE_URL}/${profile}/geojson`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [[longitude, latitude]],
      options: {
        round_trip: {
          length: targetLengthMeters,
          points: 4,
          seed,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || "ORS 경로 생성 요청에 실패했습니다.",
    );
    error.status = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return buildGeneratedCourse({
    route: payload,
    distance,
    time,
    type,
    seed,
    originLabel,
  });
};

exports.createPointToPoint = async ({
  startLatitude,
  startLongitude,
  startLabel = "출발지",
  endLatitude,
  endLongitude,
  endLabel = "도착지",
  distance,
  time,
  type,
  seed,
}) => {
  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey) {
    const error = new Error("ORS_API_KEY가 설정되어 있지 않습니다.");
    error.status = 503;
    throw error;
  }

  const profile = ORS_PROFILE_BY_TYPE[type] || "foot-walking";
  const start = {
    latitude: Number(startLatitude),
    longitude: Number(startLongitude),
  };
  const end = {
    latitude: Number(endLatitude),
    longitude: Number(endLongitude),
  };
  let lastError = null;
  let usedMinimizedDetour = false;

  for (let attempt = 0; attempt < POINT_TO_POINT_RETRY_LIMIT; attempt += 1) {
    const { waypoints, shouldMinimizeDetour } = createRandomWaypoints({
      start,
      end,
      distance,
      seed,
      attempt,
    });
    usedMinimizedDetour = usedMinimizedDetour || shouldMinimizeDetour;

    try {
      const payload = await requestOrsRoute({
        profile,
        apiKey,
        coordinates: [start, ...waypoints, end].map((point) => [
          point.longitude,
          point.latitude,
        ]),
      });

      return {
        route: buildGeneratedCourse({
          route: payload,
          distance,
          time,
          type,
          seed,
          originLabel: startLabel,
          destinationLabel: endLabel,
          title: "출발-도착 랜덤 산책 코스",
          routeMode: "pointToPoint",
        }),
        retryCount: attempt,
        usedMinimizedDetour,
      };
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error(
    "이 조건으로는 보행 경로를 만들지 못했습니다. 출발지나 도착지를 조금 조정하거나 다시 생성해 주세요.",
  );
  error.status = lastError?.status || 502;
  throw error;
};

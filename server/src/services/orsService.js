const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";
const ORS_PROFILE_BY_TYPE = {
  walk: "foot-walking",
  jogging: "foot-walking",
  running: "foot-walking",
};

function buildGeneratedCourse({ route, distance, time, type, seed }) {
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
    title: "GPS 자동 추천 코스",
    distance: distanceKm,
    time,
    type,
    mood: "city",
    source: "ors",
    seed,
    start_lat: startLat,
    start_lng: startLng,
    geometry: {
      type: "LineString",
      coordinates,
    },
    summary: {
      distance: summary.distance || distance * 1000,
      duration: summary.duration || null,
    },
    description:
      "현재 위치를 출발점으로 ORS가 실제 도로망을 따라 생성한 순환 운동 코스입니다.",
    reason:
      "선택한 거리와 운동 유형을 바탕으로 매일 다른 방향의 코스를 추천합니다.",
    caution:
      "자동 생성 경로이므로 실제 도로 상황, 공사, 보행 가능 여부를 출발 전 지도에서 확인하세요.",
    tip: "휴대폰 배터리와 데이터 연결 상태를 확인하고, 낯선 길에서는 주변을 살피며 이동하세요.",
  };
}

exports.createRoundTrip = async ({
  latitude,
  longitude,
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
  });
};

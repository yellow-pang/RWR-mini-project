const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";
const ORS_PROFILE_BY_TYPE = {
  walk: "foot-walking",
  jogging: "foot-walking",
  running: "foot-walking",
};
const ACTIVITY_SPEEDS_KM_PER_HOUR = {
  walk: 4,
  jogging: 7,
  running: 9,
};
const CANDIDATE_LIMIT = 5;
const METERS_PER_LATITUDE_DEGREE = 111320;

function roundTo(value, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(Number(value) * multiplier) / multiplier;
}

function getActivitySpeed(type) {
  return ACTIVITY_SPEEDS_KM_PER_HOUR[type] || ACTIVITY_SPEEDS_KM_PER_HOUR.walk;
}

function getTargetDistanceKm({ distance, targetDistanceKm, targetMinutes, type }) {
  if (Number.isFinite(Number(targetDistanceKm))) {
    return Number(targetDistanceKm);
  }

  if (Number.isFinite(Number(targetMinutes))) {
    return roundTo((getActivitySpeed(type) * Number(targetMinutes)) / 60, 2);
  }

  return Number(distance);
}

function getEstimatedMinutes({ distance, estimatedMinutes, type }) {
  if (Number.isFinite(Number(estimatedMinutes))) {
    return Math.round(Number(estimatedMinutes));
  }

  return Math.round((Number(distance) / getActivitySpeed(type)) * 60);
}

function getToleranceRate(distanceKm) {
  const targetDistanceKm = Number(distanceKm);

  if (targetDistanceKm <= 1) return 0.3;
  if (targetDistanceKm <= 3) return 0.2;
  if (targetDistanceKm >= 5) return 0.15;
  return 0.2;
}

function buildTargetSummary({
  targetMode,
  targetDistanceKm,
  targetMinutes,
  estimatedMinutes,
  actualDistanceKm,
  actualMinutes,
  candidateCount,
  retryCount,
}) {
  const toleranceRate = getToleranceRate(targetDistanceKm);
  const distanceDeltaKm = roundTo(actualDistanceKm - targetDistanceKm, 1);

  return {
    targetMode,
    targetDistanceKm: roundTo(targetDistanceKm, 2),
    targetMinutes: targetMinutes || null,
    estimatedMinutes: estimatedMinutes || null,
    actualDistanceKm,
    actualMinutes,
    distanceDeltaKm,
    acceptedToleranceRate: toleranceRate,
    distanceRangeKm: {
      min: roundTo(targetDistanceKm * (1 - toleranceRate), 1),
      max: roundTo(targetDistanceKm * (1 + toleranceRate), 1),
    },
    candidateCount,
    retryCount,
  };
}

function isRouteWithinTarget(route, targetDistanceKm) {
  const actualDistanceMeters =
    route.features?.[0]?.properties?.summary?.distance;

  if (!Number.isFinite(Number(actualDistanceMeters))) return false;

  const actualDistanceKm = Number(actualDistanceMeters) / 1000;
  const toleranceRate = getToleranceRate(targetDistanceKm);
  const minDistanceKm = targetDistanceKm * (1 - toleranceRate);
  const maxDistanceKm = targetDistanceKm * (1 + toleranceRate);

  return actualDistanceKm >= minDistanceKm && actualDistanceKm <= maxDistanceKm;
}

function getRouteDistanceDelta(route, targetDistanceKm) {
  const actualDistanceMeters =
    route.features?.[0]?.properties?.summary?.distance || 0;
  return Math.abs(actualDistanceMeters / 1000 - targetDistanceKm);
}

function pickBestCandidate(candidates, targetDistanceKm) {
  return candidates
    .filter((candidate) => isRouteWithinTarget(candidate.payload, targetDistanceKm))
    .sort(
      (a, b) =>
        getRouteDistanceDelta(a.payload, targetDistanceKm) -
        getRouteDistanceDelta(b.payload, targetDistanceKm),
    )[0];
}

function createTargetMissError() {
  const error = new Error(
    "조건에 맞는 코스를 찾지 못했습니다. 현재 주소 주변에서는 선택한 조건에 가까운 경로를 만들기 어렵습니다. 거리 또는 시간을 조금 늘려 다시 시도해 주세요.",
  );
  error.status = 422;
  return error;
}

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
  targetMode = "distance",
  targetDistanceKm,
  targetMinutes,
  estimatedMinutes,
  candidateCount = 1,
  retryCount = 0,
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
  const actualDistanceKm = summary.distance
    ? roundTo(summary.distance / 1000, 1)
    : roundTo(distance, 1);
  const actualMinutes = summary.duration
    ? Math.max(1, Math.round(summary.duration / 60))
    : Math.max(1, Math.round(estimatedMinutes || time));
  const targetSummary = buildTargetSummary({
    targetMode,
    targetDistanceKm: targetDistanceKm || distance,
    targetMinutes,
    estimatedMinutes: estimatedMinutes || time,
    actualDistanceKm,
    actualMinutes,
    candidateCount,
    retryCount,
  });

  return {
    id: `generated-ors-${Date.now()}`,
    title,
    distance: actualDistanceKm,
    time: actualMinutes,
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
    targetSummary,
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

async function requestOrsRoute({ profile, coordinates, apiKey, options }) {
  const response = await fetch(`${ORS_BASE_URL}/${profile}/geojson`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ coordinates, ...(options ? { options } : {}) }),
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
  targetMode = "distance",
  targetDistanceKm,
  targetMinutes,
  estimatedMinutes,
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
  const resolvedTargetDistanceKm = getTargetDistanceKm({
    distance,
    targetDistanceKm,
    targetMinutes,
    type,
  });
  const resolvedEstimatedMinutes = getEstimatedMinutes({
    distance: resolvedTargetDistanceKm,
    estimatedMinutes,
    type,
  });
  const targetLengthMeters = resolvedTargetDistanceKm * 1000;
  const candidates = [];
  let lastError = null;

  for (let attempt = 0; attempt < CANDIDATE_LIMIT; attempt += 1) {
    try {
      const payload = await requestOrsRoute({
        profile,
        apiKey,
        coordinates: [[longitude, latitude]],
        options: {
          round_trip: {
            length: targetLengthMeters,
            points: 4,
            seed: (Number(seed) || Date.now()) + attempt * 97,
          },
        },
      });

      candidates.push({ payload, attempt });
    } catch (error) {
      lastError = error;
    }
  }

  const bestCandidate = pickBestCandidate(candidates, resolvedTargetDistanceKm);

  if (!bestCandidate) {
    if (candidates.length === 0 && lastError) {
      throw lastError;
    }

    throw createTargetMissError();
  }

  return buildGeneratedCourse({
    route: bestCandidate.payload,
    distance: resolvedTargetDistanceKm,
    time: resolvedEstimatedMinutes,
    type,
    seed,
    originLabel,
    targetMode,
    targetDistanceKm: resolvedTargetDistanceKm,
    targetMinutes,
    estimatedMinutes: resolvedEstimatedMinutes,
    candidateCount: candidates.length,
    retryCount: bestCandidate.attempt,
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
  targetMode = "distance",
  targetDistanceKm,
  targetMinutes,
  estimatedMinutes,
  seed,
}) => {
  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey) {
    const error = new Error("ORS_API_KEY가 설정되어 있지 않습니다.");
    error.status = 503;
    throw error;
  }

  const profile = ORS_PROFILE_BY_TYPE[type] || "foot-walking";
  const resolvedTargetDistanceKm = getTargetDistanceKm({
    distance,
    targetDistanceKm,
    targetMinutes,
    type,
  });
  const resolvedEstimatedMinutes = getEstimatedMinutes({
    distance: resolvedTargetDistanceKm,
    estimatedMinutes,
    type,
  });
  const start = {
    latitude: Number(startLatitude),
    longitude: Number(startLongitude),
  };
  const end = {
    latitude: Number(endLatitude),
    longitude: Number(endLongitude),
  };
  const candidates = [];
  let lastError = null;

  try {
    const directPayload = await requestOrsRoute({
      profile,
      apiKey,
      coordinates: [
        [start.longitude, start.latitude],
        [end.longitude, end.latitude],
      ],
    });
    const directDistanceKm =
      directPayload.features?.[0]?.properties?.summary?.distance / 1000;
    const toleranceRate = getToleranceRate(resolvedTargetDistanceKm);

    if (directDistanceKm > resolvedTargetDistanceKm * (1 + toleranceRate)) {
      const error = new Error(
        `선택한 도착지는 목표 거리보다 멉니다. 목표 거리: ${resolvedTargetDistanceKm}km, 예상 경로: ${roundTo(directDistanceKm, 1)}km. 조건을 변경하거나 다른 도착지를 선택해 주세요.`,
      );
      error.status = 422;
      throw error;
    }

    candidates.push({ payload: directPayload, attempt: 0 });
  } catch (error) {
    if (error.status === 422) {
      throw error;
    }
    lastError = error;
  }

  for (let attempt = 0; attempt < CANDIDATE_LIMIT; attempt += 1) {
    const { waypoints, shouldMinimizeDetour } = createRandomWaypoints({
      start,
      end,
      distance: resolvedTargetDistanceKm,
      seed,
      attempt,
    });

    if (shouldMinimizeDetour && waypoints.length === 0) {
      continue;
    }

    try {
      const payload = await requestOrsRoute({
        profile,
        apiKey,
        coordinates: [start, ...waypoints, end].map((point) => [
          point.longitude,
          point.latitude,
        ]),
      });

      candidates.push({ payload, attempt: attempt + 1 });
    } catch (error) {
      lastError = error;
    }
  }

  const bestCandidate = pickBestCandidate(candidates, resolvedTargetDistanceKm);

  if (bestCandidate) {
    return {
      route: buildGeneratedCourse({
        route: bestCandidate.payload,
        distance: resolvedTargetDistanceKm,
        time: resolvedEstimatedMinutes,
        type,
        seed,
        originLabel: startLabel,
        destinationLabel: endLabel,
        title: "출발-도착 랜덤 산책 코스",
        routeMode: "pointToPoint",
        targetMode,
        targetDistanceKm: resolvedTargetDistanceKm,
        targetMinutes,
        estimatedMinutes: resolvedEstimatedMinutes,
        candidateCount: candidates.length,
        retryCount: bestCandidate.attempt,
      }),
      retryCount: bestCandidate.attempt,
    };
  }

  if (candidates.length === 0 && lastError) {
    throw lastError;
  }

  throw createTargetMissError();
};

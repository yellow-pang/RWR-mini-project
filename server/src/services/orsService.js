const ORS_BASE_URL = "https://api.openrouteservice.org/v2/directions";
const poiService = require("./poiService");
const fetchWithTimeout = require("../utils/fetchWithTimeout");
const {
  POI_PREFERENCE_LABELS,
  ROUTE_THEME_LABELS,
  normalizePoiPreferences,
  normalizeRouteTheme,
} = require("../constants/poiCategories");
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
const ORS_TIMEOUT_MS = 8000;
const METERS_PER_LATITUDE_DEGREE = 111320;
const DETOUR_LEVELS = {
  LIGHT: "light",
  MEDIUM: "medium",
  STRONG: "strong",
};
const DETOUR_SETTINGS = {
  [DETOUR_LEVELS.LIGHT]: {
    waypointDelta: -1,
    minWaypointCount: 0,
    offsetMultiplier: 0.65,
  },
  [DETOUR_LEVELS.MEDIUM]: {
    waypointDelta: 0,
    minWaypointCount: 1,
    offsetMultiplier: 1,
  },
  [DETOUR_LEVELS.STRONG]: {
    waypointDelta: 1,
    minWaypointCount: 1,
    offsetMultiplier: 1.35,
  },
};

function normalizeDetourLevel(detourLevel) {
  return DETOUR_SETTINGS[detourLevel] ? detourLevel : DETOUR_LEVELS.MEDIUM;
}

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

function buildPoiSummary({
  routeTheme,
  poiPreferences,
  pois = [],
  usedPoi = false,
  poiFallback = false,
  fallbackReason,
}) {
  const theme = normalizeRouteTheme(routeTheme);
  const preferences = normalizePoiPreferences(poiPreferences, theme);
  const selectedPois = pois.slice(0, 3);
  const preferenceLabels = preferences.map(
    (preference) => POI_PREFERENCE_LABELS[preference],
  );

  return {
    routeTheme: theme,
    themeLabel: ROUTE_THEME_LABELS[theme],
    poiPreferences: preferences,
    preferenceLabels,
    usedPoi,
    poiFallback,
    fallbackReason,
    poiNames: selectedPois.map((poi) => poi.name).filter(Boolean),
    poiCategories: selectedPois.map((poi) => poi.category).filter(Boolean),
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

function pickBestCandidate(candidates, targetDistanceKm, preferPoi = false) {
  return candidates
    .filter((candidate) => isRouteWithinTarget(candidate.payload, targetDistanceKm))
    .sort(
      (a, b) => {
        if (preferPoi) {
          const poiPriority =
            Number(Boolean(b.poiSummary?.usedPoi)) -
            Number(Boolean(a.poiSummary?.usedPoi));

          if (poiPriority !== 0) return poiPriority;
        }

        return (
          getRouteDistanceDelta(a.payload, targetDistanceKm) -
          getRouteDistanceDelta(b.payload, targetDistanceKm)
        );
      },
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
  poiSummary,
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
  const poiPreferenceLabel =
    poiSummary?.preferenceLabels?.length > 0
      ? poiSummary.preferenceLabels.join(", ")
      : poiSummary?.themeLabel;

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
    poiSummary,
    description:
      routeMode === "pointToPoint"
        ? `${originLabel}에서 ${destinationLabel}까지 ORS가 실제 도로망을 따라 생성한 산책형 이동 코스입니다.`
        : `${originLabel}을 출발점으로 ORS가 실제 도로망을 따라 생성한 순환 운동 코스입니다.`,
    reason:
      poiSummary?.usedPoi
        ? `${poiPreferenceLabel} 분위기에 어울리는 주변 장소 후보를 참고해 코스를 만들었습니다.`
        : routeMode === "pointToPoint"
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

function shufflePoiCandidates(poiCandidates, seed, salt = 0) {
  const random = createSeededRandom((Number(seed) || Date.now()) + salt);
  const shuffledPois = [...poiCandidates];

  for (let index = shuffledPois.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(random() * (index + 1));
    [shuffledPois[index], shuffledPois[nextIndex]] = [
      shuffledPois[nextIndex],
      shuffledPois[index],
    ];
  }

  return shuffledPois;
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

function getBaseWaypointCount(distance) {
  if (distance >= 5) return 3;
  if (distance >= 3) return 2;
  return 1;
}

function getWaypointCount(distance, shouldMinimizeDetour, detourLevel) {
  if (shouldMinimizeDetour) return 0;
  const settings = DETOUR_SETTINGS[detourLevel];
  const baseWaypointCount = getBaseWaypointCount(distance);

  return Math.max(
    settings.minWaypointCount,
    Math.min(4, baseWaypointCount + settings.waypointDelta),
  );
}

function createRandomWaypoints({
  start,
  end,
  distance,
  seed,
  attempt,
  detourLevel,
}) {
  const resolvedDetourLevel = normalizeDetourLevel(detourLevel);
  const detourSettings = DETOUR_SETTINGS[resolvedDetourLevel];
  const baseDistanceMeters = getDistanceInMeters(start, end);
  const targetLengthMeters = distance * 1000;
  const shouldMinimizeDetour = baseDistanceMeters * 1.25 >= targetLengthMeters;
  const waypointCount = getWaypointCount(
    distance,
    shouldMinimizeDetour,
    resolvedDetourLevel,
  );

  if (waypointCount === 0) {
    return {
      waypoints: [],
      shouldMinimizeDetour,
      detourLevel: resolvedDetourLevel,
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
  const offsetMeters =
    Math.min(1100, Math.max(160, remainingMeters / 3)) *
    detourSettings.offsetMultiplier;
  const latOffsetUnit = offsetMeters / METERS_PER_LATITUDE_DEGREE;
  const lngOffsetUnit =
    offsetMeters /
    (METERS_PER_LATITUDE_DEGREE *
      Math.max(0.35, Math.cos((midpoint.latitude * Math.PI) / 180)));

  return {
    shouldMinimizeDetour,
    detourLevel: resolvedDetourLevel,
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
  const response = await fetchWithTimeout(
    `${ORS_BASE_URL}/${profile}/geojson`,
    {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates, ...(options ? { options } : {}) }),
    },
    {
      timeoutMs: ORS_TIMEOUT_MS,
      timeoutMessage:
        "외부 경로 서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    },
  );

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
  routeTheme = "any",
  poiPreferences,
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
  let poiFallbackReason = "";
  const resolvedRouteTheme = normalizeRouteTheme(routeTheme);
  const resolvedPoiPreferences = normalizePoiPreferences(
    poiPreferences,
    resolvedRouteTheme,
  );

  try {
    const poiCandidates = await poiService.searchRouteThemePois({
      routeTheme: resolvedRouteTheme,
      poiPreferences: resolvedPoiPreferences,
      points: [{ latitude: Number(latitude), longitude: Number(longitude) }],
      targetDistanceKm: resolvedTargetDistanceKm,
    });
    const shuffledPoiCandidates = shufflePoiCandidates(poiCandidates, seed, 31);

    for (
      let attempt = 0;
      attempt < Math.min(CANDIDATE_LIMIT, shuffledPoiCandidates.length);
      attempt += 1
    ) {
      const poi = shuffledPoiCandidates[attempt];

      try {
        const payload = await requestOrsRoute({
          profile,
          apiKey,
          coordinates: [
            [longitude, latitude],
            [poi.longitude, poi.latitude],
            [longitude, latitude],
          ],
        });

        candidates.push({
          payload,
          attempt,
          poiSummary: buildPoiSummary({
            routeTheme: resolvedRouteTheme,
            poiPreferences: resolvedPoiPreferences,
            pois: [poi],
            usedPoi: true,
          }),
        });
      } catch (error) {
        lastError = error;
      }
    }
  } catch {
    poiFallbackReason =
      "주변 장소 후보를 불러오지 못해 기존 랜덤 방식으로 코스를 생성했습니다.";
  }

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

      candidates.push({
        payload,
        attempt,
        poiSummary: buildPoiSummary({
          routeTheme: resolvedRouteTheme,
          poiPreferences: resolvedPoiPreferences,
          usedPoi: false,
          poiFallback: true,
          fallbackReason:
            poiFallbackReason ||
            "목표 거리와 맞는 주변 장소 후보가 부족해 기존 랜덤 방식으로 코스를 생성했습니다.",
        }),
      });
    } catch (error) {
      lastError = error;
    }
  }

  const bestCandidate = pickBestCandidate(
    candidates,
    resolvedTargetDistanceKm,
    resolvedPoiPreferences.length > 0,
  );

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
    poiSummary: bestCandidate.poiSummary,
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
  detourLevel = DETOUR_LEVELS.MEDIUM,
  routeTheme = "any",
  poiPreferences,
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
  const resolvedDetourLevel = normalizeDetourLevel(detourLevel);
  const resolvedRouteTheme = normalizeRouteTheme(routeTheme);
  const resolvedPoiPreferences = normalizePoiPreferences(
    poiPreferences,
    resolvedRouteTheme,
  );
  const candidates = [];
  let lastError = null;
  let poiCandidates = [];
  let poiFallbackReason = "";

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

    candidates.push({
      payload: directPayload,
      attempt: 0,
      poiSummary:
        resolvedPoiPreferences.length > 0
          ? buildPoiSummary({
              routeTheme: resolvedRouteTheme,
              poiPreferences: resolvedPoiPreferences,
              usedPoi: false,
              poiFallback: true,
              fallbackReason:
                "선택한 분위기 후보가 부족해 기본 출발-도착 코스로 추천했습니다.",
            })
          : undefined,
    });
  } catch (error) {
    if (error.status === 422) {
      throw error;
    }
    lastError = error;
  }

  try {
    poiCandidates = await poiService.searchRouteThemePois({
      routeTheme: resolvedRouteTheme,
      poiPreferences: resolvedPoiPreferences,
      points: poiService.getPointToPointSearchCenters({ start, end }),
      targetDistanceKm: resolvedTargetDistanceKm,
    });
    poiCandidates = shufflePoiCandidates(poiCandidates, seed, 53);
  } catch {
    poiFallbackReason =
      "주변 장소 후보를 불러오지 못해 기존 랜덤 경유지로 코스를 생성했습니다.";
  }

  for (
    let attempt = 0;
    attempt < Math.min(CANDIDATE_LIMIT, poiCandidates.length);
    attempt += 1
  ) {
    const poi = poiCandidates[attempt];

    try {
      const payload = await requestOrsRoute({
        profile,
        apiKey,
        coordinates: [
          [start.longitude, start.latitude],
          [poi.longitude, poi.latitude],
          [end.longitude, end.latitude],
        ],
      });

      candidates.push({
        payload,
        attempt: attempt + 1,
        poiSummary: buildPoiSummary({
          routeTheme: resolvedRouteTheme,
          poiPreferences: resolvedPoiPreferences,
          pois: [poi],
          usedPoi: true,
        }),
      });
    } catch (error) {
      lastError = error;
    }
  }

  for (let attempt = 0; attempt < CANDIDATE_LIMIT; attempt += 1) {
    const { waypoints, shouldMinimizeDetour } = createRandomWaypoints({
      start,
      end,
      distance: resolvedTargetDistanceKm,
      seed,
      attempt,
      detourLevel: resolvedDetourLevel,
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

      candidates.push({
        payload,
        attempt: attempt + 1,
        poiSummary: buildPoiSummary({
          routeTheme: resolvedRouteTheme,
          poiPreferences: resolvedPoiPreferences,
          usedPoi: false,
          poiFallback: true,
          fallbackReason:
            poiFallbackReason ||
            "목표 거리와 맞는 주변 장소 후보가 부족해 기존 랜덤 경유지로 코스를 생성했습니다.",
        }),
      });
    } catch (error) {
      lastError = error;
    }
  }

  const bestCandidate = pickBestCandidate(
    candidates,
    resolvedTargetDistanceKm,
    resolvedPoiPreferences.length > 0,
  );

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
        poiSummary: bestCandidate.poiSummary,
      }),
      retryCount: bestCandidate.attempt,
      detourLevel: resolvedDetourLevel,
    };
  }

  if (candidates.length === 0 && lastError) {
    throw lastError;
  }

  throw createTargetMissError();
};

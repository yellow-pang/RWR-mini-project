const {
  ROUTE_THEME_KEYWORDS,
  ROUTE_THEME_LABELS,
  normalizeRouteTheme,
} = require("../constants/poiCategories");

const KAKAO_LOCAL_BASE_URL = "https://dapi.kakao.com/v2/local";
const DEFAULT_RESULT_SIZE = 5;
const MAX_POI_CANDIDATES = 10;

function getKakaoApiKey() {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    const error = new Error("KAKAO_REST_API_KEY가 설정되어 있지 않습니다.");
    error.status = 503;
    throw error;
  }

  return apiKey;
}

function getSearchRadiusMeters(targetDistanceKm) {
  const distanceKm = Number(targetDistanceKm);

  if (distanceKm <= 1) return 500;
  if (distanceKm <= 3) return 1000;
  return 1500;
}

async function requestKakaoKeywordSearch(params) {
  const url = new URL(`${KAKAO_LOCAL_BASE_URL}/search/keyword.json`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${getKakaoApiKey()}`,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message || "카카오 장소 검색 요청에 실패했습니다.",
    );
    error.status = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return payload;
}

function mapPoiDocument(document, { theme, keyword, centerIndex, index }) {
  const latitude = Number(document.y);
  const longitude = Number(document.x);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id:
      document.id ||
      `kakao-poi-${theme}-${centerIndex}-${index}-${latitude}-${longitude}`,
    name: document.place_name || keyword,
    category: keyword,
    theme,
    themeLabel: ROUTE_THEME_LABELS[theme],
    latitude,
    longitude,
    source: "kakao-local",
  };
}

function dedupePois(pois) {
  const seen = new Set();
  const uniquePois = [];

  pois.forEach((poi) => {
    const key = poi.id || `${poi.name}-${poi.latitude}-${poi.longitude}`;
    if (seen.has(key)) return;

    seen.add(key);
    uniquePois.push(poi);
  });

  return uniquePois;
}

function getMidpoint(pointA, pointB) {
  return {
    latitude: (pointA.latitude + pointB.latitude) / 2,
    longitude: (pointA.longitude + pointB.longitude) / 2,
  };
}

exports.getRouteThemeLabel = function getRouteThemeLabel(routeTheme) {
  return ROUTE_THEME_LABELS[normalizeRouteTheme(routeTheme)];
};

exports.searchRouteThemePois = async function searchRouteThemePois({
  routeTheme,
  points,
  targetDistanceKm,
}) {
  const theme = normalizeRouteTheme(routeTheme);
  const keywords = ROUTE_THEME_KEYWORDS[theme] || ROUTE_THEME_KEYWORDS.any;
  const radius = getSearchRadiusMeters(targetDistanceKm);
  const searches = [];

  points.forEach((point, centerIndex) => {
    if (
      !Number.isFinite(Number(point.latitude)) ||
      !Number.isFinite(Number(point.longitude))
    ) {
      return;
    }

    keywords.forEach((keyword) => {
      searches.push(
        requestKakaoKeywordSearch({
          query: keyword,
          x: point.longitude,
          y: point.latitude,
          radius,
          size: DEFAULT_RESULT_SIZE,
          sort: "distance",
        }).then((payload) =>
          (payload.documents || [])
            .map((document, index) =>
              mapPoiDocument(document, { theme, keyword, centerIndex, index }),
            )
            .filter(Boolean),
        ),
      );
    });
  });

  const results = await Promise.allSettled(searches);
  const pois = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);

  return dedupePois(pois).slice(0, MAX_POI_CANDIDATES);
};

exports.getPointToPointSearchCenters = function getPointToPointSearchCenters({
  start,
  end,
}) {
  return [start, getMidpoint(start, end), end];
};

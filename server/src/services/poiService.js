const {
  POI_PREFERENCE_LABELS,
  POI_SEARCH_STRATEGIES,
  ROUTE_THEME_KEYWORDS,
  ROUTE_THEME_LABELS,
  normalizePoiPreferences,
  normalizeRouteTheme,
} = require("../constants/poiCategories");
const fetchWithTimeout = require("../utils/fetchWithTimeout");
const { createCacheKey, createTtlCache } = require("../utils/ttlCache");

const KAKAO_LOCAL_BASE_URL = "https://dapi.kakao.com/v2/local";
const DEFAULT_RESULT_SIZE = 5;
const MAX_POI_CANDIDATES = 10;
const KAKAO_POI_TIMEOUT_MS = 5000;
const POI_CACHE_TTL_MS = 30 * 1000;
const poiCache = createTtlCache({ ttlMs: POI_CACHE_TTL_MS });

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

async function requestKakaoLocalSearch(path, params) {
  const url = new URL(`${KAKAO_LOCAL_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        Authorization: `KakaoAK ${getKakaoApiKey()}`,
      },
    },
    {
      timeoutMs: KAKAO_POI_TIMEOUT_MS,
      timeoutMessage:
        "주변 장소 검색 서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    },
  );

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

function requestKakaoKeywordSearch(params) {
  return requestKakaoLocalSearch("/search/keyword.json", params);
}

function requestKakaoCategorySearch(params) {
  return requestKakaoLocalSearch("/search/category.json", params);
}

function mapPoiDocument(
  document,
  { theme, preference, label, category, centerIndex, index, matchSource },
) {
  const latitude = Number(document.y);
  const longitude = Number(document.x);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id:
      document.id ||
      `kakao-poi-${theme}-${preference || category}-${centerIndex}-${index}-${latitude}-${longitude}`,
    name: document.place_name || label,
    category: label,
    theme,
    themeLabel: ROUTE_THEME_LABELS[theme],
    preference,
    preferenceLabel: preference ? POI_PREFERENCE_LABELS[preference] : null,
    matchSource,
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
  poiPreferences,
  points,
  targetDistanceKm,
}) {
  const theme = normalizeRouteTheme(routeTheme);
  const preferences = normalizePoiPreferences(poiPreferences, theme);
  const legacyKeywords = ROUTE_THEME_KEYWORDS[theme] || ROUTE_THEME_KEYWORDS.any;
  const radius = getSearchRadiusMeters(targetDistanceKm);

  async function searchPreferenceAtPoint({ preference, point, centerIndex }) {
    const strategy = POI_SEARCH_STRATEGIES[preference];
    const categoryResults = await Promise.allSettled(
      strategy.categoryCodes.map((categoryCode) =>
        requestKakaoCategorySearch({
          category_group_code: categoryCode,
          x: point.longitude,
          y: point.latitude,
          radius,
          size: DEFAULT_RESULT_SIZE,
          sort: "distance",
        }).then((payload) =>
          (payload.documents || []).map((document, index) =>
            mapPoiDocument(document, {
              theme,
              preference,
              label: POI_PREFERENCE_LABELS[preference],
              category: categoryCode,
              centerIndex,
              index,
              matchSource: "category",
            }),
          ),
        ),
      ),
    );
    const categoryDocuments = categoryResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);

    const validCategoryDocuments = categoryDocuments.filter(Boolean);
    if (validCategoryDocuments.length > 0) {
      return validCategoryDocuments;
    }

    const keywordResults = await Promise.allSettled(
      strategy.keywords.map((keyword) =>
        requestKakaoKeywordSearch({
          query: keyword,
          x: point.longitude,
          y: point.latitude,
          radius,
          size: DEFAULT_RESULT_SIZE,
          sort: "distance",
        }).then((payload) =>
          (payload.documents || []).map((document, index) =>
            mapPoiDocument(document, {
              theme,
              preference,
              label: keyword,
              category: keyword,
              centerIndex,
              index,
              matchSource: "keyword",
            }),
          ),
        ),
      ),
    );

    return keywordResults
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .filter(Boolean);
  }

  const cacheKey = createCacheKey("poi-search", {
    routeTheme: theme,
    preferences,
    points,
    targetDistanceKm,
  });

  return poiCache.getOrSet(cacheKey, async () => {
    const searches = [];

    points.forEach((point, centerIndex) => {
      if (
        !Number.isFinite(Number(point.latitude)) ||
        !Number.isFinite(Number(point.longitude))
      ) {
        return;
      }

      if (preferences.length > 0) {
        preferences.forEach((preference) => {
          searches.push(searchPreferenceAtPoint({ preference, point, centerIndex }));
        });
        return;
      }

      legacyKeywords.forEach((keyword) => {
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
                mapPoiDocument(document, {
                  theme,
                  label: keyword,
                  category: keyword,
                  centerIndex,
                  index,
                  matchSource: "keyword",
                }),
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
  });
};

exports.getPointToPointSearchCenters = function getPointToPointSearchCenters({
  start,
  end,
}) {
  return [start, getMidpoint(start, end), end];
};

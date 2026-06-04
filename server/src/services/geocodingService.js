const KAKAO_LOCAL_BASE_URL = "https://dapi.kakao.com/v2/local";
const fetchWithTimeout = require("../utils/fetchWithTimeout");
const { createCacheKey, createTtlCache } = require("../utils/ttlCache");
const securityConfig = require("../config/securityConfig");

const LOCATION_CACHE_TTL_MS = 30 * 1000;
const locationCache = createTtlCache({ ttlMs: LOCATION_CACHE_TTL_MS });

function getKakaoApiKey() {
  const apiKey = process.env.KAKAO_REST_API_KEY;

  if (!apiKey) {
    const error = new Error("KAKAO_REST_API_KEY가 설정되어 있지 않습니다.");
    error.status = 503;
    throw error;
  }

  return apiKey;
}

async function requestKakao(path, params) {
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
      timeoutMs: securityConfig.kakaoTimeoutMs,
      timeoutMessage:
        "위치 변환 서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message || "카카오 위치 변환 요청에 실패했습니다.",
    );
    error.status = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  return payload;
}

function mapAddressDocument(result, index) {
  const roadAddress = result.road_address?.address_name || "";
  const jibunAddress = result.address?.address_name || "";
  const address = roadAddress || result.address_name || jibunAddress;
  const region = result.address
    ? [result.address.region_1depth_name, result.address.region_2depth_name]
        .filter(Boolean)
        .join(" ")
    : "";

  return {
    id: `kakao-address-${index}`,
    address,
    roadAddress,
    jibunAddress,
    buildingName: result.road_address?.building_name || "",
    region,
    latitude: Number(result.y),
    longitude: Number(result.x),
    source: "kakao-address",
  };
}

exports.geocodeAddress = async (address) => {
  const cacheKey = createCacheKey("geocode", { address });

  return locationCache.getOrSet(cacheKey, async () => {
    const payload = await requestKakao("/search/address.json", {
      query: address,
    });
    const result = payload.documents?.[0];

    if (!result) {
      const error = new Error("입력한 주소의 좌표를 찾을 수 없습니다.");
      error.status = 404;
      throw error;
    }

    return {
      address: result.address_name || address,
      latitude: Number(result.y),
      longitude: Number(result.x),
      source: "kakao-address",
    };
  });
};

exports.searchAddresses = async (query) => {
  const cacheKey = createCacheKey("address-search", { query });

  return locationCache.getOrSet(cacheKey, async () => {
    const payload = await requestKakao("/search/address.json", {
      query,
      size: 10,
    });

    return (payload.documents || [])
      .slice(0, 10)
      .map(mapAddressDocument)
      .filter(
        (location) =>
          location.address &&
          Number.isFinite(location.latitude) &&
          Number.isFinite(location.longitude),
      );
  });
};

exports.reverseGeocode = async ({ latitude, longitude }) => {
  const cacheKey = createCacheKey("reverse-geocode", {
    latitude,
    longitude,
  });

  return locationCache.getOrSet(cacheKey, async () => {
    const payload = await requestKakao("/geo/coord2address.json", {
      x: longitude,
      y: latitude,
    });
    const result = payload.documents?.[0];

    if (!result) {
      const error = new Error("현재 위치의 주소를 찾을 수 없습니다.");
      error.status = 404;
      throw error;
    }

    const address =
      result.road_address?.address_name ||
      result.address?.address_name ||
      "현재 위치 기준";

    return {
      address,
      latitude,
      longitude,
      source: "kakao-coord",
    };
  });
};

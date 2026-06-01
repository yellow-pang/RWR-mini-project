const KAKAO_LOCAL_BASE_URL = "https://dapi.kakao.com/v2/local";

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

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${getKakaoApiKey()}`,
    },
  });

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
};

exports.searchAddresses = async (query) => {
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
};

exports.reverseGeocode = async ({ latitude, longitude }) => {
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
};

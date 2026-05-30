const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const API_PATH_PREFIX = "/api";

const FALLBACK_MESSAGES = {
  400: "요청 값이 올바르지 않습니다. 입력한 조건을 다시 확인해 주세요.",
  404: "요청한 데이터를 찾을 수 없습니다.",
  409: "이미 처리된 요청입니다.",
  413: "요청 데이터가 너무 큽니다.",
  500: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getFriendlyErrorMessage(error, fallback) {
  if (error instanceof ApiError) {
    return error.message || FALLBACK_MESSAGES[error.status] || fallback;
  }

  if (error instanceof TypeError) {
    return "서버에 연결할 수 없습니다. API 서버가 실행 중인지 확인해 주세요.";
  }

  return fallback || "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function buildUrl(path, params = {}) {
  const baseUrl = API_BASE_URL.replace(/\/+$/, "");
  const normalizedBaseUrl = baseUrl.endsWith(API_PATH_PREFIX)
    ? baseUrl
    : `${baseUrl}${API_PATH_PREFIX}`;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

export async function requestJson(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new ApiError(getFriendlyErrorMessage(error), 0);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message ||
        FALLBACK_MESSAGES[response.status] ||
        "API 요청에 실패했습니다.",
      response.status,
    );
  }

  return payload;
}

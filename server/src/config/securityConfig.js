function readPositiveIntegerEnv(name, fallbackValue) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue === "") {
    return fallbackValue;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
}

const securityConfig = {
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "4kb",
  defaultApiRateLimitWindowMs: readPositiveIntegerEnv(
    "API_RATE_LIMIT_WINDOW_MS",
    15 * 60 * 1000,
  ),
  defaultApiRateLimitMax: readPositiveIntegerEnv("API_RATE_LIMIT_MAX", 300),
  externalApiRateLimitWindowMs: readPositiveIntegerEnv(
    "EXTERNAL_API_RATE_LIMIT_WINDOW_MS",
    5 * 60 * 1000,
  ),
  externalApiRateLimitMax: readPositiveIntegerEnv(
    "EXTERNAL_API_RATE_LIMIT_MAX",
    60,
  ),
  orsTimeoutMs: readPositiveIntegerEnv("ORS_TIMEOUT_MS", 8000),
  kakaoTimeoutMs: readPositiveIntegerEnv("KAKAO_TIMEOUT_MS", 5000),
  kakaoPoiTimeoutMs: readPositiveIntegerEnv("KAKAO_POI_TIMEOUT_MS", 5000),
};

module.exports = securityConfig;

async function fetchWithTimeout(
  url,
  options = {},
  { timeoutMs, timeoutMessage } = {},
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(
        timeoutMessage || "외부 API 응답이 지연되고 있습니다.",
      );
      timeoutError.name = "ExternalApiTimeoutError";
      timeoutError.status = 504;
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = fetchWithTimeout;

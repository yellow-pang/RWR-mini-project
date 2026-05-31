const GEOLOCATION_TIMEOUT_MS = 8000;

export class GeolocationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "GeolocationError";
    this.code = code;
  }
}

export function getCurrentPosition() {
  if (!("geolocation" in navigator)) {
    return Promise.reject(
      new GeolocationError(
        "브라우저가 위치 기능을 지원하지 않습니다.",
        "unsupported",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new GeolocationError(error.message, error.code));
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 60_000,
      },
    );
  });
}

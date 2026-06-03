import { buildUrl, requestJson } from "./client";

export async function createRoundTripRoute({
  latitude,
  longitude,
  distance,
  time,
  type,
  seed,
}) {
  return requestJson(buildUrl("/routes/round-trip"), {
    method: "POST",
    body: JSON.stringify({
      latitude,
      longitude,
      distance,
      time,
      type,
      seed,
    }),
  });
}

export async function createAddressRoundTripRoute({
  address,
  latitude,
  longitude,
  distance,
  time,
  type,
  targetMode,
  targetDistanceKm,
  targetMinutes,
  estimatedMinutes,
  seed,
  exclude,
}) {
  const body = {
    address,
    distance,
    time,
    type,
    targetMode,
    targetDistanceKm,
    targetMinutes,
    estimatedMinutes,
    seed,
  };

  if (latitude !== null && latitude !== undefined) {
    body.latitude = latitude;
  }

  if (longitude !== null && longitude !== undefined) {
    body.longitude = longitude;
  }

  if (exclude) {
    body.exclude = exclude;
  }

  return requestJson(buildUrl("/routes/address-round-trip"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createAddressPointToPointRoute({
  startAddress,
  startLatitude,
  startLongitude,
  endAddress,
  endLatitude,
  endLongitude,
  distance,
  time,
  type,
  targetMode,
  targetDistanceKm,
  targetMinutes,
  estimatedMinutes,
  detourLevel,
  seed,
}) {
  const body = {
    startAddress,
    endAddress,
    distance,
    time,
    type,
    targetMode,
    targetDistanceKm,
    targetMinutes,
    estimatedMinutes,
    detourLevel,
    seed,
  };

  if (startLatitude !== null && startLatitude !== undefined) {
    body.startLatitude = startLatitude;
  }

  if (startLongitude !== null && startLongitude !== undefined) {
    body.startLongitude = startLongitude;
  }

  if (endLatitude !== null && endLatitude !== undefined) {
    body.endLatitude = endLatitude;
  }

  if (endLongitude !== null && endLongitude !== undefined) {
    body.endLongitude = endLongitude;
  }

  return requestJson(buildUrl("/routes/address-point-to-point"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

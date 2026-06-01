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
  seed,
  exclude,
}) {
  const body = {
    address,
    distance,
    time,
    type,
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

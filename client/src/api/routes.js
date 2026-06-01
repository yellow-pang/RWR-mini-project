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
  return requestJson(buildUrl("/routes/address-round-trip"), {
    method: "POST",
    body: JSON.stringify({
      address,
      latitude,
      longitude,
      distance,
      time,
      type,
      seed,
      exclude,
    }),
  });
}

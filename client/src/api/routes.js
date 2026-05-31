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

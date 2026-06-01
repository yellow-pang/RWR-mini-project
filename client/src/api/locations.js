import { buildUrl, requestJson } from "./client";

export async function reverseGeocodeLocation({ latitude, longitude }) {
  return requestJson(buildUrl("/locations/reverse-geocode"), {
    method: "POST",
    body: JSON.stringify({
      latitude,
      longitude,
    }),
  });
}

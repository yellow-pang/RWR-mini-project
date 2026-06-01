import { buildUrl, requestJson } from "./client";

export async function searchAddresses({ query }) {
  return requestJson(buildUrl("/locations/search"), {
    method: "POST",
    body: JSON.stringify({
      query,
    }),
  });
}

export async function geocodeAddress({ address }) {
  return requestJson(buildUrl("/locations/geocode"), {
    method: "POST",
    body: JSON.stringify({
      address,
    }),
  });
}

export async function reverseGeocodeLocation({ latitude, longitude }) {
  return requestJson(buildUrl("/locations/reverse-geocode"), {
    method: "POST",
    body: JSON.stringify({
      latitude,
      longitude,
    }),
  });
}

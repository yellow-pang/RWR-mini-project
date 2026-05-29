import { buildUrl, requestJson } from "./client";

export async function fetchFavorites(userId) {
  return requestJson(buildUrl("/favorites", { userId }));
}

export async function addFavorite(userId, courseId) {
  return requestJson(buildUrl("/favorites"), {
    method: "POST",
    body: JSON.stringify({ userId, courseId }),
  });
}

export async function removeFavorite(userId, courseId) {
  return requestJson(buildUrl(`/favorites/${courseId}`, { userId }), {
    method: "DELETE",
  });
}

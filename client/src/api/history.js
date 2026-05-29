import { buildUrl, requestJson } from "./client";

export async function fetchHistory(userId, limit = 10) {
  return requestJson(buildUrl("/history", { userId, limit }));
}

export async function addHistory(userId, courseId) {
  return requestJson(buildUrl("/history"), {
    method: "POST",
    body: JSON.stringify({ userId, courseId }),
  });
}

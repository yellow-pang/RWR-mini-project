import { buildUrl, requestJson } from "./client";

export async function fetchRandomCourse({ distance, time, type, exclude }) {
  const url = buildUrl("/courses/random", {
    distance,
    time,
    type,
    exclude,
  });
  return requestJson(url);
}

export async function fetchCourseById(id) {
  return requestJson(buildUrl(`/courses/${id}`));
}

import { addHistory } from "../api/history";
import { getUserId } from "./userId";

export const HISTORY_SAVE_FAILED_MESSAGE =
  "추천 결과는 표시되지만 최근 이력 저장은 실패했습니다.";

export function isPersistedCourseId(courseId) {
  return /^route-[a-z0-9-]{1,14}$/.test(courseId || "");
}

export async function saveHistoryQuietly(courseId) {
  if (!isPersistedCourseId(courseId)) {
    return true;
  }

  try {
    await addHistory(getUserId(), courseId);
    return true;
  } catch {
    return false;
  }
}

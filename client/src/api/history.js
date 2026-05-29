/**
 * 추천 이력 API 함수 모음
 * Step 05 (프론트엔드-백엔드 연동) 단계에서 실제 fetch 구현 예정
 *
 * 응답 형식: { success: true, data: ... } / { success: false, message: ... }
 */

/**
 * 사용자의 최근 추천 이력을 가져옵니다. (최대 10개)
 * @param {string} userId - 익명 사용자 UUID
 * @returns {Promise<{ success: boolean, data: object[] }>}
 */
export async function fetchHistory(userId) {
  // TODO: Step 05 구현
  // GET /api/history?userId=...
  throw new Error('fetchHistory: Not implemented')
}

/**
 * 추천 이력을 저장합니다.
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function addHistory(userId, courseId) {
  // TODO: Step 05 구현
  // POST /api/history
  throw new Error('addHistory: Not implemented')
}

/**
 * 즐겨찾기 API 함수 모음
 * Step 05 (프론트엔드-백엔드 연동) 단계에서 실제 fetch 구현 예정
 *
 * 응답 형식: { success: true, data: ... } / { success: false, message: ... }
 */

/**
 * 사용자의 즐겨찾기 목록을 가져옵니다.
 * @param {string} userId - 익명 사용자 UUID
 * @returns {Promise<{ success: boolean, data: object[] }>}
 */
export async function fetchFavorites(userId) {
  // TODO: Step 05 구현
  // GET /api/favorites?userId=...
  throw new Error('fetchFavorites: Not implemented')
}

/**
 * 즐겨찾기를 추가합니다.
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function addFavorite(userId, courseId) {
  // TODO: Step 05 구현
  // POST /api/favorites
  throw new Error('addFavorite: Not implemented')
}

/**
 * 즐겨찾기를 삭제합니다.
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<{ success: boolean }>}
 */
export async function removeFavorite(userId, courseId) {
  // TODO: Step 05 구현
  // DELETE /api/favorites/:courseId?userId=...
  throw new Error('removeFavorite: Not implemented')
}

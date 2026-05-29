/**
 * 코스 API 함수 모음
 * Step 05 (프론트엔드-백엔드 연동) 단계에서 실제 fetch 구현 예정
 *
 * 응답 형식: { success: true, data: ... } / { success: false, message: ... }
 */

/**
 * 조건에 맞는 랜덤 코스 1개를 요청합니다.
 * @param {{ distance: number, time: number, type: string }} conditions
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function fetchRandomCourse({ distance, time, type }) {
  // TODO: Step 05 구현
  // GET /api/courses/random?distance=3&time=30&type=조깅
  throw new Error('fetchRandomCourse: Not implemented')
}

/**
 * 코스 상세 정보를 가져옵니다.
 * @param {string} id - 코스 ID (예: 'route-001')
 * @returns {Promise<{ success: boolean, data: object }>}
 */
export async function fetchCourseById(id) {
  // TODO: Step 05 구현
  // GET /api/courses/:id
  throw new Error('fetchCourseById: Not implemented')
}

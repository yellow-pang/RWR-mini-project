const USER_ID_KEY = 'rwr_user_id'

/**
 * 익명 사용자 UUID를 반환합니다.
 * localStorage에 저장된 값이 없으면 새로 생성하여 저장합니다.
 * @returns {string} UUID v4 문자열
 */
export function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, userId)
  }
  return userId
}

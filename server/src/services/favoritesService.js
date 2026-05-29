const db = require("../db");

/**
 * 사용자 즐겨찾기 목록 반환
 * @param {string} userId
 * @returns {Promise<Object[]>}
 */
exports.findByUser = async (userId) => {
  const { rows } = await db.query(
    `SELECT f.id, f.user_id AS "userId", f.course_id AS "courseId", f.created_at AS "createdAt",
            c.title, c.distance, c.time, c.type, c.mood
     FROM favorites f
     JOIN courses c ON c.id = f.course_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId],
  );
  return rows;
};

/**
 * 즐겨찾기 추가 — UNIQUE 제약 위반 시 오류 코드 23505
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<Object>}
 */
exports.add = async (userId, courseId) => {
  const { rows } = await db.query(
    `INSERT INTO favorites (user_id, course_id)
     VALUES ($1, $2)
     RETURNING id, user_id AS "userId", course_id AS "courseId", created_at AS "createdAt"`,
    [userId, courseId],
  );
  return rows[0];
};

/**
 * 즐겨찾기 삭제
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<boolean>} 삭제된 행이 있으면 true
 */
exports.remove = async (userId, courseId) => {
  const { rowCount } = await db.query(
    "DELETE FROM favorites WHERE user_id = $1 AND course_id = $2",
    [userId, courseId],
  );
  return rowCount > 0;
};

const db = require("../db");

/**
 * 사용자 추천 이력 반환 (최신순)
 * @param {string} userId
 * @param {number} limit 최대 반환 건수 (기본 10)
 * @returns {Promise<Object[]>}
 */
exports.findByUser = async (userId, limit = 10) => {
  const { rows } = await db.query(
    `SELECT h.id, h.user_id AS "userId", h.course_id AS "courseId",
            h.recommended_at AS "recommendedAt",
            c.title, c.distance, c.time, c.type, c.mood
     FROM history h
     JOIN courses c ON c.id = h.course_id
     WHERE h.user_id = $1
     ORDER BY h.recommended_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows;
};

/**
 * 추천 이력 저장
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<Object>}
 */
exports.add = async (userId, courseId) => {
  const { rows } = await db.query(
    `INSERT INTO history (user_id, course_id)
     VALUES ($1, $2)
     RETURNING id, user_id AS "userId", course_id AS "courseId", recommended_at AS "recommendedAt"`,
    [userId, courseId],
  );
  return rows[0];
};

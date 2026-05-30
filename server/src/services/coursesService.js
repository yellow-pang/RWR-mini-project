const db = require("../db");
const { getCourseTypeQueryValues } = require("../constants/courseValues");

/**
 * 조건에 맞는 코스 중 랜덤으로 1개 반환
 * @param {{ distance: number, time: number, type: string, exclude?: string }} params
 * @returns {Promise<Object|null>}
 */
const COURSE_COLUMNS = `
  id, title, distance, time, type, mood,
  description, reason, caution, tip
`;

exports.findRandom = async ({ distance, time, type, exclude }) => {
  const typeValues = getCourseTypeQueryValues(type);
  const values = [distance, time, typeValues];
  let sql = `
    SELECT ${COURSE_COLUMNS}
    FROM courses
    WHERE distance = $1 AND time = $2 AND type = ANY($3)
  `;

  if (exclude) {
    values.push(exclude);
    sql += ` AND id != $${values.length}`;
  }

  sql += " ORDER BY RANDOM() LIMIT 1";

  const { rows } = await db.query(sql, values);
  return rows[0] || null;
};

/**
 * ID로 코스 1개 반환
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
exports.findById = async (id) => {
  const { rows } = await db.query(
    `SELECT ${COURSE_COLUMNS} FROM courses WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
};

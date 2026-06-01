const db = require("../db");
const { getCourseTypeQueryValues } = require("../constants/courseValues");

/**
 * 조건에 맞는 코스 중 랜덤으로 1개 반환
 * @param {{ distance: number, time: number, type: string, exclude?: string }} params
 * @returns {Promise<Object|null>}
 */
const COURSE_COLUMNS = `
  id, title, distance, time, type, mood,
  description, reason, caution, tip,
  start_lat, start_lng
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

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function getDistanceMeters(from, to) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

exports.findNearestRandom = async ({
  latitude,
  longitude,
  distance,
  time,
  type,
  exclude,
  candidateLimit = 3,
}) => {
  const typeValues = getCourseTypeQueryValues(type);
  const values = [distance, time, typeValues];
  let sql = `
    SELECT ${COURSE_COLUMNS}
    FROM courses
    WHERE distance = $1
      AND time = $2
      AND type = ANY($3)
      AND start_lat IS NOT NULL
      AND start_lng IS NOT NULL
  `;

  if (exclude) {
    values.push(exclude);
    sql += ` AND id != $${values.length}`;
  }

  const { rows } = await db.query(sql, values);

  if (rows.length === 0) {
    return null;
  }

  const origin = {
    latitude: Number(latitude),
    longitude: Number(longitude),
  };
  const nearestCandidates = rows
    .map((course) => ({
      ...course,
      distance_from_origin: Math.round(
        getDistanceMeters(origin, {
          latitude: Number(course.start_lat),
          longitude: Number(course.start_lng),
        }),
      ),
    }))
    .sort((a, b) => a.distance_from_origin - b.distance_from_origin)
    .slice(0, candidateLimit);

  return nearestCandidates[
    Math.floor(Math.random() * nearestCandidates.length)
  ];
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

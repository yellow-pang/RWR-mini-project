const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected idle client error:", err.message);
});

/**
 * SQL 쿼리 실행 헬퍼
 * @param {string} text    - SQL 쿼리 문자열 (파라미터 플레이스홀더 $1, $2 사용)
 * @param {Array}  [params] - 바인딩 파라미터 배열
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

module.exports = { query };

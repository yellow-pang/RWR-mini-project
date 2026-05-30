const { Pool } = require("pg");
const { getRequiredEnv } = require("../config/env");

const databaseUrl = getRequiredEnv("DATABASE_URL");
let databasePassword;

try {
  databasePassword = new URL(databaseUrl).password;
} catch {
  throw new Error("[Config] DATABASE_URL must be a valid PostgreSQL URL.");
}

if (databasePassword.length === 0) {
  throw new Error("[Config] DATABASE_URL must include a database password.");
}

const pool = new Pool({
  connectionString: databaseUrl,
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

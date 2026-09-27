const { Pool } = require("pg");

// LIMIT 0은 사용자 데이터를 가져오지 않고 필수 테이블·컬럼과 SELECT 권한을 확인한다.
// 데이터가 아직 없는 DB도 정상으로 판단한다.
const HEALTH_QUERY = `
  SELECT id, title, distance, time, type, mood, description, reason, caution, tip,
         start_lat, start_lng
  FROM courses LIMIT 0;
  SELECT id, user_id, course_id, created_at FROM favorites LIMIT 0;
  SELECT id, user_id, course_id, recommended_at FROM history LIMIT 0;
`;

const createDatabaseHealthCheck = (databaseUrl, { PoolClass = Pool } = {}) => {
  // 일반 API의 pool 설정은 유지하고 health 연결은 최대 1개로 제한한다.
  const pool = new PoolClass({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 1500,
    query_timeout: 1500,
    statement_timeout: 1500,
    idleTimeoutMillis: 1000,
    allowExitOnIdle: true,
  });

  pool.on("error", () => {
    console.error("[DB] Health check idle connection failed");
  });

  return async () => {
    // pg의 연결 제한은 신규 접속뿐 아니라 pool 대기에도 적용된다.
    const client = await pool.connect();
    let failed = false;

    try {
      await client.query(HEALTH_QUERY);
    } catch (err) {
      failed = true;
      throw err;
    } finally {
      // query_timeout은 응답 대기만 중단하므로 실패한 연결을 반드시 폐기한다.
      // 실행 중인 쿼리의 socket도 닫혀 서버 작업과 pool 점유가 남지 않는다.
      client.release(failed);
    }
  };
};

module.exports = { createDatabaseHealthCheck };

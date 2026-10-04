const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { Duplex } = require("node:stream");
const { test } = require("node:test");
const { Pool } = require("pg");
const { createDatabaseHealthCheck } = require("../src/services/healthService");
const { createHealthHandler } = require("../src/controllers/healthController");

// 실제 환경 파일을 import하지 않고 가짜 접속 정보와 메모리 stream만 사용한다.
const TEST_DATABASE_URL = "postgresql://health:fake-password@localhost/health";

function createMockCheck({ connectError, queryError, rows = [] } = {}) {
  const calls = { releases: [], queries: [] };
  const client = {
    async query(sql) {
      calls.queries.push(sql);
      if (queryError) throw queryError;
      return { rows, rowCount: rows.length };
    },
    release(destroy) {
      calls.releases.push(destroy);
    },
  };
  class MockPool extends EventEmitter {
    constructor(options) {
      super();
      calls.options = options;
    }

    async connect() {
      if (connectError) throw connectError;
      return client;
    }
  }
  return {
    check: createDatabaseHealthCheck(TEST_DATABASE_URL, { PoolClass: MockPool }),
    calls,
  };
}

function createResponse() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("health는 빈 테이블을 허용하고 정상 응답 형식을 유지한다", async () => {
  const { check, calls } = createMockCheck();
  const response = createResponse();

  await createHealthHandler(check)({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, "RWR API Server is running");
  assert.equal(new Date(response.body.timestamp).toISOString(), response.body.timestamp);
  assert.deepEqual(calls.releases, [false]);
});

test("health는 핵심 테이블과 컬럼을 읽기 전용 쿼리로 검사한다", async () => {
  const { check, calls } = createMockCheck();
  await check();

  const statements = calls.queries[0].split(";").map((sql) => sql.trim()).filter(Boolean);
  assert.equal(statements.length, 3);
  for (const statement of statements) {
    assert.match(statement, /^SELECT\b/i);
    assert.match(statement, /LIMIT 0$/i);
  }
  assert.match(statements[0], /start_lat, start_lng\s+FROM courses/);
  assert.match(statements[1], /id, user_id, course_id, created_at FROM favorites/);
  assert.match(statements[2], /id, user_id, course_id, recommended_at FROM history/);
});

test("health 전용 pool은 연결 개수와 접속·실행 시간을 제한한다", () => {
  const { calls } = createMockCheck();
  assert.equal(calls.options.max, 1);
  assert.equal(calls.options.connectionTimeoutMillis, 1500);
  assert.equal(calls.options.query_timeout, 1500);
  assert.equal(calls.options.statement_timeout, 1500);
  assert.equal(calls.options.idleTimeoutMillis, 1000);
});

test("DB 접속 실패는 503이며 얻지 못한 연결을 반환하지 않는다", async () => {
  const { check, calls } = createMockCheck({
    connectError: new Error(`password authentication failed: ${TEST_DATABASE_URL}`),
  });
  const response = createResponse();
  await createHealthHandler(check)({}, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    success: false,
    message: "RWR API Server is not ready",
  });
  assert.deepEqual(calls.queries, []);
  assert.deepEqual(calls.releases, []);
});

test("테이블·컬럼·권한 오류는 실패한 연결을 폐기하고 내부 정보를 숨긴다", async () => {
  for (const message of [
    "relation favorites does not exist: SELECT id FROM favorites",
    "column recommended_at does not exist",
    "permission denied for table courses",
  ]) {
    const { check, calls } = createMockCheck({
      queryError: new Error(`${message}; ${TEST_DATABASE_URL}`),
    });
    const response = createResponse();
    await createHealthHandler(check)({}, response);

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.body, {
      success: false,
      message: "RWR API Server is not ready",
    });
    assert.deepEqual(calls.releases, [true]);
  }
});

// pg 자체 timeout과 socket 정리를 검사하는 최소 PostgreSQL 응답 모형이다.
// 인증/접속 완료까지만 응답하고 쿼리 응답은 보내지 않아 지연을 재현한다.
class StalledDatabaseStream extends Duplex {
  constructor({ ready, onQuery }) {
    super();
    this.ready = ready;
    this.onQuery = onQuery;
    this.started = false;
  }

  connect() {
    queueMicrotask(() => this.emit("connect"));
  }

  setNoDelay() {}

  _read() {}

  _write(chunk, encoding, callback) {
    if (!this.started) {
      this.started = true;
      if (this.ready) {
        queueMicrotask(() => {
          // AuthenticationOk + ReadyForQuery (idle)
          this.push(Buffer.from("5200000008000000005a0000000549", "hex"));
        });
      }
    } else if (chunk[0] === "Q".charCodeAt(0)) {
      this.onQuery?.();
    }
    callback();
  }
}

function createStalledCheck(context, { ready = false, connectionTimeout = 30, queryTimeout = 30, onQuery } = {}) {
  const streams = [];
  let pool;
  class TestPool extends Pool {
    constructor(options) {
      super({
        ...options,
        ssl: false,
        connectionTimeoutMillis: connectionTimeout,
        query_timeout: queryTimeout,
        stream: () => {
          const stream = new StalledDatabaseStream({ ready, onQuery });
          streams.push(stream);
          return stream;
        },
      });
      pool = this;
    }
  }

  const check = createDatabaseHealthCheck(TEST_DATABASE_URL, { PoolClass: TestPool });
  context.after(async () => {
    for (const stream of streams) stream.destroy();
    await pool.end();
  });
  return { check, streams, pool };
}

test("접속 시간 초과 시 pg가 socket을 닫고 pool에서 제거한다", { timeout: 2000 }, async (context) => {
  const { check, streams, pool } = createStalledCheck(context);
  const response = createResponse();
  await createHealthHandler(check)({}, response);

  assert.equal(response.statusCode, 503);
  assert.equal(streams.length, 1);
  assert.equal(streams[0].destroyed, true);
  assert.equal(pool.totalCount, 0);
  assert.equal(pool.waitingCount, 0);
});

test("쿼리 시간 초과 시 실행 중 socket을 폐기하고 다음 검사를 막지 않는다", { timeout: 2000 }, async (context) => {
  const { check, streams, pool } = createStalledCheck(context, { ready: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = createResponse();
    await createHealthHandler(check)({}, response);
    assert.equal(response.statusCode, 503);
    assert.equal(streams[attempt].destroyed, true);
    assert.equal(pool.totalCount, 0);
  }
  assert.equal(streams.length, 2);
});

test("health 동시 요청의 pool 대기도 제한 시간 이후 종료된다", { timeout: 2000 }, async (context) => {
  let notifyQueryStarted;
  const queryStarted = new Promise((resolve) => { notifyQueryStarted = resolve; });
  const { check, streams, pool } = createStalledCheck(context, {
    ready: true,
    queryTimeout: 150,
    onQuery: notifyQueryStarted,
  });

  const firstResponse = createResponse();
  const firstCheck = createHealthHandler(check)({}, firstResponse);
  await queryStarted;
  const secondResponse = createResponse();
  await createHealthHandler(check)({}, secondResponse);

  assert.equal(secondResponse.statusCode, 503);
  assert.equal(streams.length, 1);
  assert.equal(streams[0].destroyed, false);
  assert.equal(pool.waitingCount, 0);
  await firstCheck;
  assert.equal(firstResponse.statusCode, 503);
  assert.equal(streams[0].destroyed, true);
  assert.equal(pool.totalCount, 0);
});

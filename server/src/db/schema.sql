-- server/src/db/schema.sql
-- PostgreSQL 16 스키마 정의
-- docker-entrypoint-initdb.d 에 마운트되어 컨테이너 최초 기동 시 자동 실행됩니다.

-- ── 코스 테이블 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id           VARCHAR(20)  PRIMARY KEY,
  title        VARCHAR(100) NOT NULL,
  distance     INTEGER      NOT NULL CHECK (distance IN (1, 3, 5)),
  time         INTEGER      NOT NULL CHECK (time IN (15, 30, 60)),
  type         VARCHAR(20)  NOT NULL CHECK (type IN ('걷기', '조깅', '러닝')),
  mood         VARCHAR(20)  NOT NULL CHECK (mood IN ('공원', '강변', '도심', '숲길')),
  description  TEXT         NOT NULL,
  reason       TEXT         NOT NULL,
  caution      TEXT         NOT NULL,
  tip          TEXT         NOT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── 즐겨찾기 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id         SERIAL       PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL,
  course_id  VARCHAR(20)  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

-- ── 추천 이력 테이블 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS history (
  id             SERIAL      PRIMARY KEY,
  user_id        VARCHAR(36) NOT NULL,
  course_id      VARCHAR(20) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  recommended_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── 조회 성능 인덱스 ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_courses_filter    ON courses(distance, time, type);
CREATE INDEX IF NOT EXISTS idx_favorites_user    ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user_time ON history(user_id, recommended_at DESC);

#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/rwr-deploy-test.XXXXXX")
trap 'rm -rf "$TEST_ROOT"' EXIT

SHA_ONE=1111111111111111111111111111111111111111
SHA_TWO=2222222222222222222222222222222222222222
SHA_FAIL=3333333333333333333333333333333333333333
SHA_FOUR=4444444444444444444444444444444444444444
DEPLOY_DIR="$TEST_ROOT/deploy"
FAKE_BIN_DIR="$TEST_ROOT/bin"
FAKE_STATE_DIR="$TEST_ROOT/state"
DOCKER_LOG="$FAKE_STATE_DIR/docker.log"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_file_contains() {
  local file=$1
  local expected=$2

  grep -Fq -- "$expected" "$file" || fail "$file 에 '$expected'가 없습니다."
}

assert_equal() {
  local expected=$1
  local actual=$2
  local message=$3

  [[ "$actual" == "$expected" ]] || fail "$message (expected=$expected, actual=$actual)"
}

mkdir -p "$DEPLOY_DIR" "$FAKE_BIN_DIR" "$FAKE_STATE_DIR"

cat > "$DEPLOY_DIR/.env" <<'ENV'
NGINX_PORT=18090
NODE_ENV=production
CORS_ORIGIN=http://127.0.0.1:18090
ORS_API_KEY=test-ors-key
KAKAO_REST_API_KEY=test-kakao-key
POSTGRES_USER=rwr_user
POSTGRES_PASSWORD=test-password
POSTGRES_DB=rwr_db
ENV

cat > "$FAKE_BIN_DIR/docker" <<'FAKE_DOCKER'
#!/usr/bin/env bash
set -euo pipefail

echo "tag=${RWR_IMAGE_TAG:-unset} $*" >> "$FAKE_STATE_DIR/docker.log"

case " $* " in
  *" up -d "*)
    printf '%s\n' "${RWR_IMAGE_TAG:-}" > "$FAKE_STATE_DIR/running-tag"
    ;;
  *" port nginx 80 "*)
    echo "127.0.0.1:18090"
    ;;
esac
FAKE_DOCKER

cat > "$FAKE_BIN_DIR/curl" <<'FAKE_CURL'
#!/usr/bin/env bash
set -euo pipefail

running_tag=$(cat "$FAKE_STATE_DIR/running-tag")
if [[ -n "${FAKE_HEALTH_FAIL_TAG:-}" && "$running_tag" == "$FAKE_HEALTH_FAIL_TAG" ]]; then
  exit 22
fi

printf '{"success":true}\n'
FAKE_CURL

chmod +x "$FAKE_BIN_DIR/docker" "$FAKE_BIN_DIR/curl"

compose_env="$TEST_ROOT/compose.env"
cat > "$compose_env" <<'ENV'
NGINX_PORT=18090
NODE_ENV=production
CORS_ORIGIN=http://127.0.0.1:18090
ORS_API_KEY=test-ors-key
KAKAO_REST_API_KEY=test-kakao-key
POSTGRES_USER=rwr_user
POSTGRES_PASSWORD=test-password
POSTGRES_DB=rwr_db
ENV

compose_json="$TEST_ROOT/compose.json"
RWR_IMAGE_TAG="$SHA_ONE" docker compose \
  --env-file "$compose_env" \
  -f "$PROJECT_ROOT/docker-compose.deploy.yml" \
  config --format json > "$compose_json"

node - "$compose_json" "$SHA_ONE" <<'NODE'
const fs = require('fs');

const [file, sha] = process.argv.slice(2);
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
const services = config.services;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(config.name === 'rwr-production', 'Compose project name must be rwr-production');
assert(services.nginx.image === `ghcr.io/yellow-pang/rwr-web:${sha}`, 'nginx must use the SHA web image');
assert(services.server.image === `ghcr.io/yellow-pang/rwr-server:${sha}`, 'server must use the SHA server image');
assert(!services.nginx.build && !services.server.build && !services.db.build, 'deploy Compose must not build images');
assert(services.nginx.ports?.length === 1, 'nginx must publish exactly one port');
assert(services.nginx.ports[0].host_ip === '127.0.0.1', 'nginx must bind to loopback');
assert(Number(services.nginx.ports[0].target) === 80, 'nginx target port must be 80');
assert(!services.server.ports, 'server must not publish a host port');
assert(!services.db.ports, 'db must not publish a host port');
assert(config.volumes.rwr_postgres_data.name === 'rwr-production-postgres-data', 'PostgreSQL volume name must be stable');
NODE

run_deploy() {
  local sha=$1
  shift

  FAKE_STATE_DIR="$FAKE_STATE_DIR" \
  RWR_DOCKER_BIN="$FAKE_BIN_DIR/docker" \
  RWR_CURL_BIN="$FAKE_BIN_DIR/curl" \
  RWR_HEALTH_ATTEMPTS=1 \
  RWR_HEALTH_INTERVAL_SECONDS=0 \
  "$@" \
  "$PROJECT_ROOT/scripts/deploy-mac.sh" "$sha" "$DEPLOY_DIR" "$PROJECT_ROOT"
}

run_deploy "$SHA_ONE" env

assert_equal "$SHA_ONE" "$(cat "$DEPLOY_DIR/.current-sha")" "첫 배포 SHA가 기록되지 않았습니다."
[[ -f "$DEPLOY_DIR/releases/$SHA_ONE/docker-compose.deploy.yml" ]] || fail "첫 release Compose가 복사되지 않았습니다."
[[ -f "$DEPLOY_DIR/releases/$SHA_ONE/server/src/db/schema.sql" ]] || fail "schema.sql이 release에 복사되지 않았습니다."
[[ -f "$DEPLOY_DIR/releases/$SHA_ONE/server/src/db/seed.sql" ]] || fail "seed.sql이 release에 복사되지 않았습니다."
assert_file_contains "$DOCKER_LOG" "tag=$SHA_ONE"
assert_file_contains "$DOCKER_LOG" " pull"
assert_file_contains "$DOCKER_LOG" " up -d"
if grep -Fq -- " build" "$DOCKER_LOG"; then
  fail "배포 중 Docker build가 실행됐습니다."
fi

run_deploy "$SHA_TWO" env

assert_equal "$SHA_TWO" "$(cat "$DEPLOY_DIR/.current-sha")" "두 번째 배포 SHA가 기록되지 않았습니다."
assert_equal "$SHA_ONE" "$(cat "$DEPLOY_DIR/.previous-sha")" "직전 SHA가 기록되지 않았습니다."

if run_deploy "$SHA_FAIL" env FAKE_HEALTH_FAIL_TAG="$SHA_FAIL"; then
  fail "health 실패 배포가 성공으로 끝났습니다."
fi

assert_equal "$SHA_TWO" "$(cat "$DEPLOY_DIR/.current-sha")" "rollback 후 current SHA가 변경됐습니다."
assert_equal "$SHA_TWO" "$(cat "$FAKE_STATE_DIR/running-tag")" "rollback이 직전 정상 SHA를 다시 실행하지 않았습니다."
assert_file_contains "$DOCKER_LOG" "tag=$SHA_FAIL"
assert_file_contains "$DOCKER_LOG" "tag=$SHA_TWO"

run_deploy "$SHA_FOUR" env

assert_equal "$SHA_FOUR" "$(cat "$DEPLOY_DIR/.current-sha")" "정리 검증 배포 SHA가 기록되지 않았습니다."
assert_equal "$SHA_TWO" "$(cat "$DEPLOY_DIR/.previous-sha")" "정리 후 직전 정상 SHA가 유지되지 않았습니다."
[[ -d "$DEPLOY_DIR/releases/$SHA_FOUR" ]] || fail "현재 release가 삭제됐습니다."
[[ -d "$DEPLOY_DIR/releases/$SHA_TWO" ]] || fail "직전 release가 삭제됐습니다."
[[ ! -e "$DEPLOY_DIR/releases/$SHA_ONE" ]] || fail "두 세대 이전 release가 남았습니다."
[[ ! -e "$DEPLOY_DIR/releases/$SHA_FAIL" ]] || fail "실패한 release가 남았습니다."
assert_file_contains "$DOCKER_LOG" "image rm ghcr.io/yellow-pang/rwr-web:$SHA_ONE"
assert_file_contains "$DOCKER_LOG" "image rm ghcr.io/yellow-pang/rwr-server:$SHA_ONE"
assert_file_contains "$DOCKER_LOG" "image rm ghcr.io/yellow-pang/rwr-web:$SHA_FAIL"
assert_file_contains "$DOCKER_LOG" "image rm ghcr.io/yellow-pang/rwr-server:$SHA_FAIL"

docker_log_lines=$(wc -l < "$DOCKER_LOG" | tr -d ' ')
if run_deploy invalid-sha env; then
  fail "잘못된 SHA가 허용됐습니다."
fi
assert_equal "$docker_log_lines" "$(wc -l < "$DOCKER_LOG" | tr -d ' ')" "잘못된 SHA에서 Docker가 호출됐습니다."

echo "PASS: deploy Compose와 Mac 배포/rollback 계약"

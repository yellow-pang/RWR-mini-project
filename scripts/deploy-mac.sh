#!/usr/bin/env bash

set -Eeuo pipefail

IMAGE_SHA=${1:-}
DEPLOY_DIR=${2:-}
SOURCE_DIR=${3:-}
DOCKER_BIN=${RWR_DOCKER_BIN:-docker}
CURL_BIN=${RWR_CURL_BIN:-curl}
HEALTH_ATTEMPTS=${RWR_HEALTH_ATTEMPTS:-12}
HEALTH_INTERVAL_SECONDS=${RWR_HEALTH_INTERVAL_SECONDS:-5}

log() {
  printf '[rwr-deploy] %s\n' "$*"
}

fail() {
  printf '[rwr-deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$IMAGE_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "배포 image tag는 40자리 Git commit SHA여야 합니다."
[[ -n "$DEPLOY_DIR" ]] || fail "배포 경로가 필요합니다."
[[ -n "$SOURCE_DIR" ]] || fail "release 원본 경로가 필요합니다."

SOURCE_DIR=$(cd "$SOURCE_DIR" && pwd -P)
mkdir -p "$DEPLOY_DIR"
DEPLOY_DIR=$(cd "$DEPLOY_DIR" && pwd -P)

ENV_FILE="$DEPLOY_DIR/.env"
[[ -f "$ENV_FILE" ]] || fail "$ENV_FILE 파일이 필요합니다."

required_env_names=(
  CORS_ORIGIN
  ORS_API_KEY
  KAKAO_REST_API_KEY
  POSTGRES_USER
  POSTGRES_PASSWORD
  POSTGRES_DB
)

for env_name in "${required_env_names[@]}"; do
  grep -Eq "^${env_name}=.+$" "$ENV_FILE" || fail "$ENV_FILE 에 ${env_name} 값이 필요합니다."
done

required_release_files=(
  docker-compose.deploy.yml
  server/src/db/schema.sql
  server/src/db/seed.sql
)

for relative_path in "${required_release_files[@]}"; do
  [[ -f "$SOURCE_DIR/$relative_path" ]] || fail "release 파일이 없습니다: $relative_path"
done

RELEASES_DIR="$DEPLOY_DIR/releases"
RELEASE_DIR="$RELEASES_DIR/$IMAGE_SHA"
mkdir -p "$RELEASE_DIR/server/src/db"
install -m 0644 "$SOURCE_DIR/docker-compose.deploy.yml" "$RELEASE_DIR/docker-compose.deploy.yml"
install -m 0644 "$SOURCE_DIR/server/src/db/schema.sql" "$RELEASE_DIR/server/src/db/schema.sql"
install -m 0644 "$SOURCE_DIR/server/src/db/seed.sql" "$RELEASE_DIR/server/src/db/seed.sql"

CURRENT_SHA=''
if [[ -f "$DEPLOY_DIR/.current-sha" ]]; then
  CURRENT_SHA=$(tr -d '[:space:]' < "$DEPLOY_DIR/.current-sha")
fi

compose_for() {
  local sha=$1
  local release_dir="$RELEASES_DIR/$sha"
  shift

  RWR_IMAGE_TAG="$sha" "$DOCKER_BIN" compose \
    --project-name rwr-production \
    --env-file "$ENV_FILE" \
    -f "$release_dir/docker-compose.deploy.yml" \
    "$@"
}

is_healthy() {
  local sha=$1
  local published_port
  local attempt

  published_port=$(compose_for "$sha" port nginx 80 | tail -n 1)
  published_port=${published_port##*:}
  [[ "$published_port" =~ ^[0-9]+$ ]] || return 1

  for ((attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt += 1)); do
    if "$CURL_BIN" --fail --silent --show-error "http://127.0.0.1:${published_port}/api/health" >/dev/null \
      && "$CURL_BIN" --fail --silent --show-error "http://127.0.0.1:${published_port}/" >/dev/null; then
      return 0
    fi

    if ((attempt < HEALTH_ATTEMPTS)); then
      sleep "$HEALTH_INTERVAL_SECONDS"
    fi
  done

  return 1
}

write_sha() {
  local destination=$1
  local sha=$2
  local temporary_file="${destination}.tmp"

  printf '%s\n' "$sha" > "$temporary_file"
  mv "$temporary_file" "$destination"
}

cleanup_old_releases() {
  local previous_sha=''
  local release_path
  local release_sha

  if [[ -f "$DEPLOY_DIR/.previous-sha" ]]; then
    previous_sha=$(tr -d '[:space:]' < "$DEPLOY_DIR/.previous-sha")
  fi

  for release_path in "$RELEASES_DIR"/*; do
    [[ -e "$release_path" ]] || continue
    release_sha=$(basename "$release_path")
    [[ "$release_sha" =~ ^[0-9a-f]{40}$ ]] || continue
    [[ "$release_sha" == "$IMAGE_SHA" || "$release_sha" == "$previous_sha" ]] && continue

    rm -rf -- "$release_path"
    "$DOCKER_BIN" image rm "ghcr.io/yellow-pang/rwr-web:$release_sha" >/dev/null 2>&1 || true
    "$DOCKER_BIN" image rm "ghcr.io/yellow-pang/rwr-server:$release_sha" >/dev/null 2>&1 || true
  done
}

rollback() {
  if [[ ! "$CURRENT_SHA" =~ ^[0-9a-f]{40}$ || ! -f "$RELEASES_DIR/$CURRENT_SHA/docker-compose.deploy.yml" ]]; then
    log "복구할 직전 release가 없습니다."
    return 1
  fi

  log "직전 정상 SHA $CURRENT_SHA 로 복구합니다."
  if ! compose_for "$CURRENT_SHA" up -d --remove-orphans; then
    return 1
  fi
  is_healthy "$CURRENT_SHA"
}

log "SHA $IMAGE_SHA image를 pull합니다."
if ! compose_for "$IMAGE_SHA" pull; then
  fail "image pull에 실패했습니다. 현재 실행 상태는 변경하지 않았습니다."
fi

log "SHA $IMAGE_SHA container를 실행합니다."
if ! compose_for "$IMAGE_SHA" up -d --remove-orphans; then
  if rollback; then
    fail "container 실행에 실패해 직전 정상 release로 복구했습니다."
  fi
  fail "container 실행에 실패했고 직전 release 복구도 실패했습니다."
fi

if ! is_healthy "$IMAGE_SHA"; then
  rollback || fail "health 확인에 실패했고 직전 release 복구도 실패했습니다."
  fail "health 확인에 실패해 직전 정상 release로 복구했습니다."
fi

if [[ "$CURRENT_SHA" =~ ^[0-9a-f]{40}$ && "$CURRENT_SHA" != "$IMAGE_SHA" ]]; then
  write_sha "$DEPLOY_DIR/.previous-sha" "$CURRENT_SHA"
  ln -sfn "releases/$CURRENT_SHA" "$DEPLOY_DIR/previous"
fi

write_sha "$DEPLOY_DIR/.current-sha" "$IMAGE_SHA"
ln -sfn "releases/$IMAGE_SHA" "$DEPLOY_DIR/current"
cleanup_old_releases

log "SHA $IMAGE_SHA 배포와 localhost health 확인이 완료됐습니다."

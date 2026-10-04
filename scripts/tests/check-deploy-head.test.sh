#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TEST_ROOT=$(mktemp -d "${TMPDIR:-/tmp}/rwr-deploy-head-test.XXXXXX")
trap 'rm -rf "$TEST_ROOT"' EXIT

SHA_ONE=1111111111111111111111111111111111111111
SHA_TWO=2222222222222222222222222222222222222222
mkdir -p "$TEST_ROOT/bin"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

cat > "$TEST_ROOT/bin/git" <<'FAKE_GIT'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$FAKE_GIT_LOG"
printf '%s\n' "$FAKE_REMOTE_MAIN"
exit "$FAKE_GIT_STATUS"
FAKE_GIT
chmod +x "$TEST_ROOT/bin/git"

run_check() {
  local deploy_sha=$1
  local remote_main=$2
  local git_status=$3
  local expected_status=$4
  local expected_output=$5
  local actual_status

  : > "$TEST_ROOT/output"
  : > "$TEST_ROOT/git.log"
  if PATH="$TEST_ROOT/bin:$PATH" \
    FAKE_GIT_LOG="$TEST_ROOT/git.log" \
    FAKE_REMOTE_MAIN="$remote_main" \
    FAKE_GIT_STATUS="$git_status" \
    GITHUB_OUTPUT="$TEST_ROOT/output" \
    bash "$PROJECT_ROOT/scripts/check-deploy-head.sh" "$deploy_sha" > "$TEST_ROOT/check.log" 2>&1; then
    actual_status=0
  else
    actual_status=$?
  fi

  [[ "$actual_status" -eq "$expected_status" ]] || fail "예상 종료 코드 $expected_status, 실제 $actual_status: $(cat "$TEST_ROOT/check.log")"
  [[ "$(cat "$TEST_ROOT/output")" == "$expected_output" ]] || fail "배포 허용 여부가 올바르지 않습니다: $(cat "$TEST_ROOT/output")"
}

run_check "$SHA_ONE" "$SHA_ONE refs/heads/main" 0 0 'should_deploy=true'
[[ "$(cat "$TEST_ROOT/git.log")" == 'ls-remote --exit-code origin refs/heads/main' ]] || fail "원격 main을 직접 조회하지 않았습니다."

# 오래된 checkout SHA가 최신 배포를 덮어쓰지 못하도록 정상적으로 생략한다.
run_check "$SHA_ONE" "$(printf '%s\trefs/heads/main' "$SHA_TWO")" 0 0 'should_deploy=false'

# 조회 실패와 잘못된 응답은 생략이 아닌 실패로 처리하며 배포를 허용하지 않는다.
run_check "$SHA_ONE" "$SHA_ONE refs/heads/main" 128 1 ''
run_check "$SHA_ONE" '' 2 1 ''
run_check "$SHA_ONE" '' 0 1 ''
run_check "$SHA_ONE" 'invalid refs/heads/main' 0 1 ''
run_check "$SHA_ONE" "$SHA_ONE refs/heads/dev" 0 1 ''
run_check "$SHA_ONE" "$(printf '%s\trefs/heads/main\n%s\trefs/heads/main' "$SHA_ONE" "$SHA_TWO")" 0 1 ''

run_check 'invalid-sha' "$SHA_ONE refs/heads/main" 0 1 ''
[[ ! -s "$TEST_ROOT/git.log" ]] || fail "잘못된 배포 SHA로 원격 조회를 실행했습니다."

if GITHUB_OUTPUT='' bash "$PROJECT_ROOT/scripts/check-deploy-head.sh" "$SHA_ONE" > "$TEST_ROOT/check.log" 2>&1; then
  fail "결과 기록 경로 없이 배포 판단이 성공했습니다."
fi

echo "PASS: 최신 main 배포 허용, 오래된 SHA 생략, 원격 조회 오류 차단"

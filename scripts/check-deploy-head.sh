#!/usr/bin/env bash

set -euo pipefail

deploy_sha=${1:-}

if [[ ! "$deploy_sha" =~ ^[0-9a-f]{40}$ ]]; then
  echo "배포 SHA는 40자리 소문자 Git SHA여야 합니다." >&2
  exit 1
fi

if [[ -z "${GITHUB_OUTPUT:-}" ]]; then
  echo "배포 판단을 기록할 GITHUB_OUTPUT 경로가 필요합니다." >&2
  exit 1
fi

# 배포 job의 concurrency 잠금을 얻은 뒤 원격 main을 확인한다.
# checkout 당시의 원격 추적 브랜치는 대기 중 오래됐을 수 있다.
if ! remote_main=$(git ls-remote --exit-code origin refs/heads/main 2>/dev/null); then
  echo "원격 main SHA를 조회하지 못해 배포를 중단합니다." >&2
  exit 1
fi

if [[ ! "$remote_main" =~ ^([0-9a-f]{40})[[:space:]]+refs/heads/main$ ]]; then
  echo "원격 main SHA 응답이 올바르지 않아 배포를 중단합니다." >&2
  exit 1
fi

latest_sha=${BASH_REMATCH[1]}
if [[ "$deploy_sha" != "$latest_sha" ]]; then
  printf 'should_deploy=false\n' >> "$GITHUB_OUTPUT"
  echo "최신 main($latest_sha)과 다른 SHA($deploy_sha)의 배포를 생략합니다."
  exit 0
fi

printf 'should_deploy=true\n' >> "$GITHUB_OUTPUT"
echo "최신 main SHA($deploy_sha)를 배포합니다."

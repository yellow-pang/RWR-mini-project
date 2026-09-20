# Plan 34. Mac mini 배포 전환 Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Phase별 구현 전 `superpowers:executing-plans`를 사용한다. 각 Phase는 이전 Phase의 검증 결과와 사용자 승인을 받은 뒤 시작한다.

**Goal:** 기존 RWR 코드를 Mac mini + OrbStack에서 먼저 그대로 재현한 뒤, 컨테이너 유지보수, GHCR 이미지 게시, Mac 자동 배포, Cloudflare 전환을 단계적으로 진행한다.

**Architecture:** Phase 0에서는 현재 `.env`, Dockerfile, `docker-compose.yml`을 수정하지 않고 Mac의 arm64 환경에서 build와 실행이 가능한지 증명한다. 이후 Phase 1~4가 각각 runtime 정비, CI/GHCR, Mac 배포 자동화, Cloudflare 전환을 담당하며, 한 Phase의 실패를 다음 Phase의 변경으로 가리지 않는다.

**Tech Stack:** React, Vite, Node.js, Express, PostgreSQL, Nginx, Docker Compose, OrbStack, GitHub Actions, GHCR, Cloudflare Tunnel

**Spec:** [`../analysis/01-current-deployment.md`](../analysis/01-current-deployment.md)

## 1. Master Plan 원칙

- 최종 목표인 `GitHub Actions → GHCR → Mac mini → OrbStack → Cloudflare Tunnel` 구조는 유지한다.
- 가장 먼저 확인할 것은 현재 코드와 Compose가 Mac mini에서 수정 없이 재현되는지 여부다.
- Phase 0이 실패하면 실패 원인을 현재 코드, 환경변수, Docker/OrbStack, arm64 이미지 중 하나로 분류하고 다음 Phase로 진행하지 않는다.
- Node.js 20 → 24 변경은 Mac 이전의 선행 조건이 아니다. 현재 Node.js 20 이미지가 Mac에서 동작함을 먼저 증명한 뒤 Phase 1에서 별도 변경한다.
- `.dockerignore`, GitHub Actions, GHCR, runner, rollback, Cloudflare는 각각 담당 Phase에서만 다룬다.
- 검증은 파일이 아직 없는지 확인하는 형식적 실패 테스트보다 DB/API/UI 같은 실제 서비스 계약을 우선한다.
- Phase 0은 Dockerfile 내부 build만 사용하고 host npm 검증을 추가하지 않는다. Phase 1은 runtime 변경 회귀 검증, Phase 2는 CI gate 검증만 담당하며 publish/deploy/최종 문서 단계에서는 같은 npm 검증을 반복하지 않는다.
- 운영 `.env`의 값은 터미널 출력, workflow log, 문서, Git에 기록하지 않는다.
- DB schema/seed 내용, 애플리케이션 기능, API 응답 형식은 이번 Master Plan에서 변경하지 않는다.
- 실제 commit, push, GHCR 게시, runner 등록, 배포, Cloudflare 변경, 기존 VM 삭제는 해당 Phase의 사용자 승인 범위 안에서만 수행한다.

## 2. Phase 구성

| Phase | 목적 | 저장소 변경 | 외부 시스템 변경 |
| --- | --- | --- | --- |
| 0 | 현재 Compose의 Mac/OrbStack 재현성 증명 | 없음 | 없음 |
| 1 | Docker build context와 Node runtime 정비 | Dockerfile, `.dockerignore`, 관련 문서 | 없음 |
| 2 | CI 검증과 GHCR 멀티 아키텍처 이미지 게시 | GitHub Actions, 이미지 설정, 관련 문서 | GitHub Secrets/Packages |
| 3 | Mac 고정 경로 pull 배포 자동화 | 배포 Compose/script/workflow, 관련 문서 | Mac self-hosted runner |
| 4 | Cloudflare 전환과 기존 VM 정리 | 결과 문서 중심 | Cloudflare 및 기존 VM |

각 Phase는 독립적으로 검토하고 승인한다. Phase 0 검증만으로 Phase 1~4의 변경이 승인된 것으로 해석하지 않는다.

---

## Phase 0. 현재 코드 그대로 Mac + OrbStack 재현

### 현재 필요한 변경

저장소 파일은 변경하지 않는다.

- 현재 루트 `.env`를 그대로 사용한다.
- 현재 `client/Dockerfile`, `server/Dockerfile`, `docker-compose.yml`, `nginx/nginx.conf`, schema/seed를 그대로 사용한다.
- 현재 Node.js 20 Alpine, Nginx Alpine, PostgreSQL 16 Alpine 이미지를 그대로 사용한다.
- GitHub Actions와 기존 VM은 사용하지 않는다.
- Cloudflare를 통하지 않고 Mac의 localhost로만 확인한다.
- 다른 Compose 프로젝트와 이름이 겹치지 않도록 검증용 project name은 `rwr-phase0`을 사용한다.
- Phase 0에서 생성되는 컨테이너, network, image, PostgreSQL volume은 검증용 로컬 runtime 리소스이며 저장소 변경이 아니다.

실행 전에는 다음 상태만 확인한다.

```bash
docker version
docker compose version
docker context show
docker info --format '{{.Architecture}}'
uname -m
git rev-parse HEAD
git status --short --untracked-files=all
```

기대 상태:

- Docker daemon과 Compose v2가 응답한다.
- Docker와 Mac host architecture가 `arm64` 또는 `aarch64`로 확인된다.
- 작업 중인 commit과 미커밋 문서 변경을 기록한다.

`.env`는 값 대신 필수 변수 이름의 존재만 확인한다.

```bash
for name in NGINX_PORT NODE_ENV CORS_ORIGIN ORS_API_KEY KAKAO_REST_API_KEY POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB VITE_KAKAO_MAP_KEY; do
  grep -q "^${name}=" .env || exit 1
done
```

Compose 해석과 실행 순서는 아래로 고정한다.

```bash
docker compose --project-name rwr-phase0 config --quiet
docker compose --project-name rwr-phase0 build
docker compose --project-name rwr-phase0 up -d
docker compose --project-name rwr-phase0 ps
```

이미 `rwr-phase0` 리소스가 존재하거나 `.env`/포트 충돌이 발견되면 임의 삭제하지 않고 상태를 먼저 보고한다. `docker compose down -v`, `docker volume rm`, DB 초기화 명령은 별도 승인 없이 실행하지 않는다.

### 후속 개선

Phase 0에서는 아래 작업을 모두 보류한다.

- `.dockerignore` 추가
- Node.js 20 → 24 업그레이드
- Dockerfile 또는 Compose 수정
- GitHub Actions 개편
- GHCR 이미지 build/push
- `linux/amd64,linux/arm64` 명시적 multi-arch build
- self-hosted runner 설치
- 고정 운영 경로 생성
- rollback script 추가
- nginx loopback bind 변경
- Cloudflare Tunnel/DNS 변경
- 기존 VM 또는 DB volume 정리

Phase 0에서 발견된 문제는 먼저 “현재 구조 재현 실패”로 기록한다. 후속 개선을 섞어 우연히 동작하게 만들지 않는다.

### 검증 기준

#### 0-1. 컨테이너와 arm64 이미지

```bash
docker compose --project-name rwr-phase0 ps
docker image inspect "$(docker compose --project-name rwr-phase0 images -q nginx)" --format '{{.Architecture}}'
docker image inspect "$(docker compose --project-name rwr-phase0 images -q server)" --format '{{.Architecture}}'
docker image inspect "$(docker compose --project-name rwr-phase0 images -q db)" --format '{{.Architecture}}'
```

통과 기준:

- nginx, server, db가 모두 실행 중이다.
- db 상태가 healthy다.
- 세 이미지가 Mac에서 `arm64`로 실행된다.
- server와 db의 host publish port는 없다.
- nginx만 현재 `.env`의 `NGINX_PORT`로 publish된다.

#### 0-2. 새 PostgreSQL 초기화

```bash
docker compose --project-name rwr-phase0 exec -T db \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\dt"'
docker compose --project-name rwr-phase0 exec -T db \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT COUNT(*) FROM courses;"'
```

통과 기준:

- `courses`, `favorites`, `history` 테이블이 존재한다.
- `courses`에 seed 10건이 존재한다.
- schema/seed 실행 오류가 db 로그에 없다.
- 검증용 volume은 `rwr-phase0` project 소속으로 생성되어 다른 프로젝트 DB와 분리된다.

#### 0-3. nginx를 통한 API 계약

실제 publish port는 Compose에서 읽고 비밀값은 출력하지 않는다.

```bash
RWR_PHASE0_PORT=$(docker compose --project-name rwr-phase0 port nginx 80 | awk -F: 'END {print $NF}')
RWR_PHASE0_URL="http://127.0.0.1:${RWR_PHASE0_PORT}"

curl --fail --silent --show-error "${RWR_PHASE0_URL}/api/health"
curl --fail --silent --show-error "${RWR_PHASE0_URL}/api/courses/route-001"
curl --fail --silent --show-error \
  "${RWR_PHASE0_URL}/api/courses/random?distance=3&time=30&type=walk"
```

통과 기준:

- 세 요청이 HTTP 2xx와 `{ "success": true, ... }` 계열 응답을 반환한다.
- 요청은 host에 공개되지 않은 server 3000이 아니라 nginx `/api` 프록시를 통해 처리된다.
- 저장 코스 조회와 랜덤 추천이 PostgreSQL seed를 사용한다.

DB write 계약은 즐겨찾기 생성·조회·삭제로 확인한다.

```bash
RWR_PHASE0_USER_ID=00000000-0000-4000-8000-000000000034

curl --fail --silent --show-error -X POST \
  -H 'Content-Type: application/json' \
  -d "{\"userId\":\"${RWR_PHASE0_USER_ID}\",\"courseId\":\"route-001\"}" \
  "${RWR_PHASE0_URL}/api/favorites"
curl --fail --silent --show-error \
  "${RWR_PHASE0_URL}/api/favorites?userId=${RWR_PHASE0_USER_ID}"
curl --fail --silent --show-error -X DELETE \
  "${RWR_PHASE0_URL}/api/favorites/route-001?userId=${RWR_PHASE0_USER_ID}"
```

통과 기준:

- 생성은 201, 조회는 해당 코스를 포함한 200, 삭제는 200을 반환한다.
- 삭제 후 같은 user ID의 즐겨찾기 목록에 `route-001`이 남지 않는다.

#### 0-4. localhost UI 계약

브라우저에서 `${RWR_PHASE0_URL}`에 접속해 아래를 수동 확인한다.

- SPA 첫 화면이 렌더링되고 새로고침해도 nginx fallback이 동작한다.
- 저장 코스 상세, 즐겨찾기, 최근 추천 화면으로 이동할 수 있다.
- 주소 찾기 UI가 열리고 주소 선택 결과가 화면에 반영된다.
- 현재 `.env`의 외부 API key가 유효하다면 주소 기반 코스 생성과 지도 표시가 동작한다.
- 브라우저 콘솔에 API base URL, CORS, mixed-content 오류가 없다.

외부 API key 오류는 Docker 재현 실패와 구분해 “환경변수 또는 외부 API 설정 문제”로 기록한다. Cloudflare를 통하지 않은 localhost 검증이므로 운영 도메인의 CORS/허용 도메인 문제는 Phase 4 대상이다.

#### 0-5. 실패 시 증거

```bash
docker compose --project-name rwr-phase0 ps
docker compose --project-name rwr-phase0 logs --tail=100 nginx server db
docker compose --project-name rwr-phase0 images
docker volume ls --filter label=com.docker.compose.project=rwr-phase0
```

로그에는 `.env` 값이나 API key를 복사하지 않는다. 실패는 다음 중 하나로 분류한다.

```text
OrbStack/Docker 실행 문제
base image 또는 arm64 호환 문제
Docker build 문제
PostgreSQL 초기화 문제
server/DB 연결 문제
nginx proxy 또는 정적 파일 문제
외부 API key/허용 도메인 문제
애플리케이션 기능 문제
```

#### Phase 0 완료 조건

- [ ] 저장소 파일 변경 없이 build가 완료된다.
- [ ] nginx, server, db가 실행되고 db가 healthy다.
- [ ] schema 3개와 seed 10건이 확인된다.
- [ ] health, course read, random course, favorite write/read/delete가 통과한다.
- [ ] localhost UI의 주요 화면과 주소 기반 흐름이 확인된다.
- [ ] 세 컨테이너가 arm64 이미지로 실행된다.
- [ ] 결과와 실패/제약 사항을 Phase 0 검증 기록에 남긴다.

Phase 0 컨테이너는 결과 검토 전까지 유지한다. 중지는 `docker compose --project-name rwr-phase0 stop`까지만 허용하며, volume 삭제는 사용자 승인 후 별도로 결정한다.

---

## Phase 1. Docker build 안전성과 Node runtime 정비

Phase 0이 통과한 뒤 별도 승인으로 진행한다. 이 Phase는 Mac 이전에 필요한 재현 검증과 runtime 업그레이드를 섞지 않기 위해 분리한다.

### 현재 필요한 변경

- 루트 `.dockerignore`를 추가해 client build context에서 `.env`, `.git`, `node_modules`, `dist`, docs, server를 제외한다.
- `server/.dockerignore`를 추가해 server `.env`, `node_modules`, log를 이미지 context에서 제외한다.
- `client/Dockerfile`과 `server/Dockerfile`의 Node.js 20 Alpine을 지원 중인 Node.js 24 Alpine으로 변경한다.
- server production 설치 명령을 현재 npm 권장 형식인 `npm ci --omit=dev`로 정리한다.
- Node runtime 변경과 `.dockerignore` 변경은 서로 다른 commit으로 나눠 원인 추적이 가능하게 한다.
- Phase 0 결과와 비교할 수 있도록 같은 Compose project가 아닌 `rwr-phase1` 검증 project를 사용한다.

변경 예상 파일:

```text
.dockerignore
server/.dockerignore
client/Dockerfile
server/Dockerfile
README.md 또는 관련 운영 문서
```

### 후속 개선

아래는 Phase 1 필수 범위에 포함하지 않는다.

- base image digest 고정
- non-root container user 전환
- container healthcheck 추가
- 이미지 취약점 검사와 SBOM
- GHCR 또는 GitHub Actions 변경
- Compose pull 배포 전환

### 검증 기준

Phase 1이 `npm ci`, lint/build, server syntax 검증의 담당 Phase다. 이후 Phase 2~4에서는 같은 로컬 명령을 반복하지 않는다.

```bash
npm ci --prefix server
find server -name '*.js' -not -path '*/node_modules/*' -print0 | xargs -0 -n1 node --check
npm ci --prefix client
npm --prefix client run lint
VITE_KAKAO_MAP_KEY= npm --prefix client run build
docker compose --project-name rwr-phase1 config --quiet
docker compose --project-name rwr-phase1 build
docker compose --project-name rwr-phase1 up -d
```

통과 기준:

- client lint/build와 모든 server JS 문법 검사가 한 번씩 통과한다.
- Node.js 24 기반 nginx/server 이미지가 arm64에서 build되고 실행된다.
- `.env`와 host `node_modules`가 최종 이미지에 포함되지 않는다.
- Phase 0의 DB/API/UI 계약이 동일하게 통과한다.
- 동작 차이가 발견되면 Node runtime 변경과 build context 변경 중 원인을 분리한다.

---

## Phase 2. GitHub CI와 GHCR 이미지 게시

Phase 1이 통과한 뒤 별도 승인으로 진행한다. 이 Phase의 끝은 “GitHub가 검증된 이미지를 게시한다”이며 Mac 자동 배포는 포함하지 않는다.

### 현재 필요한 변경

- PR, `dev` push, `main` push를 한 workflow 구조로 정리한다.
- 각 이벤트의 `validate` job은 한 번만 실행한다.
- PR과 `dev`에서는 validate까지만 실행한다.
- `main`에서는 같은 workflow의 validate 성공 후에만 publish job을 실행한다.
- publish job은 `rwr-web`, `rwr-server`를 `linux/amd64,linux/arm64`로 build해 GHCR에 게시한다.
- image tag는 전체 commit SHA를 기준으로 하고 `main` 보조 tag를 제공한다.
- `VITE_KAKAO_MAP_KEY`만 frontend build용 GitHub Secret으로 전달한다.
- server API key, DB 비밀번호, Mac `.env`는 build context와 GHCR 이미지에 넣지 않는다.
- 현재 self-hosted VM에서 build/up하는 workflow는 GHCR 게시 확인 전까지 제거하지 않고, 새 workflow와 충돌하지 않는 수동/비활성 상태로 전환 방법을 결정한다.

변경 예상 파일과 외부 설정:

```text
.github/workflows/pipeline.yml 또는 역할이 같은 단일 workflow
.github/workflows/deploy.yml 정리
.env.example와 배포 문서
GitHub Actions Secret: VITE_KAKAO_MAP_KEY
GHCR package: rwr-web, rwr-server
```

### 후속 개선

- image signing/attestation
- SBOM 및 취약점 검사
- GHCR 원격 tag 보관 정책
- branch protection과 production environment 승인 규칙
- native arm64 hosted runner와 QEMU build 시간 비교
- Mac self-hosted runner와 자동 배포

### 검증 기준

Phase 2에서는 npm 검증 명령을 로컬과 publish job에서 다시 반복하지 않는다. workflow의 validate job이 Phase 2의 유일한 CI 검증 책임을 가진다.

통과 기준:

- PR/dev 이벤트에서 validate job이 정확히 한 번 실행되고 publish/deploy job은 실행되지 않는다.
- main 이벤트에서 validate 성공 뒤 publish가 실행된다.
- validate job은 server install/syntax, client install/lint/build를 각각 한 번 수행한다.
- `rwr-web:${GITHUB_SHA}`와 `rwr-server:${GITHUB_SHA}`가 GHCR에 존재한다.
- 두 image manifest에 `linux/amd64`와 `linux/arm64`가 모두 존재한다.
- Mac에서 SHA tag를 pull했을 때 arm64 image가 선택된다.
- image history와 filesystem에 server API key, DB 비밀번호, `.env`가 없다.
- Phase 1에서 검증한 DB/API/UI 계약은 이 Phase에서 다시 수행하지 않는다.

---

## Phase 3. Mac 고정 경로 pull 배포 자동화

Phase 2가 통과한 뒤 별도 승인으로 진행한다. 이 Phase의 끝은 Cloudflare 없이 localhost에서 자동 배포가 재현되는 상태다.

### 현재 필요한 변경

- 기존 local build용 `docker-compose.yml`은 Phase 0/1 재현용으로 유지한다.
- GHCR image를 사용하는 별도 운영 Compose 파일을 추가한다.
- 운영 Compose는 commit SHA tag를 필수로 받고 Mac에서 build하지 않는다.
- nginx만 `127.0.0.1:${NGINX_PORT}:80`에 publish하고 server와 PostgreSQL은 host에 공개하지 않는다.
- Compose project name과 PostgreSQL volume 이름을 명시해 `_work` 경로와 checkout 폴더명에 영향을 받지 않게 한다.
- 운영 경로는 `/Users/tro/services/rwr`로 고정하고 Mac에 옮겨 둔 `.env`를 유지한다.
- Mac arm64 self-hosted runner에는 `rwr-production` label을 추가하고 trusted `main` 배포만 실행한다.
- workflow는 release 파일 복사, `docker compose pull`, `docker compose up`만 수행한다. GHCR package가 공개 pull 가능한 현재 상태에서는 Mac에 registry credential을 저장하지 않는다.
- 배포 script는 `.env` 존재, commit SHA 형식, required release 파일을 확인한 뒤 실행한다.
- health check 실패 시 직전 SHA와 직전 운영 Compose로 복구한다.
- Mac에는 현재 SHA와 직전 SHA image를 남기고 다른 프로젝트 image는 정리하지 않는다.

변경 예상 파일과 외부 설정:

```text
docker-compose.deploy.yml
scripts/deploy-mac.sh
.github/workflows/pipeline.yml의 deploy job
.env.example와 운영 문서
GitHub Actions Variable: RWR_DEPLOY_DIR=/Users/tro/services/rwr
GitHub Actions Environment: production
Mac self-hosted runner labels: self-hosted, macOS, ARM64, rwr-production
```

### 2026-09-20 실행 보정

- Phase 2에서 게시한 web/server package는 인증 없는 manifest 조회와 pull이 가능했다.
- 개인 프로젝트에서 불필요한 장기 credential을 Mac에 추가하지 않기 위해 Phase 3 deploy job의 GHCR login을 제거했다.
- package를 private으로 전환하면 runner 전용 최소 권한 credential과 `docker login --password-stdin`을 별도 후속 작업으로 추가한다.
- 운영 Compose와 script 계약 테스트, 실제 SHA image의 OrbStack arm64 pull/up, 새 DB 초기화, API/UI 검증이 통과했다.
- repository variable `RWR_DEPLOY_DIR`과 GitHub Environment `production`을 생성했다.
- 고정 운영 경로, self-hosted runner, main 자동 배포는 저장소 구현 검토 후 적용한다.

### 후속 개선

- release directory를 여러 세대 보관하는 방식
- 자동 image retention 기간
- PostgreSQL backup/restore
- Compose 중복 설정 축소
- runner 계정과 운영 계정 분리
- 배포 알림과 관측성
- Cloudflare Tunnel 연결

### 검증 기준

Phase 3은 배포 계약만 검증한다. npm ci/lint/build는 Phase 2 validate 결과를 사용하고 반복하지 않는다.

통과 기준:

- Mac deploy job 로그에 Docker build 명령이 없다.
- 실제 실행 경로가 `_work`가 아니라 `/Users/tro/services/rwr`다.
- `.env`가 workflow checkout 정리로 삭제되거나 덮어써지지 않는다.
- 실행 container image tag와 workflow commit SHA가 일치한다.
- nginx, server, db가 정상 실행되고 DB/API/UI 계약이 localhost에서 통과한다.
- server 3000과 db 5432가 host에 publish되지 않는다.
- 신규 Mac volume에서 schema 3개와 seed 10건이 확인된다.
- 잘못된 SHA, image pull 실패, health check 실패 시 배포가 실패로 끝난다.
- 직전 release가 있는 상태에서 실패를 유도했을 때 직전 SHA로 복구된다.
- Mac 재부팅 후 OrbStack, runner, 컨테이너 복구 방식을 확인한다.
- 같은 SHA 재배포와 다음 SHA 배포가 모두 재현 가능하다.

---

## Phase 4. Cloudflare 전환과 기존 VM 정리

Phase 3이 localhost에서 안정적으로 동작한 뒤 별도 승인으로 진행한다.

### 현재 필요한 변경

- Mac 호스트에 새 cloudflared connector를 등록한다.
- 기존 RWR hostname의 origin을 Mac의 `http://localhost:8090`으로 연결한다.
- 가능하면 기존 hostname을 유지해 `CORS_ORIGIN`과 Kakao 허용 도메인 변경을 피한다.
- hostname이 달라지는 경우 Mac `.env`의 `CORS_ORIGIN`, Kakao 허용 도메인, Cloudflare 설정을 함께 변경한다.
- Cloudflare 변경 전후로 localhost 응답과 외부 HTTPS 응답을 분리해 확인한다.
- 최소 한 번의 Mac 재부팅과 후속 자동 배포가 성공할 때까지 기존 VM RWR를 유지한다.
- 안정화 후 기존 VM RWR runner, container, image, volume, Tunnel route, `ENV_FILE` Secret 정리를 각각 확인한다.
- 기존 VM에서 다른 프로젝트가 공유하는 runner, Tunnel, Docker resource는 삭제하지 않는다.

저장소 변경은 Step/PR/운영 문서 보정이 중심이며 Cloudflare token이나 credential은 저장하지 않는다.

### 후속 개선

- Cloudflare 설정의 코드화 여부
- rate limit/WAF 재점검
- 외부 모니터링과 장애 알림
- Mac 전원/절전/재부팅 운영 정책
- 정기 DB backup
- 기존 VM 완전 폐기 여부

### 검증 기준

Phase 4에서는 내부 build와 npm 검증을 반복하지 않는다. 외부 경로와 실제 사용자 기능만 확인한다.

통과 기준:

- Cloudflare Dashboard에서 새 Mac connector가 Healthy다.
- 기존 RWR HTTPS URL에서 SPA와 `/api/health`가 정상 응답한다.
- 주소 선택, 주소/좌표 변환, 순환 코스 생성, 출발-도착 코스 생성이 동작한다.
- 저장 코스, 즐겨찾기, 최근 추천 이력이 외부 HTTPS 경로에서 동작한다.
- Kakao 지도와 우편번호 UI가 최종 hostname에서 로드된다.
- 브라우저에 CORS, mixed-content, API base URL 오류가 없다.
- 외부 실패 시 localhost 비교로 Cloudflare 문제와 앱 문제를 구분할 수 있다.
- Mac 재부팅 뒤 OrbStack, runner, cloudflared, RWR stack이 운영 절차대로 복구된다.
- 후속 main 배포가 GHCR → Mac pull/up 경로로 성공한다.
- 기존 VM 정리 대상과 유지 대상을 목록으로 검토한 뒤 사용자 승인으로만 삭제한다.

---

## 3. 검증 책임 정리

| 검증 | 담당 Phase | 후속 Phase 처리 |
| --- | --- | --- |
| 현재 Compose build와 Mac arm64 실행 | Phase 0 | 같은 원인 확인을 위해 반복하지 않음 |
| DB schema/seed와 핵심 API/UI 계약 | Phase 0 | runtime 변경/배포 변경 뒤 회귀 확인만 수행 |
| server npm install/문법 | Phase 1 | Phase 2에서는 CI validate가 승계, Phase 3~4 미실행 |
| client npm install/lint/build | Phase 1 | Phase 2에서는 CI validate가 승계, Phase 3~4 미실행 |
| CI 이벤트와 GHCR manifest | Phase 2 | Phase 3은 게시된 SHA를 소비만 함 |
| 고정 경로 pull/up와 rollback | Phase 3 | Phase 4는 동일 내부 배포를 재검증하지 않음 |
| Cloudflare와 실제 외부 사용자 흐름 | Phase 4 | 최종 운영 확인 |

Phase 1의 로컬 npm 검증은 Node runtime 변경 자체를 검증하기 위한 한 번의 기준이다. Phase 2에서 같은 항목을 CI validate로 한 번 실행하는 것은 배포 gate의 책임이며, publish/deploy/final 문서 단계에서는 다시 실행하지 않는다.

## 4. Phase 전환 조건

| 전환 | 필수 조건 |
| --- | --- |
| Phase 0 → 1 | 현재 코드 그대로 Mac arm64 build/up, DB/API/UI 계약 통과 및 결과 검토 |
| Phase 1 → 2 | Node 24와 `.dockerignore` 변경 후 Phase 0 계약 회귀 없음 |
| Phase 2 → 3 | 두 GHCR image의 amd64/arm64 manifest와 SHA pull 확인 |
| Phase 3 → 4 | Mac 고정 경로 자동 배포, rollback, 재부팅 후 복구 확인 |
| Phase 4 완료 | 외부 HTTPS 기능 검증과 기존 VM 정리 범위 승인 |

어느 Phase든 실패하면 다음 Phase로 넘어가지 않는다. 실패 원인, 변경 여부, 남은 위험을 해당 Phase 검증 기록에 남긴다.

## 5. 문서화 기준

- Phase 0 실행 후 `steps/step-34-phase-0-compose-reproduction.md`에 실제 명령과 결과를 기록한다.
- Phase 1~4는 각 Phase 완료 시 같은 작업 폴더의 `steps/`에 검증 결과를 추가한다.
- 저장소 변경이 포함된 Phase는 구현 완료 후 `pr/`에 기존 PR 문서 형식을 따른 요약을 작성한다.
- 같은 lint/build 로그를 각 Phase 문서에 반복 복사하지 않고 담당 Phase 결과를 링크한다.
- secret 값, `.env` 내용, Tunnel token, runner registration token은 문서에 기록하지 않는다.
- Windows VM에서 Mac mini로 이전하는 각 Phase의 Step 문서에는 다음 항목을 남긴다.
  - 해당 순서와 방식을 선택한 이유
  - 에이전트 또는 GitHub Actions가 자동화한 작업
  - 사용자가 직접 확인하거나 승인한 작업
  - 실제 명령·workflow·화면에서 확인한 검증 근거
  - 기존 Windows VM과 현재 운영 서비스에 미치는 영향
  - 다음 Phase로 넘어가기 전에 남은 사용자 결정
- GitHub Secret, GHCR package visibility, runner 등록, Cloudflare Tunnel, 최종 전환처럼 외부 상태가 필요한 작업은 자동화 범위와 사용자 결정 범위를 분리해 기록한다.
- 작업 시점의 사실과 이후 원격 결과가 달라지면 기존 내용을 삭제하지 않고 날짜가 있는 보정 기록을 추가한다.

## 6. 제외 범위

- Phase 0에서의 코드, Dockerfile, Compose, workflow 변경
- 기존 VM DB 데이터 migration
- schema.sql 또는 seed.sql 내용 변경
- 애플리케이션 기능/API 응답 형식 변경
- PostgreSQL custom image 또는 GHCR 게시
- Kubernetes, Jenkins, Docker Swarm 도입
- 새로운 npm 패키지 추가
- Cloudflare Terraform/API 자동화
- 사용자 승인 없는 DB volume/기존 VM 삭제

## 7. 다음 실행 범위

이 Master Plan 승인 후 가장 먼저 실행할 범위는 **Phase 0만**이다.

Phase 0 실행은 Docker runtime resource를 생성하지만 저장소 파일, GitHub, Cloudflare, 기존 VM을 변경하지 않는다. build/up 실행 전 OrbStack 상태와 기존 `rwr-phase0` resource 충돌 여부를 읽기 전용으로 확인하고, 충돌이나 기존 volume이 있으면 중단해 사용자에게 보고한다.

## 8. Plan용 제안 커밋 메시지

```text
docs: Mac mini 배포 전환 계획을 단계별로 재구성

- 현재 Compose를 수정 없이 검증하는 Phase 0을 최우선 단계로 분리한다.
- runtime 정비, GHCR 게시, Mac 자동 배포, Cloudflare 전환을 Phase 1~4로 나눈다.
- 중복 검증과 형식적 실패 테스트를 제거하고 실제 DB/API/UI 계약을 기준으로 정리한다.
```

# Step 34. Phase 1 Docker build context와 Node runtime 정비

- 검증일: 2026-09-20
- 브랜치: `chore/34-mac-mini-deployment-analysis`
- 시작 커밋: `50f71d2` (`build: Docker 빌드 컨텍스트를 제한`)
- Compose project: `rwr-phase1`
- 범위: Docker build context 제한, Node.js 24 전환, production 의존성 설치 명령 정리, Phase 0 계약 회귀 검증
- 결과: **Node.js 24 기반 arm64 build와 실행, DB 초기화, API, localhost UI 계약 통과**

## 1. 변경 내용

Docker build context 변경과 runtime 변경을 분리했다.

첫 번째 커밋에서는 다음 파일을 추가했다.

- 루트 `.dockerignore`: client와 nginx build에 필요한 파일만 허용하고 `.env`, `.git`, host `node_modules`, `dist`, docs, server를 context에서 제외
- `server/.dockerignore`: server `.env`, host `node_modules`, coverage, log를 context에서 제외

두 번째 변경에서는 다음 항목을 적용했다.

- `client/Dockerfile` builder: `node:20-alpine`에서 `node:24-alpine`으로 변경
- `server/Dockerfile`: `node:20-alpine`에서 `node:24-alpine`으로 변경
- server production 설치: `npm ci --only=production`에서 `npm ci --omit=dev`로 변경

애플리케이션 코드, DB schema/seed, Compose, nginx, `.env`, Cloudflare 설정은 변경하지 않았다.

## 2. 로컬 Node 검증

Mac host의 Node.js `v24.20.0`, npm `11.19.0`에서 lockfile 기반 설치와 정적 검증을 수행했다.

| 검증 | 결과 |
| --- | --- |
| `npm ci --prefix server` | 통과, 120 packages 설치 |
| server 전체 JavaScript `node --check` | 통과 |
| `npm ci --prefix client` | 통과, 140 packages 설치 |
| client lint | 통과 |
| client Vite production build | 통과 |

최초 sandbox 실행은 npm registry DNS 접근 제한으로 실패했다. 네트워크 접근이 가능한 동일 명령으로 다시 실행했으며 package/lockfile 문제는 없었다. 중단된 설치가 남긴 client `node_modules`는 `/private/tmp/rwr-client-node_modules-broken-phase1`로 옮긴 뒤 새로 설치했다.

현재 npm audit 결과는 server 5건(moderate 3, high 2), client 8건(moderate 2, high 6)이다. 의존성 자동 업그레이드는 runtime 재현 범위를 벗어나므로 수행하지 않고 후속 개선으로 남긴다. Docker production server 설치에서는 devDependency가 제외되어 4건(moderate 3, high 1)이 보고됐다.

## 3. Docker build와 이미지 검증

`docker compose --project-name rwr-phase1 config --quiet`와 build가 성공했다. Compose v5가 루트 `version` 키를 obsolete로 경고하지만 설정 해석과 실행에는 영향을 주지 않았다.

build context 전송량은 root 약 3.50kB, server 약 1.81kB였다. 별도로 client builder target만 build했을 때 root context는 약 2.79kB였다. host의 큰 `node_modules`나 저장소 전체가 전달되지 않는 것을 확인했다.

| 이미지/단계 | Node | 아키텍처 | 확인 결과 |
| --- | --- | --- | --- |
| `rwr-phase1-server:latest` | v24.21.0 | linux/arm64 | build 및 실행 성공 |
| `rwr-phase1-client-builder:latest` | v24.21.0 | linux/arm64 (`aarch64`) | Vite build 성공 |
| `rwr-phase1-nginx:latest` | 최종 이미지에 Node 없음 | linux/arm64 | 정적 파일 실행 성공 |

서버 최종 이미지에서 `/app/.env`, `/app/.env.example`, `node_modules/nodemon`이 없음을 확인했다. client builder에도 `/app/.env`가 포함되지 않았다.

Docker는 `VITE_KAKAO_MAP_KEY`라는 ARG/ENV 이름을 secret 가능성으로 경고했다. Vite 변수는 브라우저 bundle에 들어가는 공개 JavaScript SDK key이지만, Phase 2에서 GitHub Actions build 인자를 설계할 때 실제 secret과 구분해 취급해야 한다.

## 4. Compose 실행과 PostgreSQL 초기화

기존 Phase 0 스택과 포트 충돌을 피하기 위해 저장소 파일을 바꾸지 않고 다음 일회성 실행값을 사용했다.

```text
NGINX_PORT=8091
CORS_ORIGIN=http://127.0.0.1:8091
```

현재 `.env`는 Windows 운영 환경에서 옮긴 값이며 개발 origin이 빠질 수 있는 변경 가능한 설정이다. 파일 자체는 수정하지 않았다.

| 서비스 | 상태 | host publish |
| --- | --- | --- |
| nginx | Up | `0.0.0.0:8091`, `[::]:8091` |
| server | Up | 없음, Compose 내부 `3000/tcp` |
| db | Up, healthy | 없음, Compose 내부 `5432/tcp` |

새 volume `rwr-phase1_rwr_postgres_data`에서 `courses`, `favorites`, `history` 테이블 3개와 seed course 10건을 확인했다. 기존 Phase 0 volume과 독립되어 있다.

## 5. API 계약 회귀 검증

모든 API 요청은 nginx의 `http://127.0.0.1:8091/api`를 통해 실행했다.

| 계약 | HTTP | 결과 |
| --- | ---: | --- |
| health | 200 | `success: true` |
| `route-001` 저장 코스 조회 | 200 | 코스 ID 일치 |
| 조건 기반 랜덤 코스 | 200 | seed 코스 반환 |
| 즐겨찾기 생성 | 201 | 생성 성공 |
| 즐겨찾기 조회 | 200 | 생성한 `courseId` 확인 |
| 즐겨찾기 삭제 | 200 | 삭제 성공 |
| 삭제 후 조회 | 200 | 빈 목록 확인 |
| Kakao 주소 geocoding | 200 | 유효한 위도/경도 반환 |
| ORS 주소 기반 순환 코스 | 200 | route와 meta 계약 확인 |

검증용 즐겨찾기는 테스트가 끝난 뒤 삭제했다. localhost 요청은 sandbox 네트워크에서 차단되어 host 네트워크 권한으로 실행했으며, 이는 Phase 0에서 확인한 실행 도구 격리와 같다.

## 6. localhost UI 계약

Safari에서 `http://127.0.0.1:8091`에 접속해 다음을 확인했다.

- SPA 홈 화면과 코스 생성 폼 렌더링
- `/courses/route-001` 직접 접근과 저장 코스 상세 렌더링
- `/favorites` 직접 접근과 빈 상태 렌더링
- `/history` 직접 접근과 빈 상태 렌더링
- 직접 URL 접근 시 nginx SPA fallback 동작

Phase 0에서 이미 확인한 지도 SDK 실패 fallback 수정도 같은 client bundle에 포함됐다. 실제 Kakao 지도는 localhost 허용 도메인 또는 최종 운영 hostname에서 별도로 확인해야 한다.

## 7. Phase 1 판정

| 완료 조건 | 결과 |
| --- | --- |
| Docker build context 제한 | 통과 |
| server/client Node.js 24 build | 통과 |
| server production devDependency 제외 | 통과 |
| client lint/build와 server 문법 검사 | 통과 |
| arm64 이미지 build 및 실행 | 통과 |
| `.env`, host `node_modules` 이미지 제외 | 통과 |
| PostgreSQL schema/seed 초기화 | 통과 |
| 저장 코스, 랜덤 코스, 즐겨찾기 API | 통과 |
| Kakao geocoding과 ORS 순환 코스 | 통과 |
| localhost 주요 UI와 SPA fallback | 통과 |

Phase 1의 필수 범위는 완료됐다. 다음 Phase는 GitHub Actions와 GHCR이라는 외부 설정을 포함하므로 별도 승인 후 진행한다.

## 8. 후속 개선과 유지 중인 리소스

다음 항목은 이번 Phase에서 변경하지 않았다.

- npm audit 취약점 검토와 의존성 업그레이드
- base image digest 고정
- non-root container user
- container healthcheck
- Compose `version` 키 정리
- nginx host bind를 loopback으로 제한
- GitHub Actions, GHCR, self-hosted runner, Cloudflare

검토와 후속 검증을 위해 `rwr-phase0`과 `rwr-phase1` 컨테이너, network, image, PostgreSQL volume을 유지한다. `docker compose down -v`, volume 삭제, image prune은 실행하지 않았다.

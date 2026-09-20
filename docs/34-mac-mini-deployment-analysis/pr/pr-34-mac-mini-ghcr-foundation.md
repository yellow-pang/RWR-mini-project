# PR #37. Mac mini 이전 검증 및 GHCR 배포 기반 구성

> 관련 분석 문서: [현재 배포 구조 분석](../analysis/01-current-deployment.md)  
> 관련 작업 계획서: [Mac mini 배포 전환 Master Plan](../plans/plan-34-mac-mini-ghcr-deployment.md)  
> 관련 Step 문서: [Phase 0](../steps/step-34-phase-0-compose-reproduction.md) | [Phase 1](../steps/step-34-phase-1-docker-runtime.md) | [Phase 2](../steps/step-34-phase-2-ci-ghcr.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `chore/34-mac-mini-deployment-analysis` |
| 병합 대상 | `dev` |
| PR | [#37](https://github.com/yellow-pang/RWR-mini-project/pull/37) |
| 상태 | Open, 충돌 없음, PR validate 통과 |

---

## PR 제목

```text
[Step 34] Mac mini 이전 검증 및 GHCR 배포 기반 구성
```

---

## 배경

RWR은 Windows 노트북의 Linux VM에서 nginx, Express server, PostgreSQL을 Docker Compose로 운영했다. 기존 main 배포는 VM의 GitHub Actions self-hosted runner가 `_work` checkout 디렉터리에서 소스를 받고 `docker compose up -d --build`를 실행하는 방식이었다.

Mac mini와 OrbStack으로 이전하면서 기존 서비스를 그대로 재현할 수 있는지, Apple Silicon arm64에서 image가 실행되는지, runtime secret이 image에 섞이지 않는지부터 확인해야 했다. 동시에 CI 작업 디렉터리를 운영 디렉터리로 사용하는 결합과 운영 서버의 직접 build 부담을 줄일 필요가 있었다.

이번 PR은 전체 이전을 한 번에 바꾸지 않는다. 기존 서비스 계약을 기준선으로 검증한 뒤 GitHub Actions와 GHCR 기반으로 build 책임만 먼저 분리한다. Mac mini 자동 배포와 Cloudflare Tunnel 전환은 후속 Phase에서 다룬다.

## 해결 방식과 선택 이유

### Phase 0: 변경 전 Compose 재현

기존 `.env`와 `docker-compose.yml`로 Mac mini OrbStack에서 build와 up을 실행했다. 새 PostgreSQL volume에서 schema와 seed가 초기화되고 nginx를 통한 API와 SPA가 동작하는지 확인했다.

이 단계를 먼저 둔 이유는 기존 코드 자체가 Mac에서 실행되는지 증명해야 이후 실패를 runtime 변경이나 CI 변경의 문제로 정확히 구분할 수 있기 때문이다.

### Phase 1: build context와 Node runtime 정비

루트와 server에 `.dockerignore`를 추가하고 client/server Docker base image를 Node.js 24 Alpine으로 변경했다. server는 production dependency만 설치하도록 `npm ci --omit=dev`를 사용한다.

build context 제한은 `.env`, host `node_modules`, 문서와 개발 산출물이 image build에 들어가는 것을 막는다. Node runtime 갱신 후에도 Phase 0의 DB/API/UI 계약을 다시 검증해 runtime 변경과 기능 변경을 분리했다.

### Phase 2: GitHub-hosted CI와 GHCR 게시 준비

새 pipeline은 PR과 dev/main push에서 application 검증을 실행한다. image publish는 main push이고 validate가 성공한 경우에만 실행한다. web과 server는 `linux/amd64`, `linux/arm64` image를 만들고 전체 commit SHA와 `main` tag를 사용한다.

GHCR을 선택한 이유는 GitHub 저장소 권한과 `GITHUB_TOKEN`을 그대로 사용할 수 있고, 현재 프로젝트의 web/server 두 image를 별도 CI 서버 없이 관리할 수 있기 때문이다. Mac mini는 후속 Phase에서 source build 대신 검증된 SHA image를 pull할 수 있다.

기존 VM workflow는 삭제하지 않고 `workflow_dispatch` 수동 실행으로 남겼다. 전환 검증 중 비교 경로를 보존하면서 main push에서 기존 VM 직접 build와 새 GHCR publish가 동시에 실행되는 것을 막기 위한 조치다.

## 변경 파일 목록

| 구분 | 파일 | 변경 내용 | 연결되는 흐름 |
| --- | --- | --- | --- |
| 신규 | `.dockerignore` | client/nginx 외 파일, `.env`, host 산출물 제외 | web image build context 제한 |
| 신규 | `server/.dockerignore` | server `.env`, `node_modules`, log, coverage 제외 | server image build context 제한 |
| 수정 | `client/Dockerfile` | Node 20 builder를 Node 24로 변경 | React production bundle 생성 |
| 수정 | `server/Dockerfile` | Node 24, `npm ci --omit=dev` 적용 | Express production image 생성 |
| 신규 | `.github/workflows/pipeline.yml` | validate와 main 전용 multi-arch publish 추가 | GitHub push → 검증 → GHCR |
| 수정 | `.github/workflows/deploy.yml` | main 자동 trigger를 제거하고 수동 실행만 유지 | 기존 VM 자동 직접 배포 중지 |
| 수정 | `.env.example` | runtime `.env`와 GHCR build 입력의 경계 설명 | secret과 image build 분리 |
| 수정 | `client/src/components/MapView.jsx` | `kakao.maps.load` 계약으로 SDK 성공 여부 판단 | SDK 실패 시 SVG fallback 연결 |
| 신규 | `docs/34-mac-mini-deployment-analysis/` | 분석, Plan, Phase별 검증과 PR 기록 | 전체 마이그레이션 판단 근거 보존 |

## 적용 후 흐름

```text
PR 또는 dev push
→ GitHub-hosted runner
→ server install 및 문법 검사
→ client install, lint, build
→ image publish 없이 종료

main push
→ 같은 validate 통과
→ web/server amd64·arm64 image build
→ GHCR에 commit SHA와 main tag 게시

Phase 3 이후
→ Mac mini OrbStack이 GHCR image pull
→ docker compose up
→ localhost health 검증
→ Phase 4에서 Cloudflare Tunnel 연결
```

## 기존 서비스 로직 영향

DB schema/seed, migration 방식, `docker-compose.yml`, nginx 설정, API 경로와 응답 형식은 변경하지 않았다. 저장 코스, 랜덤 추천, 주소 기반 코스 생성, 즐겨찾기와 최근 이력의 데이터 흐름도 그대로다.

사용자 동작에서 달라지는 부분은 지도 SDK 실패 처리다. 우편번호 스크립트가 `window.kakao`만 만든 경우를 지도 SDK 성공으로 오판하지 않고 `kakao.maps.load`를 확인한다. 지도 SDK를 사용할 수 없으면 빈 화면 대신 기존 SVG 코스 프리뷰가 표시된다.

배포 동작은 main 반영 후 달라진다. 기존 VM의 자동 build/up은 실행되지 않고 GHCR image 게시가 실행된다. Mac mini pull/up은 아직 연결되지 않았으므로 이 PR만으로 운영 서버가 교체되지는 않는다.

## 환경변수와 Secret 경계

- GHCR web build에는 브라우저 bundle에 포함되는 `VITE_KAKAO_MAP_KEY`만 전달한다.
- `ORS_API_KEY`, `KAKAO_REST_API_KEY`, `POSTGRES_PASSWORD`, Mac mini `.env`는 workflow와 image에 전달하지 않는다.
- 기존 Legacy VM Deploy를 수동 실행하는 동안에는 기존 `ENV_FILE` Secret이 필요하다.
- 실제 `.env`, GitHub Secret 값, Cloudflare 설정은 이번 PR에서 변경하지 않았다.

## 검증 결과

| 범위 | 결과 |
| --- | --- |
| Mac mini OrbStack arm64 Compose build/up | 통과 |
| PostgreSQL 3개 테이블과 seed 10건 초기화 | 통과 |
| health, 저장/랜덤 코스, 즐겨찾기 CRUD | 통과 |
| Kakao geocoding과 ORS 순환 코스 | 통과 |
| 주요 SPA 경로와 nginx fallback | 통과 |
| server 설치와 전체 JavaScript 문법 | 통과 |
| client lint와 production build | 통과 |
| workflow YAML과 actionlint 1.7.12 | 통과 |
| web/server amd64·arm64 cache-only build | 통과 |
| PR #37 `Validate application` | 14초에 성공 |
| PR #37 `Publish multi-platform images` | PR 조건에서 정상 skip |

현재 npm audit은 server 5건, client 8건을 보고한다. 의존성 변경은 Mac 이전 재현과 분리해 후속 작업으로 남겼다.

## 마이그레이션 작업 주체와 승인 경계

| 단계 | 자동화 또는 에이전트 작업 | 사용자 확인이 필요한 이유 |
| --- | --- | --- |
| 구조 분석과 로컬 재현 | 저장소 분석, Compose 실행, API/UI 검증, 결과 기록 | 외부 운영 상태를 바꾸지 않음 |
| CI workflow 준비 | 파일 작성, lint, multi-arch cache-only build | 저장소 변경은 리뷰 후 commit 필요 |
| PR 생성 | 승인된 제목과 본문으로 PR #37 생성 | GitHub에 공식 변경 요청을 게시함 |
| PR 병합 | 아직 실행하지 않음 | `dev` branch 상태를 변경함 |
| Secret 확인/변경 | 아직 실행하지 않음 | 비밀값과 외부 저장소 설정을 다룸 |
| main 반영과 GHCR 게시 | 아직 실행하지 않음 | 최초 registry package와 배포 후보를 생성함 |
| Mac mini 배포 | Phase 3 예정 | 운영 container와 runtime 상태를 변경함 |
| Cloudflare 전환 | Phase 4 예정 | 실제 외부 접속 경로를 변경함 |

## 현재 상태와 후속 작업

- PR #37은 Open이며 충돌이 없다.
- PR validate는 통과했고 publish는 정상 skip됐다.
- GHCR image와 package는 아직 생성되지 않았다.
- 기존 Windows VM과 Cloudflare Tunnel은 변경하지 않았다.
- 다음 사용자 결정은 PR #37의 `dev` 병합 여부다.
- 병합 후 dev validate를 확인하고, main 반영 전에 `VITE_KAKAO_MAP_KEY`, package 권한, GHCR visibility와 Mac pull 인증 방식을 결정한다.
- 최초 GHCR image의 두 아키텍처 manifest와 SHA pull이 확인돼야 Phase 3으로 전환한다.

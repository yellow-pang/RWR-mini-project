# RWR 기존 배포 구조 및 Mac mini 이전 사전 분석

- 작성일: 2026-09-19
- 범위: 저장소 정적 분석과 공식 문서 확인. 구현 계획서가 아니다.
- 기준 경로: `/Users/tro/dev/RWR-mini-project`
- 기준 HEAD: `a430afe71822fe42db2732a51b298623558b7080`
- 초기 `git status --short --untracked-files=all`: 출력 없음, 작업 트리 깨끗함.
- 분석 시작 브랜치: `dev`. 처음 확인할 때 새 작업 브랜치는 없었다. 이후 사용자 명시적 지시에 따라 `chore/34-mac-mini-deployment-analysis`를 생성하고 체크아웃하여 문서만 추가했다.
- 원격: fetch/push 모두 `https://github.com/yellow-pang/RWR-mini-project.git`
- 로컬 `origin/HEAD`: `origin/dev`. 로컬 `origin/dev`, `origin/main`, HEAD가 같은 커밋이다. fetch하지 않았으므로 원격 실시간 상태나 실제 운영 버전을 증명하지 않는다.
- HEAD 메시지: `Merge pull request #36 from yellow-pang/feat/33-edge-security-config`
- 사용자 설명: 기존 운영 경로는 self-hosted runner의 `_work` 아래이며, 기존 DB 데이터는 이전하지 않아도 된다. 이는 서버에서 직접 검증한 사실과 구분한다.
- 실제 `.env`는 존재만 확인했고 내용을 열거나 기록하지 않았다. GitHub Secrets, 기존 VM, Cloudflare 계정에는 접근하지 않았다.

## 1. 현재 구조 요약

```text
RWR-mini-project/
├── .github/workflows/deploy.yml
├── .env.example               # 운영 Compose용 예제
├── .gitignore
├── AGENTS.md
├── README.md
├── client/                    # React/Vite, Dockerfile, lockfile, 환경변수 예제
├── server/                    # Express, Dockerfile, lockfile, 환경변수 예제
│   └── src/db/                # index.js, schema.sql, seed.sql
├── nginx/nginx.conf
├── docker-compose.yml         # 운영: nginx + server + db
├── docker-compose.dev.yml     # 개발: db만 실행
└── docs/                      # 기획 문서, plans, steps, pr 등
```

루트 package.json 및 별도의 compose.yml은 없다. workflow는 deploy.yml 하나이며, .dockerignore와 별도 migration 디렉터리/실행 스크립트는 발견되지 않았다.

| 서비스 | 이미지/빌드 | 공개 포트 | 데이터/설정 |
| --- | --- | --- | --- |
| nginx | client/Dockerfile, 루트 context, Node 빌드 → nginx:alpine | `${NGINX_PORT:-8090}:80` | React dist와 nginx.conf를 이미지에 포함 |
| server | server/Dockerfile, server context, node:20-alpine | 운영 호스트 publish 없음. 내부 3000 | Compose environment 주입 |
| db | 사전 빌드 공식 이미지 postgres:16-alpine | 운영 호스트 publish 없음. 내부 5432 | named volume + 초기화 SQL bind mount |
| 개발 db | postgres:16-alpine | `5432:5432` | 별도 postgres_data_dev 볼륨, 개발용 고정 인증정보 |

Dockerfile의 EXPOSE는 호스트 포트를 공개하는 설정이 아니다. 운영 3개 서비스는 rwr-network라는 Compose bridge network를 사용하며 restart는 unless-stopped다.

실제 package.json은 React 19, Vite 8, React Router 7, Express 4, pg 8이다. README와 docs/07-tech-stack.md의 React 18/Vite 5/Router 6 표기는 오래되었다. client/README.md는 기본 Vite 템플릿 안내여서 배포 운영 지침이 아니다.

확인한 주요 문서: docs/01-overview.md, docs/03-requirements.md, docs/06-data-spec.md, docs/07-tech-stack.md, Plan/Step/PR 33, Step 13·14·15와 관련 배포 기록. 과거 설명과 현재 설정이 다르면 현재 코드를 우선했다.

### 저장소 근거 파일

아래 링크는 분석 기준 커밋의 설정을 확인하기 위한 저장소 내부 경로다.

| 확인 대상 | 근거 파일 |
| --- | --- |
| 운영/개발 Compose | [운영 Compose](../../../docker-compose.yml), [개발 Compose](../../../docker-compose.dev.yml) |
| Docker 이미지 빌드 | [클라이언트 Dockerfile](../../../client/Dockerfile), [서버 Dockerfile](../../../server/Dockerfile) |
| GitHub Actions | [deploy.yml](../../../.github/workflows/deploy.yml) |
| nginx | [nginx.conf](../../../nginx/nginx.conf) |
| 환경변수 예제 | [루트 예제](../../../.env.example), [서버 예제](../../../server/.env.example), [클라이언트 예제](../../../client/.env.example) |
| 서버 설정/DB 연결 | [환경 로더](../../../server/src/config/env.js), [보안 설정](../../../server/src/config/securityConfig.js), [앱과 health API](../../../server/src/app.js), [DB 연결](../../../server/src/db/index.js) |
| DB 초기화 | [schema.sql](../../../server/src/db/schema.sql), [seed.sql](../../../server/src/db/seed.sql) |
| 클라이언트 API/빌드 변수 | [API 모듈](../../../client/src/api/client.js), [HTML 템플릿](../../../client/index.html), [Vite 설정](../../../client/vite.config.js) |
| 패키지/플랫폼 의존성 | [client package.json](../../../client/package.json), [client lockfile](../../../client/package-lock.json), [server package.json](../../../server/package.json), [server lockfile](../../../server/package-lock.json) |
| 기존 운영 전환 이유 | [Step 13](../../steps/step-13-vm-deployment.md), [PR 13](../../pr/pr-13-vm-deployment.md), [Step 14](../../steps/step-14-single-env-secret.md), [Step 15](../../steps/step-15-volume-naming.md) |
| Linux/Tunnel 예시 및 최신 기록 | [Plan 13](../../plans/plan-13-vm-deployment.md), [Plan 33](../../plans/plan-33-edge-security-config.md), [Step 33](../../steps/step-33-edge-security-config.md), [PR 33](../../pr/pr-33-edge-security-config.md) |
| 개요/요구사항/데이터/스택 | [README](../../../README.md), [개요](../../01-overview.md), [요구사항](../../03-requirements.md), [데이터 명세](../../06-data-spec.md), [기술 스택](../../07-tech-stack.md) |

## 2. 현재 배포 흐름

```text
GitHub main push (dev push/PR 트리거는 없음)
→ .github/workflows/deploy.yml: Deploy to VM
→ runs-on: self-hosted (OS/아키텍처/프로젝트 전용 label 없음)
→ actions/checkout@v4: 이벤트 커밋을 runner workspace에 checkout
→ secrets.ENV_FILE 전체 내용을 workspace/.env에 printf로 기록
→ 해당 workspace에서 docker compose up -d --build --remove-orphans
   ├─ nginx 이미지: node:20-alpine → npm ci → Vite build
   │                → nginx:alpine에 dist와 nginx.conf 복사
   ├─ server 이미지: node:20-alpine → npm ci --only=production
   │                 → server 파일 복사 → node server.js
   └─ db 이미지: postgres:16-alpine 사용
       → 빈 데이터 디렉터리이면 01-schema.sql → 02-seed.sql
       → pg_isready healthcheck
       → db healthy 조건 충족 후 server 시작
       → server 시작 의존성에 따라 nginx 시작 (API readiness 보장은 아님)
→ localhost:${NGINX_PORT:-8090}/ 에 curl -sf, 최대 10회 시도/실패 시 3초 대기
→ 실패 시 Compose 로그 50줄 출력, job 실패
→ 항상 docker image prune -f
```

위 순서는 논리적 의존관계이며 빌드 작업 자체가 모두 직렬이라는 뜻은 아니다. PostgreSQL healthcheck는 5초 간격/5초 timeout/5회 retries다. nginx와 server의 Compose healthcheck는 없다.

헬스체크는 홈페이지 HTTP 응답만 본다. `/api/health`조차 호출하지 않으며 해당 API도 DB 쿼리는 수행하지 않는다. 주석의 “최대 30초”와 달리 curl에 요청 timeout이 없으므로 실제 총 시간의 엄격한 상한은 아니다.

외부 접근은 저장소 문서 기준 다음 구조다. 실제 현재 Tunnel 상태는 확인하지 않았다.

```text
브라우저 HTTPS
→ Cloudflare
→ 기존 VM의 cloudflared
→ HTTP localhost:8090
→ nginx:80
   ├─ / : SPA 정적 파일, 없는 경로는 index.html
   └─ /api/ : server:3000으로 경로 보존 proxy
               ├─ PostgreSQL db:5432
               └─ ORS/Kakao 외부 API
```

브라우저는 별도로 Kakao Maps SDK와 우편번호 서비스 스크립트를 읽는다. nginx는 80만 listen하고 TLS 인증서 설정은 없다. Cloudflare ingress와 자격증명은 Compose에 포함되지 않는다.

## 3. 현재 구조가 이렇게 된 이유

- Step 13은 기존 health-center 서비스의 3000/8080/5432 포트 충돌을 피하려고 nginx를 8090에 공개했다고 설명한다. API/DB는 내부 네트워크로 제한했다.
- Step 13과 PR 13은 이전 GHCR+SSH 방식에서 VM self-hosted runner로 전환해 GHCR 토큰, VM_HOST, VM_SSH_KEY 관리 부담을 줄였다고 명시한다. 현재 workflow에도 그 구조가 반영되어 있다. 과거 GHCR 파이프라인이 실제 운영됐는지는 문서만으로 단정하지 않는다.
- Step 14는 개별 Secrets 대신 ENV_FILE 하나로 환경변수 전체를 관리하려는 목적을 설명한다. 현재 workflow와 일치한다.
- Step 15의 rwr_postgres_data는 볼륨의 소속을 알아보기 쉽게 하려는 변경이다. 실제 Docker 리소스 이름을 name:으로 고정한 것은 아니다.
- Step 17 및 client/src/api/client.js는 운영 API 호출을 상대경로 /api로 바꾼 기록이다. nginx와 SPA를 같은 origin에서 제공하는 현재 구조와 맞는다.
- Step 33의 요청 크기/timeout/rate limit 설정은 nginx.conf와 server/src/config/securityConfig.js에 반영되어 있다. Cloudflare 규칙은 대시보드 수동 운영 기록이다.

## 4. 현재 문제점

### CI 작업 디렉터리와 운영 배포 디렉터리 결합

workflow에는 별도 working-directory, 배포 경로, compose -p가 없다. checkout 위치에서 그대로 운영 Compose를 실행하므로 사용자가 설명한 `_work` 운영과 구조적으로 일치한다. 정확한 기존 절대경로는 저장소에 없다.

checkout v4의 clean 기본값은 true이며 ignored/untracked 파일도 정리 대상이 될 수 있다. 따라서 workspace 안의 수동 .env나 운영 파일을 영구 보관 장소로 취급하기 어렵다. [checkout v4 명세](https://raw.githubusercontent.com/actions/checkout/v4/action.yml)

DB 데이터 자체는 `_work` 디렉터리의 일반 파일이 아니라 Docker named volume이다. workspace 정리가 곧 DB 삭제라는 뜻은 아니다. 다만 SQL bind mount는 checkout 경로에 의존하고, 운영 디렉터리명이 바뀌면 Compose 프로젝트명과 볼륨 식별이 바뀔 수 있다. [Compose 프로젝트명](https://docs.docker.com/compose/how-tos/project-name/)

### 서버 직접 build와 cache/image 누적

nginx와 API는 매 배포 때 운영 호스트에서 build한다. 레이어 캐시로 재사용되더라도 CPU/메모리/디스크 부담과 빌드 실패가 운영 장비에 집중된다. 사전 lint/test 단계, 이미지 commit 태그, 롤백 단계, concurrency, 배포 environment 보호 설정은 파일에 없다.

image prune -f는 dangling image 정리이며 build cache 전체와 사용하지 않는 모든 태그 이미지의 보관 정책이 아니다. 실제 누적량은 docker system df가 필요하다. 이 명령은 프로젝트 제한도 없어 같은 Docker 엔진의 다른 프로젝트 dangling image까지 정리할 수 있다. [Docker prune](https://docs.docker.com/engine/manage-resources/pruning/)

### DB 초기화 재현성

schema.sql은 courses/favorites/history 및 인덱스를 만들고 seed.sql은 코스 10개를 넣는다. 새 빈 volume에서 두 SQL을 순서대로 실행하는 재현 경로가 있다. SQL 실행은 이번 분석에서 검증하지 않았다.

기존 데이터 디렉터리에는 초기화 스크립트가 다시 적용되지 않는다. CREATE TABLE IF NOT EXISTS는 기존 테이블 변경을 수행하지 않으며 ON CONFLICT DO NOTHING은 기존 seed 내용을 갱신하지 않는다. 버전 migration 도구/자동 적용 절차는 없다. 초기화 도중 실패했다면 재시작만으로 정상 복구된다고 볼 수 없다. [PostgreSQL 공식 이미지 초기화](https://github.com/docker-library/docs/tree/master/postgres#initialization-scripts)

기존 데이터를 버려도 된다는 요청 덕분에 이번 이전은 새 volume 초기화로 단순화할 수 있다. 기존 VM 데이터/volume 삭제는 수행하지 않았다.

### 환경변수 의존성

| 변수/그룹 | 주입 및 소비 위치 | 이전 시 의미 |
| --- | --- | --- |
| ENV_FILE | workflow → 루트 .env | 기존 방식 유지 시 Mac에 옮긴 .env 대신 Secret 내용으로 덮어씀 |
| NGINX_PORT | Compose ports, workflow grep | 기본 8090, Tunnel origin과 일치 필요 |
| POSTGRES_USER/PASSWORD/DB | db environment, server DATABASE_URL 조합 | 새 DB 인증값 일치 필요 |
| DATABASE_URL | server/src/db/index.js → pg.Pool | 운영은 루트 DATABASE_URL이 아니라 POSTGRES_*로 조합 |
| PORT/NODE_ENV | server/server.js | 운영 PORT=3000 고정, NODE_ENV 기본 production |
| CORS_ORIGIN | server/src/app.js | 쉼표 분리 허용 origin, 최종 도메인 확인 |
| ORS_API_KEY | orsService.js | 런타임 서버 전용 |
| KAKAO_REST_API_KEY | geocodingService.js, poiService.js | 런타임 서버 전용 |
| JSON_BODY_LIMIT | securityConfig.js | 기본 4kb, nginx는 8k 고정 |
| API_RATE_LIMIT_WINDOW_MS/MAX | securityConfig.js | 기본 900000/300 |
| EXTERNAL_API_RATE_LIMIT_WINDOW_MS/MAX | securityConfig.js | 기본 300000/60 |
| ORS_TIMEOUT_MS/KAKAO_TIMEOUT_MS/KAKAO_POI_TIMEOUT_MS | securityConfig.js, 각 서비스 | 기본 8000/5000/5000 |
| VITE_KAKAO_MAP_KEY | Compose build args → Dockerfile ARG/ENV → client/index.html | 빌드 시 정적 HTML에 포함되는 브라우저용 키. 런타임 .env 교체만으로 변경되지 않음 |
| VITE_API_BASE_URL | client/src/api/client.js | 기본 상대경로 /api. 현재 운영 Dockerfile build arg는 없음 |

server/src/config/env.js는 server/.env를 읽는다. 운영에서는 Compose environment가 직접 전달된다. 루트 .env의 모든 변수가 자동으로 컨테이너에 들어가는 구조가 아니다. 개발 서버만 직접 실행하면 루트 .env를 자동 로드하지 않는다.

DB URL을 문자열로 조합하므로 URL 예약문자가 포함된 사용자명/비밀번호의 인코딩 처리가 필요할 수 있다. printf의 shell 인용 안전성과 dotenv/Compose 변수 해석 및 URL 해석은 서로 다른 문제다. 실제 값은 검사하지 않았다.

workflow의 NGINX_PORT 추출은 dotenv 파서가 아닌 grep/cut이므로 따옴표, CRLF, inline 주석이 있으면 Compose가 읽은 값과 달라질 수 있다.

### Linux VM 절대경로 의존성

실행 Compose/Dockerfile/workflow에는 /home/<user>, _work, 특정 VM 주소가 하드코딩되어 있지 않다. 상대 bind mount와 기본 작업 위치에 간접 의존한다.

Plan 13 문서에는 /home/<user>/.cloudflared/<TUNNEL_ID>.json, systemctl, usermod -aG docker가 있고 Step 13에는 Linux x64 runner 설치 예시가 있다. 이들은 Mac에서 그대로 복사할 수 없는 운영 지침이다. 컨테이너 내부 /app, /etc/nginx, /var/lib/postgresql/data는 정상적인 Linux 컨테이너 경로이므로 Mac 호스트 경로로 바꾸는 대상이 아니다.

### amd64 / arm64 및 native dependency

Compose에 platform: linux/amd64 고정이나 Dockerfile의 amd64 강제 옵션은 없다. lockfile에는 Rolldown 1.0.2와 Lightning CSS 1.32.0의 linux-arm64-musl, linux-arm64-gnu, darwin-arm64 배포물이 있다. Alpine 컨테이너에는 linux-arm64-musl이 중요하며 macOS darwin-arm64와 다르다.

server의 pg-native는 optional peer 표기뿐 실제 설치 패키지는 없다. server lockfile의 pg-cloudflare는 선택적 라이브러리이며 cloudflared/Tunnel 운영 설정을 뜻하지 않는다. fsevents는 macOS용 optional dependency다. amd64 전용 필수 패키지는 이번 lockfile 검사에서 발견되지 않았다.

nginx:alpine과 postgres:16-alpine의 공식 이미지 목록은 arm64v8을 포함한다. node:20-alpine의 현재 tag manifest는 아직 확인하지 않았으므로 세 이미지 모두 런타임 검증 완료라고 표현하지 않는다. [nginx 공식 목록](https://raw.githubusercontent.com/docker-library/official-images/master/library/nginx), [Postgres 공식 목록](https://raw.githubusercontent.com/docker-library/official-images/master/library/postgres)

Dockerfile 두 곳의 Node 20은 분석일 기준 EOL이다. arm64 문제와 별개로 지원 중인 LTS 선정이 필요하다. lockfile의 Vite는 ^20.19.0 또는 >=22.12.0, ESLint는 ^20.19.0 또는 ^22.13.0 또는 >=24를 요구한다. 단순히 “Node 20 이상” 안내만으로는 충분하지 않다. [Node 공식 EOL](https://nodejs.org/en/about/eol)

### .dockerignore 누락

루트와 server build context에 .dockerignore가 없다. server/Dockerfile은 npm ci 뒤 COPY . .를 수행하므로 server/.env가 있으면 최종 이미지에 들어가고, 로컬 node_modules가 있으면 컨테이너에서 설치한 의존성과 섞일 수 있다. client의 COPY client/ .도 같은 의존성 혼입 가능성이 있다.

루트 .env가 현재 COPY 명령만으로 최종 nginx 이미지에 자동 포함된다는 뜻은 아니다. 다만 루트 build context에서 민감한 파일을 제외하는 규칙이 없으며 GHCR 공개 이전에는 context와 image 내용을 정리해야 한다. .gitignore는 .dockerignore의 대체물이 아니다. [Docker build context](https://docs.docker.com/build/concepts/context/#dockerignore-files)

### 외부 포트와 Cloudflare 영향

운영 API 3000과 DB 5432는 공개되어 있지 않다. nginx는 host IP를 지정하지 않아 loopback으로 제한되지 않는다. 개발 DB는 5432를 publish하며 고정 개발 인증정보를 사용한다. 실제 인터넷 도달 여부는 방화벽/공유기/OrbStack 설정에 따라 별도 확인해야 한다.

Cloudflare 전용 포트, tunnel token, 실행 서비스, Terraform 설정은 저장소 실행 파일에 없다. Plan 13의 예시와 Step 33의 Rate Limiting Rule 1개 적용 기록만 있다. 현재 계정에 그대로 남아 있는지는 확인하지 않았다.

Express는 trust proxy=1, nginx는 X-Forwarded-For를 추가하고 X-Forwarded-Proto에 $scheme을 넣는다. cloudflared가 앞에 있으면 실제 사용자 IP와 HTTPS 인식이 기대와 다를 수 있다. 특히 Express가 바로 앞 nginx 기준 한 홉만 신뢰하여 tunnel 쪽 주소를 사용자 IP로 해석하는지 확인해야 한다. 이는 재현된 오류가 아니라 현재 설정에서 도출한 점검 항목이며, 신뢰 범위를 무작정 늘리는 변경은 제안하지 않는다.

## 5. Mac mini + OrbStack에서 그대로 사용 가능한 부분

- React/Vite SPA → nginx, Express → PostgreSQL의 3서비스 구분.
- /api 상대경로, nginx 정적 서빙/SPA fallback, server:3000과 db:5432 서비스명 통신.
- 새 PostgreSQL용 schema.sql/seed.sql과 named volume 방식.
- npm ci와 lockfile 기반 설치, 프론트 멀티 스테이지 빌드 방식.
- 서버 런타임 환경변수와 브라우저 빌드 변수의 분리 개념.

OrbStack은 Docker Compose, named volume, bind mount, port forwarding을 지원하므로 구조 자체를 새 플랫폼으로 갈아엎을 이유는 없다. 이는 호환 구조 판단이며 현 파일의 무수정 실행 성공을 보증하지 않는다. [OrbStack Docker](https://docs.orbstack.dev/docker/)

## 6. 수정이 필요한 부분

목표 구조를 채택할 경우 필요한 변경 후보이며 아직 구현/Plan 승인 사항이 아니다.

1. 앱 이미지 build/push job과 Mac 배포 job 분리. 운영 Compose는 GHCR의 nginx/API image 참조로 전환.
2. _work 밖의 고정 운영 경로, 명시적인 Compose 프로젝트명, 배포 파일 버전 관리 방식 결정.
3. .dockerignore, 지원 중 Node LTS, 이미지 tag/digest 정책, arm64 빌드 및 실행 검증.
4. Compose 및 초기화 SQL 전달 방식 마련. 이미지 pull만으로 호스트의 SQL bind mount 파일이 생기지 않는다.
5. PR/dev 검증과 운영 배포 브랜치 정책 분리. default branch=dev가 곧 배포 branch=dev를 의미하지 않는다.
6. 배포 전 검증, API/DB 준비 상태 확인, 동시 배포 방지, 이전 이미지 복구 및 이미지 보관 기준.
7. .env 소유 위치와 갱신 방식, 빌드 시 Kakao JavaScript 키 전달, GHCR pull 권한 결정.
8. cloudflared 실행 위치에 따른 origin URL/포트 접근 범위, proxy header 검증.
9. Mac runner 서비스 사용자의 Docker context/PATH/keychain 접근과 재부팅 후 자동 복구 확인.
10. README의 버전, Windows 전용 명령, 기존 Linux 운영 가이드를 후속 단계에서 보정.

## 7. 제거 가능한 기존 서버 종속 요소

- 목표 전환 완료 뒤의 Mac 직접 build 단계와 VM 빌드 캐시 운영 부담.
- _work를 운영 파일의 영구 저장 위치로 사용하는 관행.
- 기존 VM 전용 runner 등록/서비스, Linux x64 설치 지침, Docker 그룹/systemctl 절차.
- Mac 운영 전환 확인 후 기존 Tunnel connector와 이전 VM 리소스. 다른 health-center 서비스가 공유하는 Tunnel/runner/volume은 통째로 삭제하면 안 된다.
- 과거 개별 환경변수 Secret, VM_HOST/VM_SSH_KEY/GHCR 토큰은 현재 workflow에서 참조하지 않는다. 실제 존재 및 다른 workflow/저장소에서의 사용 여부 확인 후 정리 대상이다.

rwr_postgres_data, nginx, PostgreSQL, 상대경로 /api는 VM 전용 잔재가 아니다. 8090도 사용 가능하면 유지할 수 있다. 이번에 실제로 제거한 항목은 없다.

## 8. 추가 확인이 필요한 부분

| 대상 | 저장소만으로 알 수 없는 점 |
| --- | --- |
| GitHub | 실제 최신 default branch, 운영 push 정책, runner 수/labels, ENV_FILE 존재/갱신 시점, GHCR 권한/공개 범위 |
| 기존 VM | 배포된 SHA, _work 절대경로, Compose project/volume 실명, cache/image 크기, 다른 서비스 공유 관계 |
| Mac | OrbStack 설치/버전/구동 상태, runner 사용자, Docker context, 실제 localhost 접근, 재시작/로그아웃/절전 동작 |
| DB | 빈 volume의 SQL 실행 성공, 3개 테이블 및 seed 10개 확인, 향후 백업 정책 |
| 네트워크 | 최종 도메인, 기존 DNS/Tunnel route, 실제 WAF/rate limit 상태, Kakao 허용 도메인 |
| 이미지 | 정확한 tag/digest의 linux/arm64 manifest와 native build 성공 |

현재 실행 셸은 uname -m=arm64이며 command -v docker는 경로를 찾지 못했다. OrbStack이 설치되지 않았다고 단정할 수는 없고 이 셸의 PATH에서 CLI가 사용 불가하다는 사실만 확인했다.

다음은 후속 읽기 전용 확인 명령 제안이며 이번에 실행하지 않았다. 기존 운영 경로에서 실행해야 하는 명령과 Mac에서 실행할 명령을 구분한다. 출력에 비밀값이 들어갈 수 있는 docker inspect 전체 출력이나 docker compose config 전체 출력은 공유하지 않는다.

```bash
# Mac: CLI/엔진/아키텍처
command -v docker
docker version
docker compose version
docker context show
docker context ls
docker info --format '{{.Architecture}}'

# 각 환경: 운영 리소스 식별 및 용량
docker compose ls
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
docker volume ls
docker system df

# Mac 또는 CI: 이미지 manifest만 조회, 이미지 실행/배포 아님
docker buildx imagetools inspect node:20-alpine
docker buildx imagetools inspect nginx:alpine
docker buildx imagetools inspect postgres:16-alpine

# 기존 VM 운영 디렉터리: 비밀값 없이 Compose 구문 확인
docker compose config --quiet
pwd
git rev-parse HEAD
```

운영 컨테이너 이름 확인 후에는 docker inspect의 --format으로 Compose working_dir/project 라벨과 Mounts만 선택해 확인할 수 있다. 실제 이름을 모르므로 실행 명령에 추측한 컨테이너명을 넣지 않는다. Cloudflare token이나 실제 .env를 문서에 복사할 필요는 없다.

lint/build/DB 초기화/배포 테스트는 실행하지 않았다. 사용자가 분석만 요청했고 의존성 설치 및 빌드 산출물 생성도 하지 않았기 때문이다. Docker CLI도 현재 사용할 수 없다.

## 9. 목표 배포 구조 제안

```text
GitHub PR/dev
→ GitHub-hosted runner: npm ci, client lint/build, server 구문/테스트 검증
→ 승인된 운영 branch 또는 release
→ Linux arm64 Docker build (nginx + API 두 이미지)
→ GHCR에 commit SHA tag와 digest 게시
→ Mac 전용 self-hosted runner의 배포 job
→ _work 밖 고정 운영 경로에 같은 release의 Compose/초기화 SQL 준비
→ OrbStack: docker compose pull → docker compose up -d --no-build
→ nginx/API/DB readiness 확인
→ Cloudflare Tunnel을 통한 외부 HTTPS 검증
```

실제 사용자 요청 방향은 브라우저 → Cloudflare Tunnel → Mac/OrbStack/nginx → API → DB다. Tunnel은 이미지 배포 대상 다음의 별도 CI 서버가 아니라 외부 접근 경로다.

별도 Jenkins는 필요 없다. Mac의 self-hosted runner를 남겨도 빌드는 GitHub에서 하고 Mac은 배포만 담당할 수 있다. Mac 전용 OS/ARM64/custom label로 runner 대상을 구분해야 기존 VM runner와 혼선이 없다. PR 코드를 Mac 운영 runner에서 실행하는 구조는 피한다.

Mac 운영 경로 예시는 /Users/<운영계정>/services/rwr이며 아직 확정하지 않는다. 여기에 Compose, 비밀값을 포함하지 않는 release 식별 정보, 초기 SQL, 운영 .env를 분리해 둔다. Compose/SQL은 이미지와 같은 커밋의 배포 묶음으로 전달하고 .env는 Mac에 유지하거나 승인된 Secret 관리 방식으로 갱신한다. 앱 소스 전체 checkout은 실행에 필수는 아니다.

GitHub는 GHCR 게시에 GITHUB_TOKEN을 사용할 수 있으며 package 권한 설정이 필요하다. private 이미지의 Mac pull에는 별도 읽기 인증이 필요하고 public 이미지는 익명 pull을 지원한다. [GitHub 이미지 게시](https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images), [GHCR 인증/접근](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

Mac만 운영하면 처음에는 linux/arm64 단일 이미지로 충분하다. Linux VM으로 복귀할 필요가 있을 때 linux/amd64,linux/arm64 멀티 플랫폼 이미지를 선택한다. GitHub-hosted ARM runner 사용 가능 여부는 저장소/계정 조건을 확인하고, 대안은 Buildx/QEMU다. [GitHub runner 선택](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job), [Docker 멀티 플랫폼 빌드](https://docs.docker.com/build/ci/github-actions/multi-platform/)

cloudflared를 Mac 호스트에서 실행하면 localhost:8090을 origin으로 사용하는 구성을 검토할 수 있다. 같은 Compose network의 컨테이너라면 nginx:80을 가리키는 구조를 검토한다. 컨테이너 내부 localhost는 Mac이나 nginx가 아니라 해당 컨테이너 자신이다. 실행 위치 결정 전 포트 바인딩/endpoint를 확정하지 않는다. [Cloudflare published applications](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/)

**규모 판단:** 단일 서버 MVP만을 기준으로 GHCR은 필수는 아니다. 배포가 드물다면 고정 디렉터리에서 직접 build하는 구조가 더 단순하다. 그러나 사용자는 운영 장비 빌드 부담을 없애고 Actions 중심 자동화를 원하므로, 앱 이미지 두 개만 GHCR로 관리하는 것은 목표에 직접 맞는다. Kubernetes, Jenkins, 별도 custom PostgreSQL 이미지를 당장 추가할 필요는 없다. 비용/권한/보관 정책은 계정 조건을 확인한 뒤 결정한다.

## 10. 다음 Plan을 만들기 전에 반드시 확인해야 할 항목

1. 작업 브랜치와 문서 경로는 확정했다: `chore/34-mac-mini-deployment-analysis`, `docs/34-mac-mini-deployment-analysis/`. 다음 구현 작업도 같은 브랜치를 사용할지는 후속 범위에 따라 결정한다.
2. dev와 운영 배포 branch의 관계. 현재 main push 배포를 유지할지 여부.
3. Mac 고정 운영 경로와 Compose 프로젝트명, 새 DB volume 이름.
4. GHCR 도입 선택, package 공개 여부, Mac 인증과 SHA/digest 보관 방식.
5. arm64 전용 또는 multi-platform 여부와 지원 중 Node LTS 선택.
6. Mac OrbStack/runner 실행 계정 및 부팅·로그인·절전 후 복구 가능 여부.
7. 실제 .env의 필수 키 존재와 운영값 적합성. 비밀값을 공유하지 않고 확인.
8. cloudflared를 호스트/컨테이너 중 어디에 둘지, 최종 도메인과 origin, 기존 서비스 공유 여부.
9. DB 빈 volume 초기화 실검증 범위와 후속 migration 필요 수준.
10. 운영 API/DB health 판정과 실패 시 이미지 복구 기준, 중복 배포 방지 기준.
11. Compose/SQL을 같은 release로 전달하는 방법과 .env를 보호하는 배포 규칙.
12. 변경 대상인 Docker/환경변수/보안 설정에 대한 사용자 승인 범위. 이번 분석은 변경 승인이 아니다.

### 최종 분류표

| 분류 | 대상 | 판단 |
| --- | --- | --- |
| 유지 | nginx + Express + PostgreSQL | 현재 MVP에 적합한 서비스 구분 |
| 유지 | /api 상대경로와 내부 서비스명 | Mac 호스트 변경과 분리된 접근 방식 |
| 유지 | schema/seed, PostgreSQL named volume | 새 DB 출발의 기본 구성 |
| 유지 | lockfile, npm ci, 멀티 스테이지 개념 | 설치/빌드 재현의 기반 |
| 수정 | self-hosted 직접 build workflow | hosted build와 Mac 배포 분리 후보 |
| 수정 | _work 운영 및 암묵적 project 이름 | 고정 경로/명시적 프로젝트명 필요 |
| 수정 | Docker build context | .dockerignore 부재, env/node_modules 혼입 방지 |
| 수정 | Node 20 및 부동 이미지 tag | 지원 LTS와 release/digest 기준 검토 |
| 수정 | 홈페이지만 확인하는 배포 검사 | API/DB 준비 상태 검증 필요 |
| 수정 | .env 관리와 빌드 변수 전달 | Mac 런타임과 GHCR 빌드 구분 |
| 수정 | README/운영 지침 | 실제 버전·Mac 운영 방식으로 보정 후보 |
| 제거 | 기존 VM x64/systemctl/docker 그룹 지침의 신규 서버 적용 | macOS 운영 절차로 대체 |
| 제거 | 기존 VM runner/Tunnel connector | 전환 검증 및 다른 서비스 공유 확인 후만 정리 |
| 제거 | 목표 전환 후 Mac build/prune 단계 | Mac 빌드 제거, 별도 image 보관 기준으로 대체 |
| 확인 필요 | nginx 8090/개발 DB 5432 공개 범위 | 호스트/컨테이너 Tunnel 위치와 LAN 접근 요구 |
| 확인 필요 | 정확한 이미지 arm64 동작 | manifest와 실제 빌드/실행 검증 미수행 |
| 확인 필요 | 기존 VM 실제 경로/배포 SHA/volume/cache | 저장소 밖 운영 상태 |
| 확인 필요 | Cloudflare DNS/WAF/IP 전달 | 문서 기록과 실제 계정 상태 구분 |
| 확인 필요 | OrbStack CLI/자동 복구/runner 권한 | 현재 셸에서 docker 사용 불가 |
| 확인 필요 | GitHub Secrets/GHCR/배포 branch | 원격 설정 미조회 |

제안 커밋 메시지(실제 commit/push는 수행하지 않음):

```text
docs: Mac mini 이전을 위한 기존 배포 구조 분석

- Docker Compose와 self-hosted 배포 흐름을 실제 설정 기준으로 정리한다.
- 환경변수, DB 초기화, 영속 데이터와 arm64 이전 점검 항목을 기록한다.
- GHCR 기반 목표 구조와 후속 확인 항목을 구분한다.
- 작업별 README와 분석 문서 폴더 구조를 추가한다.
```

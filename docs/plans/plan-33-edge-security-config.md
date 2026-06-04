# Plan 33. Edge 보안 설정 보완

## 상태

- 작성일: 2026.06.04
- 브랜치: `feat/33-edge-security-config`
- 단계: 구현 완료
- 관련 이전 문서:
  - `docs/plans/plan-32-api-security-hardening.md`
  - `docs/steps/step-32-api-security-hardening.md`
  - `docs/pr/pr-32-api-security-hardening.md`
- 기준 문서:
  - `docs/01-overview.md`
  - `docs/03-requirements.md`
  - `docs/06-data-spec.md`
  - `docs/07-tech-stack.md`

## 1. 작업 목표

Step 33에서는 Step 32에서 남겨둔 운영 앞단 보안 과제를 정리한다.

이번 작업의 핵심 목표는 아래 세 가지다.

```text
1. Nginx client_max_body_size와 proxy timeout을 명시한다.
2. Cloudflare rate limit / WAF 적용 기준을 문서화한다.
3. 서버 timeout, rate limit 값을 환경변수로 승격한다.
```

이번 Step은 API 기능을 새로 추가하는 작업이 아니라, 이미 적용된 보안 설정을 운영 환경에서 더 명확하게 조정할 수 있도록 만드는 작업이다.

## 2. 현재 상태 요약

### 이미 적용된 항목

- Express 서버에 `helmet` 보안 헤더가 적용되어 있다.
- Express JSON body limit은 `JSON_BODY_LIMIT` 환경변수 또는 기본값 `4kb`를 사용한다.
- Express 서버에 API rate limit이 적용되어 있다.
  - `/api/routes/*`, `/api/locations/*`: 5분당 60회
  - 그 외 `/api/*`: 15분당 300회
- ORS 요청 timeout은 코드 기본값 `8000ms`다.
- Kakao 주소/좌표 변환 timeout은 코드 기본값 `5000ms`다.
- Kakao POI 검색 timeout은 코드 기본값 `5000ms`다.
- Nginx는 React 정적 파일을 서빙하고 `/api/*` 요청을 Express 서버로 프록시한다.

### 아직 필요한 항목

- `nginx/nginx.conf`에 `client_max_body_size`가 명시되어 있지 않다.
- `nginx/nginx.conf`에 `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout`이 명시되어 있지 않다.
- Step 32의 rate limit과 timeout 값이 서버 코드 상수로 고정되어 있어 운영 환경별 조정이 어렵다.
- 루트 `.env.example`, `server/.env.example`, `docker-compose.yml`에 새 보안 설정값 전달 기준이 정리되어 있지 않다.
- Cloudflare rate limit / WAF는 대시보드 설정 영역이라 코드로 직접 적용하지 않고, Free tier 기준으로 실제 가능한 설정과 참고용 제한 항목을 분리한 체크리스트가 필요하다.

## 3. 사용자 확인이 필요한 결정

이번 작업은 저장소 규칙상 구현 전 사용자 확인이 필요하다.

### 3.1 Nginx 설정 변경

`nginx/nginx.conf` 변경은 운영 프록시 설정 변경에 해당한다.

계획값:

| 항목                    | 권장값 | 이유                                                                                    |
| ----------------------- | ------ | --------------------------------------------------------------------------------------- |
| `client_max_body_size`  | `8k`   | Express JSON body limit 기본값 `4kb`보다 약간 크게 두어 Nginx가 먼저 과도한 요청을 차단 |
| `proxy_connect_timeout` | `5s`   | Express 연결 지연 시 오래 대기하지 않음                                                 |
| `proxy_send_timeout`    | `10s`  | 요청 전달 지연 보호                                                                     |
| `proxy_read_timeout`    | `15s`  | ORS 후보 검증 등 서버 처리 시간을 고려하되 무한 대기 방지                               |

### 3.2 환경변수 이름 추가

환경변수 이름 추가는 `.env.example`, `server/.env.example`, `docker-compose.yml` 변경을 포함한다.

계획 변수:

| 변수명                              | 기본값   | 적용 대상                                             |
| ----------------------------------- | -------- | ----------------------------------------------------- |
| `JSON_BODY_LIMIT`                   | `4kb`    | Express JSON body limit                               |
| `API_RATE_LIMIT_WINDOW_MS`          | `900000` | 일반 `/api/*` rate limit window                       |
| `API_RATE_LIMIT_MAX`                | `300`    | 일반 `/api/*` max                                     |
| `EXTERNAL_API_RATE_LIMIT_WINDOW_MS` | `300000` | `/api/routes/*`, `/api/locations/*` rate limit window |
| `EXTERNAL_API_RATE_LIMIT_MAX`       | `60`     | 외부 API 의존 경로 max                                |
| `ORS_TIMEOUT_MS`                    | `8000`   | ORS 요청 timeout                                      |
| `KAKAO_TIMEOUT_MS`                  | `5000`   | 주소/좌표 변환 timeout                                |
| `KAKAO_POI_TIMEOUT_MS`              | `5000`   | POI 검색 timeout                                      |

운영 `.env` 파일 자체는 사용자 승인 없이 수정하지 않는다. 이번 Step에서는 예제 파일과 compose 전달 설정만 갱신한다.

### 3.3 Cloudflare 설정

Cloudflare rate limit / WAF는 저장소 코드가 아니라 Cloudflare 대시보드 설정이다.

이번 Step에서는 실제 Cloudflare 계정 설정을 변경하지 않는다. 대신 PR 또는 Step 문서에 Free tier에서 실제 가능한 권장 규칙, Pro 이상 참고 항목, Notion 복사용 학습 메모를 남긴다.

## 4. 구현 계획

### 4.1 Nginx body size와 proxy timeout 명시

`nginx/nginx.conf`에 요청 body 크기와 `/api/` proxy timeout을 명시한다.

예상 방향:

```nginx
client_max_body_size 8k;

location /api/ {
    proxy_connect_timeout 5s;
    proxy_send_timeout 10s;
    proxy_read_timeout 15s;
}
```

Nginx limit 값은 Express의 `JSON_BODY_LIMIT`와 충돌하지 않도록 Express limit보다 약간 크게 둔다.

### 4.2 서버 설정값 환경변수 승격

서버 코드의 rate limit과 timeout 상수를 환경변수 기반으로 변경한다.

구현 기준:

- 환경변수가 없으면 Step 32와 동일한 기본값을 사용한다.
- 숫자 환경변수가 잘못 들어오면 기본값으로 fallback한다.
- 음수, 0, 숫자가 아닌 값은 사용하지 않는다.
- 응답 형식은 기존 `{ success: false, message }`를 유지한다.

필요하면 `server/src/config/securityConfig.js` 같은 작은 설정 모듈을 추가해 파싱 로직을 한 곳에 모은다.

### 4.3 Docker Compose 환경변수 전달

운영 Docker Compose의 `server.environment`에 보안 설정 환경변수를 전달한다.

루트 `.env.example`에는 운영자가 값을 이해하고 바꿀 수 있도록 주석을 추가한다.

개발용 `server/.env.example`에도 같은 이름을 넣어 로컬 실행 기준을 맞춘다.

### 4.4 Cloudflare Free 기준 운영 체크리스트 문서화

Cloudflare는 코드로 변경하지 않고 문서화한다.

권장 문서 내용:

| 항목                            | Free 기준                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| Cloudflare Proxy                | 주황색 구름 사용 가능                                                                   |
| Rate Limiting 대상              | `/api/routes/*`, `/api/locations/*` 우선                                                |
| Rate Limiting 기준              | rule 1개, Path 조건, IP 기준, `10 requests / 10 seconds`, duration `10 seconds`         |
| Cloudflare Free Managed Ruleset | 문서상 Free에서 제공되지만 대시보드 확인 결과 별도 설정하지 않는 것으로 정리            |
| WAF Custom Rules                | Free에서 가능하지만 이번 Step에서는 필수 적용 대상이 아닌 참고 항목                     |
| Bot Fight Mode                  | Free에서 가능하지만 전체 도메인 적용이라 API 영향 가능성이 있어 보류                    |
| Pro 이상 참고                   | Host 조건, 5분 period, 10분 duration, Cloudflare Managed Ruleset, OWASP Core Ruleset 등 |

Cloudflare 설정은 운영 환경 트래픽과 도메인 상태에 따라 달라질 수 있으므로, 이번 Step에서는 "권장값"과 "확인 항목"으로 남긴다.

### 4.5 구현 후 Cloudflare 확인 결과

2026.06.05 기준 사용자 대시보드 확인 결과, Cloudflare Free에서 실제로 적용한 것은 `Rate Limiting Rule 1개`다.

최종 적용한 rule은 `/api/routes/*`, `/api/locations/*`를 대상으로 하는 `RWR generated route and location APIs`이며, 같은 IP에서 `10 requests / 10 seconds`를 넘으면 `Block`한다.

Managed Ruleset은 문서상 Free Managed Ruleset이 제공되지만, 대시보드에서 검색 시 `Account-level web application firewall (WAF)` 구매/add-on 화면으로 연결되었다. 이 화면은 계정 단위 WAF 설정이며 Enterprise 또는 유료 add-on 영역으로 보인다.

따라서 이번 Step에서는 Managed Ruleset을 별도로 구현하거나 설정하지 않는다. Free에서 기본 제공되는 보호가 있다면 그대로 두고, 직접 설정 가능한 작업으로는 추적하지 않는다.

## 5. 변경 예상 파일

| 파일                                         | 변경 예상 내용                             |
| -------------------------------------------- | ------------------------------------------ |
| `nginx/nginx.conf`                           | `client_max_body_size`, proxy timeout 명시 |
| `server/src/app.js`                          | rate limit 값 환경변수 설정 사용           |
| `server/src/services/orsService.js`          | ORS timeout 환경변수 설정 사용             |
| `server/src/services/geocodingService.js`    | Kakao 위치 timeout 환경변수 설정 사용      |
| `server/src/services/poiService.js`          | Kakao POI timeout 환경변수 설정 사용       |
| `server/src/config/securityConfig.js`        | 보안 설정 파싱 모듈 추가 가능              |
| `.env.example`                               | 운영 보안 환경변수 예시 추가               |
| `server/.env.example`                        | 로컬 서버 보안 환경변수 예시 추가          |
| `docker-compose.yml`                         | server 컨테이너 환경변수 전달 추가         |
| `docs/steps/step-33-edge-security-config.md` | 구현 완료 후 작성                          |
| `docs/pr/pr-33-edge-security-config.md`      | PR 요약 문서 작성                          |

## 6. 검증 계획

가능한 범위에서 아래 검증을 실행한다.

```text
node --check server/src/app.js
node --check server/src/services/orsService.js
node --check server/src/services/geocodingService.js
node --check server/src/services/poiService.js
node --check server/src/config/securityConfig.js
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
```

Nginx 설정은 로컬에 Nginx 바이너리가 없을 수 있으므로, 가능한 경우 Docker 빌드 또는 컨테이너 실행으로 간접 확인한다.

```text
docker compose config
docker compose build nginx
```

Docker 실행이나 빌드는 사용자 환경과 승인 여부에 따라 생략할 수 있다. 생략하면 남은 리스크를 Step 문서에 적는다.

## 7. 제외 범위

- DB 스키마 변경
- seed 데이터 변경
- `server/.env` 실제 파일 수정
- 저장소 코드/API를 통한 Cloudflare 대시보드 자동 변경
- 새로운 npm 패키지 추가
- CORS 정책 변경
- Helmet 세부 정책 변경
- 생성형 코스 API 동작 방식 변경
- 지도 출발지/방향 UX 개선

## 8. 진행 순서

1. 사용자에게 Nginx 설정 변경과 환경변수 이름 추가 승인을 받는다.
2. `nginx/nginx.conf`에 body size와 proxy timeout을 명시한다.
3. 서버 보안 설정값 파싱 모듈을 추가하거나 기존 코드에 최소 변경으로 반영한다.
4. `app.js`, ORS, Kakao 위치, POI 서비스가 환경변수 기반 설정을 사용하도록 변경한다.
5. 루트 `.env.example`, `server/.env.example`, `docker-compose.yml`에 새 값을 반영한다.
6. 문법 확인과 클라이언트 lint/build를 실행한다.
7. Nginx/Docker 설정 검증이 가능하면 실행한다.
8. Step / PR 문서를 작성한다.
9. 한글 Conventional Commit 메시지를 제안한다.

## 9. 결론

Step 33은 Step 32의 서버 코드 보안 설정을 운영 앞단까지 연결하는 작업이다.

Nginx는 요청 크기와 proxy 대기 시간을 명시해 1차 방어선을 맡고, Express는 rate limit과 외부 API timeout 값을 환경변수로 받아 운영 환경별 조정이 가능해진다. Cloudflare는 실제 대시보드 설정을 변경하지 않고, 운영자가 적용할 수 있는 rate limit / WAF 체크리스트로 문서화한다.

# Step 33. Edge 보안 설정 보완

> 작성일: 2026.06.04  
> 브랜치: `feat/33-edge-security-config`  
> 작업 계획서: [docs/plans/plan-33-edge-security-config.md](../plans/plan-33-edge-security-config.md)  
> 관련 PR 문서: [docs/pr/pr-33-edge-security-config.md](../pr/pr-33-edge-security-config.md)

---

## 1. 작업 목표

Step 32에서는 Express 서버 안쪽의 보안 안정화를 진행했다.

이번 Step 33에서는 서버 앞단의 운영 설정까지 이어서 보완했다. 여기서 "앞단"은 사용자의 요청이 Express 서버에 도착하기 전에 거치는 구간을 뜻한다.

운영 요청 흐름은 아래처럼 볼 수 있다.

```text
사용자 브라우저
→ Cloudflare
→ Nginx
→ Express API 서버
→ PostgreSQL 또는 외부 API
```

이번 작업의 목표는 아래 세 가지다.

```text
1. Nginx에서 요청 body 크기와 API proxy timeout을 명시한다.
2. Express의 timeout, rate limit 값을 환경변수로 조정할 수 있게 한다.
3. Cloudflare rate limit / WAF 설정 방법을 최신 방식 기준으로 문서화한다.
```

---

## 2. 구현 요약

### 2.1 Nginx 요청 크기 제한 추가

`nginx/nginx.conf`에 아래 설정을 추가했다.

```nginx
client_max_body_size 8k;
```

이 설정은 Nginx가 받을 수 있는 요청 body의 최대 크기를 정한다.

RWR API는 이미지 업로드나 큰 파일 업로드를 받지 않는다. 주소, 좌표, 거리, 운동 유형 같은 작은 JSON 요청만 받는다. 그래서 요청 body를 작게 제한하는 편이 안전하다.

현재 Express의 JSON body limit 기본값은 `4kb`다. Nginx는 그보다 조금 큰 `8k`로 두었다.

```text
Nginx: 8k까지 허용
Express: 4kb까지 JSON 파싱 허용
```

이렇게 두면 Nginx가 너무 큰 요청을 1차로 거르고, Express가 실제 JSON 처리 단계에서 더 엄격하게 한 번 더 제한한다.

쉬운 비유로는 건물 입구와 사무실 문에 각각 제한을 두는 것과 비슷하다.

```text
건물 입구: 너무 큰 짐은 들어오지 못하게 한다.
사무실 문: 업무에 필요한 크기의 짐만 최종적으로 받는다.
```

### 2.2 Nginx proxy timeout 추가

`/api/` 프록시 구간에 아래 timeout을 추가했다.

```nginx
proxy_connect_timeout 5s;
proxy_send_timeout 10s;
proxy_read_timeout 15s;
```

각 값의 의미는 아래와 같다.

| 설정                    | 값    | 의미                                                       |
| ----------------------- | ----- | ---------------------------------------------------------- |
| `proxy_connect_timeout` | `5s`  | Nginx가 Express 서버에 연결할 때 최대 5초만 기다린다.      |
| `proxy_send_timeout`    | `10s` | Nginx가 Express로 요청을 전달할 때 최대 10초까지 허용한다. |
| `proxy_read_timeout`    | `15s` | Express 응답을 읽을 때 최대 15초까지 기다린다.             |

RWR의 생성형 코스 API는 ORS와 Kakao Local API를 사용한다. 외부 API가 느리면 Express도 응답을 바로 만들지 못할 수 있다.

하지만 무한히 기다리면 Nginx와 서버 자원이 붙잡힌다. 그래서 충분히 기다리되, 문제가 길어질 때는 끊을 수 있는 기준을 둔 것이다.

### 2.3 서버 보안 설정 환경변수 승격

Step 32에서는 rate limit과 timeout 값이 코드 상수였다.

이번 Step에서는 `server/src/config/securityConfig.js`를 추가해 환경변수로 조정할 수 있게 했다.

추가된 설정값은 아래와 같다.

| 환경변수                            | 기본값   | 의미                                                  |
| ----------------------------------- | -------- | ----------------------------------------------------- |
| `JSON_BODY_LIMIT`                   | `4kb`    | Express JSON body limit                               |
| `API_RATE_LIMIT_WINDOW_MS`          | `900000` | 일반 API rate limit 시간 창. 900000ms = 15분          |
| `API_RATE_LIMIT_MAX`                | `300`    | 일반 API 15분당 최대 요청 수                          |
| `EXTERNAL_API_RATE_LIMIT_WINDOW_MS` | `300000` | 외부 API 의존 경로 rate limit 시간 창. 300000ms = 5분 |
| `EXTERNAL_API_RATE_LIMIT_MAX`       | `60`     | 외부 API 의존 경로 5분당 최대 요청 수                 |
| `ORS_TIMEOUT_MS`                    | `8000`   | ORS 요청 timeout. 8000ms = 8초                        |
| `KAKAO_TIMEOUT_MS`                  | `5000`   | Kakao 주소/좌표 변환 timeout. 5000ms = 5초            |
| `KAKAO_POI_TIMEOUT_MS`              | `5000`   | Kakao POI 검색 timeout. 5000ms = 5초                  |

환경변수는 운영 환경마다 다르게 둘 수 있다.

예를 들어 개인 테스트 서버에서는 낮게 잡고, 실제 사용자가 많아지면 조금 높일 수 있다.

```text
로컬 테스트: 5분당 30회
운영 초기: 5분당 60회
트래픽 증가 후: 실제 사용량을 보고 조정
```

중요한 점은 잘못된 값이 들어와도 서버가 바로 이상하게 동작하지 않도록 했다는 것이다.

`securityConfig.js`는 숫자 환경변수에 대해 아래처럼 판단한다.

```text
값이 비어 있음 → 기본값 사용
숫자가 아님 → 기본값 사용
0 이하 → 기본값 사용
양의 정수 → 해당 값 사용
```

즉 `ORS_TIMEOUT_MS=abc`처럼 잘못 들어가도 서버는 기본값 `8000`을 사용한다.

### 2.4 Docker Compose 환경변수 전달

운영 `docker-compose.yml`의 `server.environment`에 새 환경변수를 전달하도록 추가했다.

루트 `.env.example`과 `server/.env.example`에도 같은 이름을 추가했다.

실제 `.env` 파일은 수정하지 않았다. `.env`는 개인/운영 비밀값을 담을 수 있으므로 사용자가 직접 값을 넣는 파일로 유지한다.

---

## 3. Cloudflare 설정 가이드

이번 Step에서는 Cloudflare 계정을 직접 변경하지 않았다. 대신 운영자가 Cloudflare 대시보드에서 최신 방식으로 설정할 수 있도록 기준을 정리했다.

Cloudflare 공식 문서 기준으로, 현재 rate limit은 WAF의 새 `Rate limiting rules`를 사용한다. 예전 Rate Limiting API와 Terraform의 `cloudflare_rate_limit` 리소스는 2025.06.15 이후 지원되지 않으며, API나 Terraform 자동화를 쓴다면 Rulesets API 또는 `cloudflare_ruleset` 리소스를 사용해야 한다.

공식 문서:

- Rate limiting rules: <https://developers.cloudflare.com/waf/rate-limiting-rules/>
- Dashboard에서 생성: <https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/>
- 이전 Rate Limiting 업그레이드 안내: <https://developers.cloudflare.com/waf/reference/legacy/old-rate-limiting/upgrade/>
- Managed Rules: <https://developers.cloudflare.com/waf/managed-rules/>

### 3.1 추천 Rate Limiting Rule

RWR에서 가장 먼저 보호해야 할 경로는 외부 API 비용과 지연에 연결되는 API다.

```text
/api/routes/*
/api/locations/*
```

추천 규칙:

| 항목            | 추천값                                              |
| --------------- | --------------------------------------------------- |
| Rule name       | `RWR generated route and location APIs`             |
| 대상 경로       | `/api/routes/*`, `/api/locations/*`                 |
| 기준            | IP 기준 request-based rate limiting                 |
| 요청 수         | 60 requests                                         |
| 기간            | 5 minutes                                           |
| Action          | `Block` 또는 운영 초기에는 `Managed Challenge` 검토 |
| Duration        | 10 minutes 또는 사용 가능한 가장 가까운 값          |
| Custom response | 가능하면 429 JSON 응답                              |

Cloudflare expression 예시는 아래와 같다.

```text
(
  http.request.uri.path starts_with "/api/routes/"
  or http.request.uri.path starts_with "/api/locations/"
)
```

도메인을 더 좁히고 싶다면 host 조건을 함께 추가한다.

```text
http.host eq "rwr.yourdomain.com"
and (
  http.request.uri.path starts_with "/api/routes/"
  or http.request.uri.path starts_with "/api/locations/"
)
```

Cloudflare 대시보드 기준 절차는 아래와 같다.

```text
1. Cloudflare Dashboard에 로그인한다.
2. 계정과 zone을 선택한다.
3. Security rules 페이지로 이동한다.
   - 구 UI에서는 Security > WAF > Rate limiting rules로 이동할 수 있다.
4. Create rule > Rate limiting rules를 선택한다.
5. Rule name을 입력한다.
6. Field/Expression에서 위 API 경로 조건을 설정한다.
7. With the same characteristics는 IP 기준으로 둔다.
8. When rate exceeds에서 Requests=60, Period=5 minutes를 입력한다.
9. Then take action에서 Block 또는 Managed Challenge를 선택한다.
10. Duration을 선택한다.
11. Deploy 또는 Save as Draft를 선택한다.
```

운영 초기에는 바로 강한 차단을 걸기보다, Cloudflare Security Events를 보면서 정상 사용자가 막히지 않는지 확인하는 것이 좋다.

### 3.2 Express rate limit과 Cloudflare rate limit의 관계

이번 프로젝트에는 두 겹의 rate limit이 있다.

```text
Cloudflare rate limit
→ Nginx
→ Express rate limit
```

각 역할은 다르다.

| 위치       | 역할                                                                                 |
| ---------- | ------------------------------------------------------------------------------------ |
| Cloudflare | 서버까지 오기 전에 과도한 요청을 막는다. 외부 트래픽 방어에 유리하다.                |
| Express    | Cloudflare를 거치지 않는 내부/직접 요청 또는 설정 누락에 대비하는 마지막 방어선이다. |

Cloudflare를 켰다고 Express rate limit을 제거하지 않는 이유는 방어를 한 곳에만 의존하지 않기 위해서다.

### 3.3 WAF Managed Rules 권장

Cloudflare Managed Rules는 Cloudflare가 미리 준비한 보안 규칙 묶음이다.

공식 문서 기준으로 Managed Rules는 아래 같은 공격 유형을 막는 데 도움을 준다.

```text
Zero-day 취약점
OWASP Top 10 계열 공격
민감정보 추출 시도
유출된 인증정보 사용 시도
```

RWR은 로그인 기능은 없지만, API가 외부에 노출되는 서비스이므로 WAF Managed Rules를 켜는 것이 좋다.

추천 순서:

```text
1. Security > WAF > Managed rules로 이동한다.
2. Cloudflare Managed Ruleset 활성화를 검토한다.
3. Cloudflare OWASP Core Ruleset 활성화를 검토한다.
4. 처음에는 기본 또는 낮은 민감도로 시작한다.
5. Security Events에서 정상 API 요청이 막히는지 확인한다.
6. 정상 요청이 막히면 예외 rule 또는 override를 좁게 추가한다.
```

주의할 점은 WAF가 모든 요청 body를 무제한으로 검사하지 않는다는 것이다. Cloudflare Managed Rules의 body 검사 한도는 plan마다 다르다. RWR은 JSON body를 `4kb`로 작게 제한했으므로 이 점에서는 WAF와도 잘 맞는다.

### 3.4 Bot 관련 설정

Cloudflare에는 Bot Fight Mode, Super Bot Fight Mode, Bot Management 같은 봇 대응 기능이 있다. 제공 범위는 plan에 따라 다르다.

RWR에서는 로그인이나 결제 기능이 없고, 핵심 보호 대상은 생성형 코스 API 과다 호출이다. 따라서 봇 기능을 무리하게 먼저 켜기보다 아래 순서가 안전하다.

```text
1. Rate limiting rules 먼저 적용
2. WAF Managed Rules 적용
3. Security Events 확인
4. 봇 트래픽이 명확할 때 Bot Fight Mode 계열 검토
```

무작정 강한 challenge를 걸면 모바일 사용자나 일부 브라우저에서 코스 생성 흐름이 끊길 수 있다.

---

## 4. 변경 파일

| 구분 | 파일                                         | 변경 내용                                                   |
| ---- | -------------------------------------------- | ----------------------------------------------------------- |
| 수정 | `nginx/nginx.conf`                           | `client_max_body_size 8k`, API proxy timeout 추가           |
| 수정 | `docker-compose.yml`                         | server 컨테이너에 보안 환경변수 전달 추가                   |
| 수정 | `.env.example`                               | 운영 보안 환경변수 예시 추가                                |
| 수정 | `server/.env.example`                        | 로컬 서버 보안 환경변수 예시 추가                           |
| 수정 | `server/src/app.js`                          | JSON body limit과 rate limit 값을 설정 모듈에서 읽도록 변경 |
| 수정 | `server/src/services/orsService.js`          | ORS timeout 값을 설정 모듈에서 읽도록 변경                  |
| 수정 | `server/src/services/geocodingService.js`    | Kakao 위치 timeout 값을 설정 모듈에서 읽도록 변경           |
| 수정 | `server/src/services/poiService.js`          | Kakao POI timeout 값을 설정 모듈에서 읽도록 변경            |
| 신규 | `server/src/config/securityConfig.js`        | 보안 설정 환경변수 파싱 모듈 추가                           |
| 신규 | `docs/plans/plan-33-edge-security-config.md` | Step 33 구현 계획 작성                                      |
| 신규 | `docs/steps/step-33-edge-security-config.md` | Step 33 구현 완료 기록                                      |
| 신규 | `docs/pr/pr-33-edge-security-config.md`      | PR 요약 문서 작성                                           |

---

## 5. 제외한 작업

이번 Step에서는 아래 항목을 변경하지 않았다.

- DB 스키마 변경
- seed 데이터 변경
- 실제 `.env` 파일 수정
- Cloudflare 대시보드 실제 변경
- 새로운 npm 패키지 추가
- CORS 정책 변경
- Helmet 세부 정책 변경
- 생성형 코스 API 응답 형식 변경
- 지도 출발지/방향 UX 개선

---

## 6. 검증 결과

| 검증 항목                                              | 결과 |
| ------------------------------------------------------ | ---- |
| `node --check server/src/config/securityConfig.js`     | 통과 |
| `node --check server/src/app.js`                       | 통과 |
| `node --check server/src/services/orsService.js`       | 통과 |
| `node --check server/src/services/geocodingService.js` | 통과 |
| `node --check server/src/services/poiService.js`       | 통과 |
| 클라이언트 lint                                        | 통과 |
| 클라이언트 build                                       | 통과 |

Nginx 설정은 로컬 Nginx 실행 검증까지는 하지 않았다. 다만 설정 변경은 표준 Nginx directive만 사용했고, Docker Compose의 server 환경변수 전달은 기존 compose 구조 안에서만 추가했다.

---

## 7. 문서와 코드 차이 확인

`docs/07-tech-stack.md`에는 클라이언트가 React 18 / Vite 5 기준으로 적혀 있지만, 실제 `client/package.json`은 React 19 / Vite 8 기준이다.

이번 Step의 검증은 실제 `package.json` 스크립트 기준으로 실행했다.

---

## 8. 후속 작업 제안

다음 작업 후보:

- 운영 서버에서 Docker Compose 재배포 후 Nginx 설정 동작 확인
- Cloudflare Security Events를 보고 rate limit 기준 조정
- WAF Managed Rules 적용 후 정상 API 요청 차단 여부 확인
- 지도 출발지/방향 UX 개선 Step 진행

---

## 9. 결론

Step 33은 Step 32에서 추가한 서버 보안 설정을 운영 앞단까지 연결한 작업이다.

Nginx는 과도한 요청 크기와 오래 걸리는 proxy 연결을 먼저 제한한다. Express는 rate limit과 timeout 값을 환경변수로 받아 운영 상황에 맞게 조정할 수 있다. Cloudflare는 최신 WAF Rate limiting rules와 Managed Rules 기준으로 설정할 수 있도록 문서화했다.

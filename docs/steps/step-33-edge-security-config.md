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

## 3. Cloudflare Free 기준 설정 가이드

이번 Step에서는 Cloudflare Free tier에서 실제로 설정할 수 있는 내용과, 학습용으로만 남길 내용을 분리했다. 2026.06.05 기준 사용자 대시보드 확인 결과, 최종적으로 적용한 Cloudflare 설정은 `Rate Limiting Rule 1개`다.

Cloudflare 공식 문서 기준으로, 현재 rate limit은 WAF의 새 `Rate limiting rules`를 사용한다. 예전 Rate Limiting API와 Terraform의 `cloudflare_rate_limit` 리소스는 2025.06.15 이후 지원되지 않으며, API나 Terraform 자동화를 쓴다면 Rulesets API 또는 `cloudflare_ruleset` 리소스를 사용해야 한다.

공식 문서:

- Rate limiting rules: <https://developers.cloudflare.com/waf/rate-limiting-rules/>
- Rate limiting parameters / Free 제한: <https://developers.cloudflare.com/waf/rate-limiting-rules/parameters/>
- Dashboard에서 생성: <https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/>
- Managed Rules: <https://developers.cloudflare.com/waf/managed-rules/>
- Bot Fight Mode Free plan: <https://developers.cloudflare.com/bots/plans/free/>

### 3.1 Free에서 실제로 적용할 수 있는 우선순위

실제 배포가 상용 서비스 수준은 아니므로, Cloudflare Free에서는 아래만 적용 대상으로 본다.

| 우선순위 | 항목                            | 이번 Step 판단 | 이유 |
| -------- | ------------------------------- | -------------- | ---- |
| 1        | Cloudflare Proxy, 주황색 구름   | 기본 적용 유지 | 무료로 CDN/프록시와 기본 보호를 받을 수 있다. |
| 2        | Rate Limiting Rules 1개         | 최종 적용 | Free는 rule 1개만 가능하므로 생성형 API 보호에 사용했다. |
| 3        | Cloudflare Free Managed Ruleset | 별도 설정하지 않음 | 검색/대시보드 확인 시 Account-level WAF add-on 화면으로 연결되어 직접 설정할 항목이 없었다. |
| 4        | WAF Custom Rules                | 보류 | Free에서도 가능하지만 지금 프로젝트에서 억지로 추가할 차단 조건은 없다. |
| 5        | Bot Fight Mode                  | 보류 | 무료지만 전체 도메인에 적용되고 API 흐름에 영향을 줄 수 있다. |

### 3.2 최종 적용한 Rate Limiting Rule 요약

Free에서 rate limiting rule은 1개만 만들 수 있다. 이번 Step에서는 `/api/routes/*`, `/api/locations/*`처럼 외부 API 비용과 지연에 연결되는 경로를 한 rule에 묶어 적용했다.

Free는 rate limiting expression에서 `Path` 중심 필드가 가능하다. `http.host eq ...` 같은 host 조건은 Free에서 제한될 수 있으므로 이번 문서의 실제 설정 예시에서는 제외한다.

최종 적용한 규칙은 아래와 같다.

| 항목                     | 값                                           |
| ------------------------ | -------------------------------------------- |
| Rule name                | `RWR generated route and location APIs`      |
| 대상 경로                | `/api/routes/*`, `/api/locations/*`          |
| Expression               | Path 조건만 사용                             |
| Counting characteristics | IP                                           |
| Requests                 | `10`                                         |
| Period                   | `10 seconds`                                 |
| Action                   | `Block`                                      |
| Duration                 | `10 seconds`                                 |
| Custom response          | Free에서는 사용하지 않음. 기본 429 응답 사용 |
| 상태                     | `Enabled`                                    |

이 규칙은 병목 가능성이 큰 호출부를 Cloudflare 앞단에서 한 번 막기 위한 기본 방어다.

왜 `10 requests / 10 seconds`로 시작하나?

RWR에서 코스 생성 버튼을 정상적으로 쓰는 사용자는 10초에 10번씩 생성 요청을 보내지 않는다. 반대로 버튼 연타나 자동화 요청은 이 기준에 걸릴 가능성이 높다.

그래도 Free tier의 10초 제한은 세밀한 운영 방어라기보다 "학습용/기본 방어"에 가깝다. 실제 운영 서비스라면 Cloudflare Free의 10초 rate limit만 믿지 않고 Express rate limit, Nginx timeout, 서버 로그 확인을 함께 사용해야 한다.

### 3.3 Free 기준 대시보드 설정 방법

아래 순서는 2026.06.05 기준 Cloudflare 대시보드의 `New rate limiting rule` 화면을 기준으로 작성했다.

```text
1. Cloudflare Dashboard에 로그인한다.
2. 계정과 zone을 선택한다.
3. DNS에서 배포 도메인의 Proxy status가 주황색 구름인지 확인한다.
4. Security rules 페이지로 이동한다.
   - 구 UI에서는 Security > WAF > Rate limiting rules로 이동할 수 있다.
5. Create rule > Rate limiting rules를 선택한다.
6. Rule name에 RWR generated route and location APIs를 입력한다.
7. Field/Expression에서 Path 조건을 설정한다.
8. With the same characteristics는 IP 기준으로 둔다.
9. When rate exceeds에서 Requests=10, Period=10 seconds를 입력한다.
10. Then take action에서 Block을 선택한다.
11. Duration은 10 seconds로 둔다.
12. Deploy 또는 Save as Draft를 선택한다.
13. 규칙이 Disabled 상태라면 Enabled로 전환한다.
14. Security Events에서 정상 코스 생성 요청이 막히는지 확인한다.
```

화면 입력값은 아래처럼 넣는다.

| 화면 영역 | 입력 항목 | 값 |
| --------- | --------- | -- |
| `Rule name` | Rule name | `RWR generated route and location APIs` |
| `When incoming requests match...` | 조건 입력 방식 | 드롭다운 방식 또는 `Edit expression` 방식 중 하나 사용 |
| `With the same characteristics...` | Characteristics | `IP` |
| `When rate exceeds...` | Requests | `10` |
| `When rate exceeds...` | Period | `10 seconds` |
| `Then take action...` | Choose action | `Block` |
| `For duration...` | Duration | `10 seconds` |
| rule 목록 | Status | `Enabled` |

드롭다운으로 조건을 넣을 수 있으면 아래처럼 설정한다.

| 줄 | Field | Operator | Value | 연결 |
| -- | ----- | -------- | ----- | ---- |
| 1 | `URI Path` | `starts with` | `/api/routes/` | `Or` |
| 2 | `URI Path` | `starts with` | `/api/locations/` | - |

Expression Preview가 아래와 비슷하면 맞다.

```text
(starts_with(http.request.uri.path, "/api/routes/")) or (starts_with(http.request.uri.path, "/api/locations/"))
```

Cloudflare 화면에서는 `URI Path`와 `starts with`를 고르면 expression이 위처럼 함수 형태로 표시될 수 있다. 이 형식도 정상이다.

드롭다운이 헷갈리거나 원하는 Field가 보이지 않으면 오른쪽 `Edit expression`을 눌러 아래 값을 그대로 입력한다.

```text
(
  starts_with(http.request.uri.path, "/api/routes/")
  or starts_with(http.request.uri.path, "/api/locations/")
)
```

Free tier 실제 설정에서는 아래 조건을 넣지 않는다.

```text
http.host eq "rwr.yourdomain.com"
```

2026.06.05 기준 Cloudflare Free Rate Limiting rule expression에서는 `Host`가 Pro 이상 필드로 표시될 수 있다. 따라서 이번 설정은 `Path` 조건만 사용한다.

처음 적용할 때는 `Deploy` 전에 `Save as Draft`로 저장해 설정값을 한 번 확인해도 된다. 바로 적용하려면 `Deploy`를 누른 뒤, rule 목록에서 상태가 `Enabled`인지 확인한다. `Disabled`로 남아 있으면 요청을 막지 않으므로, 오른쪽 메뉴 또는 상세 화면에서 활성화해야 한다.

### 3.4 Managed Ruleset 확인 결과

Cloudflare 문서상 Free에서 사용할 수 있는 Managed Ruleset은 `Cloudflare Free Managed Ruleset`이다.

`Cloudflare Managed Ruleset`과 `Cloudflare OWASP Core Ruleset`은 Pro 이상에서 사용할 수 있으므로 이번 Free 기준 실제 설정에는 넣지 않는다.

다만 2026.06.05 기준 사용자 대시보드에서 Managed Ruleset을 검색했을 때 `Account-level web application firewall (WAF)` 구매/add-on 안내 화면으로 연결되었다. 이 화면은 계정 단위 WAF 설정이며 Enterprise 또는 유료 add-on 영역으로 보인다.

따라서 이번 Step에서는 Managed Ruleset을 별도로 구현하거나 설정하지 않았다. Free에서 기본 제공되는 보호가 있다면 그대로 두고, 사용자가 직접 켜거나 튜닝할 수 있는 설정 대상으로 보지 않는다.

정리하면 아래처럼 보면 된다.

| Ruleset                         | Free 사용 여부 | 이번 Step 판단 |
| ------------------------------- | -------------- | -------------- |
| Cloudflare Free Managed Ruleset | 가능           | 별도 설정하지 않음. 기본 제공/확인 항목으로만 기록 |
| Cloudflare Managed Ruleset      | 불가           | 학습 참고 |
| Cloudflare OWASP Core Ruleset   | 불가           | 학습 참고 |

Cloudflare 문서에 따르면 Free Managed Ruleset은 모든 플랜에서 사용 가능하고, 고영향/광범위하게 악용되는 취약점에 대한 기본 보호를 제공한다.

### 3.5 Bot Fight Mode

Bot Fight Mode는 Free에서 사용할 수 있다. 다만 Cloudflare 문서 기준으로 전체 도메인에 적용되고, 세밀하게 조정하기 어렵다.

RWR은 API 호출이 중요한 서비스라서 Bot Fight Mode가 정상 API 흐름이나 모바일 브라우저 경험에 영향을 줄 수 있다.

따라서 이번 Step에서는 아래처럼 정리한다.

```text
가능은 하다.
하지만 지금은 켜지 않는다.
봇 트래픽이 실제로 확인되면 학습/테스트 목적으로만 검토한다.
```

### 3.6 Express rate limit과 Cloudflare rate limit의 관계

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
- 저장소 코드/API를 통한 Cloudflare 대시보드 자동 변경
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
- Cloudflare Free 기준 rate limiting rule 적용 후 Security Events 확인
- Cloudflare Security Events를 보고 `10 requests / 10 seconds` 기준 조정
- Cloudflare Managed Ruleset은 Free 대시보드에서 별도 설정 대상이 아니었으므로 추가 작업하지 않음
- 지도 출발지/방향 UX 개선 Step 진행

---

## 9. 결론

Step 33은 Step 32에서 추가한 서버 보안 설정을 운영 앞단까지 연결한 작업이다.

Nginx는 과도한 요청 크기와 오래 걸리는 proxy 연결을 먼저 제한한다. Express는 rate limit과 timeout 값을 환경변수로 받아 운영 상황에 맞게 조정할 수 있다. Cloudflare는 Free tier에서 실제 가능한 설정만 적용 대상으로 두고, Pro 이상 기능은 학습용 참고로 분리했다.

---

## 10. Notion 복사용 학습 메모

아래 내용은 Notion에 그대로 복사하기 위한 요약이다.

```markdown
# Cloudflare Free tier 보안 설정 학습 메모

## 이번 프로젝트에서 실제로 설정 가능한 것

| 항목                            | Free 가능 여부 | 적용 판단                                                                           |
| ------------------------------- | -------------: | ----------------------------------------------------------------------------------- |
| Cloudflare Proxy, 주황색 구름   |           가능 | 적용 가능. DNS에서 Proxy status를 주황색 구름으로 둔다.                             |
| WAF Custom Rules                |           가능 | 가능하지만 이번에는 필수 적용 대상은 아니다.                                        |
| Rate Limiting Rules             |           가능 | Free는 1개 rule만 가능하므로 `/api/routes/*`, `/api/locations/*` 보호에만 사용한다. |
| Rate limit 대상 path 조건       |           가능 | Free rate limiting rule expression은 Path 중심으로 사용한다.                        |
| Cloudflare Free Managed Ruleset |           가능 | 문서상 Free에서 제공되지만 대시보드에서 별도 설정 화면을 찾지 못해 이번에는 설정하지 않았다. |
| Bot Fight Mode                  |           가능 | 무료지만 전체 도메인에 적용되고 API에 영향을 줄 수 있어 이번에는 보류한다.          |

## 최종 적용한 Free 기준 Rate Limiting Rule

| 항목                          | 값                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Rule name                     | `RWR generated route and location APIs`                                                                     |
| 대상 path                     | `/api/routes/*`, `/api/locations/*`                                                                         |
| Expression                    | `(http.request.uri.path starts_with "/api/routes/" or http.request.uri.path starts_with "/api/locations/")` |
| Counting characteristics      | IP                                                                                                          |
| Requests                      | 10                                                                                                          |
| Period                        | 10 seconds                                                                                                  |
| Action                        | Block                                                                                                       |
| Mitigation timeout / Duration | 10 seconds                                                                                                  |
| Custom response               | Free에서는 사용하지 않음. 기본 429 응답 사용                                                                |

## 실제 설정 순서

1. Cloudflare Dashboard에 로그인한다.
2. 계정과 zone을 선택한다.
3. DNS에서 배포 도메인의 Proxy status가 주황색 구름인지 확인한다.
4. Security rules 또는 Security > WAF > Rate limiting rules로 이동한다.
5. Create rule > Rate limiting rules를 선택한다.
6. Rule name에 `RWR generated route and location APIs`를 입력한다.
7. Path expression을 설정한다.
8. With the same characteristics는 IP 기준으로 둔다.
9. When rate exceeds는 `10 requests / 10 seconds`로 둔다.
10. Then take action은 `Block`으로 둔다.
11. Duration은 `10 seconds`로 둔다.
12. Deploy 또는 Save as Draft를 선택한다.
13. Security Events에서 정상 코스 생성 요청이 막히는지 확인한다.

## Free에서 실제 설정하지 않는 참고 항목

| 항목                          |   Free 가능 여부 | 참고                                                                                                                      |
| ----------------------------- | ---------------: | ------------------------------------------------------------------------------------------------------------------------- |
| `http.host eq ...` 조건       | 제한 가능성 높음 | Free Rate Limiting rule expression에서 Host는 Free가 아니라 Pro 이상 필드로 표시된다. Free 실제 설정 예시에서는 제외한다. |
| 60 requests / 5 minutes       |             불가 | Free는 counting period가 10초만 가능하다.                                                                                 |
| Duration 10 minutes           |             불가 | Free는 mitigation timeout도 10초만 가능하다.                                                                              |
| Cloudflare Managed Ruleset    |             불가 | Pro 이상. Free에서는 Free Managed Ruleset을 사용한다.                                                                     |
| Cloudflare OWASP Core Ruleset |             불가 | Pro 이상.                                                                                                                 |
| Super Bot Fight Mode          |             불가 | Pro 이상.                                                                                                                 |
| Bot Management                |             불가 | Enterprise add-on.                                                                                                        |

## 학습 포인트

- Cloudflare Free도 Proxy, WAF Custom Rules, Rate Limiting Rules 1개, Free Managed Ruleset, Bot Fight Mode를 제공한다.
- 이번 프로젝트에서 최종 적용한 Cloudflare 규칙은 Rate Limiting Rule 1개다.
- Rate Limiting Rules는 Free에서 1개만 가능하므로 가장 비용이 큰 API 경로에 집중하는 것이 좋다.
- Managed Ruleset은 검색 결과 Account-level WAF add-on 화면으로 연결되어 별도 설정하지 않았다.
- Free의 rate limit은 10초 단위만 가능해서 세밀한 운영 방어보다는 기본 방어와 학습용에 가깝다.
- 상용 수준 운영이라면 Cloudflare Free만 믿지 말고 Express rate limit, Nginx timeout, 서버 로그 확인을 함께 사용해야 한다.
- Bot Fight Mode는 무료지만 전체 도메인 적용이라 API나 모바일 사용자 경험에 영향을 줄 수 있어 신중히 켜야 한다.
```

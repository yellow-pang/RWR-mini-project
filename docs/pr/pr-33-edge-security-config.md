# PR #33. Edge 보안 설정 보완

> 관련 작업 계획서: [docs/plans/plan-33-edge-security-config.md](../plans/plan-33-edge-security-config.md)  
> 관련 Step 문서: [docs/steps/step-33-edge-security-config.md](../steps/step-33-edge-security-config.md)

---

## 브랜치 정보

| 항목        | 값                             |
| ----------- | ------------------------------ |
| 작업 브랜치 | `feat/33-edge-security-config` |
| 병합 대상   | `dev`                          |
| 상태        | 구현 및 문서화 완료            |

---

## PR 제목

```text
[Step 33] Edge 보안 설정 보완
```

---

## 개요

Step 32에서 적용한 API rate limit, 외부 API timeout, body limit을 운영 환경에서 더 명확하게 조정할 수 있도록 보완한다.

이번 PR은 Nginx 요청 크기 제한과 proxy timeout 명시, 서버 보안 설정값의 환경변수 승격, Cloudflare rate limit / WAF 설정 가이드 문서화를 포함한다.

실제 Cloudflare 대시보드와 실제 `.env` 파일은 변경하지 않는다.

---

## 변경 파일 목록

| 구분 | 파일                                         | 변경 내용                                                   |
| ---- | -------------------------------------------- | ----------------------------------------------------------- |
| 수정 | `nginx/nginx.conf`                           | `client_max_body_size 8k`, API proxy timeout 추가           |
| 수정 | `docker-compose.yml`                         | server 컨테이너에 보안 환경변수 전달 추가                   |
| 수정 | `.env.example`                               | 운영 보안 환경변수 예시 추가                                |
| 수정 | `server/.env.example`                        | 로컬 서버 보안 환경변수 예시 추가                           |
| 수정 | `server/src/app.js`                          | JSON body limit과 rate limit 값을 설정 모듈에서 읽도록 변경 |
| 수정 | `server/src/services/orsService.js`          | ORS timeout 값을 환경변수 기반 설정으로 변경                |
| 수정 | `server/src/services/geocodingService.js`    | Kakao 위치 timeout 값을 환경변수 기반 설정으로 변경         |
| 수정 | `server/src/services/poiService.js`          | Kakao POI timeout 값을 환경변수 기반 설정으로 변경          |
| 신규 | `server/src/config/securityConfig.js`        | 보안 설정 환경변수 파싱 모듈 추가                           |
| 신규 | `docs/plans/plan-33-edge-security-config.md` | Step 33 구현 계획 작성                                      |
| 신규 | `docs/steps/step-33-edge-security-config.md` | Step 33 구현 완료 기록                                      |
| 신규 | `docs/pr/pr-33-edge-security-config.md`      | PR 요약 문서 작성                                           |

---

## 주요 변경 내용

### Nginx 설정 보완

- `client_max_body_size 8k`를 명시해 과도한 요청 body를 Nginx에서 1차 차단
- `/api/` proxy 구간에 timeout 추가
  - `proxy_connect_timeout 5s`
  - `proxy_send_timeout 10s`
  - `proxy_read_timeout 15s`

### 서버 보안 설정 환경변수화

- `server/src/config/securityConfig.js` 추가
- 숫자 환경변수는 양의 정수일 때만 사용하고, 잘못된 값이면 기본값으로 fallback
- 기존 Step 32 기본값은 유지
  - 일반 API: 15분당 300회
  - 외부 API 의존 경로: 5분당 60회
  - ORS timeout: 8초
  - Kakao timeout: 5초

### 환경변수 예시와 Compose 반영

- 루트 `.env.example`에 운영 보안 설정값 추가
- `server/.env.example`에 로컬 서버 보안 설정값 추가
- `docker-compose.yml`에서 server 컨테이너로 보안 환경변수 전달

### Cloudflare 설정 문서화

- 최신 Cloudflare WAF `Rate limiting rules` 기준으로 설정 가이드 작성
- `/api/routes/*`, `/api/locations/*` 보호 규칙 예시 추가
- 예전 Rate Limiting API / `cloudflare_rate_limit` 리소스는 2025.06.15 이후 지원되지 않는다는 점 기록
- WAF Managed Rules 적용 순서와 주의사항 정리

---

## 검증

| 항목             | 결과 |
| ---------------- | ---- |
| 서버 문법 확인   | 통과 |
| 클라이언트 lint  | 통과 |
| 클라이언트 build | 통과 |

실행한 검증:

```text
node --check server/src/config/securityConfig.js
node --check server/src/app.js
node --check server/src/services/orsService.js
node --check server/src/services/geocodingService.js
node --check server/src/services/poiService.js
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
```

Nginx 컨테이너 실행 검증은 이번 로컬 작업에서는 수행하지 않았다. 운영 서버에서 Docker Compose 재배포 후 Nginx 설정 동작을 확인해야 한다.

---

## 후속 확인

- 운영 `.env`에 새 보안 환경변수 값을 실제로 넣을지 여부
- Cloudflare 대시보드에서 Rate limiting rules 적용 여부
- Cloudflare Security Events 확인 후 제한값 조정 여부
- WAF Managed Rules 적용 후 정상 API 요청 차단 여부
- 지도 출발지/방향 UX 개선 Step 진행 여부

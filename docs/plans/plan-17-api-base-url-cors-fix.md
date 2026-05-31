# 작업계획서 - Step 17: 프로덕션 API Base URL CORS 오류 수정

> **상태**: 완료  
> **작성일**: 2026.05.31  
> **브랜치**: `fix/api-base-url-cors` 권장  
> **목적**: 프로덕션 배포 후 `localhost:3000`으로 API 요청이 발생해 CORS 오류가 발생하는 문제 수정  
> **관련 문서**: [step-17-api-base-url-cors-fix.md](../steps/step-17-api-base-url-cors-fix.md) | [pr-17-api-base-url-cors-fix.md](../pr/pr-17-api-base-url-cors-fix.md)

---

## 1. 작업 배경

GitHub Actions로 VM 배포 후 `https://rwr.healthq.store` 접속은 정상이었으나,
코스 추천 등 API 요청에서 다음 오류가 발생했다.

```text
Access to fetch at 'http://localhost:3000/api/courses/random?...'
from origin 'https://rwr.healthq.store' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
No 'Access-Control-Allow-Origin' header is present on the requested resource.

GET http://localhost:3000/api/courses/random?... net::ERR_FAILED 403
```

---

## 2. 원인 분석

### 2.1 코드 흐름

```text
client/src/api/client.js
  API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api"
```

`VITE_API_BASE_URL`이 Vite 빌드 시점에 주입되지 않으면 `"http://localhost:3000/api"`가 번들에 고정된다.

### 2.2 Docker Compose 빌드 ARG 누락

`docker-compose.yml`의 nginx 서비스 build args에 `VITE_KAKAO_MAP_KEY`만 있고
`VITE_API_BASE_URL`이 없어 빌드 시 환경변수가 전달되지 않음.

```yaml
# docker-compose.yml (수정 전)
args:
  VITE_KAKAO_MAP_KEY: ${VITE_KAKAO_MAP_KEY:-}
  # VITE_API_BASE_URL 없음 → 빌드 결과에 localhost:3000 고정됨
```

### 2.3 아키텍처 특성

프로덕션 구성은 nginx가 동일 오리진에서 `/api/*` 요청을 `server:3000`으로 프록시한다.

```
브라우저 → https://rwr.healthq.store/api/...
         → nginx (80) → proxy_pass http://server:3000
```

따라서 `VITE_API_BASE_URL`을 주입하지 않고 **상대경로 `/api`** 를 기본값으로 쓰면
nginx 프록시 구조와 완전히 일치한다.

---

## 3. 요구사항 요약

- CORS 오류 없이 프로덕션 API 호출이 가능해야 한다.
- 로컬 개발 환경(Vite proxy, 직접 서버 설정 모두)에서도 정상 동작해야 한다.
- `docker-compose.yml` build args 추가 없이 해결한다 (환경변수 관리 단순화).
- `schema.sql`, `seed.sql`, Docker 설정, 기타 비관련 파일은 수정하지 않는다.

---

## 4. 수정 계획

| 순서 | 작업                                               | 파일                       |
| ---- | -------------------------------------------------- | -------------------------- |
| 1    | 폴백을 빈 문자열(상대경로)로 변경                  | `client/src/api/client.js` |
| 2    | `new URL()`에 `window.location.origin` 베이스 추가 | `client/src/api/client.js` |
| 3    | `.env.example` 주석 업데이트                       | `client/.env.example`      |
| 4    | lint/build 검증                                    | —                          |
| 5    | 문서 작성                                          | plans / pr / steps         |

---

## 5. 제외 범위

| 항목                                 | 사유                                          |
| ------------------------------------ | --------------------------------------------- |
| `docker-compose.yml` build args 수정 | 코드 수정으로 해결 가능, 환경변수 관리 단순화 |
| `CORS_ORIGIN` 서버 설정 변경         | 요청 URL이 수정되면 CORS 헤더 필요 없음       |
| 로컬 `.env` 직접 수정                | 사용자가 필요에 따라 선택적으로 설정          |

# Step 17. 프로덕션 API Base URL CORS 오류 수정

> 작성일: 2026.05.31  
> 브랜치: `fix/api-base-url-cors`  
> 작업 계획서: [docs/plans/plan-17-api-base-url-cors-fix.md](../plans/plan-17-api-base-url-cors-fix.md)  
> 관련 PR 문서: [docs/pr/pr-17-api-base-url-cors-fix.md](../pr/pr-17-api-base-url-cors-fix.md)

---

## 1. 작업 목표

GitHub Actions로 VM 배포(`https://rwr.healthq.store`) 후 발생한 CORS 오류를 수정한다.

```text
Access to fetch at 'http://localhost:3000/api/courses/random?...'
from origin 'https://rwr.healthq.store' has been blocked by CORS policy
```

---

## 2. 원인

### 빌드 시 환경변수 미주입 → localhost 고정

`client/src/api/client.js`의 폴백 값이 `"http://localhost:3000/api"`였다.

`docker-compose.yml` nginx 서비스 build args에 `VITE_KAKAO_MAP_KEY`만 있고
`VITE_API_BASE_URL`은 포함되지 않아 Vite 빌드 시 `undefined`로 평가되었다.
`||` 연산자에 의해 `"http://localhost:3000/api"`가 번들에 하드코딩되어 배포됨.

```text
빌드 시: VITE_API_BASE_URL = undefined
→ undefined || "http://localhost:3000/api"
→ 번들에 "http://localhost:3000/api" 고정
→ 브라우저에서 외부 서버(localhost)로 크로스오리진 요청 발생
→ CORS 차단
```

### 프로덕션 아키텍처와 불일치

```
nginx (80) ─ / ──▶ React SPA
           └─ /api/* ──▶ proxy_pass http://server:3000
```

nginx가 동일 오리진에서 `/api/*`를 프록시하므로, 클라이언트는
**상대경로 `/api/...`** 로 요청해야 한다. `localhost:3000`으로 직접 요청하면
브라우저가 크로스오리진으로 판단해 CORS preflight를 보내고 서버가 거부한다.

---

## 3. 변경 내용

| 구분 | 파일                       | 설명                                                              |
| ---- | -------------------------- | ----------------------------------------------------------------- |
| 수정 | `client/src/api/client.js` | 폴백 `\|\| "http://localhost:3000/api"` → `?? ""`(상대경로)       |
| 수정 | `client/src/api/client.js` | `new URL(path, window.location.origin)` 추가 (상대경로 파싱 지원) |
| 수정 | `client/.env.example`      | `VITE_API_BASE_URL` 주석 처리 및 설명 보완                        |

---

## 4. 변경 상세

### client/src/api/client.js

```js
// 수정 전
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// 수정 후
// 환경변수 미설정 시 빈 문자열 → 상대경로 /api 사용 (nginx 동일 오리진 프록시 대응)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
```

```js
// 수정 전
const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

// 수정 후
// 상대경로일 때 window.location.origin을 베이스로 사용
const url = new URL(
  `${normalizedBaseUrl}${normalizedPath}`,
  window.location.origin,
);
```

> `??`(Nullish Coalescing): `null` / `undefined`일 때만 우측 값 사용.  
> `||`와 달리 `""`, `0`, `false`는 그대로 통과시키므로 의도치 않은 폴백을 방지한다.

### 환경별 동작

| 환경                      | `VITE_API_BASE_URL`     | 실제 요청 URL                                                         |
| ------------------------- | ----------------------- | --------------------------------------------------------------------- |
| 프로덕션 (nginx)          | 미설정 → `""`           | `https://rwr.healthq.store/api/...` ✅                                |
| 로컬 (Vite proxy 사용)    | 미설정 → `""`           | `http://localhost:5173/api/...` → Vite가 `localhost:3000`으로 전달 ✅ |
| 로컬 (환경변수 직접 설정) | `http://localhost:3000` | `http://localhost:3000/api/...` ✅                                    |

---

## 5. 검증 결과

| 항목             | 명령                                       | 결과                 |
| ---------------- | ------------------------------------------ | -------------------- |
| Production build | `node node_modules/vite/bin/vite.js build` | ✅ 성공 (55 modules) |

---

## 6. .env 설정 안내

### 로컬 개발 환경

Vite proxy(`vite.config.js`)가 `/api` 요청을 자동으로 `localhost:3000`으로 전달하므로
`.env` 설정 없이도 동작한다.

직접 서버를 가리키고 싶을 때만 설정:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 프로덕션 환경

`VITE_API_BASE_URL`을 **설정하지 않는다.**  
nginx가 동일 오리진에서 `/api/*`를 프록시하므로 상대경로가 올바르게 동작한다.

루트 `.env` (VM 배포용)에서는 아래 항목만 관리하면 된다:

```env
# API URL 관련 항목은 추가하지 않음
VITE_KAKAO_MAP_KEY=실제키값
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DB=...
CORS_ORIGIN=https://rwr.healthq.store
NODE_ENV=production
```

# PR #17. 프로덕션 API Base URL CORS 오류 수정

> 관련 작업 계획서: [docs/plans/plan-17-api-base-url-cors-fix.md](../plans/plan-17-api-base-url-cors-fix.md)  
> 관련 Step 문서: [docs/steps/step-17-api-base-url-cors-fix.md](../steps/step-17-api-base-url-cors-fix.md)

---

## 브랜치 정보

| 항목        | 값                      |
| ----------- | ----------------------- |
| 작업 브랜치 | `fix/api-base-url-cors` |
| 병합 대상   | `dev`                   |
| 상태        | 완료                    |

---

## PR 제목

```text
[Step 17] 프로덕션 API Base URL CORS 오류 수정
```

---

## 개요

프로덕션 배포(`https://rwr.healthq.store`) 후 모든 API 요청이 `http://localhost:3000`으로
발생해 CORS 정책에 의해 차단되던 문제를 수정했다.

`VITE_API_BASE_URL` 환경변수가 빌드 시 주입되지 않을 때 `localhost:3000`으로 폴백되던
로직을 빈 문자열(상대경로 `/api`)로 변경했다. nginx가 동일 오리진에서 `/api/*`를
프록시하므로 환경변수 주입 없이도 프로덕션/로컬 모두 올바르게 동작한다.

---

## 변경 파일 목록

| 구분 | 파일                       | 변경 내용                                                                 |
| ---- | -------------------------- | ------------------------------------------------------------------------- |
| 수정 | `client/src/api/client.js` | `\|\|` 폴백 `"http://localhost:3000/api"` → `?? ""` (상대경로)            |
| 수정 | `client/src/api/client.js` | `new URL(path)` → `new URL(path, window.location.origin)` (상대경로 지원) |
| 수정 | `client/.env.example`      | `VITE_API_BASE_URL` 선택 항목으로 주석 처리 및 설명 보완                  |

---

## 변경 상세

### client/src/api/client.js

```diff
- const API_BASE_URL =
-   import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
+ // 환경변수 미설정 시 빈 문자열 → 상대경로 /api 사용 (nginx 동일 오리진 프록시 대응)
+ const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
```

```diff
- const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);
+ // 상대경로(normalizedBaseUrl이 빈 문자열 또는 /api)일 때 window.location.origin을 베이스로 사용
+ const url = new URL(`${normalizedBaseUrl}${normalizedPath}`, window.location.origin);
```

### 환경별 동작

| 환경              | `VITE_API_BASE_URL` 설정 | 실제 요청 URL                                                      |
| ----------------- | ------------------------ | ------------------------------------------------------------------ |
| 프로덕션 (nginx)  | 미설정 → `""`            | `https://rwr.healthq.store/api/...` ✅                             |
| 로컬 (Vite proxy) | 미설정 → `""`            | `http://localhost:5173/api/...` → Vite proxy → `localhost:3000` ✅ |
| 로컬 (직접 설정)  | `http://localhost:3000`  | `http://localhost:3000/api/...` ✅                                 |

---

## 검증

```powershell
cd client
node node_modules/vite/bin/vite.js build
```

| 항목             | 결과                 |
| ---------------- | -------------------- |
| Production build | ✅ 성공 (55 modules) |

# PR #32. API 보안 안정화

> 관련 작업 계획서: [docs/plans/plan-32-api-security-hardening.md](../plans/plan-32-api-security-hardening.md)  
> 관련 Step 문서: [docs/steps/step-32-api-security-hardening.md](../steps/step-32-api-security-hardening.md)

---

## 브랜치 정보

| 항목        | 값                                    |
| ----------- | ------------------------------------- |
| 작업 브랜치 | `feat/step-32-api-security-hardening` |
| 병합 대상   | `dev`                                 |
| 상태        | 구현 및 문서화 완료                   |

---

## PR 제목

```text
[Step 32] API 보안 안정화
```

---

## 개요

Step 31에서 정리한 후속 보안 과제 중 서버 코드 레벨에서 바로 적용할 수 있는 API 안정화 작업을 구현한다.

이번 PR은 `express-rate-limit` 기반 요청 제한, ORS / Kakao Local 요청 timeout, 30초 메모리 캐시, 민감정보 노출을 줄이는 에러 로그 형식 변경을 포함한다.

DB 스키마, Docker, Nginx, Cloudflare, `.env`는 변경하지 않는다.

---

## 변경 파일 목록

| 구분 | 파일                                           | 변경 내용                                |
| ---- | ---------------------------------------------- | ---------------------------------------- |
| 수정 | `server/package.json`                          | `express-rate-limit` 의존성 추가         |
| 수정 | `server/package-lock.json`                     | 의존성 잠금 파일 갱신                    |
| 수정 | `server/src/app.js`                            | API rate limit, 프록시 신뢰 설정, 안전한 에러 로그 적용 |
| 수정 | `server/src/services/orsService.js`            | ORS 요청 timeout과 timeout 발생 시 추가 ORS 재시도 중단 적용 |
| 수정 | `server/src/services/geocodingService.js`      | Kakao 위치 요청 timeout과 30초 캐시 적용 |
| 수정 | `server/src/services/poiService.js`            | Kakao POI 요청 timeout과 30초 캐시 적용  |
| 신규 | `server/src/utils/fetchWithTimeout.js`         | timeout fetch 공통 유틸 추가             |
| 신규 | `server/src/utils/ttlCache.js`                 | TTL 메모리 캐시 유틸 추가                |
| 신규 | `docs/plans/plan-32-api-security-hardening.md` | 구현 계획 문서 작성                      |
| 신규 | `docs/steps/step-32-api-security-hardening.md` | 구현 완료 기록 작성                      |
| 신규 | `docs/pr/pr-32-api-security-hardening.md`      | PR 요약 문서 작성                        |

---

## 주요 변경 내용

### API rate limit

- `/api/routes/*`, `/api/locations/*`에 5분당 60회 제한 적용
- 그 외 `/api/*`에 15분당 300회 제한 적용
- `/api/health`는 제한 적용 전 등록해 헬스체크 영향을 줄임
- Nginx 프록시 뒤 실제 클라이언트 IP 기준에 가깝게 동작하도록 `trust proxy` 1단계 설정
- 초과 응답은 `{ success: false, message }` 형식으로 반환

### 외부 API timeout

- ORS 경로 생성 요청에 8초 timeout 적용
- Kakao 주소/좌표 변환 요청에 5초 timeout 적용
- Kakao POI 검색 요청에 5초 timeout 적용
- ORS timeout 발생 시 같은 요청 안의 추가 ORS 후보 재시도 중단
- timeout 에러는 사용자에게 재시도 안내 문구로 전달

### 30초 메모리 캐시

- 주소 검색, 주소 좌표 변환, 좌표 주소 변환, POI 검색에 30초 메모리 캐시 적용
- 캐시 key는 요청 원문이 아니라 `sha256` 해시로 생성
- ORS 생성형 경로 결과는 랜덤성 유지를 위해 캐시하지 않음

### 로그 민감정보 축소

- 공통 에러 로그에서 `err.message` 직접 출력을 제거
- method, path, status, error name 중심의 로그로 변경
- 주소 원문, 좌표, 요청 body 전체, API key가 로그에 남을 가능성을 줄임

---

## 검증

| 항목                 | 결과                                            |
| -------------------- | ----------------------------------------------- |
| 클라이언트 lint      | 통과                                            |
| 클라이언트 build     | 통과                                            |
| 서버 문법 확인       | 통과                                            |
| rate limit 수동 확인 | 301번째 `/api/not-found` 요청에서 429 응답 확인 |

실행한 검증:

```text
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
node --check server/src/app.js
node --check server/src/services/orsService.js
node --check server/src/services/geocodingService.js
node --check server/src/services/poiService.js
node --check server/src/utils/fetchWithTimeout.js
node --check server/src/utils/ttlCache.js
```

rate limit 응답 확인:

```json
{
  "success": false,
  "message": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
}
```

---

## 후속 확인

- Nginx `client_max_body_size`, proxy timeout 보완 여부
- Cloudflare rate limit / WAF 설정 여부
- timeout, rate limit 값을 환경변수로 승격할지 여부
- 지도 출발지/방향 UX 개선 Step 진행 여부

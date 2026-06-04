# Plan 32. API 보안 안정화

## 상태

- 작성일: 2026.06.04
- 브랜치: `feat/step-32-api-security-hardening`
- 단계: 구현 전 계획
- 관련 이전 문서:
  - `docs/plans/plan-31-security-ux-hardening.md`
  - `docs/steps/step-31-security-ux-hardening.md`
  - `docs/pr/pr-31-security-ux-hardening.md`
- 기준 문서:
  - `docs/01-overview.md`
  - `docs/03-requirements.md`
  - `docs/06-data-spec.md`
  - `docs/07-tech-stack.md`

## 1. 작업 목표

Step 32에서는 생성형 코스 API가 외부 API와 사용자 입력에 의존하는 구조를 고려해 서버 API의 기본 방어선을 강화한다.

핵심 목표는 아래 네 가지다.

```text
1. API rate limit 적용
2. ORS / Kakao Local 외부 요청 timeout 적용
3. geocode / reverse-geocode / POI search 30초 메모리 캐시 적용
4. 서버 에러 로그에서 민감정보 노출 가능성 축소
```

이번 작업은 DB 스키마, Docker, Nginx, Cloudflare 설정을 변경하지 않는다.

## 2. 현재 상태 요약

### 이미 적용된 항목

- `helmet` 기본 보안 헤더가 적용되어 있다.
- `express.json({ limit: process.env.JSON_BODY_LIMIT || "4kb" })`로 요청 body 크기 제한이 적용되어 있다.
- `CORS_ORIGIN` 기반 CORS 허용 도메인 제한이 적용되어 있다.
- 주소, 좌표, 거리, 시간, 운동 유형, POI 선호, 우회 강도 입력 검증이 라우터에 적용되어 있다.
- API 실패 응답은 대부분 `{ success: false, message }` 형식을 따른다.

### 아직 필요한 항목

- `express-rate-limit` 기반 요청 제한은 아직 없다.
- ORS 요청과 Kakao Local 요청에 timeout이 없다.
- 주소 변환, 좌표 변환, POI 검색 결과에 짧은 캐시가 없다.
- 공통 에러 로그가 현재 `err.message`를 그대로 출력하므로 외부 API 에러 메시지에 주소 또는 좌표가 섞일 가능성을 줄일 필요가 있다.

## 3. 사용자 확인이 필요한 결정

### 3.1 새 npm 패키지 추가

API rate limit 구현에는 `express-rate-limit` 패키지 추가가 필요하다.

사용자 승인 후 아래 작업을 진행한다.

```text
npm.cmd --prefix server install express-rate-limit
```

승인 전에는 package.json, package-lock.json을 수정하지 않는다.

### 3.2 환경변수 추가 여부

timeout과 rate limit 값을 환경변수로 둘 수도 있지만, 이번 Step에서는 `.env.example` 또는 운영 `.env` 변경을 피하기 위해 코드 기본값으로 먼저 구현하는 방식을 우선한다.

필요 시 후속 Step에서 문서화와 함께 환경변수로 승격한다.

### 3.3 Nginx / Cloudflare 설정

Nginx `client_max_body_size`, proxy timeout, `limit_req`, Cloudflare rate limit은 운영 설정에 가까우므로 이번 Step에서는 변경하지 않는다.

별도 운영 보안 Step에서 사용자 확인 후 진행한다.

## 4. 구현 계획

### 4.1 API rate limit

서버 앱에 rate limit 미들웨어를 추가한다.

권장 기준:

| 구분          | 대상                                | 기준                                           |
| ------------- | ----------------------------------- | ---------------------------------------------- |
| 기본 API      | `/api/*`                            | 일반 사용 흐름을 막지 않는 넓은 제한           |
| 외부 API 의존 | `/api/routes/*`, `/api/locations/*` | ORS, Kakao 비용과 지연을 고려해 더 엄격한 제한 |
| health check  | `/api/health`                       | 운영 모니터링을 고려해 별도 완화 또는 제외     |

응답 형식은 기존 규칙에 맞춘다.

```json
{
  "success": false,
  "message": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
}
```

### 4.2 외부 API timeout

ORS와 Kakao Local 요청에 `AbortController` 기반 timeout을 적용한다.

적용 대상:

- `server/src/services/orsService.js`
- `server/src/services/geocodingService.js`
- `server/src/services/poiService.js`

기본값 후보:

| 대상                 | 기본 timeout |
| -------------------- | ------------ |
| ORS 경로 생성        | 8초          |
| Kakao 주소/좌표 변환 | 5초          |
| Kakao POI 검색       | 5초          |

timeout 실패는 내부적으로는 구분하되, 사용자 응답은 기술 용어보다 재시도 안내 중심으로 유지한다.

### 4.3 30초 메모리 캐시

서버 프로세스 메모리에 짧은 TTL 캐시를 추가한다.

적용 대상:

- geocode address 결과
- reverse-geocode 결과
- POI search 결과

적용하지 않는 대상:

- ORS 생성형 경로 전체 결과

ORS 결과는 seed, 랜덤성, 목표 거리 검증과 맞물려 있으므로 이번 Step에서는 캐시하지 않는다.

캐시 기준:

```text
TTL: 30초
주소 원문 장기 저장 없음
프로세스 재시작 시 캐시 초기화 허용
```

### 4.4 로그 민감정보 축소

Express 공통 에러 핸들러의 로그를 조정한다.

현재:

```text
[Error] ${err.message}
```

변경 방향:

```text
[Error] method=POST path=/api/routes/address-round-trip status=502 name=Error
```

주소 원문, 좌표, 요청 body 전체, API key는 로그에 남기지 않는다.

## 5. 변경 예상 파일

| 파일                                              | 변경 예상 내용                                 |
| ------------------------------------------------- | ---------------------------------------------- |
| `server/package.json`                             | `express-rate-limit` 승인 후 의존성 추가       |
| `server/package-lock.json`                        | 의존성 잠금 파일 갱신                          |
| `server/src/app.js`                               | rate limit 미들웨어와 안전한 에러 로그 적용    |
| `server/src/services/orsService.js`               | ORS fetch timeout 적용                         |
| `server/src/services/geocodingService.js`         | Kakao 요청 timeout과 짧은 캐시 적용            |
| `server/src/services/poiService.js`               | Kakao POI 요청 timeout과 짧은 캐시 적용        |
| `server/src/utils/` 또는 `server/src/middleware/` | timeout, cache, rate limit 보조 모듈 추가 가능 |
| `docs/steps/step-32-api-security-hardening.md`    | 구현 완료 후 작성                              |
| `docs/pr/pr-32-api-security-hardening.md`         | PR 요약 문서 작성                              |

## 6. 검증 계획

가능한 범위에서 아래 검증을 실행한다.

```text
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
node --check server/src/app.js
node --check server/src/services/orsService.js
node --check server/src/services/geocodingService.js
node --check server/src/services/poiService.js
```

rate limit 적용 후에는 수동 호출로 제한 응답 형식이 `{ success: false, message }`인지 확인한다.

## 7. 제외 범위

- DB 스키마 변경
- seed 데이터 변경
- Docker 설정 변경
- Nginx 설정 변경
- Cloudflare 대시보드 설정
- `server/.env` 수정
- 생성형 코스 저장 정책 변경
- AI 주변 정보 또는 관광형 코스 기능 추가

## 8. 진행 순서

1. 사용자에게 `express-rate-limit` 패키지 추가 승인을 받는다.
2. 승인되면 서버 의존성을 설치한다.
3. rate limit 미들웨어를 추가한다.
4. 외부 API timeout 유틸을 추가하고 ORS / Kakao 요청에 적용한다.
5. 30초 메모리 캐시 유틸을 추가하고 geocode / reverse-geocode / POI search에 적용한다.
6. 공통 에러 로그를 민감정보가 남지 않는 형식으로 정리한다.
7. 문법 확인과 클라이언트 lint/build를 실행한다.
8. Step / PR 문서를 작성한다.
9. 한글 Conventional Commit 메시지를 제안한다.

## 9. 결론

Step 32의 우선순위는 외부 API 비용과 서버 안정성을 보호하는 것이다.

`express-rate-limit` 추가는 사용자 승인 후 진행하고, timeout과 캐시는 새 환경변수 없이 코드 기본값으로 먼저 적용한다. 운영 앞단 보안인 Cloudflare와 Nginx 보완은 이번 Step에서 분리한다.

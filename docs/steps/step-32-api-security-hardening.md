# Step 32. API 보안 안정화

> 작성일: 2026.06.04  
> 브랜치: `feat/step-32-api-security-hardening`  
> 작업 계획서: [docs/plans/plan-32-api-security-hardening.md](../plans/plan-32-api-security-hardening.md)  
> 관련 PR 문서: [docs/pr/pr-32-api-security-hardening.md](../pr/pr-32-api-security-hardening.md)

---

## 1. 작업 목표

Step 32에서는 RWR 서버가 외부 API와 사용자 입력을 더 안정적으로 다루도록 기본 방어선을 추가했다.

이번 작업은 고급 보안 장비를 붙이는 작업이 아니라, 실무 API 서버에서 흔히 필요한 기본 안정화 작업이다.

핵심 목표는 아래 네 가지다.

```text
1. 짧은 시간에 너무 많은 API 요청을 막는다.
2. ORS / Kakao Local 같은 외부 API가 늦으면 오래 기다리지 않는다.
3. 같은 주소 변환과 POI 검색 요청은 30초 동안 재사용한다.
4. 에러 로그에 주소, 좌표, API key 같은 민감정보가 남을 가능성을 줄인다.
```

---

## 2. 구현 요약

### 2.1 API Rate Limit 추가

`express-rate-limit`을 추가해 API 요청 수를 제한했다.

적용 위치는 `server/src/app.js`다.

| 대상               | 제한                                           |
| ------------------ | ---------------------------------------------- |
| `/api/routes/*`    | 5분당 60회                                     |
| `/api/locations/*` | 5분당 60회                                     |
| 그 외 `/api/*`     | 15분당 300회                                   |
| `/api/health`      | rate limit 적용 전 등록되어 제한 대상에서 제외 |

제한을 초과하면 아래 형식으로 응답한다.

```json
{
  "success": false,
  "message": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
}
```

### 2.2 외부 API Timeout 추가

ORS와 Kakao Local 요청에 `AbortController` 기반 timeout을 적용했다.

공통 fetch 유틸은 `server/src/utils/fetchWithTimeout.js`에 추가했다.

| 대상                 | timeout |
| -------------------- | ------- |
| ORS 경로 생성        | 8초     |
| Kakao 주소/좌표 변환 | 5초     |
| Kakao POI 검색       | 5초     |

timeout이 발생하면 내부 에러 이름은 `ExternalApiTimeoutError`로 구분하고, 사용자에게는 기술 용어 대신 재시도 안내 문구를 반환한다.

### 2.3 30초 메모리 캐시 추가

짧은 TTL 캐시 유틸을 `server/src/utils/ttlCache.js`에 추가했다.

적용 대상은 아래와 같다.

- 주소 검색
- 주소 → 좌표 변환
- 좌표 → 주소 변환
- POI 검색

캐시 TTL은 30초다.

캐시 key는 요청 값을 그대로 저장하지 않고 `sha256` 해시로 만든다. 따라서 서버 메모리 안에서도 주소 원문이나 좌표 조합이 key 문자열로 직접 남지 않는다.

ORS 경로 생성 결과는 캐시하지 않았다. RWR은 랜덤 코스 추천이 핵심이므로 최종 경로 결과를 캐시하면 같은 코스가 반복될 가능성이 커지기 때문이다.

### 2.4 안전한 에러 로그 적용

기존 공통 에러 로그는 `err.message`를 그대로 출력했다.

```text
[Error] ${err.message}
```

이번 Step에서는 아래처럼 요청 위치와 에러 종류만 남기도록 변경했다.

```text
[Error] method=POST path=/api/routes/address-round-trip status=502 name=Error
```

남기는 정보:

- HTTP method
- 요청 path
- 응답 status
- 에러 name

남기지 않는 정보:

- 주소 원문
- 좌표
- 요청 body 전체
- API key
- Authorization 헤더
- 외부 API 상세 URL

---

## 3. 개념 설명

### 3.1 Rate Limit이란?

Rate Limit은 한 사용자가 짧은 시간 안에 API를 너무 많이 호출하지 못하게 막는 기술이다.

예를 들어 사용자가 `코스 생성` 버튼을 계속 누르면 서버는 매번 ORS와 Kakao Local 같은 외부 API를 호출할 수 있다.

```text
사용자 요청
→ 주소를 좌표로 변환
→ 주변 POI 검색
→ ORS로 경로 생성
→ 거리 검증
→ 응답 반환
```

요청 한 번이 내부적으로 여러 외부 API 호출로 이어질 수 있기 때문에 반복 요청을 제한해야 한다.

쉬운 비유로는 식당 주문 제한과 비슷하다.

```text
한 사람이 1분에 주문을 100번 넣으면 주방이 마비된다.
그래서 일정 횟수를 넘으면 "잠시 후 다시 주문해 주세요"라고 막는다.
```

RWR에서는 특히 `/api/routes/*`, `/api/locations/*`가 중요하다. 이 경로들은 외부 API 비용과 응답 지연에 직접 연결되기 때문이다.

### 3.2 Timeout이란?

Timeout은 외부 API가 너무 오래 응답하지 않을 때 서버가 기다리는 것을 중단하는 기술이다.

외부 API는 우리 서버가 통제할 수 없다. ORS 서버 지연, Kakao API 장애, 네트워크 불안정이 생겨도 서버는 사용자의 요청을 처리해야 한다.

timeout이 없으면 서버가 응답 없는 요청을 계속 붙잡을 수 있다.

```text
요청 처리 중...
요청 처리 중...
요청 처리 중...
```

이번 Step에서는 ORS는 8초, Kakao는 5초까지만 기다리도록 했다.

쉬운 비유로는 전화를 거는 상황과 비슷하다.

```text
친구가 전화를 받지 않으면 계속 기다리지 않고,
몇 초 뒤 끊고 "나중에 다시 걸자"고 판단하는 것과 같다.
```

코드에서는 `AbortController`로 fetch 요청을 중간에 취소한다.

### 3.3 메모리 캐시란?

캐시는 같은 요청 결과를 잠깐 저장해두고, 같은 요청이 다시 들어오면 외부 API를 다시 호출하지 않고 저장된 결과를 재사용하는 기술이다.

예를 들어 같은 주소를 여러 번 변환하는 상황이 있을 수 있다.

```text
첫 요청: Kakao API 호출 → 결과 저장
두 번째 요청: 캐시에서 바로 반환
세 번째 요청: 캐시에서 바로 반환
30초 후: 다시 Kakao API 호출
```

이번 Step의 캐시는 서버 프로세스 메모리에만 저장된다.

장점:

- 구현이 간단하다.
- Redis 같은 추가 인프라가 필요 없다.
- Docker, DB 설정을 변경하지 않아도 된다.
- 30초처럼 짧은 TTL에 적합하다.

단점:

- 서버가 재시작되면 캐시가 사라진다.
- 서버가 여러 대면 캐시가 공유되지 않는다.
- 장기 저장이나 대량 캐시에는 맞지 않는다.

현재 RWR 단계에서는 짧은 반복 요청을 줄이는 목적이므로 메모리 캐시가 충분하다.

### 3.4 안전한 에러 로그란?

로그는 개발자가 문제를 찾기 위해 보는 기록이다.

하지만 로그에 주소, 좌표, 요청 body, API key가 남으면 나중에 보안 문제가 될 수 있다.

RWR은 주소와 좌표를 다루므로 로그를 특히 조심해야 한다.

이번 Step에서는 에러 메시지 본문을 그대로 출력하지 않고, 어느 API에서 어떤 상태의 에러가 났는지만 남긴다.

이렇게 하면 문제 위치는 알 수 있지만 민감정보는 남기지 않는다.

### 3.5 기존 보안 설정과의 관계

이미 적용되어 있던 보안 설정도 있다.

| 기술                      | 역할                                                         |
| ------------------------- | ------------------------------------------------------------ |
| `helmet`                  | 브라우저 보안 헤더를 강화한다.                               |
| `express.json` body limit | 너무 큰 JSON 요청으로 인한 메모리 부담을 줄인다.             |
| CORS 제한                 | 허용된 웹 출처의 브라우저 요청만 받도록 제한한다.            |
| 입력 검증                 | 잘못된 주소, 좌표, 거리, 시간, 운동 유형 값을 초기에 막는다. |

이번 Step에서 추가한 항목은 이 기존 설정을 보완한다.

| 기술             | 막는 문제                                        |
| ---------------- | ------------------------------------------------ |
| Rate Limit       | 반복 요청, 버튼 연타, 악의적 과다 호출           |
| Timeout          | 외부 API 지연으로 서버 요청이 오래 붙잡히는 문제 |
| 30초 캐시        | 같은 외부 API 요청 반복                          |
| 안전한 에러 로그 | 주소, 좌표, API key 등 로그 노출                 |

---

## 4. 변경 파일

| 구분 | 파일                                           | 변경 내용                                |
| ---- | ---------------------------------------------- | ---------------------------------------- |
| 수정 | `server/package.json`                          | `express-rate-limit` 의존성 추가         |
| 수정 | `server/package-lock.json`                     | 의존성 잠금 파일 갱신                    |
| 수정 | `server/src/app.js`                            | API rate limit과 안전한 에러 로그 적용   |
| 수정 | `server/src/services/orsService.js`            | ORS 요청 timeout 적용                    |
| 수정 | `server/src/services/geocodingService.js`      | Kakao 위치 요청 timeout과 30초 캐시 적용 |
| 수정 | `server/src/services/poiService.js`            | Kakao POI 요청 timeout과 30초 캐시 적용  |
| 신규 | `server/src/utils/fetchWithTimeout.js`         | timeout fetch 공통 유틸 추가             |
| 신규 | `server/src/utils/ttlCache.js`                 | 해시 key 기반 TTL 메모리 캐시 유틸 추가  |
| 신규 | `docs/plans/plan-32-api-security-hardening.md` | Step 32 구현 계획 작성                   |
| 신규 | `docs/steps/step-32-api-security-hardening.md` | Step 32 구현 완료 기록                   |
| 신규 | `docs/pr/pr-32-api-security-hardening.md`      | PR 요약 문서 작성                        |

---

## 5. 제외한 작업

이번 Step에서는 아래 항목을 변경하지 않았다.

- DB 스키마 변경
- seed 데이터 변경
- Docker 설정 변경
- Nginx 설정 변경
- Cloudflare 설정
- `server/.env` 수정
- timeout / rate limit 환경변수 추가
- 생성형 코스 저장 정책 변경
- 관광형 코스, AI 설명, 색상 커스텀 같은 UX 확장

Nginx와 Cloudflare는 서버 코드 바깥의 운영 인프라 영역이므로 후속 Step에서 별도로 다루는 것이 좋다.

---

## 6. 검증 결과

| 검증 항목                                              | 결과                                            |
| ------------------------------------------------------ | ----------------------------------------------- |
| 클라이언트 lint                                        | 통과                                            |
| 클라이언트 build                                       | 통과                                            |
| `node --check server/src/app.js`                       | 통과                                            |
| `node --check server/src/services/orsService.js`       | 통과                                            |
| `node --check server/src/services/geocodingService.js` | 통과                                            |
| `node --check server/src/services/poiService.js`       | 통과                                            |
| `node --check server/src/utils/fetchWithTimeout.js`    | 통과                                            |
| `node --check server/src/utils/ttlCache.js`            | 통과                                            |
| rate limit 수동 확인                                   | 301번째 `/api/not-found` 요청에서 429 응답 확인 |

rate limit 수동 확인 결과:

```json
{
  "success": false,
  "message": "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
}
```

---

## 7. 문서와 코드 차이 확인

`docs/07-tech-stack.md`에는 클라이언트가 React 18 / Vite 5 기준으로 적혀 있지만, 실제 `client/package.json`은 React 19 / Vite 8 기준이다.

이번 Step의 검증은 실제 `package.json` 스크립트 기준으로 실행했다.

---

## 8. 후속 작업 제안

다음 보안/운영 작업 후보:

- Nginx `client_max_body_size` 명시
- Nginx proxy timeout 명시
- Cloudflare rate limit / WAF 설정
- timeout, rate limit 기준을 환경변수로 승격
- 운영 로그 수집 도구를 사용할 경우 민감정보 마스킹 규칙 추가

다음 UX 작업 후보:

- 지도 출발지 인지 강화
- 겹치는 경로 방향 표시 강화
- 실패 후 거리/시간 조정 재시도 UX 개선

---

## 9. 결론

Step 32는 RWR 서버를 더 실무적인 API 서버에 가깝게 만드는 안정화 작업이다.

이제 서버는 반복 요청을 제한하고, 외부 API가 지연되면 오래 기다리지 않으며, 같은 위치/POI 요청을 짧게 재사용하고, 에러가 나도 민감정보를 로그에 남길 가능성을 줄인다.

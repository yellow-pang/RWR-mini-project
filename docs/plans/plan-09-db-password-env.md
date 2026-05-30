# 작업계획서 - Step 09: DB 비밀번호 환경변수 오류 수정

> **상태**: 진행 완료  
> **작성일**: 2026.05.31  
> **브랜치**: `fix/db-password-env`  
> **목적**: PostgreSQL 접속 시 발생하는 SCRAM 비밀번호 타입 오류 해결
> **관련 문서**: [step-09-db-password-env.md](../steps/step-09-db-password-env.md) | [pr-09-db-password-env.md](../pr/pr-09-db-password-env.md)

---

## 1. 문제 요약

로컬 백엔드에서 아래 API를 호출하면 500 오류가 발생한다.

```text
GET http://localhost:3000/api/courses/random?distance=3&time=60&type=running
```

응답:

```json
{ "success": false, "message": "Internal server error" }
```

백엔드 터미널 오류:

```text
[Error] SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string
```

이 오류는 Node PostgreSQL 클라이언트가 DB 인증을 시도할 때 `password` 설정값을 문자열로 받지 못했을 때 발생하는 경우가 많다. 따라서 추천 API 자체의 필터링 로직보다 DB 연결 환경변수 로딩과 Docker Compose 설정을 우선 점검한다.

---

## 2. 작업 목표

- 서버 DB 연결 설정에서 `password`가 항상 문자열로 전달되도록 보정한다.
- Docker Compose 환경변수와 서버 런타임 환경변수의 이름과 값이 일치하는지 확인한다.
- 환경변수가 누락됐을 때 원인을 빠르게 알 수 있도록 오류 메시지를 개선한다.
- `GET /api/courses/random?distance=3&time=60&type=running` 요청이 DB에서 정상 조회되거나, 해당 조건 데이터가 없으면 명세에 맞는 빈 결과 응답을 반환하도록 확인한다.

---

## 3. 조사 대상

| 영역 | 확인 내용 |
| --- | --- |
| Docker Compose | `POSTGRES_PASSWORD`, 서버 DB 환경변수 전달 방식 |
| 서버 환경변수 | `.env` 로딩 위치와 변수명 |
| DB 연결 코드 | `pg.Pool` 또는 DB 클라이언트 설정값 |
| API 흐름 | `/api/courses/random`이 DB 조회까지 도달하는 과정 |
| 오류 처리 | DB 설정 오류와 일반 500 오류의 구분 가능성 |

---

## 4. 수정 계획

1. 현재 브랜치와 작업트리 상태를 확인한다.
2. `docker-compose.yml`, `docker-compose.dev.yml`, 서버 DB 설정 파일, `.env.example` 계열 문서를 점검한다.
3. DB 비밀번호 환경변수 누락 또는 타입 불일치 원인을 확정한다.
4. 필요한 경우 서버 DB 설정에서 환경변수 검증 로직을 추가한다.
5. 필요한 경우 Compose의 서버 환경변수 이름을 실제 코드와 맞춘다.
6. 필요한 경우 예시 환경변수 문서 또는 README의 실행 설정을 보정한다.
7. API 요청과 서버 모듈 로드 검증을 수행한다.
8. PR 문서와 Step 문서에 원인, 변경 내용, 검증 결과를 기록한다.

---

## 5. 검증 계획

| 검증 항목 | 방법 | 기대 결과 |
| --- | --- | --- |
| 서버 모듈 로드 | 서버 앱 또는 DB 설정 모듈 로드 | 환경변수 검증이 의도대로 동작 |
| 랜덤 추천 API | `GET /api/courses/random?distance=3&time=60&type=running` | 500이 아닌 정상 응답 |
| DB 인증 | 서버 로그 확인 | SCRAM password 타입 오류 미발생 |
| 빌드/정적 검증 | 프로젝트 기존 스크립트 확인 후 실행 | 오류 없음 |
| 문서 검증 | PR/Step 문서 작성 | 원인과 검증 결과 추적 가능 |

---

## 6. 완료 기준

- [x] 오류 원인 확정
- [x] DB 비밀번호 설정이 문자열로 전달되도록 수정
- [x] `/api/courses/random` 요청에서 SCRAM 오류 재발하지 않음
- [x] 필요한 자동/수동 검증 완료
- [x] PR 문서 작성
- [x] Step 문서 갱신 또는 별도 완료 문서 작성
- [x] 한글 커밋 메시지 작성

---

## 7. 수행 결과

Docker PostgreSQL 컨테이너 자체는 `healthy` 상태였고, `server/.env`의 `DATABASE_URL`로 Node에서 `rwr_db`에 정상 접속되는 것을 확인했다.

따라서 원인은 DB 컨테이너가 아니라 서버 실행 위치에 따라 `server/.env`가 로드되지 않을 수 있는 구조로 판단했다. 서버 앱 초기화 시 고정 경로로 `server/.env`를 로드하고, DB 연결 전에 `DATABASE_URL`과 비밀번호 포함 여부를 검증하도록 수정했다.

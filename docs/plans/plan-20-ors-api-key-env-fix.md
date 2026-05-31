# 작업계획서 - Step 20: ORS API Key 배포 환경변수 전달 수정

> **상태**: 완료  
> **작성일**: 2026.05.31  
> **브랜치**: `hotfix/ors-api-key-env`  
> **목적**: 배포 환경에서 `ORS_API_KEY`가 Express server 컨테이너로 전달되지 않아 `/api/routes/round-trip`이 503을 반환하는 문제 수정  
> **관련 문서**: [step-19-ors-round-trip-route.md](../steps/step-19-ors-round-trip-route.md) | [pr-19-ors-round-trip-route.md](../pr/pr-19-ors-round-trip-route.md)

---

## 1. 작업 배경

Step 19에서 ORS Round Trip API를 Express 서버 프록시 방식으로 연동했다.

로컬에서는 `server/.env` 또는 실행 환경에 `ORS_API_KEY`를 넣어 정상 동작할 수 있지만, 운영 배포에서는 `docker-compose.yml`의 `server.environment`에 `ORS_API_KEY`가 포함되어 있지 않았다.

그 결과 GitHub Actions가 `ENV_FILE` Secret으로 루트 `.env`를 생성해도, Docker Compose가 해당 값을 server 컨테이너에 전달하지 못해 `/api/routes/round-trip`에서 503이 발생한다.

---

## 2. 증상

프로덕션에서 GPS 자동 추천 요청 시 아래 응답이 발생한다.

```text
POST https://rwr.healthq.store/api/routes/round-trip
Status Code: 503 Service Unavailable
```

현재 서버 코드는 `process.env.ORS_API_KEY`가 없으면 503을 반환한다.

---

## 3. 원인

운영 `docker-compose.yml`의 server 환경변수 목록에 `ORS_API_KEY`가 없다.

```yaml
server:
  environment:
    PORT: 3000
    NODE_ENV: ${NODE_ENV:-production}
    CORS_ORIGIN: ${CORS_ORIGIN}
    DATABASE_URL: postgresql://...
    # ORS_API_KEY 누락
```

GitHub Actions는 `ENV_FILE` Secret으로 `.env` 파일을 만들지만, Compose `environment`에 명시되지 않은 값은 server 컨테이너 환경으로 전달되지 않는다.

---

## 4. 수정 계획

| 순서 | 작업                                                | 파일                           |
| ---- | --------------------------------------------------- | ------------------------------ |
| 1    | server 컨테이너에 `ORS_API_KEY` 전달 추가           | `docker-compose.yml`           |
| 2    | ENV_FILE Secret에 `ORS_API_KEY` 포함 필요 주석 추가 | `.github/workflows/deploy.yml` |
| 3    | 통합 환경변수 예제에 `ORS_API_KEY` 추가             | `.env.example`                 |
| 4    | 서버 로컬 환경변수 예제에 `ORS_API_KEY` 추가        | `server/.env.example`          |
| 5    | PR/Step 문서 작성                                   | `docs/pr`, `docs/steps`        |

---

## 5. 제외 범위

| 항목                  | 사유                                                       |
| --------------------- | ---------------------------------------------------------- |
| 실제 `.env` 수정      | 비밀값이 포함되므로 사용자가 직접 관리                     |
| GitHub Secret 값 수정 | 저장소 Settings에서 사용자가 직접 `ENV_FILE`을 갱신해야 함 |
| ORS 호출 로직 수정    | 503 원인은 환경변수 전달 누락이며 호출 로직은 유지         |
| DB/schema/seed 변경   | 관련 없음                                                  |

---

## 6. 배포 후 조치

GitHub 저장소 → Settings → Secrets and variables → Actions → `ENV_FILE` Secret에 아래 항목이 포함되어야 한다.

```env
ORS_API_KEY=account.heigit.org에서_확인한_basic_token
```

Secret 갱신 후 `main` 브랜치 배포가 다시 실행되면 GitHub Actions가 `.env`를 생성하고, Docker Compose가 `ORS_API_KEY`를 server 컨테이너로 전달한다.

---

## 7. 검증 항목

| 항목                  | 확인 방법                                                    |
| --------------------- | ------------------------------------------------------------ |
| Compose 환경변수 전달 | `docker-compose.yml` server.environment에 `ORS_API_KEY` 존재 |
| ENV_FILE 안내         | `.github/workflows/deploy.yml` 주석에 ORS 안내 존재          |
| 예제 파일 안내        | `.env.example`, `server/.env.example`에 `ORS_API_KEY` 존재   |
| 배포 후 API 정상화    | `POST /api/routes/round-trip` 503 미발생                     |

# PR #20. ORS API Key 배포 환경변수 전달 수정

> 관련 작업 계획서: [docs/plans/plan-20-ors-api-key-env-fix.md](../plans/plan-20-ors-api-key-env-fix.md)  
> 관련 Step 문서: [docs/steps/step-20-ors-api-key-env-fix.md](../steps/step-20-ors-api-key-env-fix.md)

---

## 브랜치 정보

| 항목        | 값                       |
| ----------- | ------------------------ |
| 작업 브랜치 | `hotfix/ors-api-key-env` |
| 병합 대상   | `dev`                    |
| 상태        | 완료                     |

---

## PR 제목

```text
[Step 20] ORS_API_KEY 배포 환경변수 전달 수정
```

---

## 개요

프로덕션에서 `POST /api/routes/round-trip` 요청이 503을 반환하는 문제를 수정했다.

원인은 GitHub Actions가 `ENV_FILE` Secret으로 루트 `.env`를 생성하더라도, 운영 `docker-compose.yml`의 `server.environment`에 `ORS_API_KEY`가 없어 Express server 컨테이너로 값이 전달되지 않는 것이었다.

---

## 변경 파일 목록

| 구분 | 파일                                        | 변경 내용                                      |
| ---- | ------------------------------------------- | ---------------------------------------------- |
| 수정 | `docker-compose.yml`                        | server 환경변수에 `ORS_API_KEY` 전달 추가      |
| 수정 | `.github/workflows/deploy.yml`              | `ENV_FILE`에 `ORS_API_KEY` 포함 필요 주석 추가 |
| 수정 | `.env.example`                              | 통합 환경변수 예제에 `ORS_API_KEY` 추가        |
| 수정 | `server/.env.example`                       | 서버 로컬 환경변수 예제에 `ORS_API_KEY` 추가   |
| 신규 | `docs/plans/plan-20-ors-api-key-env-fix.md` | 작업 계획서 작성                               |
| 신규 | `docs/pr/pr-20-ors-api-key-env-fix.md`      | PR 문서 작성                                   |
| 신규 | `docs/steps/step-20-ors-api-key-env-fix.md` | Step 문서 작성                                 |

---

## 변경 이유

Step 19에서 ORS 연동은 Express 서버 프록시 방식으로 구현되었다. 서버 코드는 `process.env.ORS_API_KEY`를 읽어 ORS API를 호출하며, 값이 없으면 503을 반환한다.

운영 배포는 GitHub Actions의 `ENV_FILE` Secret으로 루트 `.env`를 만들고 `docker compose up -d --build`를 실행한다. 하지만 Compose 파일에서 `server.environment`에 명시하지 않은 값은 server 컨테이너 환경으로 들어가지 않는다.

따라서 `ORS_API_KEY`를 `docker-compose.yml`에 명시적으로 전달해야 한다.

---

## 동작 설명

배포 시 흐름은 아래와 같다.

```text
GitHub Secret ENV_FILE
→ GitHub Actions가 루트 .env 생성
→ docker compose가 ${ORS_API_KEY} 읽음
→ server 컨테이너 environment로 전달
→ Express process.env.ORS_API_KEY에서 사용
```

---

## 배포 후 필요 조치

GitHub 저장소 Settings → Secrets and variables → Actions → `ENV_FILE` Secret에 아래 항목이 포함되어야 한다.

```env
ORS_API_KEY=account.heigit.org에서_확인한_basic_token
```

Secret 갱신 후 `main` 브랜치 배포가 다시 실행되어야 한다.

---

## 검증

| 항목                                                              | 결과                                     |
| ----------------------------------------------------------------- | ---------------------------------------- |
| `docker-compose.yml` server.environment에 `ORS_API_KEY` 추가 확인 | 완료                                     |
| `.github/workflows/deploy.yml` ENV_FILE 안내 주석 확인            | 완료                                     |
| `.env.example` / `server/.env.example` 예제 추가 확인             | 완료                                     |
| 실제 배포 API 호출                                                | 미실행 (GitHub Secret 갱신 후 확인 필요) |

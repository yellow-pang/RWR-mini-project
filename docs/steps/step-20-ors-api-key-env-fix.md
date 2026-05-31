# Step 20. ORS API Key 배포 환경변수 전달 수정

> 작성일: 2026.05.31  
> 브랜치: `hotfix/ors-api-key-env`  
> 작업 계획서: [docs/plans/plan-20-ors-api-key-env-fix.md](../plans/plan-20-ors-api-key-env-fix.md)  
> 관련 PR 문서: [docs/pr/pr-20-ors-api-key-env-fix.md](../pr/pr-20-ors-api-key-env-fix.md)

---

## 1. 작업 목표

프로덕션에서 `/api/routes/round-trip` 요청이 503을 반환하는 문제를 수정한다.

Step 19에서 ORS 연동은 Express 서버 프록시 방식으로 구현되었으므로, 운영 Docker server 컨테이너에 `ORS_API_KEY`가 전달되어야 한다.

---

## 2. 원인

루트 `.env` 또는 GitHub Actions `ENV_FILE` Secret에 `ORS_API_KEY`가 있어도, `docker-compose.yml`의 `server.environment`에 해당 변수가 없으면 server 컨테이너 환경변수로 전달되지 않는다.

서버 코드는 `process.env.ORS_API_KEY`가 없을 때 503을 반환한다.

```js
if (!apiKey) {
  const error = new Error("ORS_API_KEY가 설정되어 있지 않습니다.");
  error.status = 503;
  throw error;
}
```

---

## 3. 변경 내용

| 구분 | 파일                                   | 설명                                                 |
| ---- | -------------------------------------- | ---------------------------------------------------- |
| 수정 | `docker-compose.yml`                   | server 환경변수에 `ORS_API_KEY: ${ORS_API_KEY}` 추가 |
| 수정 | `.github/workflows/deploy.yml`         | `ENV_FILE`에 ORS key 포함 필요 주석 추가             |
| 수정 | `.env.example`                         | 통합 환경변수 예제에 `ORS_API_KEY` 추가              |
| 수정 | `server/.env.example`                  | 서버 로컬 환경변수 예제에 `ORS_API_KEY` 추가         |
| 신규 | `docs/pr/pr-20-ors-api-key-env-fix.md` | PR 문서 작성                                         |

---

## 4. 변경 상세

### 4.1 docker-compose.yml

```yaml
server:
  environment:
    PORT: 3000
    NODE_ENV: ${NODE_ENV:-production}
    CORS_ORIGIN: ${CORS_ORIGIN}
    ORS_API_KEY: ${ORS_API_KEY}
    DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
```

### 4.2 GitHub Actions ENV_FILE

현재 배포 방식은 `ENV_FILE` Secret 하나로 루트 `.env` 전체를 생성한다. 따라서 GitHub Actions workflow 구조를 바꾸지 않고, `ENV_FILE`에 `ORS_API_KEY`도 포함해야 한다는 주석을 추가했다.

### 4.3 환경변수 예제

`.env.example`, `server/.env.example`에 ORS basic token 입력 위치를 추가했다.

```env
ORS_API_KEY=account.heigit.org에서_확인한_basic_token
```

---

## 5. 검증 결과

| 검증 항목                                                    | 결과                                     |
| ------------------------------------------------------------ | ---------------------------------------- |
| `docker-compose.yml` server.environment에 `ORS_API_KEY` 존재 | 확인                                     |
| `.github/workflows/deploy.yml` ENV_FILE 안내 주석 존재       | 확인                                     |
| `.env.example`에 `ORS_API_KEY` 존재                          | 확인                                     |
| `server/.env.example`에 `ORS_API_KEY` 존재                   | 확인                                     |
| 실제 배포 API 호출                                           | 미실행 (GitHub Secret 갱신 후 확인 필요) |

---

## 6. 배포 후 확인 방법

1. GitHub 저장소 Settings → Secrets and variables → Actions → `ENV_FILE` 수정
2. `ENV_FILE`에 아래 라인 포함

```env
ORS_API_KEY=account.heigit.org에서_확인한_basic_token
```

3. `main` 브랜치 배포 재실행
4. 브라우저 Network 탭에서 `POST /api/routes/round-trip`가 503이 아닌지 확인

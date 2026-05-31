# PR #13. VM 배포 환경 구성

> 관련 작업 계획서: [docs/plans/plan-13-vm-deployment.md](../plans/plan-13-vm-deployment.md)
> 관련 Step 문서: [docs/steps/step-13-vm-deployment.md](../steps/step-13-vm-deployment.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `feat/vm-deployment-setup` |
| 병합 대상 | `dev` |
| 상태 | 진행 중 |

---

## PR 제목

```text
[Step 13] VM 배포 환경 구성 (self-hosted runner + Cloudflare Tunnel)
```

---

## 개요

Ubuntu 24.04 VM에 Docker Compose + Cloudflare Tunnel + GitHub Actions self-hosted runner를 이용한 운영 배포 환경을 구성했다.

기존 `health-center` 서비스(포트 3000, 8080, 5432 등 사용 중)와 포트 충돌 없이 RWR 전용 포트(`8090`)로 격리하고, DB 인증정보 등 민감 값을 코드에서 분리해 GitHub Secrets로 관리한다.

---

## 주요 변경 사항

| 구분 | 파일 | 내용 |
| --- | --- | --- |
| 신규 | `.env.example` (루트) | server/client 환경변수를 루트 단일 파일로 통합 |
| 수정 | `docker-compose.yml` | nginx 포트 `80` → `${NGINX_PORT:-8090}`, DB 인증정보 전체 외부화 |
| 수정 | `.github/workflows/deploy.yml` | GHCR+SSH 방식 → self-hosted runner 방식으로 전면 교체 |
| 수정 | `docs/plans/plan-13-vm-deployment.md` | Runner docker 그룹 적용 후 서비스 재시작 주의사항 추가 |

---

## 변경 이유

### 포트 격리
VM에 이미 3000(frontend), 8080(backend), 5432(postgres) 등이 점유되어 있으므로, nginx 외부 노출 포트를 `8090`으로 지정했다. Express API와 PostgreSQL은 Docker 내부 네트워크에만 존재하며 외부에 노출하지 않는다.

### 환경변수 외부화
`docker-compose.yml`에 하드코딩된 `rwr_password`, `rwr_user` 등을 `${POSTGRES_PASSWORD}` 방식으로 교체했다. 루트 `.env` 파일(`.gitignore`에 포함)에서 값을 읽으며, 배포 시에는 GitHub Actions가 Secrets로 `.env`를 자동 생성한다.

### self-hosted runner 전환
기존 워크플로우는 GitHub-hosted runner에서 GHCR에 이미지를 빌드·푸시한 뒤 SSH로 VM에 접속해 배포하는 방식이었다. self-hosted runner 방식으로 전환하면 VM에서 직접 빌드하므로 GHCR 토큰, VM_HOST, VM_SSH_KEY 등 별도 Secrets가 필요 없고 배포 흐름이 단순해진다.

---

## GitHub Secrets 등록 필요 항목

GitHub 저장소 → Settings → Secrets and variables → Actions

| Secret 이름 | 값 |
| --- | --- |
| `NGINX_PORT` | `8090` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://rwr.yourdomain.com` |
| `POSTGRES_USER` | `rwr_user` |
| `POSTGRES_PASSWORD` | 강력한 비밀번호 (`$` 기호 제외 권장) |
| `POSTGRES_DB` | `rwr_db` |
| `VITE_KAKAO_MAP_KEY` | 카카오맵 API 키 (없으면 빈 값) |

---

## 검증

로컬에서 `.env` 생성 후 빌드 확인:

```powershell
cp .env.example .env
# .env 실제 값으로 수정 후
docker compose up -d --build
curl http://localhost:8090/
```

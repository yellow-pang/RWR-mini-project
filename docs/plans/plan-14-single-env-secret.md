# Plan 14. GitHub Secret 단일 ENV_FILE 방식으로 전환

> **작성일**: 2026.05.31
> **브랜치**: `refactor/single-env-secret`
> **전제 조건**: Step 13 완료 (VM 배포 환경 구성)

---

## 1. 목표

GitHub Secrets에 변수를 7개 개별 등록하는 방식 대신, `.env` 파일 전체 내용을 하나의 Secret(`ENV_FILE`)으로 등록하는 방식으로 전환한다.

---

## 2. 변경 동기

### 현재 방식 (plan-13)

7개의 Secret을 각각 등록하고, `deploy.yml`에서 `printf`로 하나씩 `.env`에 씁니다.

```
GitHub Secrets:
  NGINX_PORT=8090
  NODE_ENV=production
  CORS_ORIGIN=...
  POSTGRES_USER=...
  POSTGRES_PASSWORD=...
  POSTGRES_DB=...
  VITE_KAKAO_MAP_KEY=...
```

**단점**: Secret이 늘어날 때마다 `deploy.yml`도 같이 수정해야 하고, 등록 작업이 번거롭습니다.

### 변경 후 방식 (plan-14)

`.env` 파일 전체 내용을 그대로 복사해 `ENV_FILE` 하나로 등록합니다.

```
GitHub Secrets:
  ENV_FILE=
    NGINX_PORT=8090
    NODE_ENV=production
    CORS_ORIGIN=...
    ... (파일 전체 내용)
```

**장점**:

- Secret 등록이 1회로 끝납니다.
- 환경변수가 추가되어도 `deploy.yml`을 수정할 필요 없이 Secret 값만 업데이트합니다.
- 로컬 `.env`를 그대로 붙여넣으면 되므로 실수가 줄어듭니다.

---

## 3. 변경 파일 목록

| 구분 | 파일                           | 변경 내용                                           |
| ---- | ------------------------------ | --------------------------------------------------- |
| 수정 | `.github/workflows/deploy.yml` | 7개 `printf` → `ENV_FILE` 단일 Secret 방식으로 교체 |
| 수정 | `.env.example`                 | Secret 등록 방법 주석 업데이트                      |

---

## 4. `deploy.yml` 변경 계획

### 변경 전

```yaml
- name: Create .env from GitHub Secrets
  run: |
    printf 'NGINX_PORT=%s\n'         "${{ secrets.NGINX_PORT }}"         >  .env
    printf 'NODE_ENV=%s\n'           "${{ secrets.NODE_ENV }}"            >> .env
    printf 'CORS_ORIGIN=%s\n'        "${{ secrets.CORS_ORIGIN }}"         >> .env
    printf 'POSTGRES_USER=%s\n'      "${{ secrets.POSTGRES_USER }}"       >> .env
    printf 'POSTGRES_PASSWORD=%s\n'  "${{ secrets.POSTGRES_PASSWORD }}"   >> .env
    printf 'POSTGRES_DB=%s\n'        "${{ secrets.POSTGRES_DB }}"         >> .env
    printf 'VITE_KAKAO_MAP_KEY=%s\n' "${{ secrets.VITE_KAKAO_MAP_KEY }}"  >> .env
```

### 변경 후

```yaml
- name: Create .env from GitHub Secret
  env:
    ENV_FILE: ${{ secrets.ENV_FILE }}
  run: printf '%s' "$ENV_FILE" > .env
```

`${{ secrets.ENV_FILE }}`을 직접 `run`에 인라인하지 않고 `env:`로 먼저 환경변수로 받는 이유:

- GitHub Actions는 `${{ secrets.* }}`를 로그에서 마스킹하지만, 멀티라인 값이 `run` 인라인에 직접 치환될 때 줄바꿈이 깨지는 경우가 있습니다.
- `env:` → shell 변수로 전달하면 멀티라인이 안전하게 보존됩니다.

---

## 5. GitHub Secret 등록 방법

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

| Name       | Secret                                       |
| ---------- | -------------------------------------------- |
| `ENV_FILE` | 로컬 `.env` 파일 전체 내용을 그대로 붙여넣기 |

`.env` 예시 (주석 제거 후 붙여넣어도 되고, 주석 포함해도 dotenv가 무시함):

```
NGINX_PORT=8090
NODE_ENV=production
CORS_ORIGIN=https://rwr.yourdomain.com
POSTGRES_USER=rwr_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=rwr_db
VITE_KAKAO_MAP_KEY=
```

---

## 6. 헬스체크 포트 처리

현재 헬스체크에서 `${{ secrets.NGINX_PORT }}`를 직접 참조하는 코드가 있습니다.

```yaml
PORT="${{ secrets.NGINX_PORT }}"
PORT="${PORT:-8090}"
```

`ENV_FILE` 방식 전환 후에는 이 Secret이 사라지므로, `.env`에서 값을 읽어오는 방식으로 변경합니다.

```bash
PORT=$(grep '^NGINX_PORT=' .env | cut -d'=' -f2)
PORT="${PORT:-8090}"
```

---

## 7. 완료 기준

- [ ] `ENV_FILE` Secret 1개만으로 `docker compose up` 정상 동작
- [ ] 기존 7개 개별 Secret 방식 코드 완전 제거
- [ ] 헬스체크가 `.env`에서 포트를 정상 읽음

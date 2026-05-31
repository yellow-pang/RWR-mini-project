# Step 14. GitHub Secret 단일 ENV_FILE 방식으로 전환

> 작성일: 2026.05.31
> 브랜치: `refactor/single-env-secret`
> 작업 계획서: [docs/plans/plan-14-single-env-secret.md](../plans/plan-14-single-env-secret.md)
> 관련 PR 문서: [docs/pr/pr-14-single-env-secret.md](../pr/pr-14-single-env-secret.md)

---

## 1. 작업 목표

GitHub Secrets에 환경변수를 7개 개별 등록하던 방식을 `.env` 파일 전체 내용을 `ENV_FILE` 하나의 Secret으로 등록하는 방식으로 전환한다.

---

## 2. 변경 내용

| 구분 | 파일                           | 설명                                                                                        |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------------- |
| 수정 | `.github/workflows/deploy.yml` | 7개 `printf` → `ENV_FILE` 단일 Secret 방식으로 교체, 헬스체크 포트도 `.env`에서 읽도록 변경 |
| 수정 | `.env.example`                 | Secret 등록 방법 주석 업데이트                                                              |

---

## 3. 주요 변경 상세

### `deploy.yml` Step 2 변경

**변경 전**: 7개 Secret을 `printf`로 하나씩 `.env`에 기록

```yaml
- name: Create .env from GitHub Secrets
  run: |
    printf 'NGINX_PORT=%s\n'         "${{ secrets.NGINX_PORT }}"         >  .env
    printf 'NODE_ENV=%s\n'           "${{ secrets.NODE_ENV }}"            >> .env
    ... (7줄)
```

**변경 후**: `ENV_FILE` 1개 Secret으로 `.env` 생성

```yaml
- name: Create .env from GitHub Secret
  env:
    ENV_FILE: ${{ secrets.ENV_FILE }}
  run: printf '%s' "$ENV_FILE" > .env
```

`env:` 블록으로 먼저 shell 변수로 전달하는 이유: `${{ secrets.ENV_FILE }}`을 `run`에 직접 인라인하면 멀티라인 값의 줄바꿈이 깨질 수 있기 때문이다.

### 헬스체크 포트 처리

`NGINX_PORT` Secret이 사라지므로, 이미 생성된 `.env`에서 직접 읽도록 변경되었다.

```bash
PORT=$(grep '^NGINX_PORT=' .env | cut -d'=' -f2)
PORT="${PORT:-8090}"
```

---

## 4. GitHub Secret 등록 방법

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

| Name       | Secret                                     |
| ---------- | ------------------------------------------ |
| `ENV_FILE` | 로컬 `.env` 파일 전체 내용 그대로 붙여넣기 |

기존에 등록했던 `NGINX_PORT`, `NODE_ENV` 등 7개 개별 Secret은 더 이상 사용하지 않으므로 삭제해도 된다.

---

## 5. 검증 결과

| 검증 항목                               | 결과 |
| --------------------------------------- | ---- |
| `deploy.yml` YAML 구조 이상 없음        | 완료 |
| 멀티라인 Secret 안전 처리 (`env:` 블록) | 완료 |
| 헬스체크 포트 `.env` 파싱으로 전환      | 완료 |
| `.env.example` 주석 업데이트            | 완료 |

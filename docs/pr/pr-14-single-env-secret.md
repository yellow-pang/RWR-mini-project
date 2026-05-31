# PR #14. GitHub Secret 단일 ENV_FILE 방식으로 전환

> 관련 작업 계획서: [docs/plans/plan-14-single-env-secret.md](../plans/plan-14-single-env-secret.md)
> 관련 Step 문서: [docs/steps/step-14-single-env-secret.md](../steps/step-14-single-env-secret.md)

---

## 브랜치 정보

| 항목        | 값                           |
| ----------- | ---------------------------- |
| 작업 브랜치 | `refactor/single-env-secret` |
| 병합 대상   | `dev`                        |
| 상태        | 진행 중                      |

---

## PR 제목

```text
[Step 14] GitHub Secret을 ENV_FILE 단일 방식으로 전환
```

---

## 개요

GitHub Secrets에 환경변수를 7개 개별 등록하던 방식을 `.env` 파일 전체를 `ENV_FILE` 하나의 Secret으로 등록하는 방식으로 전환했다.

환경변수가 추가·변경되어도 `deploy.yml`을 수정할 필요 없이 Secret 값만 업데이트하면 되므로 관리 편의성이 크게 향상된다.

---

## 주요 변경 사항

| 구분 | 파일                           | 내용                                           |
| ---- | ------------------------------ | ---------------------------------------------- |
| 수정 | `.github/workflows/deploy.yml` | 7개 `printf` → `ENV_FILE` 단일 Secret으로 교체 |
| 수정 | `.env.example`                 | Secret 등록 방법 주석 업데이트                 |

---

## 변경 이유

기존 방식은 환경변수가 하나 추가될 때마다 Secret 등록과 `deploy.yml` 수정을 동시에 해야 했다. `ENV_FILE` 방식은 `.env` 파일 자체를 Secret으로 관리하므로 코드 변경 없이 Secret 값만 교체하면 된다.

멀티라인 값을 안전하게 처리하기 위해 `${{ secrets.ENV_FILE }}`을 `run` 인라인에 직접 치환하지 않고 `env:` 블록으로 먼저 shell 변수로 전달한다.

---

## 검증

```bash
# VM에서 직접 확인 시
cat .env   # ENV_FILE Secret 값이 정상적으로 파일에 기록되었는지 확인
docker compose config   # 환경변수가 compose에 정상 주입되는지 확인
```

# PR #15. Docker 볼륨 이름 명시화

> 관련 작업 계획서: [docs/plans/plan-15-volume-naming.md](../plans/plan-15-volume-naming.md)
> 관련 Step 문서: [docs/steps/step-15-volume-naming.md](../steps/step-15-volume-naming.md)

---

## 브랜치 정보

| 항목        | 값                  |
| ----------- | ------------------- |
| 작업 브랜치 | `fix/volume-naming` |
| 병합 대상   | `dev`               |
| 상태        | 진행 중             |

---

## PR 제목

```text
[Step 15] Docker 볼륨 이름 명시화 (rwr_postgres_data)
```

---

## 개요

`docker-compose.yml`의 PostgreSQL 볼륨 이름을 `postgres_data`에서 `rwr_postgres_data`로 변경했다.

---

## 변경 사항

| 구분 | 파일                 | 내용                                            |
| ---- | -------------------- | ----------------------------------------------- |
| 수정 | `docker-compose.yml` | 볼륨 이름 `postgres_data` → `rwr_postgres_data` |

---

## 변경 이유

`docker volume ls`에서 볼륨이 어느 프로젝트 소속인지 명확히 식별하기 위해 프로젝트 prefix를 추가했다. 기술적 충돌 위험은 기존에도 낮았으나, 볼륨 이름에 `rwr_` prefix를 붙여 명시성을 높였다.

---

## 주의사항

VM에 이미 `postgres_data` 볼륨이 존재한다면 볼륨 이름 변경 후 새 빈 볼륨이 생성된다. **VM 최초 배포 전이므로 해당 없음.**

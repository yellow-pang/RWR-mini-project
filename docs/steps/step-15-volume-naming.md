# Step 15. Docker 볼륨 이름 명시화

> 작성일: 2026.05.31
> 브랜치: `fix/volume-naming`
> 작업 계획서: [docs/plans/plan-15-volume-naming.md](../plans/plan-15-volume-naming.md)
> 관련 PR 문서: [docs/pr/pr-15-volume-naming.md](../pr/pr-15-volume-naming.md)

---

## 1. 작업 목표

`docker-compose.yml`의 PostgreSQL 볼륨 이름을 `postgres_data`에서 `rwr_postgres_data`로 변경하여 프로젝트 식별성을 높인다.

---

## 2. 변경 내용

| 구분 | 파일                 | 설명                                                  |
| ---- | -------------------- | ----------------------------------------------------- |
| 수정 | `docker-compose.yml` | 볼륨 이름 `postgres_data` → `rwr_postgres_data` (2곳) |

---

## 3. 변경 상세

`db` 서비스의 볼륨 마운트와 최상단 `volumes` 선언 2곳을 동시에 변경했다.

```yaml
# 변경 전
db:
  volumes:
    - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:

# 변경 후
db:
  volumes:
    - rwr_postgres_data:/var/lib/postgresql/data

volumes:
  rwr_postgres_data:
```

---

## 4. 검증 결과

| 검증 항목                                 | 결과 |
| ----------------------------------------- | ---- |
| `docker-compose.yml` 볼륨 이름 일치 (2곳) | 완료 |
| 기존 코드 로직 변경 없음                  | 확인 |

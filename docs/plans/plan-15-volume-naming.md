# Plan 15. Docker 볼륨 이름 명시화

> **작성일**: 2026.05.31
> **브랜치**: `fix/volume-naming`
> **전제 조건**: Step 14 완료 (ENV_FILE 단일 Secret 전환)

---

## 1. 목표

`docker-compose.yml`의 PostgreSQL 볼륨 이름을 `postgres_data`에서 `rwr_postgres_data`로 변경하여 프로젝트 식별성을 높이고 타 프로젝트 볼륨과의 혼동을 방지한다.

---

## 2. 배경

Docker Compose는 볼륨을 `<프로젝트폴더명>_<볼륨명>` 형식으로 생성한다. 현재 프로젝트 폴더명이 `rwr-mini-project`이므로 실제 생성되는 볼륨 이름은 `rwr-mini-project_postgres_data`가 된다.

기술적 충돌 위험은 낮지만 `docker volume ls` 출력에서 볼륨이 어느 프로젝트 소속인지 한눈에 파악하기 어렵다. 또한 컴포즈 파일을 다른 경로에서 실행하는 경우 이름이 달라질 수 있으므로 볼륨 이름에 프로젝트 prefix를 명시한다.

---

## 3. 변경 파일 목록

| 구분 | 파일                 | 변경 내용                                       |
| ---- | -------------------- | ----------------------------------------------- |
| 수정 | `docker-compose.yml` | 볼륨 이름 `postgres_data` → `rwr_postgres_data` |

---

## 4. 변경 상세

| 위치               | 변경 전                      | 변경 후                          |
| ------------------ | ---------------------------- | -------------------------------- |
| `db.volumes`       | `postgres_data:/var/lib/...` | `rwr_postgres_data:/var/lib/...` |
| `volumes` (최상단) | `postgres_data:`             | `rwr_postgres_data:`             |

---

## 5. 주의사항

이미 `postgres_data` 볼륨으로 데이터가 존재하는 경우, 볼륨 이름 변경 후 `docker compose up`을 하면 **새 빈 볼륨**이 생성되어 기존 데이터가 보이지 않는다. VM 최초 배포 전이라면 무관하다. 만약 기존 데이터를 유지해야 한다면 볼륨을 수동으로 rename하거나 dump/restore가 필요하다.

---

## 6. 완료 기준

- [ ] `docker compose up -d --build` 정상 실행
- [ ] `docker volume ls`에서 `rwr_postgres_data` 확인

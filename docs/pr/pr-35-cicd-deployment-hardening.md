# PR 35. CI/CD 배포 순서와 검증 강화

> 관련 작업 계획서: [Plan 35](../plans/plan-35-cicd-deployment-hardening.md)
> 관련 Step 문서: [Step 35](../steps/step-35-cicd-deployment-hardening.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `fix/35-cicd-deployment-hardening` |
| 병합 대상 | `dev` |
| 상태 | 로컬 구현·검증 완료, commit/push 및 실제 PR 생성 전 |

문서의 35는 Step 번호이며 GitHub PR 번호는 아직 없다.

---

## PR 제목

```text
[Step 35] CI/CD 배포 순서와 검증 강화
```

---

## 개요

main에 연속 병합할 때 늦게 완료된 이전 빌드가 최신 운영 버전을 덮어쓸 수 있었고, 기존 health는 DB 장애를 검사하지 않았다. 배포 대기열을 보존하면서 직렬화하고 최신 main SHA만 배포한다. DB health와 실제 조회 API의 응답을 배포 성공 조건으로 추가하고 기존 배포/rollback 테스트를 CI에 연결한다.

main에는 PR·최신 상태·GitHub Actions `Validate application` 필수 검사 보호를 별도로 적용했다. 설정 JSON을 저장소에 기록하고 원격 적용 결과를 Step 문서에 남겼다.

---

## 변경 파일 목록

| 구분 | 파일 | 변경 내용 |
| --- | --- | --- |
| 수정 | `.github/workflows/pipeline.yml` | 테스트 연결, 배포 queue/직렬화, 최신 SHA 검사, 안전한 인수 전달 |
| 수정 | `.github/workflows/deploy.yml` | 수동 VM runner를 Linux/X64로 한정 |
| 신규 | `.github/main-branch-protection.json` | 실제 적용한 main 보호 설정 |
| 신규 | `scripts/check-deploy-head.sh` | 원격 main 최신 SHA 판정 |
| 수정 | `scripts/deploy-mac.sh` | HTTP 시간 제한, JSON·DB 조회 API 검증 |
| 수정/신규 | `scripts/tests/*` | 실패 rollback, 최신 SHA, workflow 계약 회귀 검사 |
| 수정 | `server/src/app.js`, `server/src/db/index.js` | DB health handler 연결 |
| 신규 | `server/src/controllers/healthController.js`, `server/src/services/healthService.js` | DB readiness 및 실패 503 |
| 신규 | `server/tests/health.test.js` | 정상/접속/권한/timeout/연결 정리 테스트 |
| 수정/신규 | README, 데이터·기술 문서, Plan/Step/PR 35 | 현 CI/CD 운영 기준과 검증 기록 |

---

## 주요 변경 내용

- `queue: max`, `cancel-in-progress: false`로 진행 중 및 대기 중 배포를 보존한다. 최신 SHA 확인으로 이전 커밋의 뒤늦은 배포를 생략한다.
- health 전용 최대 1개 DB 연결과 접속/쿼리 timeout을 두고 필수 테이블·컬럼·권한을 읽기 전용으로 확인한다.
- `/api/health`, 즐겨찾기/이력 GET, UI를 검사하고 응답 오류 시 직전 SHA 복구 경로를 사용한다.
- Node 내장 test와 기존 Bash/Ruby 검증을 validate에 연결한다. 신규 패키지는 없다.
- main PR은 최신 상태와 CI 성공을 요구하되 다른 사람의 승인 수는 0명으로 유지한다.

---

## 검증

| 항목 | 결과 |
| --- | --- |
| 서버 health 테스트 | 8개 통과 |
| 서버 문법 검사 | 28개 파일 통과 |
| 배포/rollback, SHA 검사, workflow 계약 | 통과 |
| 클라이언트 lint/build | 통과 |
| 기존 PostgreSQL 대상 health SELECT | 읽기 전용 통과 |
| main 보호 설정 재조회 | 통과 |
| shell 문법, Git diff 검사 | 통과 |

배포 실패 테스트는 가짜 Docker/curl과 임시 경로에서 실행했다. 실제 서비스의 장애나 재시작을 유도하지 않았다.

---

## 후속 확인

- commit/push 후 PR의 강화된 CI가 성공하는지 확인한다.
- main 병합 후 새 workflow의 GHCR 게시·Mac 배포 결과를 확인한다.
- 실제 장애 rollback, 재부팅 복구, Cloudflare origin 확인은 별도 운영 검증이다.
- 기존 DB 마이그레이션은 이번 변경에 포함하지 않는다. schema/seed, Compose, `.env`/Secret은 유지한다.

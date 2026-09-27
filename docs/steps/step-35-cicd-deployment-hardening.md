# Step 35. CI/CD 배포 순서와 검증 강화

> 작성일: 2026.09.27
> 브랜치: `fix/35-cicd-deployment-hardening`
> 계획: [Plan 35](../plans/plan-35-cicd-deployment-hardening.md)
> PR 문서: [PR 35](../pr/pr-35-cicd-deployment-hardening.md)

## 1. 작업 배경과 완료 범위

`dev → main` 병합의 CI/CD 연결을 분석한 결과, 기존 workflow `35493924836`의 validate, GHCR publish, Mac deploy가 모두 성공했고 운영 컨테이너도 main SHA `040f02d2bc90742a92633ee1468bacbfe4ed5c75`를 실행하고 있었다. 새 기능이 필요한 상태보다는 배포 순서와 성공 판정의 공백을 보완할 단계였다.

사용자 요청에 따라 깨끗한 `dev`(`4d77fc4`)에서 작업 브랜치를 생성·체크아웃하고 계획 작성 후 구현했다. 로컬 검증과 원격 main 보호 설정을 완료했다. 초기 구현 보고 시에는 미커밋 상태였으며, 후속 승인에 따른 commit/push와 GitHub 검증 결과는 아래 실행 기록에 보정한다.

## 2. 배포 역행과 대기열 소실 방지

### 발생 가능한 상황

main에 A → B를 병합했어도 B 이미지 빌드가 먼저 끝나면 B 배포 후 A가 뒤늦게 배포될 수 있었다. Mac runner가 하나여도 빌드 완료 순서는 보장되지 않는다.

`pipeline.yml`의 deploy job에 다음 설정을 추가했다.

```yaml
concurrency:
  group: rwr-production-deploy
  queue: max
  cancel-in-progress: false
```

- 같은 운영 배포는 한 번에 하나만 실행한다.
- 새 push가 이미 컨테이너를 교체 중인 배포를 자동 취소하지 않는다.
- `queue: max`는 최대 100개 pending 작업을 보존한다. 기본 pending 1개 설정에서는 A 실행 중 최신 C가 대기하다 늦게 끝난 B에 의해 취소되고 B는 오래된 SHA라 생략되어 C가 영영 배포되지 않는 문제가 있다. 독립 리뷰에서 이 경우를 확인하고 보완했다.

직렬화 구간 안에서 checkout 후 `scripts/check-deploy-head.sh`가 `git ls-remote --exit-code origin refs/heads/main`을 실행한다. 원격 최신 SHA와 workflow SHA가 같을 때만 `GITHUB_OUTPUT`에 `should_deploy=true`를 기록한다.

| 결과 | 처리 |
| --- | --- |
| 최신 main과 동일 | 다음 deploy step 실행 |
| 원격 main보다 오래된 SHA | `false`를 기록하고 정상 생략, 컨테이너 변경 없음 |
| 원격 조회 실패 또는 잘못된 응답 | job 실패, 배포 실행 안 함 |

배포 인수는 GitHub 표현식을 shell 본문에 삽입하지 않고 `env`로 전달한 뒤 큰따옴표로 감싼다. job timeout은 HTTP 재시도와 rollback 시간을 고려해 25분이다. 수동 취소나 강제 종료 시 rollback까지 보장하는 구조는 아니다.

참고: [GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency). GitHub 대기열 순서는 커밋 순서와 다를 수 있으므로 SHA 검사와 직렬화를 함께 사용한다.

## 3. DB를 확인하는 health API

기존 `/api/health`는 DB 접근 없이 항상 성공 JSON을 반환했다. DB 인증 오류나 필수 테이블 누락도 배포 성공으로 처리될 수 있었다.

- `healthService.js`: 기존 일반 API pool과 분리한 health 전용 `pg.Pool`을 생성한다.
- `healthController.js`: 검사가 성공하면 기존 message/timestamp 형식으로 200, 실패하면 내부 정보 없는 일반 메시지로 503을 반환한다.
- `db/index.js`: 기존 `query` export를 유지하면서 `checkDatabaseHealth`를 추가한다.
- `app.js`: 기존 `/api/health` 경로에 새 handler를 연결한다.

검사 SQL은 `courses`, `favorites`, `history`의 필수 컬럼을 선택하는 `SELECT ... LIMIT 0` 세 문장이다. PostgreSQL이 테이블, 컬럼, SELECT 권한을 검사하지만 사용자 행을 가져오지 않는다. 초기 데이터가 0건이어도 정상이다.

| 제한 | 값 | 목적 |
| --- | --- | --- |
| health pool 최대 연결 | 1개 | 일반 API 연결과 자원 분리 |
| 연결 및 pool 대기 | 1.5초 | 접속 실패나 동시 요청의 무한 대기 방지 |
| query / statement timeout | 각각 1.5초 | 서버 실행 및 클라이언트 응답 대기 제한 |
| idle 연결 유지 | 1초 | 사용하지 않는 health 연결 정리 |

query timeout은 JavaScript 응답 대기만 끝낼 수 있으므로 실패 시 `client.release(true)`로 해당 연결을 폐기한다. `Promise.race`만으로 응답을 끊고 DB 연결을 남기는 방식은 사용하지 않는다. 기존 일반 API pool과 `.env` 설정은 바꾸지 않았다.

## 4. 배포 후 API/DB/UI 검증

`deploy-mac.sh`의 `is_healthy`는 다음 네 요청을 검사한다.

1. `/api/health`: HTTP 200, JSON `success: true`
2. `/api/favorites?userId=00000000-0000-4000-8000-000000000000`: HTTP 200, `success: true`, `data` 배열
3. `/api/history?userId=00000000-0000-4000-8000-000000000000&limit=1`: 같은 목록 계약
4. `/`: HTTP 200

검증용 UUID는 요청 인자일 뿐이며 사용자를 생성하거나 즐겨찾기·이력을 저장하지 않는다. 빈 배열도 통과한다. 즐겨찾기/이력 GET은 각각 courses와 JOIN하는 기존 API라 실제 DB 조회 경로를 검사한다. ORS·Kakao 유료/외부 API 요청은 실행하지 않는다.

curl에는 연결 3초, 요청 전체 10초 제한을 둔다. HTTP 200이더라도 `success: false`, HTML로 된 SPA fallback, 잘못된 JSON/목록은 실패시킨다. 3xx 응답도 200으로 인정하지 않는다.

JSON 파서는 `docker compose exec -T server node -e`로 실행한다. Node가 포함된 기존 server 이미지를 사용하므로 Mac host에 Node/jq를 새로 설치할 필요가 없다. 응답 원문은 로그에 출력하지 않는다.

검증 실패 시 기존 rollback 경로를 사용한다. 직전 Compose/SHA를 복구한 뒤 같은 API/DB/UI 검증을 수행한다. 이 작업은 앱 이미지와 Compose 복구이며 DB 데이터/스키마 복구나 무중단 배포를 의미하지 않는다.

## 5. CI와 수동 fallback

`Validate application`에 다음 검증을 연결했다.

```bash
node --test server/tests/*.test.js
bash scripts/tests/deploy-mac.test.sh
ruby scripts/tests/workflow-deploy.test.rb
bash scripts/tests/check-deploy-head.test.sh
```

Node 내장 test를 사용하며 npm 패키지를 추가하지 않았다. Bash 테스트의 Docker/curl 배포 동작은 가짜 실행 파일로 대체하고 임시 디렉터리 안에서 수행한다. 실제 Docker Compose는 `config`만 사용하므로 CI 테스트가 운영 컨테이너를 변경하지 않는다.

Legacy VM workflow는 계속 `workflow_dispatch` 전용이며 runner 조건을 `self-hosted, Linux, X64`로 한정했다. Mac runner가 수동 VM 배포를 가져가는 문제를 방지한다. 현재 Linux runner가 offline이면 수동 배포는 대기하며, 실제 VM 사용 가능 여부는 별도 확인이 필요하다.

## 6. main 브랜치 보호 적용

GitHub API에서 기존 main이 보호되지 않은 상태인지 확인한 뒤 `.github/main-branch-protection.json`의 설정을 적용하고 다시 읽어 검증했다.

| 항목 | 적용 결과 |
| --- | --- |
| main 보호 | `protected: true` |
| 변경 경로 | PR 사용 |
| 필수 검사 | `Validate application` |
| 검사 제공자 | GitHub Actions, App ID `15368` |
| 최신 main 반영 | 필수 (`strict: true`) |
| 관리자에게도 적용 | 활성 |
| 다른 사람의 승인 | 0명, 개인 프로젝트 작업 유지 |
| force push / branch 삭제 | 금지 |

코드 파일에 설정을 저장하는 것만으로 GitHub 보호가 적용되는 것은 아니다. 이번에는 API로 실제 적용했고 read-back 결과까지 확인했다. workflow는 보호 설정을 자동 변경하지 않는다. main SHA는 적용 전후 동일한 `040f02d...`다.

이제 main 대상 PR에서 최신 main 반영을 요구하면 먼저 브랜치를 갱신하고 CI를 다시 통과해야 한다. 필수 검사가 실패하거나 끝나지 않으면 관리자도 그대로 병합할 수 없다.

참고: [GitHub branch protection API](https://docs.github.com/en/rest/branches/branch-protection#update-branch-protection).

## 7. 검증 결과

| 검증 | 결과 |
| --- | --- |
| Node health 테스트 | 8개 통과 |
| 서버 전체 JS 문법 | 28개 통과 |
| Bash 문법 | 변경/신규 shell 스크립트 통과 |
| 배포/rollback 모의 테스트 | 통과 |
| 최신 SHA / 오래된 SHA / 원격 조회 오류 테스트 | 통과 |
| Ruby workflow 계약 검사 | 테스트 연결·queue·조건·runner 검사 통과 |
| 클라이언트 lint | 통과 |
| 클라이언트 build | 통과 |
| 실제 PostgreSQL health SELECT | 기존 server 컨테이너의 별도 Node 프로세스에서 읽기 전용 실행, 통과 |
| main 보호 설정 | 적용 후 read-back 통과 |
| Git diff 공백 검사 | 통과 |

health 테스트는 단순 mock뿐 아니라 실제 pg 드라이버에 메모리 PostgreSQL stream을 연결하여 접속 timeout, 쿼리 timeout, pool 대기 제한과 socket 폐기를 확인한다. 환경 파일과 실제 비밀값을 읽지 않는다.

배포 모의 테스트는 pull 실패 시 미교체, up 실패 후 rollback, health 실패, rollback 자체 실패, HTTP 200의 오류 JSON/HTML/잘못된 목록, redirect, timeout, UI 실패, current/previous 보관을 검사한다.

macOS에서는 저장소에 기재된 Windows 명령 `npm.cmd` 대신 같은 스크립트를 실행하는 `npm`을 사용했다. 실제 DB 확인은 SELECT만 실행했고 파일·컨테이너·데이터를 변경하지 않았다.

## 8. 이후 확인

- 사용자가 변경 파일을 검토하고 commit/push한다.
- 작업 브랜치 → dev PR에서 강화한 validate와 publish/deploy 생략을 확인한다.
- dev → main PR에서 보호 규칙과 validate 성공을 확인한 뒤 사용자가 병합한다.
- main workflow에서 SHA 게시, 최신 여부 검사, Mac 배포 및 DB/API/UI 확인이 성공하는지 확인한다.
- Cloudflare origin 연결, 실제 장애 rollback, Mac 재부팅 복구는 별도 운영 작업으로 남는다. 단위·모의 테스트 성공을 실제 장애 복구 완료로 기록하지 않는다.

DB schema/seed, Docker Compose, 환경변수/Secret, Cloudflare는 수정하지 않았으며 commit/push/운영 배포도 수행하지 않았다.

## 9. 2026.09.27 사용자 후속 승인 및 원격 PR 검증

위의 미커밋 기록은 초기 구현 완료 시점 기준이다. 이후 사용자가 commit과 dev 병합을 승인했다.

- 구현 커밋: `c9bf6af` (`ci: 운영 배포 순서와 DB 검증 강화`)
- 원격 작업 브랜치 push 및 dev 대상 [PR #43](https://github.com/yellow-pang/RWR-mini-project/pull/43) 생성 완료
- 최초 PR workflow: [36317840311](https://github.com/yellow-pang/RWR-mini-project/actions/runs/36317840311)
- `Validate application` 성공: dependency 설치, 서버 문법/health, 배포/rollback, workflow, 최신 SHA, 클라이언트 lint/build 모두 통과
- publish는 PR 조건에 따라 생략, 운영 배포 미실행

GitHub는 `queue: max`가 포함된 새 workflow를 정상 접수했고 강화된 테스트를 실제 Ubuntu runner에서 실행했다. 최종 문서 커밋의 PR CI도 통과한 뒤 dev에 병합한다. 실제 main 게시/배포는 이 PR 검증과 구분하며 이후 main 병합에서 확인해야 한다.

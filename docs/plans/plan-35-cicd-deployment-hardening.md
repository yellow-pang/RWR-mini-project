# Plan 35. CI/CD 배포 순서와 검증 강화

## 상태

- 작성일: 2026.09.27
- 브랜치: `fix/35-cicd-deployment-hardening` (`dev`에서 생성)
- 단계: 로컬 구현·검증 및 main 보호 설정 완료, 사용자 commit/push 후 원격 workflow 검증 대기
- 승인 근거: 사용자가 CI/CD 분석 후 새 브랜치 생성·체크아웃과 후속 구현을 요청했다.
- 이전 작업: [Step 34 Phase 3](../34-mac-mini-deployment-analysis/steps/step-34-phase-3-mac-pull-deployment.md)
- 관련 기준: `docs/01-overview.md`, `docs/03-requirements.md`, `docs/06-data-spec.md`, `docs/07-tech-stack.md`

## 1. 목표와 현재 근거

`main` push의 validate → GHCR publish → Mac deploy 연결은 실제 workflow `35493924836`에서 성공했다. 원격 `main`은 `040f02d`, `dev`는 `4d77fc4`이며 두 브랜치 사이 차이는 문서뿐이다. 현재 Mac runner는 online이고 운영 컨테이너는 main SHA를 실행한다.

이번 작업은 연속 병합에 따른 배포 역행과 배포 성공 판정의 검증 공백을 보완한다. PostgreSQL을 기준 데이터로 유지하고 기존 SHA 이미지 배포 구조를 따른다.

## 2. 구현 범위

1. Mac 배포를 concurrency group으로 직렬화하고 진행 중인 배포는 자동 취소하지 않는다. `queue: max`로 대기 중 최신 배포가 늦게 끝난 이전 빌드에 의해 취소되지 않게 한다.
2. 배포 직전 원격 main SHA를 확인하여 오래된 workflow는 운영 컨테이너를 변경하지 않고 생략한다. 원격 조회 오류는 안전하게 실패시킨다.
3. DB 연결과 필수 테이블을 읽기 전용으로 확인하는 서버 health 검증을 추가한다. 오류 응답은 내부 SQL·접속 정보 없이 503으로 반환하며 검증 시간을 제한한다.
4. 배포 스크립트의 HTTP 요청 시간을 제한하고 API 응답 내용과 실제 DB 조회 경로를 검증한다. 실패하면 기존 rollback 경로를 사용한다.
5. 기존 배포/rollback 모의 테스트와 workflow 계약 테스트, 신규 서버 health 및 오래된 SHA 방지 테스트를 CI validate에 연결한다. 새로운 npm 패키지는 추가하지 않는다.
6. 수동 Legacy VM workflow를 Linux/X64 runner로 한정하여 Mac에 잘못 배정되지 않도록 한다.
7. 코드와 검증이 완료된 뒤 main에 PR 및 `Validate application` 필수 검사 보호를 적용하고 읽기로 확인한다. 개인 프로젝트이므로 다른 사람의 승인을 필수로 요구하지 않는다.
8. README·기술 스택 문서에 현 배포 흐름을 보정하고 Step/PR 문서를 작성한다.

## 3. 설계 기준

- 최신 여부 비교는 배포 직렬화 구간 안에서 수행한다. main 조회가 실패하면 배포를 실행하지 않는다.
- current/previous SHA 보관, 공개 GHCR pull, 고정 운영 경로, 기존 runtime `.env` 직접 참조를 유지한다.
- DB 검증은 기존 데이터의 존재 개수를 강제하지 않으며 스키마/권한/접속 오류를 잡는 읽기 작업만 수행한다.
- 서버 비밀값과 DB 정보는 이미지, 로그, 클라이언트 코드에 넣지 않는다.
- 실패 테스트는 임시 경로와 가짜 Docker/curl을 사용한다. 실제 운영 장애나 재시작을 유도하지 않는다.
- Mac과 Ubuntu CI에서 같은 테스트가 실행되도록 기본 Bash, Node.js 내장 test, Ruby YAML을 사용한다.

## 4. 검증

- 서버 health: 정상 DB, 접속/쿼리 실패, 시간 초과, 내부 오류 정보 비노출.
- 배포: 최신/오래된 SHA 및 원격 조회 실패, 정상 전환, pull 실패, up/health 실패 rollback, 응답 내용 오류, 세대 보관.
- workflow: main 전용 publish/deploy, needs 연결, concurrency, 검증 스크립트 연결, Linux 전용 legacy runner.
- 클라이언트 lint/build, 서버 JS 문법 검사, shell 문법 및 Git diff 검증.
- GitHub main 보호 설정 적용 후 필수 검사와 PR 요구 상태 재조회.

## 5. 경계와 완료 기준

DB 스키마/seed, Docker Compose, `.env`/Secret, Cloudflare 설정은 수정하지 않는다. DB 마이그레이션 신규 도입, 실제 장애 rollback, Mac 재부팅은 이번 코드 보완에 포함하지 않는다. 이 운영 검증은 서비스 중단과 다른 프로젝트 영향이 있어 별도 작업으로 남긴다.

사용자가 코드를 확인한 뒤 직접 commit/push한다. GitHub에서 변경한 workflow가 실행되는 최종 검증은 해당 push/PR 및 후속 main 병합 때 수행한다. 로컬 테스트 성공과 원격 신규 배포 성공을 구분해서 기록한다.

## 6. 완료 기록

2026.09.27 서버 health 테스트 8개, 서버 JS 28개 문법, 배포/rollback 모의 테스트, 최신 SHA 검사, workflow 계약, 클라이언트 lint/build가 통과했다. 새 health SELECT를 기존 PostgreSQL에서 읽기 전용으로 실행해 통과했다. main에 PR·최신 상태·GitHub Actions의 `Validate application` 필수 검사를 적용하고 재조회했다. 상세 결과는 [Step 35](../steps/step-35-cicd-deployment-hardening.md)에 기록한다.

### 2026.09.27 후속 실행 승인

사용자가 에이전트의 commit과 dev 병합을 요청했다. 작업 브랜치를 push하고 dev 대상 PR의 CI 성공 후 merge 방식으로 병합한다. 로그인·권한 문제는 한 번만 재시도하고 계속 실패하면 PR 제목과 본문을 사용자에게 전달한다. main 병합과 운영 배포는 이번 후속 요청에 포함하지 않는다.

# Step 36. 공개 이미지 보안 점검과 포트폴리오 운영 판단

> 작성일·점검일: 2026.10.04
>
> 문서화 브랜치: `dev`
>
> 작업 유형: 읽기 전용 보안 점검 결과와 공개 유지 결정의 문서화
>
> 이전 작업: [Step 35](./step-35-cicd-deployment-hardening.md)
>
> PR 요약: [PR 문서 36](../pr/pr-36-public-image-security-review.md)

## 1. 왜 점검했는가

RWR은 React, Express, PostgreSQL, GitHub Actions, GHCR, Mac mini·OrbStack 배포를 직접 사용해 본 경험을 링크로 보여주는 포트폴리오 프로젝트다. 현재는 실제 사용자를 모집해 지속적으로 서비스를 제공하는 운영 단계가 아니다. 초기 기획의 개인 사용·서비스 확장 방향과 현재 공개 목적은 구분한다.

현재 `rwr-web`과 `rwr-server`는 GHCR에서 공개되어 있다. 공개 이미지는 인증 없이 다운로드할 수 있고, 이미지 안의 파일과 빌드 정보를 분석할 수 있다. 이 사실을 확인한 뒤, 서버 비밀값이나 개인 데이터가 배포 결과물에 들어갔는지 추가 점검했다.

점검 목적은 이미지 공개 자체를 문제로 판단하는 것이 아니라, 공개해도 되는 코드·정적 파일과 공개하면 안 되는 인증정보·데이터가 분리되어 있는지 확인하는 것이다. 최종 파일 목록만 보면 삭제 전 레이어나 공개 빌드 메타데이터의 노출을 놓칠 수 있어 이 영역도 포함했다.

사용자는 점검 결과를 확인한 뒤 비공개 전환을 하지 않고, 현재 공개 배포를 유지하면서 보완할 부분과 그 판단 근거를 문서로 남기기로 결정했다.

## 2. 점검 당시 배포 구조

```text
PR / dev push
→ GitHub-hosted runner의 검증

main push
→ 검증 성공
→ web/server의 linux/amd64·linux/arm64 이미지 빌드 및 GHCR 게시
→ Mac mini self-hosted runner
→ OrbStack에서 같은 commit SHA 이미지 pull/up
→ DB/API/UI 상태 확인
```

- 기준 설정: [pipeline.yml](../../.github/workflows/pipeline.yml), [배포 Compose](../../docker-compose.deploy.yml), [Mac 배포 스크립트](../../scripts/deploy-mac.sh).
- 게시 단계는 `GITHUB_TOKEN`으로 GHCR에 로그인하지만 Mac 배포 단계는 공개 이미지를 인증 없이 받는다.
- 서버 API 키와 DB 접속정보는 컨테이너 실행 시 환경변수로 전달한다. 이미지 자체에 저장하는 설정과 구분한다.
- 실제 DB 데이터는 `rwr-production-postgres-data` 볼륨에 있다. 이미지 다운로드가 Mac의 실행 환경변수나 DB 볼륨 다운로드를 의미하지는 않는다.
- 점검 당시 Mac의 web/server 컨테이너는 `2f19b8882ce3b8207ec8bf0ef94c4e1d008ccad2` 태그를 실행하고 있었다.

## 3. 실제 검사 범위와 방법

### 공개 이미지와 로그

GHCR 조회에서 확인된 아래 SHA 태그 3개를 대상으로 web/server의 두 아키텍처를 검사했다.

| SHA 태그 | 대응하는 main 게시 실행 |
| --- | --- |
| `8d244f8cf0497b4db26d38b46cfead62b57dac6c` | [35488279464](https://github.com/yellow-pang/RWR-mini-project/actions/runs/35488279464) |
| `040f02d2bc90742a92633ee1468bacbfe4ed5c75` | [35493924836](https://github.com/yellow-pang/RWR-mini-project/actions/runs/35493924836) |
| `2f19b8882ce3b8207ec8bf0ef94c4e1d008ccad2` | [37190359693](https://github.com/yellow-pang/RWR-mini-project/actions/runs/37190359693) |

| 검사 대상 | 범위 |
| --- | --- |
| 플랫폼별 이미지 | 3개 SHA × web/server × amd64/arm64 = 12개 |
| 공개 빌드 증명 메타데이터(provenance) | 12개 |
| 이미지 파일 레이어 | 중복 digest를 제외한 55개, 레이어 파일 항목 20,585개 |
| 이미지 설정·이력 | 환경변수, 실행 사용자, 포트, 빌드 이력 |
| Actions 로그 | 게시 실행 3건의 로그 파일 16개 |
| 저장소 | 추적 파일 237개와 Dockerfile·제외 규칙·workflow·Compose 검토 |
| 실행 중인 컨테이너 | 프로세스 사용자, 특권 설정, 마운트, 실제 포트 연결 |

공개 레이어를 임시 경로에 내려받아 digest를 검증하고, tar 내부 파일을 읽어 검사했다. 최종 화면에 남은 파일뿐 아니라 각 레이어에 존재했던 파일을 확인했다. 이미지 검사 중 다운로드·해석 오류는 없었다.

실제 로컬·실행 환경의 ORS 키, Kakao REST 키, DB 비밀번호·연결 문자열 등과 대조하고, 토큰·사설키·서비스 계정의 알려진 패턴과 민감파일 이름을 검사했다. 비밀값은 메모리에서 비교했으며 문서·출력·저장소에 기록하지 않았다. 원문 Actions 로그도 저장소에 추가하지 않았다.

## 4. 항목별 결과

`미발견`은 위 범위의 운영값 대조·패턴 검사에서 발견되지 않았다는 뜻이다. 모든 종류의 비밀값과 취약점이 없다는 보증은 아니다.

| 우선순위 | 점검 항목 | 결과 | 확인한 내용 |
| --- | --- | --- | --- |
| 필수 | Secret 포함 여부 | 미발견 | 운영 API 키·DB 비밀번호·연결 문자열의 일치값과 검사한 토큰 패턴이 공개 이미지·메타데이터에서 발견되지 않았다. |
| 필수 | `.env` 포함 여부 | 미발견 | 검사 대상 레이어에서 `.env`, `.env.local`, `.env.production` 등 환경변수 파일이 발견되지 않았다. |
| 필수 | Docker Layer 기록 | 미발견 | 각 레이어와 빌드 이력에서 운영 Secret을 찾지 못했다. 현재 Dockerfile에도 Secret을 COPY한 뒤 삭제하거나 `RUN export`로 전달하는 흐름이 없다. |
| 필수 | Build ARG / ENV | 공개 키 포함 | 프런트엔드 빌드에 `VITE_KAKAO_MAP_KEY`를 사용한다. 서버 Secret은 빌드 인자로 전달하지 않는다. |
| 필수 | `.dockerignore` | 보완 필요 | 현재 환경변수 파일 제외는 작동하지만 중첩 경로, 인증파일, 개인 설정, DB 덤프 등을 폭넓게 제외하는 규칙은 부족하다. |
| 필수 | Actions Secret 출력 | 미발견 | 게시 실행 3건의 로그에서 대조한 운영 비밀값과 검사한 토큰 패턴이 탐지되지 않았다. 현재 workflow에 Secret 값을 그대로 출력하는 명령도 발견하지 못했다. |
| 필수 | 실제 데이터 포함 여부 | 미발견 | 샘플 코스 SQL과 테스트용 데이터는 있지만 운영 사용자 데이터, DB 덤프·백업은 발견되지 않았다. |
| 중요 | Private Key / 인증서 | 실제 사설키 미발견 | 탐지 후보는 npm·dotenv 문서의 `...`·`XXXX` 예시와 같은 예시가 담긴 compile cache였다. 시스템 CA 인증서는 기본 이미지의 정상 구성이다. |
| 중요 | 서비스 계정 파일 | 미발견 | 검사한 인증파일 이름과 서비스 계정 JSON 패턴이 발견되지 않았다. |
| 중요 | 불필요한 파일 COPY | 보완 필요 | 서버의 `COPY . .` 때문에 테스트, 초기 SQL, Dockerfile, `.dockerignore`도 `/app`에 들어간다. |
| 중요 | Container 권한 | 보완 필요 | 실제 Node 서버는 root로 실행된다. Nginx master도 root다. PostgreSQL 프로세스는 UID 70으로 실행된다. |
| 중요 | Port 공개 | 현재 배포 양호 | 운영 호스트에는 Nginx `127.0.0.1:8090`만 연결된다. API 3000·DB 5432는 호스트에 publish되지 않는다. 개발·기존 Compose에는 별도 보완점이 있다. |

### Kakao JavaScript 키의 공개

`VITE_KAKAO_MAP_KEY`는 웹 이미지의 HTML과 공개 provenance에서 확인됐다. [client/index.html](../../client/index.html)의 지도 SDK URL에 들어가는 브라우저용 키다. 실제 서버용 `KAKAO_REST_API_KEY`와 값이 다름도 확인했다.

GitHub Secret에 보관하더라도 브라우저에 전달하는 HTML에 넣으면 공개된다. 이 키를 비공개 이미지에 넣는 것만으로 브라우저 노출을 막을 수는 없다. Kakao 지도 가이드의 JavaScript 키 사용 흐름에 맞는 공개이지만, 콘솔에서 키 종류와 허용 도메인을 확인해야 한다. 콘솔 설정은 이번에 조회하지 않았다.

앞으로 서버용 키·DB 비밀번호를 `VITE_*`나 build ARG에 추가해서는 안 된다. 빌드 중 비밀값이 필요하다면 BuildKit secret mount를 검토한다. 공개 provenance도 검사 대상에 포함해야 한다.

### 포함된 파일과 실행 권한

- [server/Dockerfile](../../server/Dockerfile)의 `COPY . .`로 `tests/health.test.js`, `src/db/schema.sql`, `src/db/seed.sql` 등이 들어간다. seed는 샘플 코스 10개를 위한 것이며 실제 즐겨찾기·이력 데이터가 아니다. 테스트의 DB 접속정보도 테스트용 더미값이다.
- 서버 이미지에 `USER` 지시가 없으며 실제 Node 프로세스도 UID 0이었다. 이 문제는 Secret 유출과 별개의 실행 권한 보완 항목이다.
- 세 운영 컨테이너 모두 `privileged`가 꺼져 있고 Docker socket 마운트는 없었다. Nginx worker는 비root로 실행되지만 master의 root 실행까지 해소한 상태는 아니다.
- [docker-compose.dev.yml](../../docker-compose.dev.yml)은 고정 개발 인증정보와 `5432:5432`를 사용한다. [기존 docker-compose.yml](../../docker-compose.yml)의 Nginx도 호스트 주소를 제한하지 않는다. 현재 GHCR 배포 Compose의 loopback 제한과 혼동하지 않는다.

## 5. 왜 바로 수정하지 않았는가

현재 목적은 실제 사용자에게 운영 서비스를 제공하는 것이 아니라, 구현·배포 경험과 동작하는 결과를 포트폴리오 링크로 보여주는 것이다. 사용자는 이미지 공개를 유지하고 이번 결과를 향후 개선 근거로 남기기로 했다.

점검에서 즉시 대응할 운영 Secret·개인 데이터 유출은 발견되지 않았다. 확인된 root 실행, 넓은 파일 복사 범위, 제외 규칙의 부족은 남은 보완 항목으로 기록한다. 이미 비밀값이 유출됐는데 포트폴리오라는 이유로 조치를 미루는 상황과는 구분한다.

비root 실행은 파일 권한과 Nginx 포트·임시 디렉터리 설정까지 확인해야 하고, COPY 범위를 줄이면 실행에 필요한 파일의 누락 여부를 검증해야 한다. 현재 데모의 동작·배포·복구 흐름을 바꾸는 구현과 운영 검증은 별도 작업으로 진행한다. 이번 요청은 확인한 사실과 판단을 문서로 보존하는 범위다.

포트폴리오 용도도 외부 요청과 API 사용이 가능한 공개 환경이라는 사실은 유지된다. 공개 유지 결정이 무위험 판정이나 실제 서비스 운영을 위한 보안 승인이라는 뜻은 아니다. 현재 남은 위험을 인지한 상태에서 적용을 유예한 결정이다.

따라서 이번에는 이미지 공개 범위, Dockerfile, Compose, workflow, 환경변수·Secret, DB와 실행 중인 컨테이너를 변경하지 않았다.

## 6. 나중에 보완한다면

아래 항목은 **미구현 후속 작업**이다. Docker·보안·환경 설정 변경은 저장소의 사용자 확인 절차를 따른다.

| 순서 | 보완 항목 | 수정 위치·방식 | 완료 확인 |
| --- | --- | --- | --- |
| 1 | 서버 비root 실행 | `server/Dockerfile`에서 기본 이미지의 `node` 사용자 활용과 파일 소유권을 검토한다. | 실제 Node 프로세스 UID가 0이 아니며 DB 연결·API·배포 health가 정상이다. |
| 2 | COPY 범위 축소 | 서버 실행에 필요한 파일·디렉터리를 명시적으로 복사하고 테스트·빌드 설정·불필요한 SQL을 제외한다. | 새 이미지의 파일 목록에 제외 대상이 없고 실행에 필요한 파일은 유지된다. DB 초기화용 release 파일 공급도 유지된다. |
| 3 | 민감파일 제외 강화 | 루트·서버 `.dockerignore`에 중첩 `.env*`, `.git`, 개인 설정, 인증파일, 사설키, 백업·덤프 제외를 추가한다. `.gitignore`의 `.env.production` 등도 함께 검토한다. | 민감파일 형태의 안전한 더미 파일로 build context 제외를 확인하고 최종 이미지와 레이어를 다시 검사한다. |
| 4 | 개발·기존 포트 제한 | 개발 DB와 기존 Nginx의 호스트 바인딩을 필요한 경우 `127.0.0.1`로 제한한다. | 개발 도구 접속이 유지되고 불필요한 LAN 접근이 차단된다. 현재 배포 Compose의 제한도 유지된다. |
| 5 | Nginx 비root 검토 | 비root 구성에 맞게 listen 포트, Compose 매핑, cache·PID·임시 디렉터리 권한을 함께 검토한다. | SPA·API 프록시·health가 정상이고 다른 Mac 프로젝트의 포트와 충돌하지 않는다. |
| 6 | CI 검사 자동화 | 이미지 게시 전 Secret 검사, 게시 후보 이미지·레이어 검사, 의존성·기본 이미지 취약점 검사를 추가한다. | 탐지 결과를 로그에 비밀값 없이 기록하고 실패 시 게시를 차단한다. 공개 키·문서 예시의 예외는 좁게 관리한다. |
| 7 | 외부 설정 확인 | Kakao 키 종류·허용 도메인·사용량 제한과 Cloudflare 접근·요청 제한을 확인한다. | 콘솔의 실제 적용값을 재조회하고 허용한 동작이 유지되는지 확인한다. |

실제 사용자를 받거나 개인정보·백업·서비스 계정 파일을 다루기 전, 또는 인증·빌드·배포 구조가 바뀔 때 재점검한다. 운영 Secret 유출이 발견되면 현재의 유예 판단을 다시 적용하지 않고 키 교체·폐기와 노출된 이미지·로그·캐시 정리를 우선한다.

이미지 비공개 전환은 이번 후속 목록의 필수 조건이 아니다. 공개 상태를 유지하더라도 비밀값 분리와 최소 권한은 보완할 수 있다.

## 7. 한계와 문서 검증

- 결과는 2026.10.04 당시의 공개 SHA 태그 3개와 대응 로그에 한정한다. 이후 이미지·설정 변경에 자동으로 적용되지 않는다.
- 운영값 대조와 알려진 패턴 중심의 검사다. 임의 형식·다른 인코딩의 비밀값까지 완전히 검출한다고 보장하지 않는다.
- 의존성·기본 이미지 CVE, Git 전체 이력, Actions cache 전체, Cloudflare·Kakao 콘솔 설정은 이번 검사 범위에 포함하지 않았다.
- 정상 동작 중인 서비스를 중단하거나 공격 요청·실제 실패 rollback·재부팅을 수행하지 않았다.
- 본 작업의 새 변경은 Markdown 문서뿐이다. 애플리케이션 코드가 바뀌지 않아 lint/build·서버 문법 검사는 다시 실행하지 않았다.
- 문서 작성과 로컬 커밋은 사용자가 명시적으로 요청했다. 원격 push, PR 생성, main 반영과 새 배포는 이번 작업에 포함하지 않는다.

| 문서 검증 | 결과 |
| --- | --- |
| 점검 증거와 수치 대조 | 공개 SHA 3개, 플랫폼 이미지 12개, 고유 레이어 55개, 로그 실행 3건·파일 16개 일치 |
| UTF-8·상대 링크 | 변경 문서 5개 확인, 깨진 로컬 링크 없음 |
| 문서의 비밀값 검사 | 운영값 대조·검사 패턴의 탐지 없음 |
| Git 공백 검사 | 새 문서의 줄바꿈용 끝 공백을 제거한 뒤 `git diff --cached --check` 통과 |
| 커밋 범위 | 문서 5개만 stage, 애플리케이션·배포 설정 변경 없음 |

## 8. 참고 자료

- [Docker Build secrets](https://docs.docker.com/build/building/secrets/): 빌드 비밀값과 secret mount.
- [Docker Provenance attestations](https://docs.docker.com/build/metadata/attestations/slsa-provenance/): 공개 빌드 정보와 build ARG 노출.
- [Dockerfile EXPOSE](https://docs.docker.com/reference/dockerfile/#expose): `EXPOSE`와 실제 호스트 포트 publish의 차이.
- [Vite 환경변수](https://vite.dev/guide/env-and-mode): `VITE_*` 값의 빌드 결과물 포함.
- [Kakao 지도 Web API 가이드](https://apis.map.kakao.com/web/guide/): JavaScript 키와 도메인 설정.

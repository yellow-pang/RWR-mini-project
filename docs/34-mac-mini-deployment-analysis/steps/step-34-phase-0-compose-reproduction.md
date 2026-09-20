# Step 34. Phase 0 Mac mini + OrbStack Compose 재현 검증

- 검증일: 2026-09-20
- 브랜치: `chore/34-mac-mini-deployment-analysis`
- 기준 커밋: `dd32ed5fe62b928993e6c1f5a7153b86bddc0967`
- Compose project: `rwr-phase0`
- 범위: 저장소와 `.env`를 수정하지 않은 baseline build, 실행, DB 초기화, API, localhost UI 검증과 발견된 UI blocker의 최소 수정
- 결과: **baseline 인프라·DB·API 통과, 환경 차이와 UI blocker 확인, 최소 수정 후 주소 기반 순환 코스까지 통과**

## 1. 실행 환경

| 항목 | 확인 결과 |
| --- | --- |
| Mac host | `arm64` |
| Docker context | `orbstack` |
| Docker Engine | 29.4.0, Linux arm64 |
| Docker Compose | v5.1.2 |
| 필수 환경변수 | 9개 이름이 모두 존재함. 값은 출력하거나 문서화하지 않음 |
| 기존 `rwr-phase0` 리소스 | 실행 전 컨테이너, 이미지, volume 없음 |
| baseline build 전 저장소 변경 | 없음 |

Compose 해석은 성공했다. Compose v5는 루트 `version: "3.9"` 키가 더 이상 필요하지 않다는 경고를 출력했지만 실행을 막지는 않았다.

## 2. Build와 컨테이너 실행

현재 `client/Dockerfile`, `server/Dockerfile`, `docker-compose.yml`, `nginx/nginx.conf`를 그대로 사용해 build와 `up -d`가 성공했다.

| 서비스 | 이미지 | 아키텍처 | 실행 상태 | host publish |
| --- | --- | --- | --- | --- |
| nginx | `rwr-phase0-nginx:latest` | arm64 | Up | `0.0.0.0:8090`과 `[::]:8090` |
| server | `rwr-phase0-server:latest` | arm64 | Up | 없음, Compose 내부 `3000/tcp`만 사용 |
| db | `postgres:16-alpine` | arm64 | Up, healthy | 없음, Compose 내부 `5432/tcp`만 사용 |

현재 Compose는 Mac arm64에서 에뮬레이션 없이 세 이미지를 실행할 수 있다. nginx 포트가 loopback에 한정되지 않고 모든 host interface에 공개되는 기존 동작도 그대로 재현됐다.

Build 중 확인된 후속 항목은 다음과 같다.

- `npm ci --only=production`은 `--omit=dev` 사용을 권고한다.
- server 의존성 검사에서 moderate 3건, high 1건이 보고됐다.
- client build 의존성 검사에서 moderate 2건, high 6건이 보고됐다.
- 루트와 server에 `.dockerignore`가 없어 build context 제외 규칙이 적용되지 않았다.

위 항목은 Phase 0에서 수정하지 않았으며 Phase 1 검토 대상으로 남긴다.

## 3. PostgreSQL 초기화

새 named volume `rwr-phase0_rwr_postgres_data`가 생성됐고 entrypoint가 현재 SQL 파일을 순서대로 실행했다.

- `01-schema.sql`: `courses`, `favorites`, `history` 테이블과 인덱스 생성 성공
- `02-seed.sql`: 코스 10건 삽입 성공
- `\dt`: 테이블 3개 확인
- `SELECT COUNT(*) FROM courses`: 10 확인
- DB healthcheck: healthy

OrbStack이 검증 중 한 번 `Stopped` 상태가 됐다. `orbctl start` 후 `restart: unless-stopped` 설정에 따라 세 컨테이너가 자동으로 다시 실행됐고, PostgreSQL은 기존 volume을 인식해 재초기화하지 않았다. volume의 데이터도 유지됐다.

## 4. nginx 경유 API 계약

모든 요청은 host에 직접 공개되지 않은 server 3000 대신 `http://127.0.0.1:8090/api`를 통해 실행했다.

| 계약 | HTTP | 결과 |
| --- | ---: | --- |
| health | 200 | `success: true` |
| `route-001` 저장 코스 조회 | 200 | `success: true`, 코스 ID 일치 |
| 조건 기반 랜덤 코스 | 200 | `success: true`, seed 코스 반환 |
| 즐겨찾기 생성 | 201 | 생성 성공 |
| 즐겨찾기 조회 | 200 | `route-001` 포함 |
| 즐겨찾기 삭제 | 200 | 삭제 성공 |
| 삭제 후 재조회 | 200 | 빈 목록 확인 |

처음 sandbox 내부 `curl`은 OrbStack의 localhost 포트에 접근할 수 없었다. 동일 요청을 host 네트워크에서 실행하자 성공했으므로 애플리케이션 장애가 아니라 실행 도구의 네트워크 격리로 분류했다.

## 5. localhost UI 계약

Safari에서 실제 localhost UI를 확인했다.

통과한 항목:

- SPA 첫 화면 렌더링
- 즐겨찾기와 최근 추천 이력 화면 이동
- `/favorites` 직접 새로고침 시 nginx SPA fallback 동작
- `/courses/route-001` 직접 접근과 DB 저장 코스 상세 렌더링
- Kakao 우편번호 위젯 로드
- 공개 주소 검색과 검색 결과 표시

실패한 항목:

- 검색 결과에서 주소를 선택한 뒤 `POST /api/locations/geocode`가 HTTP 403을 반환했다.
- 화면에는 `CORS origin is not allowed`가 표시됐다.
- 현재 `.env`의 `CORS_ORIGIN`에는 `http://localhost:8090`과 `http://127.0.0.1:8090`이 모두 등록돼 있지 않다. 실제 값은 출력하거나 기록하지 않았다.
- CORS preflight도 두 localhost origin에서 각각 403을 반환했다.

읽기 요청은 브라우저가 같은 origin GET에 `Origin` 헤더를 보내지 않아 동작할 수 있지만, JSON POST 요청은 `Origin` 검사를 통과해야 한다. 따라서 첫 화면과 목록 조회 성공만으로 주소 기반 핵심 흐름이 정상이라고 판단할 수 없다.

사용자 확인 후 `.env` 파일은 수정하지 않고 Phase 0 server 컨테이너에만 `CORS_ORIGIN=http://127.0.0.1:8090`을 일회성으로 주입해 다시 검증했다. Windows 운영 배포용으로 작성된 현재 `.env`에서 로컬 개발 origin이 빠졌을 가능성이 있으므로, 이를 고정된 운영 요구사항이 아니라 환경별로 수정 가능한 설정으로 분류한다.

일회성 보정 후 결과:

- 동일한 주소 선택 요청 `POST /api/locations/geocode`가 HTTP 200을 반환했다.
- 응답에는 유효한 위도와 경도가 포함됐다.
- 같은 요청을 직접 실행해도 HTTP 200과 `success: true`를 확인했다.
- 응답 직후 Safari에서 React가 렌더링하던 페이지 영역이 비어 주소 표시, 지도 표시, 코스 생성까지 진행할 수 없었다.
- nginx/server 로그에는 해당 요청의 200만 기록됐고 server 오류는 없었다.
- Safari JavaScript 콘솔을 일시적으로 활성화해 오류를 재현했고, 확인 후 개발자 메뉴 설정을 원래대로 복구했다.

Safari 콘솔에서 지도 SDK 요청의 HTTP 401과 `window.kakao.maps.load` 접근 `TypeError`를 확인했다. 현재 JavaScript 지도 키와 REST 키는 서로 다른 값이므로 키 종류를 잘못 복사한 상태는 아니다. 과거 Step 16 문서에는 지도 SDK 허용 도메인으로 `http://localhost:5173`과 운영 hostname만 기록돼 있으며, 이번 검증 origin인 `http://127.0.0.1:8090`은 포함되지 않는다.

우편번호 스크립트도 `window.kakao` 객체를 생성한다. 기존 `MapView`는 `window.kakao` 존재 여부만 검사해 지도 SDK가 401로 로드되지 않은 상태를 정상으로 오인했고, 주소 좌표가 설정되자 존재하지 않는 `window.kakao.maps.load`를 호출해 React 화면이 비었다.

### 5.1 UI blocker 최소 수정

`client/src/components/MapView.jsx`의 SDK 판정을 실제 호출 계약인 `window.kakao.maps.load` 함수 존재 여부로 변경했다. 지도 SDK를 쓸 수 없으면 기존 설계대로 `MapPreview` SVG fallback을 렌더링한다. API 응답, 코스 생성, DB 구조는 변경하지 않았다.

수정 후 검증:

- Docker Node 20 builder의 Vite production build 통과
- 임시 Node 20 컨테이너의 client lint 통과
- 브라우저 cache를 우회해 새 bundle을 로드한 뒤 같은 주소 선택 성공
- 선택 주소와 좌표가 화면 상태에 반영됨
- 지도 SDK 401 상황에서 빈 화면 대신 SVG 코스 프리뷰 표시
- 걷기·1km 조건의 ORS 순환 코스 생성 성공
- `/result`에서 약 0.9km 주소 기준 코스와 예상 시간 표시

실제 Kakao 지도 표시는 localhost origin을 Kakao Developers 설정에 추가하거나 최종 운영 hostname으로 접속할 때 별도로 확인한다. 외부 허용 도메인 문제는 Docker/arm64 재현 실패와 구분한다.

## 6. Phase 0 판정

| 완료 조건 | 결과 |
| --- | --- |
| 저장소 파일 변경 없이 build | 통과 |
| nginx, server, db 실행과 DB healthy | 통과 |
| schema 3개와 seed 10건 | 통과 |
| health, 코스 조회, 랜덤 추천, 즐겨찾기 CRUD | 통과 |
| localhost 주요 화면과 SPA fallback | 통과 |
| 주소 선택 후 geocoding API | 일회성 CORS 보정에서 통과 |
| 주소 선택 결과와 SDK 실패 fallback | 최소 수정 후 통과 |
| 주소 기반 순환 코스 생성 | 통과 |
| 실제 Kakao 지도 | 확인 필요: localhost SDK 요청 401, 운영 hostname에서 재검증 |
| 세 컨테이너 arm64 실행 | 통과 |

현재 코드를 수정하지 않은 baseline 결과와 최소 수정 후 결과를 분리해 기록했다. Phase 0의 Mac arm64 Compose, DB, API, 로컬 UI 핵심 계약은 확인됐으며 실제 Kakao 지도만 외부 허용 도메인 확인 항목으로 남는다.

현재 `.env`는 Windows 운영 배포에서 옮긴 값이며 이후 Mac 개발·운영 환경에 맞게 변경 가능한 대상으로 관리한다. 실제 값이나 API key는 저장소 문서에 기록하지 않는다.

## 7. 유지 중인 검증 리소스

Master Plan 지침에 따라 아래 리소스는 결과 검토 전까지 삭제하지 않았다.

- `rwr-phase0-nginx-1`
- `rwr-phase0-server-1`
- `rwr-phase0-db-1`
- `rwr-phase0_rwr-network`
- `rwr-phase0_rwr_postgres_data`
- `rwr-phase0-nginx:latest`
- `rwr-phase0-server:latest`

`docker compose down -v`, volume 삭제, image prune은 실행하지 않았다.

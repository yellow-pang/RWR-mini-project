# PR #08. 이동 유형 타입 인코딩 보정

> 관련 작업 계획서: [docs/plans/plan-08-db-integration-verification.md](../plans/plan-08-db-integration-verification.md)  
> 관련 Step 문서: [docs/steps/step-08-db-integration-verification.md](../steps/step-08-db-integration-verification.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `fix/course-type-encoding` |
| 병합 대상 | `main` |
| 상태 | 진행 중 |

---

## PR 제목

```text
[Step 08] 이동 유형 type 인코딩 보정
```

---

## 개요

홈 화면에서 이동 유형을 선택해 추천을 요청할 때 `type` 값이 깨진 문자열로 전송되어 서버 검증 오류가 발생했다. 이를 해결하기 위해 내부/API/DB 저장 값은 ASCII enum으로 통일하고, 사용자 화면과 오류 메시지는 한글로 유지했다.

---

## 주요 변경 사항

| 구분 | 내용 |
| --- | --- |
| 프론트 옵션 | `TYPE_OPTIONS.value`를 `walk`, `jogging`, `running`으로 변경 |
| 화면 표시 | `courseDisplay.js`에서 ASCII enum을 한글 라벨로 변환 |
| 서버 상수 | `server/src/constants/courseValues.js`에 이동 유형 enum 추가 |
| 서버 검증 | `/api/courses/random`의 `type` 검증을 ASCII enum 기준으로 변경 |
| 기존 DB 호환 | `coursesService`에서 ASCII 값과 기존 한글 DB 값을 함께 조회 |
| DB 스키마 | 신규 DB용 `type`, `mood` CHECK 값을 ASCII enum으로 변경 |
| DB seed | 신규 DB용 seed의 `type`, `mood` 값을 ASCII enum으로 변경 |
| 문서 | 데이터 명세와 Step 08 검증 문서 갱신 |

---

## 변경 전/후 API 예시

변경 전:

```text
GET /api/courses/random?distance=3&time=30&type=%3F%D1%89%EB%96%87
```

변경 후:

```text
GET /api/courses/random?distance=3&time=30&type=jogging
```

---

## 기능 보존 체크리스트

| 기능 | 보존 여부 |
| --- | --- |
| 거리 선택 | 보존 |
| 소요 시간 선택 | 보존 |
| 이동 유형 선택 | 보존 |
| 추천 API 호출 | 보존 |
| 다시 추천 | 보존 |
| 결과 카드의 한글 타입 표시 | 보존 |
| 상세 화면의 한글 타입 표시 | 보존 |
| 즐겨찾기/최근 목록의 한글 타입 표시 | 보존 |
| 서버 validation 오류 메시지 | 한글로 유지 |
| 기존 한글 type DB 데이터 조회 | 호환 처리 |

---

## 검증 방법

실행 위치: `C:\Dev\RWR-mini-project\client`

```powershell
npm run lint
npm run build
```

실행 위치: `C:\Dev\RWR-mini-project\server`

```powershell
node -e "require('./src/app'); console.log('server app loaded')"
```

깨진 문자열 검색:

```powershell
rg "嫄룰린|議곌퉭|\?щ떇" client/src server/src
```

확인 결과:

```text
client eslint 성공
client vite build 성공
server app loaded
깨진 타입 문자열 미검출
```

---

## 제외 범위

| 제외 항목 | 사유 |
| --- | --- |
| Docker/PostgreSQL 통합 실행 | 이번 작업에서는 코드 보정과 정적 검증 중심으로 진행 |
| 기존 DB 데이터 마이그레이션 | 기존 한글 type 조회 호환으로 우선 대응 |
| 로그인/지도/GPS/공유 등 MVP 외 기능 | 요청 범위 밖 |
| 커밋/push/PR 생성 | 사용자 확인 후 진행 |

---

## 리뷰어 참고

- 새 DB를 초기화하면 `courses.type`은 `walk/jogging/running`, `courses.mood`는 `park/river/city/forest`로 저장된다.
- 기존 Docker 볼륨에 한글 `type` 값이 남아 있어도 추천 조회는 호환된다.
- 화면에 노출되는 문구는 계속 한글이며, 사용자는 내부 enum을 보지 않는다.

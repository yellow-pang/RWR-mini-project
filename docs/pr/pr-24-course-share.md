# PR #24. 코스 공유 기능 추가

> 관련 작업 계획서: [docs/plans/plan-24-course-share.md](../plans/plan-24-course-share.md)  
> 관련 Step 문서: [docs/steps/step-24-course-share.md](../steps/step-24-course-share.md)

---

## 브랜치 정보

| 항목        | 값                          |
| ----------- | --------------------------- |
| 작업 브랜치 | `feat/step-24-course-share` |
| 병합 대상   | `dev`                       |
| 상태        | 완료                        |

---

## PR 제목

```text
[Step 24] 코스 공유 기능 추가
```

---

## 개요

코스 상세 화면에 공유 버튼을 추가했다.

사용자가 코스 상세 화면에서 공유 버튼을 누르면, Web Share API 지원 환경에서는 브라우저/OS 기본 공유창을 호출한다. Web Share API 미지원 또는 호출 실패 시에는 Clipboard API로 공유 URL을 복사하고 성공 안내 메시지를 표시한다.

저장된 DB 코스는 `/detail/:id` 딥링크를 공유한다. 생성형 ORS 코스는 아직 안정적인 복원 ID가 없으므로 코스 요약 문구와 서비스 URL을 공유하고, 즐겨찾기 버튼은 노출하지 않는다.

기존 상세 경로 `/courses/:id`는 유지하고, 공유용 딥링크로 `/detail/:id` 라우트 alias를 추가했다. 이 과정에서 Step 23 이후 틀어진 상세/결과 화면 버튼, 운동 유형 아이콘, 상세 정보 섹션 아이콘도 함께 보정했다.

---

## 변경 파일 목록

| 구분 | 파일                                 | 변경 내용                                             |
| ---- | ------------------------------------ | ----------------------------------------------------- |
| 수정 | `client/src/App.jsx`                 | `/detail/:id` 상세 라우트 alias 추가                  |
| 수정 | `client/src/pages/DetailPage.jsx`    | 공유 버튼, 공유 처리 핸들러, 공유 성공/실패 안내 추가 |
| 수정 | `client/src/pages/HomePage.jsx`      | 운동 유형별 아이콘 표시 기준 통일                     |
| 수정 | `client/src/pages/ResultPage.jsx`    | 결과 조건 요약의 운동 유형 아이콘 보정                |
| 수정 | `client/src/components/CourseCard.jsx` | 생성형 코스 카드에서 즐겨찾기 숨김 및 상세 버튼 폭 보정 |
| 수정 | `client/src/components/CourseCard.css` | 단일 액션 버튼 레이아웃 추가                         |
| 수정 | `client/src/components/CourseInfo.jsx` | 코스 소개/추천 이유/주의사항/준비 팁 아이콘 보정     |
| 수정 | `client/src/components/Icon.jsx`     | 공유/하단 탭/상세 정보용 outline 아이콘 추가          |
| 수정 | `client/src/components/TabBar.jsx`   | 홈/즐겨찾기/이력 탭 아이콘 보정                       |
| 수정 | `client/src/utils/courseDisplay.js`  | 운동 유형별 아이콘 매핑 유틸 추가                     |
| 신규 | `client/src/utils/share.js`          | Web Share API + Clipboard fallback 공유 유틸 추가     |
| 수정 | `client/src/index.css`               | 상세 헤더 액션 버튼 레이아웃과 공유 버튼 스타일 추가  |
| 수정 | `client/index.html`                  | 서비스 공통 description/OG 메타 태그 추가             |
| 수정 | `docs/01-overview.md`                | 코스 공유 기능 보정 기록 추가                         |
| 수정 | `docs/03-requirements.md`            | 코스 공유 요구사항 보정 기록 추가                     |
| 신규 | `docs/plans/plan-24-course-share.md` | Step 24 작업 계획서 작성                              |
| 신규 | `docs/pr/pr-24-course-share.md`      | PR 문서 작성                                          |
| 신규 | `docs/steps/step-24-course-share.md` | Step 완료 문서 작성                                   |

---

## 변경 이유

RWR은 추천 코스를 확인하고 저장할 수 있지만, 코스를 다른 사람에게 전달하는 공식 공유 기능이 없었다.

모바일 브라우저에서는 Web Share API를 통해 카카오톡, 문자, SNS 등 OS 기본 공유창을 사용할 수 있고, PC나 미지원 브라우저에서는 클립보드 복사로 링크를 전달할 수 있다. 두 방식을 조합하면 별도 유료 API 없이 반응형 웹과 향후 WebView 앱 확장에 모두 대응할 수 있다.

---

## 동작 설명

- DB 코스 상세 화면에서 헤더 오른쪽에 즐겨찾기 버튼과 공유 버튼을 표시한다.
- 생성형 ORS 코스 상세 화면에서는 공유 버튼만 표시하고 즐겨찾기 버튼은 숨긴다.
- 공유 버튼 클릭 시 공유 payload를 생성한다.
- DB 코스 공유 URL은 `window.location.origin` 기준 `/detail/:id`로 생성한다.
- 생성형 ORS 코스는 코스명, 거리, 시간 요약 문구와 서비스 URL을 공유한다.
- `navigator.share`가 있으면 Web Share API를 먼저 호출한다.
- Web Share API 미지원 또는 실패 시 `navigator.clipboard.writeText`로 공유 URL을 복사한다.
- 클립보드 복사 성공 시 `코스 링크가 클립보드에 복사되었습니다!` 안내를 표시한다.

---

## UI 보정

- 걷기/조깅/러닝 아이콘을 각각 발자국, 심박/펄스, 러너 아이콘으로 구분했다.
- 상세 화면의 코스 소개, 추천 이유, 주의사항, 준비 팁 아이콘을 outline 계열로 정리했다.
- 주의사항은 삼각형 느낌표 아이콘으로 변경했다.
- 하단 탭의 홈, 즐겨찾기, 이력 아이콘을 채색 없는 outline 스타일로 맞췄다.
- 생성형 ORS 코스 결과 카드에서는 즐겨찾기 버튼을 숨기고 `상세 보기` 버튼이 전체 폭을 사용하도록 보정했다.
- 주소 기반 생성형 코스의 즐겨찾기는 기존 DB 코스 즐겨찾기와 목적이 달라질 수 있어 후속 단계에서 기능 정책을 다시 정의한다.

---

## Open Graph

이번 단계에서는 코스별 동적 OG 태그는 추가하지 않았다. 현재 앱은 Vite SPA이므로 SNS 크롤러가 클라이언트 렌더링 이후의 코스별 데이터를 안정적으로 읽는다고 보장하기 어렵다.

대신 `client/index.html`에 서비스 공통 description/OG 메타 태그를 추가했다. 코스별 미리보기 카드는 향후 서버 렌더링, pre-render, 공유 전용 preview endpoint 등을 검토할 때 확장한다.

---

## 검증

```powershell
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
```

| 항목                 | 결과                               |
| -------------------- | ---------------------------------- |
| 클라이언트 Lint      | 성공                               |
| 클라이언트 Build     | 성공                               |
| `/detail/:id` 라우트 | 확인                               |
| 생성형 코스 공유 버튼 | 확인                               |
| 생성형 코스 상세 버튼 폭 | 확인                               |
| 상세/탭 아이콘 보정 | 확인                               |
| Clipboard fallback   | 확인 필요                          |
| 모바일 Web Share API | 실제 모바일 브라우저에서 확인 필요 |

---

## 후속 작업

- 실제 모바일 Safari/Chrome에서 Web Share API 공유창 동작 확인
- PC 브라우저에서 Clipboard API fallback 동작 확인
- 주소 기반 생성형 코스 저장/즐겨찾기 정책 재정의
- 생성형 ORS 코스 저장 정책이 정리되면 `/detail/:id` 딥링크 공유 지원 검토
- 코스별 OG preview가 필요하면 서버 렌더링 또는 공유 전용 endpoint 검토

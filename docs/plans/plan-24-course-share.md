# 작업계획서 - Step 24: 코스 공유 기능 추가

> **상태**: 구현 완료  
> **작성일**: 2026.06.01  
> **브랜치**: `feat/step-24-course-share`  
> **목적**: 코스 상세 페이지에서 사용자가 추천 코스를 Web Share API 또는 클립보드 복사 fallback으로 쉽게 공유할 수 있도록 한다.  
> **관련 문서**: [step-23-postcode-address-selection.md](../steps/step-23-postcode-address-selection.md) | [pr-23-postcode-address-selection.md](../pr/pr-23-postcode-address-selection.md)

---

## 1. 작업 배경

RWR은 사용자가 거리, 시간, 운동 유형, 출발 위치를 기준으로 오늘의 걷기/러닝 코스를 추천받는 반응형 웹 서비스다. 현재 사용자는 추천 결과와 상세 페이지에서 코스 정보를 확인할 수 있지만, 코스를 다른 사람에게 전달하는 공식 공유 기능은 없다.

모바일 브라우저에서는 OS 공유 시트를 사용하면 카카오톡, 문자, SNS 등으로 자연스럽게 공유할 수 있다. PC나 일부 미지원 브라우저에서는 Web Share API가 동작하지 않으므로 클립보드 복사 fallback이 필요하다.

Step 24에서는 백엔드 API 추가 없이 프론트엔드 표준 웹 API만 사용해 공유 기능을 구현한다. 향후 하이브리드 앱(WebView) 패키징 가능성을 고려해 기능 탐지와 예외 처리를 명확히 한다.

---

## 2. 최종 목표

코스 상세 페이지(`DetailPage`)에 공유 버튼을 추가한다.

```text
[뒤로]          코스 상세          [저장] [공유]
```

사용자가 공유 버튼을 누르면:

1. Web Share API 지원 환경에서는 `navigator.share()`를 호출한다.
2. Web Share API 미지원 환경 또는 공유 실패/취소 상황에서는 클립보드 복사를 시도한다.
3. 클립보드 복사 성공 시 `코스 링크가 클립보드에 복사되었습니다!` 안내를 표시한다.
4. 모든 공유 수단이 실패하면 사용자가 이해할 수 있는 오류 메시지를 표시한다.

---

## 3. 결정 사항

| 항목                 | 결정                                         | 이유                                                                       |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------------- |
| 구현 범위            | 프론트엔드 단독                              | 공유는 브라우저 내장 API로 처리 가능하며 서버 변경이 불필요함              |
| 1순위 공유           | Web Share API                                | 모바일 브라우저와 향후 WebView 앱 확장에 적합함                            |
| fallback             | Clipboard API                                | PC/미지원 브라우저에서도 무료로 공유 링크 전달 가능                        |
| 공유 버튼 위치       | DetailPage 헤더의 즐겨찾기 버튼 옆           | 코스 상세를 확인한 직후 공유 행동이 자연스러움                             |
| 공유 URL             | `/detail/:id` 딥링크                         | 요구사항의 딥링크 형식을 따른다                                            |
| 기존 상세 URL        | `/courses/:id` 유지                          | 기존 내부 이동과 북마크 호환을 깨지 않음                                   |
| 생성형 ORS 코스 공유 | 코스 요약 문구 + 서비스 URL 공유             | 생성형 코스는 DB에 영속 ID가 없으므로 딥링크 대신 현재 서비스 진입 URL 사용 |
| OG 태그              | 기본 OG만 검토, 코스별 동적 OG는 제외        | Vite SPA에서 코스별 OG는 SSR/서버 렌더링 없이는 SNS 크롤러 대응이 제한적임 |

---

## 4. 요구사항 요약

- `DetailPage`에 공유 버튼을 추가한다.
- 공유 버튼은 기존 즐겨찾기 버튼 옆에 배치한다.
- 생성형 ORS 코스처럼 안정적인 상세 딥링크가 없는 경우 코스 요약 문구와 서비스 URL을 공유한다.
- 생성형 ORS 코스는 현재 즐겨찾기 목적과 맞지 않으므로 이번 단계에서는 공유 버튼만 표시하고 즐겨찾기 버튼은 숨긴다.
- Web Share API 지원 여부를 `navigator.share`로 기능 탐지한다.
- 지원 환경에서는 `navigator.share({ title, text, url })`를 호출한다.
- Web Share API 미지원, 호출 실패, 사용자 취소 등 예외 상황에서는 클립보드 복사를 시도한다.
- 클립보드 복사는 `navigator.clipboard.writeText()`를 우선 사용한다.
- 클립보드 복사 성공 시 명확한 안내를 표시한다.
- 클립보드 복사 실패 시 오류 안내를 표시한다.
- 백엔드 API, DB 스키마, Docker, `.env`는 변경하지 않는다.
- 함수형 컴포넌트와 Hooks만 사용한다.
- 컴포넌트에서 직접 외부 API를 호출하지 않는다. 단, Web Share API/Clipboard API는 브라우저 내장 API이므로 프론트엔드 유틸에서 호출한다.

---

## 5. UX 설계

### 5.1 버튼 배치

현재 `DetailPage` 헤더는 다음 구조다.

```text
[뒤로]          코스 상세          [즐겨찾기]
```

Step 24에서는 아래 구조로 바꾼다.

```text
[뒤로]          코스 상세          [즐겨찾기] [공유]
```

생성형 ORS 코스처럼 즐겨찾기가 비활성인 코스는 공유 가능 여부에 따라 아래 중 하나를 선택한다.

```text
[뒤로]          코스 상세          [공유]
```

또는 딥링크 복원이 불가능하면:

```text
[뒤로]          코스 상세          [빈 영역]
```

이번 Step에서는 생성형 ORS 코스도 공유 버튼은 표시하되, 즐겨찾기 버튼은 숨긴다. 생성형 코스 공유 URL은 `/detail/:id`가 아니라 서비스 진입 URL을 사용하고, 공유 문구에 코스명·거리·시간을 포함한다.

### 5.2 알림 방식

현재 앱은 `form-notice`, `form-error` 메시지를 페이지 내부 안내로 사용한다. Step 24에서는 별도 전역 토스트 시스템을 새로 만들지 않고, DetailPage 내부의 공유 안내 메시지를 먼저 사용한다.

권장 문구:

- 복사 성공: `코스 링크가 클립보드에 복사되었습니다!`
- 공유 실패: `코스 공유에 실패했습니다. 잠시 후 다시 시도해 주세요.`
- 지원 불가: `이 브라우저에서는 공유 기능을 사용할 수 없습니다.`

후속 단계에서 여러 화면 공통 토스트가 필요해지면 `ToastProvider` 또는 `useToast`로 확장한다.

### 5.3 공유 텍스트

공유 payload:

```js
{
  title: "RWR 오늘의 추천 러닝 코스",
  text: "이 코스 어때요? 함께 걸어봐요!",
  url: "https://[도메인]/detail/route-001"
}
```

운동 유형에 따라 제목을 조금 더 자연스럽게 만들 수 있다.

예:

- 걷기: `RWR 오늘의 추천 걷기 코스`
- 조깅: `RWR 오늘의 추천 조깅 코스`
- 러닝: `RWR 오늘의 추천 러닝 코스`

---

## 6. URL 및 라우팅 설계

### 6.1 현재 상태

현재 앱 상세 라우트는 다음과 같다.

```text
/courses/:id
```

`CourseCard`의 상세 보기 버튼도 `/courses/:id`로 이동한다.

### 6.2 Step 24 변경 계획

요구사항의 공유 URL 형식은 다음과 같다.

```text
/detail/:id
```

따라서 `App.jsx`에 `/detail/:id` 라우트를 추가하고 같은 `DetailPage`를 렌더링한다.

```text
/courses/:id  -> 기존 내부 이동 호환 유지
/detail/:id   -> 공유용 딥링크
```

공유 URL은 `window.location.origin` 기준으로 생성한다.

```js
new URL(`/detail/${courseId}`, window.location.origin).toString();
```

기존 내부 이동까지 `/detail/:id`로 바꿀지 여부는 구현 시점에 판단한다. 권장 방식은 기존 `/courses/:id`는 유지하고 공유 URL만 `/detail/:id`를 사용한다.

---

## 7. 기술 설계

### 7.1 공유 유틸

신규 파일 후보:

- `client/src/utils/share.js`

책임:

- 공유 가능 코스인지 판단하는 데 필요한 보조 함수
- 공유 URL 생성
- 공유 payload 생성
- Web Share API 호출
- Clipboard API fallback

예상 함수:

```js
export function buildCourseShareUrl(courseId) {}

export function buildCourseSharePayload(course) {}

export async function shareCourse(course) {}
```

### 7.2 Web Share API 흐름

```text
공유 버튼 클릭
→ courseId 확인
→ share payload 생성
→ navigator.share 존재 여부 확인
→ 있으면 navigator.share(payload) 호출
→ 성공 시 완료
→ 실패 또는 미지원이면 clipboard fallback
```

주의:

- 사용자가 공유 시트를 닫은 경우에도 Promise reject가 발생할 수 있다.
- 사용자 취소를 오류처럼 크게 표시하지 않도록 처리한다.
- 다만 요구사항상 실패/취소 시 fallback으로 안전하게 진입하도록 한다.

### 7.3 Clipboard fallback 흐름

```text
navigator.clipboard?.writeText(url)
→ 성공: form-notice 표시
→ 실패: form-error 표시
```

보안 주의:

- Clipboard API도 HTTPS 또는 localhost 같은 보안 컨텍스트에서 안정적으로 동작한다.
- 미지원 환경에 대한 구형 `document.execCommand("copy")` fallback은 이번 Step에서 제외한다.
  - 이유: 구현 복잡도 대비 효과가 낮고, 최신 브라우저 기준 Clipboard API로 충분하다.

### 7.4 DetailPage 상태

변경 대상:

- `client/src/pages/DetailPage.jsx`

추가 상태:

- `shareMessage`
- `shareErrorMessage`
- 필요 시 `isSharing`

또는 기존 `message`와 구분하기 위해 공유 전용 상태를 둔다.

권장:

- API 로딩/상세 조회 오류는 기존 `message`
- 공유 성공/실패는 `shareNotice` 또는 `shareMessage`

---

## 8. Open Graph 검토

요구사항에는 OG 태그 적용이 선택/권장 항목으로 포함되어 있다.

하지만 현재 RWR은 Vite 기반 SPA이며, 코스 상세 데이터는 클라이언트에서 로드된다. 카카오톡/SNS 크롤러는 JavaScript 실행 후 상태를 기다려주지 않을 수 있으므로, 코스별 동적 OG 태그를 클라이언트만으로 안정적으로 제공하기 어렵다.

이번 Step에서 가능한 범위:

- `client/index.html`에 서비스 공통 기본 OG 태그를 추가하는 것은 검토 가능
- 코스별 title/description/image 동적 OG는 제외

후속 단계 후보:

- 서버에서 `/detail/:id` 요청 시 HTML 메타 태그를 동적으로 내려주는 SSR 또는 pre-render 방식
- 공유 전용 정적 preview endpoint 추가
- 대표 이미지/서비스 로고 asset 정리

이번 Step 권장 결정:

- 공유 기능 구현을 우선한다.
- 기본 OG 태그 추가는 구현 중 파일/asset 상태를 확인한 뒤, 과한 변경이면 후속 작업으로 분리한다.

---

## 9. 예상 변경 파일

| 구분      | 파일                                 | 내용                                              |
| --------- | ------------------------------------ | ------------------------------------------------- |
| 수정      | `client/src/App.jsx`                 | `/detail/:id` 라우트 alias 추가                   |
| 수정      | `client/src/pages/DetailPage.jsx`    | 공유 버튼, 공유 상태 메시지, share handler 추가   |
| 수정      | `client/src/components/Icon.jsx`     | 공유 아이콘 추가                                  |
| 신규      | `client/src/utils/share.js`          | Web Share API + Clipboard fallback 공유 유틸      |
| 수정      | `client/src/index.css`               | DetailPage 헤더 액션 버튼/공유 메시지 스타일 조정 |
| 선택 수정 | `client/index.html`                  | 서비스 공통 OG 태그 추가 검토                     |
| 수정      | `docs/01-overview.md`                | 코스 공유 기능 보정 기록 추가                     |
| 수정      | `docs/03-requirements.md`            | 공유 기능 요구사항 기록 추가                      |
| 신규      | `docs/pr/pr-24-course-share.md`      | 구현 후 PR 문서                                   |
| 신규      | `docs/steps/step-24-course-share.md` | 구현 후 Step 문서                                 |

---

## 10. 제외 범위

| 항목                                | 사유                                                    |
| ----------------------------------- | ------------------------------------------------------- |
| 백엔드 공유 API                     | Web Share/Clipboard로 프론트엔드 단독 구현 가능         |
| 카카오 메시지 API                   | 유료/권한/템플릿 관리 부담이 있어 이번 요구와 맞지 않음 |
| 로그인 기반 공유                    | MVP/고도화 현재 범위를 벗어남                           |
| 공유 횟수 분석                      | 이벤트 수집/분석 설계가 필요하므로 후속 작업            |
| 생성형 ORS 코스 딥링크 공유         | 생성형 코스 저장 정책과 ID 설계가 필요함                |
| 코스별 동적 OG                      | SPA만으로 SNS 크롤러 대응이 안정적이지 않음             |
| 구형 execCommand clipboard fallback | 최신 브라우저 기준 대비 구현 복잡도 증가                |

---

## 11. 검증 항목

| 항목                | 확인 방법                                                          |
| ------------------- | ------------------------------------------------------------------ |
| 공유 버튼 표시      | DB 코스 DetailPage에서 즐겨찾기 버튼 옆 공유 버튼 확인             |
| Web Share 지원 분기 | 모바일 브라우저 또는 DevTools에서 `navigator.share` 지원 환경 확인 |
| Clipboard fallback  | PC Chrome에서 공유 버튼 클릭 후 클립보드 복사 안내 확인            |
| 공유 URL 형식       | 복사/공유 URL이 `/detail/:id`인지 확인                             |
| 딥링크 접근         | `/detail/route-001` 직접 접근 시 DetailPage 로드 확인              |
| 기존 상세 URL 유지  | `/courses/route-001` 직접 접근 시 DetailPage 로드 확인             |
| 공유 텍스트         | title/text/url payload 구성 확인                                   |
| 생성형 코스 처리    | ORS 생성 코스에서 공유 버튼만 표시하고 즐겨찾기 버튼은 숨김 확인   |
| 오류 처리           | Clipboard 실패 상황에서 오류 안내 표시 확인                        |
| lint                | `npm.cmd --prefix client run lint`                                 |
| build               | `npm.cmd --prefix client run build`                                |

---

## 12. 실제 개발 환경에서 이어가기 프롬프트

아래 프롬프트를 새 대화에 붙여 넣으면 Step 24 구현을 이어갈 수 있다.

```text
당신은 RWR: Run Walk Random 프로젝트를 돕는 AI 개발 에이전트입니다.

프로젝트 기준:
- React + Vite 클라이언트
- Node.js + Express API 서버
- PostgreSQL Docker DB
- 데이터는 PostgreSQL 기준이며, 정적 routeData.js나 즐겨찾기/이력 localStorage 배열 기준이 아닙니다.
- 사용자 식별은 localStorage의 rwr_user_id 익명 UUID를 사용합니다.

작업 전에 아래 문서를 읽어주세요:
1. docs/01-overview.md
2. docs/03-requirements.md
3. docs/06-data-spec.md
4. 현재 작업 기준 문서: docs/plans/plan-24-course-share.md
5. 이전 완료 상태: docs/steps/step-23-postcode-address-selection.md
6. 이전 PR 문서: docs/pr/pr-23-postcode-address-selection.md

작업 프로세스:
1. 요구사항과 최종 목표를 요약합니다.
2. git status로 미커밋 변경을 확인합니다.
3. 현재 브랜치가 feat/step-24-course-share 인지 확인합니다.
4. 코드 수정 전 plan-24 문서를 기준으로 구현 범위를 재확인합니다.
5. 사용자 승인 후 코드 수정과 검증을 진행합니다.
6. PR/Step 문서를 작성합니다.
7. 한글 Conventional Commit 메시지 초안을 제목과 본문으로 출력합니다.

핵심 제약:
- 함수형 컴포넌트 + Hooks만 사용합니다.
- 공유 기능은 백엔드 API 추가 없이 프론트엔드에서 구현합니다.
- Web Share API를 우선 사용하고, 미지원/실패 시 Clipboard API fallback을 사용합니다.
- 공유 URL은 `/detail/:id` 형식의 딥링크를 사용합니다.
- 기존 `/courses/:id` 상세 라우트는 호환 유지합니다.
- schema.sql, seed.sql, Docker 설정, .env 변경은 사용자 확인 후 진행합니다.
- GPS, 로그인, AI 추천 등 다른 기능은 임의로 추가하지 않습니다.
- git commit/push는 사용자가 직접 진행합니다.
- 한글 문서는 UTF-8 인코딩을 유지합니다.
- cmd 기반 명령을 우선 사용합니다.

오늘 할 작업:
- Step 24: 코스 공유 기능 추가
- DetailPage의 즐겨찾기 버튼 옆에 공유 버튼을 추가합니다.
- `/detail/:id` 라우트 alias를 추가하고 공유 URL은 이 경로로 생성합니다.
- Web Share API 지원 환경에서는 navigator.share를 호출합니다.
- 미지원 또는 실패 시 Clipboard API로 공유 URL을 복사합니다.
- 복사 성공/실패 안내 메시지를 표시합니다.
- 구현 후 docs/pr/pr-24-course-share.md, docs/steps/step-24-course-share.md를 작성합니다.
```

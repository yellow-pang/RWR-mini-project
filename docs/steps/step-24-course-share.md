# Step 24. 코스 공유 기능 추가

> 작성일: 2026.06.01  
> 브랜치: `feat/step-24-course-share`  
> 작업 계획서: [docs/plans/plan-24-course-share.md](../plans/plan-24-course-share.md)  
> 관련 PR 문서: [docs/pr/pr-24-course-share.md](../pr/pr-24-course-share.md)

---

## 1. 작업 목표

코스 상세 페이지에서 사용자가 추천 코스를 쉽게 공유할 수 있도록 공유 기능을 추가했다.

이번 단계는 백엔드 API 추가 없이 프론트엔드 표준 웹 API만 사용한다. Web Share API를 우선 사용하고, 지원하지 않는 브라우저나 실패 상황에서는 Clipboard API로 공유 링크를 복사한다.

---

## 2. 중요 변경 요약

### 2.1 DetailPage 공유 버튼 추가

코스 상세 화면의 헤더 오른쪽에 공유 버튼을 추가했다.

```text
[뒤로]          코스 상세          [즐겨찾기] [공유]
```

저장된 DB 코스는 즐겨찾기 버튼과 공유 버튼을 함께 표시한다. 생성형 ORS 코스는 아직 서버에 저장되지 않고 상세 딥링크로 안정적으로 복원할 수 없기 때문에 공유 버튼만 표시하고 즐겨찾기 버튼은 숨긴다.

주소 기반 생성형 코스의 즐겨찾기는 기존 DB 코스 저장 목적과 달라질 수 있어 후속 단계에서 별도 기능 정책으로 다시 정의한다.

### 2.2 `/detail/:id` 공유 딥링크 추가

기존 상세 경로는 그대로 유지했다.

```text
/courses/:id
```

공유용 경로는 새 alias로 추가했다.

```text
/detail/:id
```

저장된 DB 코스 공유 링크는 `window.location.origin`을 기준으로 `/detail/:id` 형식으로 생성한다. 생성형 ORS 코스는 복원 가능한 상세 ID가 없으므로 서비스 진입 URL과 코스명·거리·시간 요약 문구를 공유한다.

### 2.3 Web Share API + Clipboard fallback

변경 파일: `client/src/utils/share.js`

추가 기능:

- 공유 가능한 DB 코스 ID 확인
- `/detail/:id` 공유 URL 생성
- 공유 payload 생성
- `navigator.share` 지원 시 네이티브 공유 호출
- Web Share API 실패/미지원 시 `navigator.clipboard.writeText`로 URL 복사
- 클립보드 복사 성공 메시지 반환

### 2.4 UI 틀어짐 보정

Step 23 이후 주소 기반 생성형 코스가 도입되면서 기존 저장 코스 중심 UI 일부가 어색해진 부분을 함께 보정했다.

- 생성형 ORS 코스 결과 카드에서는 즐겨찾기 버튼을 숨기고 `상세 보기` 버튼이 전체 폭을 사용하도록 변경했다.
- 상세 화면에서는 생성형 ORS 코스에 공유 버튼만 표시한다.
- 걷기, 조깅, 러닝 아이콘을 각각 발자국, 심박/펄스, 러너 아이콘으로 구분했다.
- 상세 정보 섹션 아이콘을 채색 없는 outline 계열로 맞췄다.
- 주의사항은 삼각형 느낌표 아이콘으로 변경했다.
- 하단 탭은 홈, 즐겨찾기, 이력을 outline 스타일 아이콘으로 정리했다.

### 2.5 공유 안내 메시지

`DetailPage`에 공유 전용 안내 상태를 추가했다.

- `shareNotice`: 복사 성공 등 안내
- `shareError`: 공유 실패 안내
- `isSharing`: 중복 클릭 방지

복사 성공 문구:

```text
코스 링크가 클립보드에 복사되었습니다!
```

---

## 3. 변경 파일 요약

| 구분      | 파일                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 라우팅    | `client/src/App.jsx`                                                                                                                                          |
| 상세 화면 | `client/src/pages/DetailPage.jsx`                                                                                                                             |
| 결과 카드 | `client/src/components/CourseCard.jsx`, `client/src/components/CourseCard.css`                                                                                 |
| 상세 정보 | `client/src/components/CourseInfo.jsx`                                                                                                                         |
| 탭바      | `client/src/components/TabBar.jsx`                                                                                                                            |
| 아이콘    | `client/src/components/Icon.jsx`                                                                                                                              |
| 표시 유틸 | `client/src/utils/courseDisplay.js`                                                                                                                           |
| 공유 유틸 | `client/src/utils/share.js`                                                                                                                                   |
| 스타일    | `client/src/index.css`                                                                                                                                        |
| HTML 메타 | `client/index.html`                                                                                                                                           |
| 문서      | `docs/01-overview.md`, `docs/03-requirements.md`, `docs/plans/plan-24-course-share.md`, `docs/pr/pr-24-course-share.md`, `docs/steps/step-24-course-share.md` |

---

## 4. Open Graph 처리

코스별 동적 OG 태그는 이번 단계에서 제외했다. 현재 앱은 Vite SPA 구조이므로 SNS 크롤러가 클라이언트 렌더링 이후 코스 데이터를 안정적으로 읽는다고 보기 어렵다.

대신 서비스 공통 description/OG 메타 태그를 `client/index.html`에 추가했다. 코스별 미리보기 카드는 후속 단계에서 SSR, pre-render, 공유 전용 preview endpoint 중 하나를 선택해 구현하는 편이 안전하다.

---

## 5. 검증 결과

| 검증 항목                           | 결과 |
| ----------------------------------- | ---- |
| `npm.cmd --prefix client run lint`  | 통과 |
| `npm.cmd --prefix client run build` | 통과 |

빌드 검증은 통과했다. Web Share API는 실제 모바일 브라우저 또는 HTTPS 환경에서 동작 확인이 필요하다. Clipboard API fallback도 브라우저 보안 컨텍스트에 따라 동작이 달라질 수 있으므로 실제 브라우저에서 추가 확인한다.

---

## 6. 후속 확인

1. `/detail/route-001` 직접 접근 시 상세 페이지 로드 확인
2. `/courses/route-001` 기존 경로 접근 유지 확인
3. PC 브라우저에서 공유 버튼 클릭 시 클립보드 복사 안내 확인
4. 모바일 브라우저에서 OS 공유창 표시 확인
5. 생성형 ORS 코스 상세 화면에서 공유 버튼만 표시되고 즐겨찾기 버튼은 숨겨지는지 확인
6. 생성형 ORS 코스 결과 카드의 `상세 보기` 버튼이 전체 폭으로 표시되는지 확인

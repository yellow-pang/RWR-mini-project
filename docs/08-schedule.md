# 08. 개발 일정 & 리스크

> **문서 유형**: 프로젝트 관리 / 개발 계획  
> **작성일**: 2026.05.28  
> **관련 문서**: [기술 스택](./07-tech-stack.md) | [요구사항 정의서](./03-requirements.md)

---

## 목차

1. [개발 기간 개요](#1-개발-기간-개요)
2. [Gantt 차트](#2-gantt-차트)
3. [단계별 작업 상세](#3-단계별-작업-상세)
4. [리스크 관리](#4-리스크-관리)
5. [완료 기준 체크리스트](#5-완료-기준-체크리스트)

---

## 1. 개발 기간 개요

> **기획/문서화**: 별도 진행 완료 (docs/ 폴더 10개 문서)  
> **실제 개발 기간**: 2026.05.29(금) 14:00 ~ 2026.05.31(일) 23:59  
> **총 캘린더 시간**: 약 58시간 / **실작업 예상**: 약 30~33시간

### 기간별 일정 요약

#### 🗓 금요일 5/29 (14:00~23:00 · 약 9시간) — P0 핵심 기능

| 시간        | 단계                   | 주요 작업                                            | 산출물              |
| ----------- | ---------------------- | ---------------------------------------------------- | ------------------- |
| 14:00~15:30 | **환경 세팅**          | Vite+React 초기화, 폴더 구조, GitHub 연결, CSS 변수  | 개발 서버 실행      |
| 15:30~17:30 | **메인 UI**            | MainPage, ConditionGroup, OptionChip, 조건 상태 관리 | 조건 선택 화면 동작 |
| 17:30~19:30 | **데이터 + 추천 로직** | routeData.js (10개 코스), getRandomRoute, 필터링     | 코스 추천 기능 동작 |
| 19:30~21:30 | **결과 화면**          | ResultPage, CourseCard, 다시 추천 버튼               | 추천 결과 화면 완성 |
| 21:30~23:00 | **상세 화면 (1부)**    | DetailPage 레이아웃, CourseInfo 섹션 컴포넌트        | 상세 화면 기초 구조 |

#### 🗓 토요일 5/30 (09:00~23:00 · 약 14시간) — P1 + 확장 기능

| 시간        | 단계                  | 주요 작업                                                  | 산출물                  |
| ----------- | --------------------- | ---------------------------------------------------------- | ----------------------- |
| 09:00~10:30 | **즐겨찾기 완성**     | storageUtils.js, FavoriteButton, FavoritesPage             | 즐겨찾기 저장/해제 완성 |
| 10:30~12:00 | **이력 + 네비게이션** | HistoryPage, addHistory, BottomTab, React Router 전체 연결 | 하단 탭 네비게이션 완성 |
| 13:00~16:00 | **반응형 CSS**        | 전체 미디어 쿼리 (375/768/1024px), 카드 그리드             | 모바일·PC 반응형 완성   |
| 16:00~19:00 | **🗺 지도 API 연동**  | 카카오맵 SDK 연결, 코스 시작점 마커, 지도 컴포넌트         | 코스 위치 지도 표시     |
| 19:00~21:00 | **코스 데이터 확장**  | 코스 10개 → 20개 작성 (다양한 조건 조합 보완)              | 더 풍부한 추천 결과     |
| 21:00~23:00 | **중간 테스트**       | npm run build, 기능 점검, 버그 목록 작성                   | 빌드 성공 확인          |

#### 🗓 일요일 5/31 (10:00~23:59 · 약 14시간) — 도전 기능 + 마무리

| 시간        | 단계                 | 주요 작업                                                   | 산출물             |
| ----------- | -------------------- | ----------------------------------------------------------- | ------------------ |
| 10:00~12:00 | **📍 GPS 위치 기반** | Geolocation API, 내 주변 코스 우선 표시 필터                | GPS 기반 코스 필터 |
| 12:00~13:30 | **🔗 공유 기능**     | Web Share API, 코스 공유 버튼 (네이티브 공유 시트)          | 코스 공유 기능     |
| 14:00~17:00 | **UI 완성도**        | 화면 전환 애니메이션, 로딩 상태, 빈 상태 UI, 세부 다듬기    | UX 완성도 향상     |
| 17:00~20:00 | **통합 테스트**      | 시나리오 1~4 전체 수동 테스트, 버그 수정, 엣지 케이스 처리  | 품질 보장          |
| 20:00~23:59 | **최종 제출**        | npm run build, README 최종 업데이트, GitHub 푸시, 제출 확인 | 🎉 제출 완료       |

---

## 2. Gantt 차트

```mermaid
gantt
    title RWR 개발 일정 (2026.05.29 금 ~ 05.31 일)
    dateFormat YYYY-MM-DD HH:mm
    axisFormat %m/%d

    section 금요일 (P0 핵심)
    환경 세팅 & 기반 구축         :done, setup,    2026-05-29 14:00, 90m
    메인 화면 UI & 조건 선택      :done, main,     2026-05-29 15:30, 120m
    코스 데이터 & 추천 로직       :done, logic,    2026-05-29 17:30, 120m
    결과 화면                     :done, result,   2026-05-29 19:30, 120m
    상세 화면 1부                 :done, detail1,  2026-05-29 21:30, 90m

    section 토요일 (P1 + 확장)
    즐겨찾기 완성                 :detail2,        2026-05-30 09:00, 90m
    이력 & 하단 네비게이션        :history,        2026-05-30 10:30, 90m
    반응형 CSS 전체 적용          :responsive,     2026-05-30 13:00, 180m
    카카오맵 API 연동             :crit, map,      2026-05-30 16:00, 180m
    코스 데이터 확장 20개         :data,           2026-05-30 19:00, 120m
    중간 빌드 테스트              :test1,          2026-05-30 21:00, 120m

    section 일요일 (도전 + 마무리)
    GPS 현재 위치 기반 필터       :crit, gps,      2026-05-31 10:00, 120m
    Web Share API 공유 기능       :share,          2026-05-31 12:00, 90m
    UI 완성도 & 애니메이션        :ui,             2026-05-31 14:00, 180m
    통합 테스트 & 버그 수정       :test2,          2026-05-31 17:00, 180m
    빌드 검증 & 최종 제출         :milestone, submit, 2026-05-31 21:00, 180m
```

---

## 3. 단계별 작업 상세

### [금 14:00~15:30] 환경 세팅

```
□ npm create vite@latest rwr-mini-project -- --template react
□ cd rwr-mini-project && npm install
□ npm install react-router-dom
□ 폴더 구조 생성 (src/components, pages, utils, data, context)
□ GitHub 저장소 연결 (git init → git remote add origin)
□ index.css — CSS 변수 정의 (컬러, 폰트, spacing)
□ App.jsx — 기본 라우터 구조 설정
□ 첫 커밋: "Initial project setup"
```

**완료 기준**: `npm run dev` 실행 후 브라우저에서 기본 화면 확인

---

### [금 15:30~17:30] 메인 화면 UI

```
□ Header.jsx — 타이틀, 뒤로 가기 버튼
□ OptionChip.jsx — selected prop에 따른 스타일 변경
□ ConditionGroup.jsx — 그룹 레이블 + OptionChip 3개
□ ConditionSelector.jsx — 3개 ConditionGroup 조합
□ MainPage.jsx — 전체 레이아웃, useState로 조건 상태 관리
□ 추천 버튼 — 3조건 미선택 시 비활성 처리
□ 커밋: "feat: main page with condition selector"
```

**완료 기준**: 조건 3가지 선택 → 추천 버튼 활성화 동작 확인

---

### [금 17:30~19:30] 데이터 + 추천 로직

```
□ src/data/routeData.js — 10개 코스 데이터 작성
□ src/utils/routeUtils.js — getRandomRoute 함수
□ App.jsx 또는 Context — selectedConditions 전역 상태 연결
□ 추천 버튼 클릭 → getRandomRoute 호출 → ResultPage 이동
□ 빈 결과 케이스 처리
□ 커밋: "feat: route data and recommendation logic"
```

**완료 기준**: 조건 선택 후 추천 버튼 → 결과 화면으로 이동, 코스 객체 정상 반환 확인

---

### [금 19:30~21:30] 추천 결과 화면

```
□ CourseCard.jsx — 코스명, 메타, 설명, 추천 이유, 액션 버튼
□ ResultPage.jsx — CourseCard 렌더링 + 조건 요약 칩
□ RecommendAgainButton.jsx — 다시 추천 버튼
□ 다시 추천 로직 — excludeId 적용
□ 커밋: "feat: result page with course card"
```

**완료 기준**: 결과 카드 표시, 다시 추천 버튼으로 다른 코스 표시 확인

---

### [금 21:30~23:00] 상세 화면 1부

```
□ DetailPage.jsx — 코스 설명/이유/주의/팁 4개 섹션 레이아웃
□ CourseInfo.jsx — 섹션 단위 컴포넌트
□ 커밋: "feat: detail page structure"
```

**완료 기준**: 상세 화면 레이아웃 렌더링 확인

---

### [토 09:00~10:30] 즐겨찾기 완성

```
□ src/utils/storageUtils.js — getFavorites, toggleFavorite
□ FavoriteButton.jsx — 상태에 따른 아이콘 변화
□ AppContext — favorites 전역 상태
□ FavoritesPage.jsx — 목록 + EmptyState
□ 커밋: "feat: favorites with localStorage"
```

**완료 기준**: 즐겨찾기 저장 후 새로고침해도 유지, FavoritesPage 목록 확인

---

### [토 10:30~12:00] 이력 + 네비게이션

```
□ storageUtils.js — addHistory, getHistory (최대 10개)
□ 추천 발생 시 addHistory 자동 호출
□ HistoryCard.jsx — 코스 정보 + 추천 시각
□ HistoryPage.jsx — 이력 목록 + EmptyState
□ BottomTab.jsx — 홈/즐겨찾기/이력 탭
□ React Router 전체 라우팅 연결
□ 커밋: "feat: history and bottom navigation"
```

**완료 기준**: 3탭 전환 동작, 이력 최대 10개 제한 확인

---

### [토 13:00~16:00] 반응형 CSS

```
□ 전체 화면 미디어 쿼리 적용 (375px / 768px / 1024px)
□ BottomTab PC 뷰 조정 (사이드바 또는 상단 탭)
□ 카드 그리드 (모바일 1열 → 태블릿 2열)
□ Chrome DevTools 모바일 에뮬레이션으로 검증
□ 커밋: "style: responsive layout"
```

**완료 기준**: 375px iPhone SE ~ 1280px PC 레이아웃 모두 정상

---

### [토 16:00~19:00] 🗺 카카오맵 API 연동 (기존 '도전' → 정식 P1)

```
□ 카카오 Developers 앱 등록, JavaScript 키 발급
□ index.html — Kakao Maps SDK 스크립트 삽입
□ MapView.jsx — 지도 컴포넌트 (코스 시작점 마커)
□ DetailPage에 MapView 통합
□ course 데이터에 lat/lng 좌표 추가 (20개 코스 기준)
□ 마커 클릭 시 로드뷰 링크 제공 (선택)
□ 커밋: "feat: kakao map with course markers"
```

**완료 기준**: 상세 화면에서 카카오맵 렌더링, 코스 시작점 마커 표시 확인

---

### [토 19:00~21:00] 코스 데이터 확장 (10개 → 20개)

```
□ routeData.js — 기존 10개 + 신규 10개 코스 작성
□ 조건 조합 커버리지 확인 (거리 3 × 시간 3 × 유형 3 = 27 조합 중 최소 18개 충족)
□ 각 코스 lat/lng 좌표 추가 (카카오맵 연동용)
□ 커밋: "data: expand course data to 20 routes"
```

**완료 기준**: 모든 조건 조합에서 최소 1개 이상 추천 결과 반환

---

### [토 21:00~23:00] 중간 빌드 테스트

```
□ npm run build → dist/ 폴더 생성 확인
□ 빌드 오류 전체 수정
□ 주요 기능 동작 점검 (조건 선택 → 추천 → 상세 → 지도 → 즐겨찾기)
□ 버그 목록 작성 (일요일 테스트 시 수정)
□ 커밋: "fix: mid-sprint build fix"
```

**완료 기준**: 빌드 오류 0개, 핵심 플로우 정상 동작

---

### [일 10:00~12:00] 📍 GPS 현재 위치 기반 필터 (도전 기능)

```
□ Geolocation API — navigator.geolocation.getCurrentPosition
□ 내 현재 좌표와 코스 좌표 간 직선 거리 계산 (Haversine)
□ 내 주변 코스 우선 표시 (반경 5km 이내 코스 상단 정렬)
□ 위치 권한 거부 시 기존 랜덤 추천으로 fallback
□ 커밋: "feat: GPS-based nearby course filter"
```

**완료 기준**: 위치 권한 허용 시 내 주변 코스 우선 표시, 거부 시 일반 추천으로 동작

---

### [일 12:00~13:30] 🔗 Web Share API 공유 기능 (도전 기능)

```
□ ShareButton.jsx — navigator.share() 호출
□ 공유 내용: 코스명 + 거리/시간 요약 + URL
□ Web Share API 미지원 시 클립보드 복사로 fallback
□ ResultPage, DetailPage에 공유 버튼 추가
□ 커밋: "feat: web share api for course sharing"
```

**완료 기준**: 모바일에서 네이티브 공유 시트 노출, PC에서 클립보드 복사 동작

---

### [일 14:00~17:00] UI 완성도 & 애니메이션

```
□ 화면 전환 CSS transition (fade-in)
□ 추천 결과 등장 애니메이션 (slide-up)
□ FavoriteButton 하트 애니메이션
□ OptionChip 선택 시 scale 피드백
□ 로딩 상태 표시 (지도 로딩 스피너)
□ 에러 상태 UI (지도 로드 실패, GPS 오류)
□ 커밋: "style: ui animations and polish"
```

**완료 기준**: 주요 인터랙션에 시각적 피드백 존재, 에러 상태 우아하게 처리

---

### [일 17:00~20:00] 통합 테스트 & 버그 수정

```
□ 시나리오 1: 이산책 — 짧은 거리 걷기 코스 추천 전 플로우
□ 시나리오 2: 박러닝 — 5km 러닝 코스 + 즐겨찾기 저장
□ 시나리오 3: 최건강 — GPS 위치 기반 코스 필터링
□ 시나리오 4: 이력 재사용 — 최근 추천 이력에서 코스 재선택
□ 엣지 케이스: 빈 상태 UI, localStorage 초기화 후 확인
□ 모바일/PC 전체 레이아웃 최종 확인
□ 버그 수정 전부 완료 커밋
```

**완료 기준**: 4개 시나리오 모두 오류 없이 통과

---

### [일 20:00~23:59] 빌드 & 최종 제출

```
□ npm run build 최종 확인 (오류 0개)
□ README.md — 실행 방법, 기능 목록, 스크린샷 추가
□ GitHub 저장소 Public 설정 확인
□ git push (dev 브랜치)
□ 제출 커밋: "chore: final submission v1.0"
□ 제출 링크/URL 최종 확인
```

**완료 기준**: 빌드 성공, GitHub Public 저장소 접근 가능, 제출 완료

---

## 4. 리스크 관리

### 리스크 매트릭스

```mermaid
quadrantChart
    title 리스크 매트릭스 (발생 가능성 vs 영향도)
    x-axis "낮은 가능성" --> "높은 가능성"
    y-axis "낮은 영향" --> "높은 영향"
    R1-CSS반응형시간초과: [0.5, 0.6]
    R2-카카오맵API오류: [0.5, 0.7]
    R3-GPS권한거부: [0.6, 0.3]
    R4-빌드실패: [0.3, 0.8]
    R5-데이터조합누락: [0.4, 0.5]
    R6-일정지연: [0.4, 0.6]
```

### 리스크 목록 및 대응 계획

| ID  | 리스크                                     | 발생 가능성 | 영향도  | 대응 계획                                                                |
| --- | ------------------------------------------ | :---------: | :-----: | ------------------------------------------------------------------------ |
| R1  | 반응형 CSS 작업이 예상보다 오래 걸림       |   🟡 중간   | 🟡 중간 | 토요일 13~16시 블록 보호; 부족하면 1024px 생략, 모바일 우선 처리         |
| R2  | 카카오맵 API 키 발급 오류 또는 렌더링 실패 |   🟡 중간   | 🔴 높음 | API 키 미리 발급 준비; 실패 시 정적 이미지 또는 링크로 대체              |
| R3  | GPS 위치 권한 거부로 기능 무력화           |   🟡 중간   | 🟢 낮음 | 권한 거부 시 기존 랜덤 추천으로 자동 fallback 처리; graceful degradation |
| R4  | npm run build 시 빌드 오류 발생            |   🟢 낮음   | 🔴 높음 | 토요일 중간(21시) 빌드 테스트 1회 실시; 오류 즉시 해결                   |
| R5  | 일부 조건 조합에 코스 데이터 없음          |   🟢 낮음   | 🟡 중간 | 20개 코스 + 빈 결과 안내 UI로 처리; 조합 커버리지 표로 사전 확인         |
| R6  | 도전 기능 구현 시간 초과                   |   🟡 중간   | 🟡 중간 | GPS·공유는 일요일 배치; 시간 부족 시 해당 기능만 스킵하고 P1 완성 우선   |

### 우선순위 기반 절충 계획

```
시간 부족 시 포기 순서 (일요일 기준):
1. Web Share API 공유 기능 (도전) — 없어도 서비스 기능에 영향 없음
2. GPS 현재 위치 필터 (도전) — 없어도 랜덤 추천은 동작
3. UI 애니메이션 세부 다듬기 — 기능 동작하면 OK

절대 포기하지 않는 것 (P0/P1):
- 조건 선택 UI + 랜덤 코스 추천
- 추천 결과 카드 + 다시 추천
- 즐겨찾기 + 이력
- 카카오맵 마커 (정식 P1)
- 반응형 UI
```

---

## 5. 완료 기준 체크리스트

### 기능 체크리스트

```
기능 요구사항 (필수 P0/P1)
□ FR-01~04  조건 선택 (거리/시간/유형) 정상 동작
□ FR-06~09  추천 및 다시 추천 정상 동작
□ FR-11     결과 카드 모든 필드 표시
□ FR-12~14  상세 화면 및 뒤로 가기
□ FR-15~19  즐겨찾기 저장/해제/영속성
□ FR-21~22  최근 이력 저장 (최대 10개)
□ FR-20, 24 빈 상태 UI 표시
□ MAP-01    카카오맵 코스 시작점 마커 표시 (P1 신규)

도전 기능 (P2)
□ GPS-01    현재 위치 기반 코스 우선 정렬
□ GPS-02    위치 권한 거부 시 fallback 동작
□ SHARE-01  Web Share API 코스 공유
□ SHARE-02  미지원 환경 클립보드 복사 fallback

비기능 요구사항
□ NFR-01    추천 결과 1초 이내 표시
□ NFR-04    375px ~ 1280px 반응형 동작
□ NFR-07~08 새로고침 후 즐겨찾기/이력 유지
□ NFR-13    npm run build 오류 없음
□ NFR-14    GitHub Public 저장소 Push 완료
□ NFR-15    README 실행 방법 포함
```

---

_다음 문서: [09. PRD (제품 요구사항 문서)](./09-prd.md)_

import { createContext, useContext, useState } from "react";

// Step 04 mock course data. Real API calls are handled in Step 05.
export const MOCK_COURSE = {
  id: "route-001",
  title: "서울숲 산책길",
  distance: 3,
  time: 30,
  type: "조깅",
  mood: "공원",
  description:
    "서울숲의 나무길과 열린 광장을 따라 가볍게 움직일 수 있는 도심 속 코스입니다. 보행로가 비교적 평탄해 처음 방문한 사용자도 부담 없이 이용할 수 있습니다.",
  reason:
    "30분 안에 다녀오기 좋은 거리이고, 공원 중심 코스라 초보자도 페이스를 조절하기 쉽습니다.",
  caution:
    "주말 낮에는 방문객이 많을 수 있으니 자전거 전용 구간과 보행 구간을 구분해 이용하세요.",
  tip: "물 500ml 정도를 준비하고, 서울숲역에서 출발하면 접근이 편합니다.",
};

const CourseContext = createContext(null);

export function CourseProvider({ children }) {
  const [conditions, setConditions] = useState({
    distance: null,
    time: null,
    type: null,
  });
  const [currentCourse, setCurrentCourse] = useState(null);

  return (
    <CourseContext.Provider
      value={{ conditions, setConditions, currentCourse, setCurrentCourse }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within CourseProvider");
  return ctx;
}

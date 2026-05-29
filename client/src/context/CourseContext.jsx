import { createContext, useContext, useState } from "react";

// Step 04 목업용 코스 데이터
export const MOCK_COURSE = {
  id: "route-001",
  title: "서울숲 둘레길",
  distance: 3,
  time: 30,
  type: "조깅",
  mood: "공원",
  description:
    "봄이면 벚꽃이 만개하는 서울숲 외곽 트랙 코스입니다. 한강 조망 구간이 포함되어 있어 달리는 내내 탁 트인 경관을 즐길 수 있습니다.",
  reason:
    "평지 위주로 관절 부담이 적어 초보 조거에게 적합합니다. 30분 이내로 부담 없이 완주할 수 있는 거리입니다.",
  caution:
    "주말 오전에는 이용객이 많아 혼잡합니다. 자전거 전용 구간과 도보 구간을 구분해 이용하세요.",
  tip: "물 500ml 이상 준비를 권장합니다. 서울숲역 2번 출구에서 도보 5분 거리입니다.",
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

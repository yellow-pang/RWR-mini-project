import { useState } from "react";
import { RECOMMENDATION_MODES } from "../constants/recommendationModes";
import { CourseContext } from "./courseContext";

export function CourseProvider({ children }) {
  const [conditions, setConditions] = useState({
    distance: null,
    time: null,
    type: null,
  });
  const [currentCourse, setCurrentCourse] = useState(null);
  const [recommendationMode, setRecommendationMode] = useState(
    RECOMMENDATION_MODES.RANDOM_DB,
  );
  const [recommendationMeta, setRecommendationMeta] = useState(null);

  return (
    <CourseContext.Provider
      value={{
        conditions,
        setConditions,
        currentCourse,
        setCurrentCourse,
        recommendationMode,
        setRecommendationMode,
        recommendationMeta,
        setRecommendationMeta,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

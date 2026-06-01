import { useState } from "react";
import { CourseContext } from "./courseContext";

export function CourseProvider({ children }) {
  const [conditions, setConditions] = useState({
    distance: null,
    time: null,
    type: null,
  });
  const [currentCourse, setCurrentCourse] = useState(null);
  const [routeLocation, setRouteLocation] = useState({
    address: "",
    latitude: null,
    longitude: null,
    source: null,
  });
  const [recommendationMeta, setRecommendationMeta] = useState(null);

  return (
    <CourseContext.Provider
      value={{
        conditions,
        setConditions,
        currentCourse,
        setCurrentCourse,
        routeLocation,
        setRouteLocation,
        recommendationMeta,
        setRecommendationMeta,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

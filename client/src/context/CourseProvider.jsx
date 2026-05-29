import { useState } from "react";
import { CourseContext } from "./courseContext";

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

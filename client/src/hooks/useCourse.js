import { useContext } from "react";
import { CourseContext } from "../context/courseContext";

export function useCourse() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error("useCourse must be used within CourseProvider");
  return ctx;
}

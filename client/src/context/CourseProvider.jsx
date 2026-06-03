import { useState } from "react";
import { CourseContext } from "./courseContext";
import { ROUTE_MODES } from "../constants/recommendationModes";

const EMPTY_ROUTE_LOCATION = {
  address: "",
  latitude: null,
  longitude: null,
  source: null,
};

export function CourseProvider({ children }) {
  const [routeMode, setRouteMode] = useState(ROUTE_MODES.ROUND_TRIP);
  const [conditions, setConditions] = useState({
    distance: null,
    time: null,
    type: null,
  });
  const [currentCourse, setCurrentCourse] = useState(null);
  const [routeLocation, setRouteLocation] = useState(EMPTY_ROUTE_LOCATION);
  const [destinationLocation, setDestinationLocation] =
    useState(EMPTY_ROUTE_LOCATION);
  const [recommendationMeta, setRecommendationMeta] = useState(null);

  return (
    <CourseContext.Provider
      value={{
        routeMode,
        setRouteMode,
        conditions,
        setConditions,
        currentCourse,
        setCurrentCourse,
        routeLocation,
        setRouteLocation,
        destinationLocation,
        setDestinationLocation,
        recommendationMeta,
        setRecommendationMeta,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

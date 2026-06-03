const { validationResult } = require("express-validator");
const coursesService = require("../services/coursesService");
const geocodingService = require("../services/geocodingService");
const orsService = require("../services/orsService");

const ADDRESS_ROUTE_NOTICE =
  "입력한 주소를 기준으로 실제 도로망을 따라 순환 코스를 생성했습니다.";
const ADDRESS_FALLBACK_NOTICE =
  "경로 생성이 원활하지 않아 입력 위치와 가까운 저장 코스로 추천했습니다.";
const POINT_TO_POINT_NOTICE =
  "출발지와 목적지 사이를 산책하듯 걸을 수 있는 경로를 생성했습니다.";
const POINT_TO_POINT_MINIMIZED_NOTICE =
  "출발지와 도착지 사이의 기본 거리가 선택한 거리보다 길어, 우회 경유지를 줄여 경로를 생성했습니다.";

exports.createRoundTrip = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const route = await orsService.createRoundTrip(req.body);
    res.json({ success: true, data: route });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message || "GPS 경로 생성에 실패했습니다.",
      });
    }

    next(err);
  }
};

async function resolveLocation({ address, latitude, longitude }) {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return {
      address: address || "현재 위치 기준",
      latitude,
      longitude,
      source: "coordinates",
    };
  }

  return geocodingService.geocodeAddress(address);
}

async function resolveNamedLocation({
  address,
  latitude,
  longitude,
  fallbackLabel,
}) {
  const location = await resolveLocation({ address, latitude, longitude });

  return {
    ...location,
    address: location.address || fallbackLabel,
  };
}

exports.createAddressRoundTrip = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const location = await resolveLocation(req.body);

    try {
      const route = await orsService.createRoundTrip({
        ...req.body,
        latitude: location.latitude,
        longitude: location.longitude,
        originLabel: location.address,
      });

      return res.json({
        success: true,
        data: route,
        meta: {
          location,
          usedFallback: false,
          notice: ADDRESS_ROUTE_NOTICE,
        },
      });
    } catch (routeError) {
      const fallbackCourse = await coursesService.findNearestRandom({
        latitude: location.latitude,
        longitude: location.longitude,
        distance: req.body.distance,
        time: req.body.time,
        type: req.body.type,
        exclude: req.body.exclude,
      });

      if (!fallbackCourse) {
        throw routeError;
      }

      try {
        const fallbackRoute = await orsService.createRoundTrip({
          ...req.body,
          latitude: Number(fallbackCourse.start_lat),
          longitude: Number(fallbackCourse.start_lng),
          originLabel: fallbackCourse.title,
        });

        return res.json({
          success: true,
          data: fallbackRoute,
          meta: {
            location,
            usedFallback: true,
            fallbackCourseId: fallbackCourse.id,
            fallbackReason: routeError.message,
            notice: ADDRESS_FALLBACK_NOTICE,
          },
        });
      } catch {
        // ORS 자체가 불안정한 경우에는 저장 코스를 그대로 제공한다.
      }

      return res.json({
        success: true,
        data: fallbackCourse,
        meta: {
          location,
          usedFallback: true,
          fallbackReason: routeError.message,
          notice: ADDRESS_FALLBACK_NOTICE,
        },
      });
    }
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message || "주소 기준 경로 생성에 실패했습니다.",
      });
    }

    next(err);
  }
};

exports.createAddressPointToPoint = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const [startLocation, endLocation] = await Promise.all([
      resolveNamedLocation({
        address: req.body.startAddress,
        latitude: req.body.startLatitude,
        longitude: req.body.startLongitude,
        fallbackLabel: "출발지",
      }),
      resolveNamedLocation({
        address: req.body.endAddress,
        latitude: req.body.endLatitude,
        longitude: req.body.endLongitude,
        fallbackLabel: "도착지",
      }),
    ]);

    const result = await orsService.createPointToPoint({
      distance: req.body.distance,
      time: req.body.time,
      type: req.body.type,
      seed: req.body.seed,
      startLatitude: startLocation.latitude,
      startLongitude: startLocation.longitude,
      startLabel: startLocation.address,
      endLatitude: endLocation.latitude,
      endLongitude: endLocation.longitude,
      endLabel: endLocation.address,
    });

    return res.json({
      success: true,
      data: result.route,
      meta: {
        startLocation,
        endLocation,
        usedFallback: false,
        retryCount: result.retryCount,
        notice: result.usedMinimizedDetour
          ? POINT_TO_POINT_MINIMIZED_NOTICE
          : POINT_TO_POINT_NOTICE,
      },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message:
          err.message ||
          "출발지와 도착지 사이의 산책 경로 생성에 실패했습니다.",
      });
    }

    next(err);
  }
};

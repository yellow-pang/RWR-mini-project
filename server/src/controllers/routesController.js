const { validationResult } = require("express-validator");
const geocodingService = require("../services/geocodingService");
const orsService = require("../services/orsService");

const ADDRESS_ROUTE_NOTICE = "목표 거리와 가까운 순환 코스를 찾았습니다.";
const POINT_TO_POINT_NOTICE = "목표 거리와 가까운 출발-도착 코스를 찾았습니다.";

exports.createRoundTrip = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const route = await orsService.createRoundTrip(req.body);
    res.json({
      success: true,
      data: route,
      meta: route.targetSummary || null,
    });
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
          ...(route.poiSummary || {}),
          ...(route.targetSummary || {}),
          notice: ADDRESS_ROUTE_NOTICE,
        },
      });
    } catch (routeError) {
      throw routeError;
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
      targetMode: req.body.targetMode,
      targetDistanceKm: req.body.targetDistanceKm,
      targetMinutes: req.body.targetMinutes,
      estimatedMinutes: req.body.estimatedMinutes,
      detourLevel: req.body.detourLevel,
      routeTheme: req.body.routeTheme,
      poiPreferences: req.body.poiPreferences,
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
        detourLevel: result.detourLevel,
        retryCount: result.retryCount,
        ...(result.route.poiSummary || {}),
        ...(result.route.targetSummary || {}),
        notice: POINT_TO_POINT_NOTICE,
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

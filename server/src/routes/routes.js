const { Router } = require("express");
const { body } = require("express-validator");
const { COURSE_TYPES } = require("../constants/courseValues");
const routesController = require("../controllers/routesController");

const router = Router();

router.post(
  "/round-trip",
  [
    body("latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("latitude는 -90~90 사이의 숫자여야 합니다.")
      .toFloat(),
    body("longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("longitude는 -180~180 사이의 숫자여야 합니다.")
      .toFloat(),
    body("distance")
      .isInt()
      .withMessage("distance는 정수여야 합니다.")
      .toInt()
      .isIn([1, 3, 5])
      .withMessage("distance는 1, 3, 5 중 하나여야 합니다."),
    body("time")
      .isInt()
      .withMessage("time은 정수여야 합니다.")
      .toInt()
      .isIn([15, 30, 60])
      .withMessage("time은 15, 30, 60 중 하나여야 합니다."),
    body("type")
      .trim()
      .notEmpty()
      .withMessage("type은 필수입니다.")
      .isIn(COURSE_TYPES)
      .withMessage("이동 유형은 걷기, 조깅, 러닝 중 하나여야 합니다."),
    body("seed")
      .optional()
      .isInt({ min: 1 })
      .withMessage("seed는 양의 정수여야 합니다.")
      .toInt(),
  ],
  routesController.createRoundTrip,
);

router.post(
  "/address-round-trip",
  [
    body("address")
      .optional({ values: "falsy" })
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("주소는 2자 이상 200자 이하로 입력해 주세요."),
    body("latitude")
      .optional({ values: "null" })
      .isFloat({ min: -90, max: 90 })
      .withMessage("latitude는 -90~90 사이의 숫자여야 합니다.")
      .toFloat(),
    body("longitude")
      .optional({ values: "null" })
      .isFloat({ min: -180, max: 180 })
      .withMessage("longitude는 -180~180 사이의 숫자여야 합니다.")
      .toFloat(),
    body().custom((value) => {
      const hasAddress =
        typeof value.address === "string" && value.address.trim().length >= 2;
      const hasCoordinates =
        Number.isFinite(Number(value.latitude)) &&
        Number.isFinite(Number(value.longitude));

      if (!hasAddress && !hasCoordinates) {
        throw new Error("주소 또는 현재 위치 좌표가 필요합니다.");
      }

      return true;
    }),
    body("distance")
      .isInt()
      .withMessage("distance는 정수여야 합니다.")
      .toInt()
      .isIn([1, 3, 5])
      .withMessage("distance는 1, 3, 5 중 하나여야 합니다."),
    body("time")
      .isInt()
      .withMessage("time은 정수여야 합니다.")
      .toInt()
      .isIn([15, 30, 60])
      .withMessage("time은 15, 30, 60 중 하나여야 합니다."),
    body("type")
      .trim()
      .notEmpty()
      .withMessage("type은 필수입니다.")
      .isIn(COURSE_TYPES)
      .withMessage("이동 유형은 걷기, 조깅, 러닝 중 하나여야 합니다."),
    body("seed")
      .optional()
      .isInt({ min: 1 })
      .withMessage("seed는 양의 정수여야 합니다.")
      .toInt(),
    body("exclude")
      .optional({ values: "falsy" })
      .trim()
      .matches(/^route-[a-z0-9-]+$/)
      .withMessage("exclude 형식이 올바르지 않습니다.")
      .isLength({ max: 20 })
      .withMessage("exclude 값이 너무 깁니다."),
  ],
  routesController.createAddressRoundTrip,
);

router.post(
  "/address-point-to-point",
  [
    body("startAddress")
      .optional({ values: "falsy" })
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("출발 주소는 2자 이상 200자 이하로 입력해 주세요."),
    body("startLatitude")
      .optional({ values: "null" })
      .isFloat({ min: -90, max: 90 })
      .withMessage("startLatitude는 -90~90 사이의 숫자여야 합니다.")
      .toFloat(),
    body("startLongitude")
      .optional({ values: "null" })
      .isFloat({ min: -180, max: 180 })
      .withMessage("startLongitude는 -180~180 사이의 숫자여야 합니다.")
      .toFloat(),
    body("endAddress")
      .optional({ values: "falsy" })
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("도착 주소는 2자 이상 200자 이하로 입력해 주세요."),
    body("endLatitude")
      .optional({ values: "null" })
      .isFloat({ min: -90, max: 90 })
      .withMessage("endLatitude는 -90~90 사이의 숫자여야 합니다.")
      .toFloat(),
    body("endLongitude")
      .optional({ values: "null" })
      .isFloat({ min: -180, max: 180 })
      .withMessage("endLongitude는 -180~180 사이의 숫자여야 합니다.")
      .toFloat(),
    body().custom((value) => {
      const hasStartAddress =
        typeof value.startAddress === "string" &&
        value.startAddress.trim().length >= 2;
      const hasStartCoordinates =
        Number.isFinite(Number(value.startLatitude)) &&
        Number.isFinite(Number(value.startLongitude));
      const hasEndAddress =
        typeof value.endAddress === "string" &&
        value.endAddress.trim().length >= 2;
      const hasEndCoordinates =
        Number.isFinite(Number(value.endLatitude)) &&
        Number.isFinite(Number(value.endLongitude));

      if (!hasStartAddress && !hasStartCoordinates) {
        throw new Error("출발 주소 또는 출발 좌표가 필요합니다.");
      }

      if (!hasEndAddress && !hasEndCoordinates) {
        throw new Error("도착 주소 또는 도착 좌표가 필요합니다.");
      }

      return true;
    }),
    body("distance")
      .isInt()
      .withMessage("distance는 정수여야 합니다.")
      .toInt()
      .isIn([1, 3, 5])
      .withMessage("distance는 1, 3, 5 중 하나여야 합니다."),
    body("time")
      .isInt()
      .withMessage("time은 정수여야 합니다.")
      .toInt()
      .isIn([15, 30, 60])
      .withMessage("time은 15, 30, 60 중 하나여야 합니다."),
    body("type")
      .trim()
      .notEmpty()
      .withMessage("type은 필수입니다.")
      .isIn(COURSE_TYPES)
      .withMessage("이동 유형은 걷기, 조깅, 러닝 중 하나여야 합니다."),
    body("seed")
      .optional()
      .isInt({ min: 1 })
      .withMessage("seed는 양의 정수여야 합니다.")
      .toInt(),
  ],
  routesController.createAddressPointToPoint,
);

module.exports = router;

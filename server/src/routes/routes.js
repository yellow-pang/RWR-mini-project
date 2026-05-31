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

module.exports = router;

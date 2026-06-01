const { Router } = require("express");
const { body } = require("express-validator");
const locationsController = require("../controllers/locationsController");

const router = Router();

router.post(
  "/search",
  [
    body("query")
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("검색어는 2자 이상 200자 이하로 입력해 주세요."),
  ],
  locationsController.search,
);

router.post(
  "/geocode",
  [
    body("address")
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage("주소는 2자 이상 200자 이하로 입력해 주세요."),
  ],
  locationsController.geocode,
);

router.post(
  "/reverse-geocode",
  [
    body("latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("latitude는 -90~90 사이의 숫자여야 합니다.")
      .toFloat(),
    body("longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("longitude는 -180~180 사이의 숫자여야 합니다.")
      .toFloat(),
  ],
  locationsController.reverseGeocode,
);

module.exports = router;

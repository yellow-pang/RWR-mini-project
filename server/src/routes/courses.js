const { Router } = require("express");
const { query, param } = require("express-validator");
const coursesController = require("../controllers/coursesController");

const router = Router();

// ── GET /api/courses/random ───────────────────────────────
router.get(
  "/random",
  [
    query("distance")
      .notEmpty()
      .withMessage("distance는 필수입니다.")
      .isInt()
      .withMessage("distance는 정수여야 합니다.")
      .toInt()
      .isIn([1, 3, 5])
      .withMessage("distance는 1, 3, 5 중 하나여야 합니다."),
    query("time")
      .notEmpty()
      .withMessage("time은 필수입니다.")
      .isInt()
      .withMessage("time은 정수여야 합니다.")
      .toInt()
      .isIn([15, 30, 60])
      .withMessage("time은 15, 30, 60 중 하나여야 합니다."),
    query("type")
      .trim()
      .notEmpty()
      .withMessage("type은 필수입니다.")
      .isIn(["걷기", "조깅", "러닝"])
      .withMessage("type은 걷기, 조깅, 러닝 중 하나여야 합니다."),
    query("exclude")
      .optional()
      .trim()
      .matches(/^route-[a-z0-9-]+$/)
      .withMessage("exclude 형식이 올바르지 않습니다.")
      .isLength({ max: 20 })
      .withMessage("exclude 값이 너무 깁니다."),
  ],
  coursesController.getRandom,
);

// ── GET /api/courses/:id ──────────────────────────────────
router.get(
  "/:id",
  [
    param("id")
      .trim()
      .matches(/^route-[a-z0-9-]+$/)
      .withMessage("id 형식이 올바르지 않습니다.")
      .isLength({ max: 20 })
      .withMessage("id 값이 너무 깁니다."),
  ],
  coursesController.getById,
);

module.exports = router;

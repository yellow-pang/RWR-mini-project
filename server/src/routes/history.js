const { Router } = require("express");
const { query, body } = require("express-validator");
const historyController = require("../controllers/historyController");

const router = Router();

// ── GET /api/history?userId=&limit= ──────────────────────
router.get(
  "/",
  [
    query("userId")
      .trim()
      .isUUID(4)
      .withMessage("userId는 유효한 UUID여야 합니다."),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("limit은 1~50 사이 정수여야 합니다.")
      .toInt(),
  ],
  historyController.getList,
);

// ── POST /api/history ─────────────────────────────────────
router.post(
  "/",
  [
    body("userId")
      .trim()
      .isUUID(4)
      .withMessage("userId는 유효한 UUID여야 합니다."),
    body("courseId")
      .trim()
      .matches(/^route-[a-z0-9-]+$/)
      .withMessage("courseId 형식이 올바르지 않습니다.")
      .isLength({ max: 20 })
      .withMessage("courseId 값이 너무 깁니다."),
  ],
  historyController.add,
);

module.exports = router;

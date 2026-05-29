const { Router } = require("express");
const { query, body, param } = require("express-validator");
const favoritesController = require("../controllers/favoritesController");

const router = Router();

const uuidRule = (field, location) =>
  location(field)
    .trim()
    .isUUID(4)
    .withMessage(`${field}는 유효한 UUID여야 합니다.`);

const courseIdRule = (location) =>
  location("courseId")
    .trim()
    .matches(/^route-[a-z0-9-]+$/)
    .withMessage("courseId 형식이 올바르지 않습니다.")
    .isLength({ max: 20 })
    .withMessage("courseId 값이 너무 깁니다.");

// ── GET /api/favorites?userId= ───────────────────────────
router.get("/", [uuidRule("userId", query)], favoritesController.getList);

// ── POST /api/favorites ───────────────────────────────────
router.post(
  "/",
  [uuidRule("userId", body), courseIdRule(body)],
  favoritesController.add,
);

// ── DELETE /api/favorites/:courseId?userId= ───────────────
router.delete(
  "/:courseId",
  [
    param("courseId")
      .trim()
      .matches(/^route-[a-z0-9-]+$/)
      .withMessage("courseId 형식이 올바르지 않습니다.")
      .isLength({ max: 20 })
      .withMessage("courseId 값이 너무 깁니다."),
    uuidRule("userId", query),
  ],
  favoritesController.remove,
);

module.exports = router;

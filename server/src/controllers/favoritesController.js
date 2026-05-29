const { validationResult } = require("express-validator");
const favoritesService = require("../services/favoritesService");

exports.getList = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const data = await favoritesService.findByUser(req.query.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.add = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { userId, courseId } = req.body;
    const data = await favoritesService.add(userId, courseId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({
          success: false,
          message: "이미 즐겨찾기에 추가된 코스입니다.",
        });
    }
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { courseId } = req.params;
    const { userId } = req.query;
    const deleted = await favoritesService.remove(userId, courseId);

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "즐겨찾기 항목을 찾을 수 없습니다." });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

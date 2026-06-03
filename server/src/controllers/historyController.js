const { validationResult } = require("express-validator");
const historyService = require("../services/historyService");

exports.getList = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { userId, limit } = req.query;
    const data = await historyService.findByUser(userId, limit);
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
    const data = await historyService.add(userId, courseId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.code === "23503") {
      return res.status(404).json({
        success: false,
        message: "최근 이력에는 저장된 DB 코스만 추가할 수 있습니다.",
      });
    }

    next(err);
  }
};

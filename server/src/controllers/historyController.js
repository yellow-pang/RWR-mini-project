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
    const data = await historyService.findByUser(
      userId,
      limit ? Number(limit) : 10,
    );
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
    next(err);
  }
};

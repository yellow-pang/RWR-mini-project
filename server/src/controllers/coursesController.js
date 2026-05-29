const { validationResult } = require("express-validator");
const coursesService = require("../services/coursesService");

exports.getRandom = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const { distance, time, type, exclude } = req.query;
    const course = await coursesService.findRandom({
      distance: Number(distance),
      time: Number(time),
      type,
      exclude,
    });

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "조건에 맞는 코스가 없습니다." });
    }

    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const course = await coursesService.findById(req.params.id);

    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "코스를 찾을 수 없습니다." });
    }

    res.json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

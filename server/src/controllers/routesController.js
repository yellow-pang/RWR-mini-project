const { validationResult } = require("express-validator");
const orsService = require("../services/orsService");

exports.createRoundTrip = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const route = await orsService.createRoundTrip(req.body);
    res.json({ success: true, data: route });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message || "GPS 경로 생성에 실패했습니다.",
      });
    }

    next(err);
  }
};

const { validationResult } = require("express-validator");
const geocodingService = require("../services/geocodingService");

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, message: errors.array()[0].msg });
    return true;
  }
  return false;
}

exports.geocode = async (req, res, next) => {
  if (sendValidationError(req, res)) return;

  try {
    const location = await geocodingService.geocodeAddress(req.body.address);
    res.json({ success: true, data: location });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message || "주소를 좌표로 변환하지 못했습니다.",
      });
    }
    next(err);
  }
};

exports.search = async (req, res, next) => {
  if (sendValidationError(req, res)) return;

  try {
    const locations = await geocodingService.searchAddresses(req.body.query);
    res.json({ success: true, data: locations });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message || "주소 검색에 실패했습니다.",
      });
    }
    next(err);
  }
};

exports.reverseGeocode = async (req, res, next) => {
  if (sendValidationError(req, res)) return;

  try {
    const location = await geocodingService.reverseGeocode(req.body);
    res.json({ success: true, data: location });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        message: err.message || "현재 위치의 주소를 찾지 못했습니다.",
      });
    }
    next(err);
  }
};

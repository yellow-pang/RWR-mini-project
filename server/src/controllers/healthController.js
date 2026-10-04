const createHealthHandler = (checkDatabaseHealth) => async (req, res) => {
  try {
    await checkDatabaseHealth();

    return res.json({
      success: true,
      message: "RWR API Server is running",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      success: false,
      message: "RWR API Server is not ready",
    });
  }
};

module.exports = { createHealthHandler };

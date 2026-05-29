const express = require("express");
const cors = require("cors");

const app = express();

// ── 미들웨어 ──────────────────────────────────────────────
app.use(express.json());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  }),
);

// ── 헬스체크 ──────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "RWR API Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ── 라우터 등록 ──────────────────────────────────────────
const coursesRouter = require("./routes/courses");
const favoritesRouter = require("./routes/favorites");
const historyRouter = require("./routes/history");
app.use("/api/courses", coursesRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/history", historyRouter);

// ── 404 핸들러 ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── 전역 에러 핸들러 ─────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);
  res
    .status(err.status || 500)
    .json({ success: false, message: "Internal server error" });
});

module.exports = app;

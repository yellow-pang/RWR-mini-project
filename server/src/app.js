require("./config/env");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "4kb" }));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "RWR API Server is running",
    timestamp: new Date().toISOString(),
  });
});

const coursesRouter = require("./routes/courses");
const favoritesRouter = require("./routes/favorites");
const historyRouter = require("./routes/history");
const locationsRouter = require("./routes/locations");
const routesRouter = require("./routes/routes");

app.use("/api/courses", coursesRouter);
app.use("/api/favorites", favoritesRouter);
app.use("/api/history", historyRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/routes", routesRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[Error] ${err.message}`);

  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ success: false, message: "Request body is too large" });
  }

  if (err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ success: false, message: "CORS origin is not allowed" });
  }

  res
    .status(err.status || 500)
    .json({ success: false, message: "Internal server error" });
});

module.exports = app;

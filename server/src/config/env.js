const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const getRequiredEnv = (name) => {
  const value = process.env[name];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`[Config] ${name} environment variable is required.`);
  }

  return value;
};

module.exports = { getRequiredEnv };

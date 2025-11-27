// backend/src/utils/jwt.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

export function signToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

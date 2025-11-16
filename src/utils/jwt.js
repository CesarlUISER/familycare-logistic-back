import jwt from "jsonwebtoken";
const { JWT_SECRET = "super_secret_change_me" } = process.env;

export function signToken(payload, opts = {}) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d", ...opts });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

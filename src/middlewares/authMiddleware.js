// backend/src/middlewares/authMiddleware.js
import { verifyToken } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = verifyToken(token); // { id, email, name, rol, ... }
    // Guardamos los datos del usuario del token en la request
    req.user = decoded;

    next();
  } catch (err) {
    console.error("❌ Error en requireAuth:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// backend/src/controllers/authController.js
import bcrypt from "bcryptjs";
import Usuario from "../models/Usuario.js";
import { signToken } from "../utils/jwt.js";

function limpiarUsuario(uInstance) {
  const u = uInstance.toJSON();
  delete u.password_hash;
  return u;
}

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email y contraseña son obligatorios" });
    }

    const emailNorm = email.trim().toLowerCase();

    // =====================================================
    // 1) SUPERADMIN desde .env (se evalúa PRIMERO)
    // =====================================================
    const envEmail = (process.env.DEMO_USER_EMAIL || "").trim().toLowerCase();
    const envPass = process.env.DEMO_USER_PASSWORD || "";

    if (emailNorm === envEmail) {
      // Solo permite login si la contraseña coincide EXACTAMENTE con la del .env
      if (password !== envPass) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      const superUser = {
        id: 0, // indica que viene de .env, no de BD
        nombre: process.env.DEMO_USER_NAME || "Administrador",
        email: envEmail,
        rol: process.env.DEMO_USER_ROLE || "superadmin",
        perm_inventario: true,
        perm_entradas: true,
        perm_salidas: true,
        perm_caducidades: true,
        perm_reportes: true,
        perm_usuarios: true,
      };

      const token = signToken({
        id: superUser.id,
        email: superUser.email,
        nombre: superUser.nombre,
        rol: superUser.rol,
        perm_inventario: superUser.perm_inventario,
        perm_entradas: superUser.perm_entradas,
        perm_salidas: superUser.perm_salidas,
        perm_caducidades: superUser.perm_caducidades,
        perm_reportes: superUser.perm_reportes,
        perm_usuarios: superUser.perm_usuarios,
      });

      return res.json({ token, user: superUser });
    }

    // =====================================================
    // 2) LOGIN NORMAL CONTRA TABLA usuarios
    // =====================================================
    const usuario = await Usuario.findOne({ where: { email: emailNorm } });

    if (!usuario) {
      // No existe ni en BD ni es superadmin .env
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        message: "El usuario está inactivo. Contacta al administrador.",
      });
    }

    // Soporta hash bcrypt o texto plano legado
    let match = false;
    const stored = usuario.password_hash || "";

    if (stored.startsWith("$2")) {
      // Hash bcrypt
      match = await bcrypt.compare(password, stored);
    } else {
      // Texto plano viejo
      match = password === stored;
    }

    if (!match) {
      return res.status(401).json({ message: "Credenciales incorrectas" });
    }

    const cleanUser = limpiarUsuario(usuario);

    const token = signToken({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      perm_inventario: usuario.perm_inventario,
      perm_entradas: usuario.perm_entradas,
      perm_salidas: usuario.perm_salidas,
      perm_caducidades: usuario.perm_caducidades,
      perm_reportes: usuario.perm_reportes,
      perm_usuarios: usuario.perm_usuarios,
    });

    return res.json({ token, user: cleanUser });
  } catch (err) {
    console.error("❌ Error en login:", err);
    return res.status(500).json({ message: "Error interno en el login" });
  }
};

// GET /api/auth/me
export const me = async (req, res) => {
  try {
    const userFromToken = req.user; // viene de requireAuth (utils/jwt.verifyToken)
    const userId = userFromToken?.id;

    if (userId === undefined || userId === null) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // 1) Si es superadmin virtual (id = 0, de .env), NO va a existir en la BD
    const envEmail = (process.env.DEMO_USER_EMAIL || "").trim().toLowerCase();
    if (userId === 0 && userFromToken.email?.toLowerCase() === envEmail) {
      // Regresamos lo que viene del token (ya es un objeto limpio)
      return res.json({ user: userFromToken });
    }

    // 2) Usuarios normales, buscar en tabla usuarios
    const usuario = await Usuario.findByPk(userId);
    if (!usuario) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    return res.json({ user: limpiarUsuario(usuario) });
  } catch (err) {
    console.error("❌ Error en /auth/me:", err);
    return res.status(500).json({ message: "Error al obtener usuario actual" });
  }
};

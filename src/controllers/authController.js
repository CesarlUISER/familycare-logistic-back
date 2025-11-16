import { signToken } from "../utils/jwt.js";

const {
  DEMO_USER_EMAIL = "admin@familycare.com",
  DEMO_USER_PASSWORD = "admin123",
  DEMO_USER_NAME = "Administrador",
  DEMO_USER_ROLE = "superadmin",
} = process.env;

/**
 * Demo sin DB de usuarios: compara contra variables de entorno
 * y regresa { token, user }.
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email y password son requeridos" });
    }

    const emailOk = String(email).toLowerCase() === String(DEMO_USER_EMAIL).toLowerCase();
    const passOk = String(password) === String(DEMO_USER_PASSWORD);

    if (!emailOk || !passOk) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const user = {
      id: "demo-1",
      email: DEMO_USER_EMAIL,
      name: DEMO_USER_NAME,
      role: DEMO_USER_ROLE,
    };

    const token = signToken(user); // payload: { id, email, name, role }
    return res.json({ token, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error en login" });
  }
}

export async function me(req, res) {
  // req.user viene del middleware requireAuth
  return res.json({ user: req.user });
}

export async function logout(_req, res) {
  // Con JWT stateless, solo confirmamos
  return res.json({ ok: true });
}

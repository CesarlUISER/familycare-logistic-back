// backend/src/controllers/usuarioController.js
import bcrypt from "bcryptjs";
import Usuario from "../models/Usuario.js";

function limpiarUsuario(usuarioInstance) {
  const u = usuarioInstance.toJSON();
  delete u.password_hash;
  return u;
}

function generarPasswordTemporal(longitud = 8) {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pass = "";
  for (let i = 0; i < longitud; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

// GET /api/usuarios
export const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      order: [["id", "ASC"]],
    });

    res.json({
      ok: true,
      data: usuarios.map(limpiarUsuario),
    });
  } catch (err) {
    console.error("❌ Error al listar usuarios:", err);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
};

// POST /api/usuarios
export const crearUsuario = async (req, res) => {
  try {
    const {
      nombre,
      email,
      rol = "empleado",
      activo = true,
      perm_inventario = true,
      perm_entradas = true,
      perm_salidas = true,
      perm_caducidades = true,
      perm_reportes = true,
      perm_usuarios = false,
      password, // opcional, si no se manda generamos uno temporal
    } = req.body;

    if (!nombre || !email) {
      return res
        .status(400)
        .json({ error: "Nombre y correo electrónico son obligatorios" });
    }

    const existente = await Usuario.findOne({ where: { email } });
    if (existente) {
      return res
        .status(409)
        .json({ error: "Ya existe un usuario con ese correo electrónico" });
    }

    const passwordTemporal = password || generarPasswordTemporal(8);
    const password_hash = await bcrypt.hash(passwordTemporal, 10);

    const nuevo = await Usuario.create({
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      password_hash,
      rol,
      activo: Boolean(activo),
      perm_inventario: Boolean(perm_inventario),
      perm_entradas: Boolean(perm_entradas),
      perm_salidas: Boolean(perm_salidas),
      perm_caducidades: Boolean(perm_caducidades),
      perm_reportes: Boolean(perm_reportes),
      perm_usuarios: Boolean(perm_usuarios),
    });

    res.status(201).json({
      ok: true,
      usuario: limpiarUsuario(nuevo),
      password_temporal: passwordTemporal,
    });
  } catch (err) {
    console.error("❌ Error al crear usuario:", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
};

// PATCH /api/usuarios/:id
export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Evitar que alguien se quite a sí mismo el rol admin sin querer (opcional)
    if (
      usuario.id === req.user.id &&
      req.body.rol &&
      req.body.rol !== usuario.rol
    ) {
      return res
        .status(400)
        .json({ error: "No puedes cambiar tu propio rol en este momento" });
    }

    const camposEditables = [
      "nombre",
      "email",
      "rol",
      "activo",
      "perm_inventario",
      "perm_entradas",
      "perm_salidas",
      "perm_caducidades",
      "perm_reportes",
      "perm_usuarios",
    ];

    const updates = {};
    for (const campo of camposEditables) {
      if (campo in req.body) {
        updates[campo] = req.body[campo];
      }
    }

    if (updates.email) {
      updates.email = updates.email.trim().toLowerCase();
      // opcional: validar que no duplique otro correo
    }

    await usuario.update(updates);

    res.json({
      ok: true,
      usuario: limpiarUsuario(usuario),
    });
  } catch (err) {
    console.error("❌ Error al actualizar usuario:", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
};

// POST /api/usuarios/:id/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByPk(id);

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const passwordTemporal = generarPasswordTemporal(8);
    usuario.password_hash = await bcrypt.hash(passwordTemporal, 10);
    await usuario.save();

    res.json({
      ok: true,
      usuario: limpiarUsuario(usuario),
      password_temporal: passwordTemporal,
    });
  } catch (err) {
    console.error("❌ Error al resetear contraseña:", err);
    res.status(500).json({ error: "Error al resetear contraseña" });
  }
};

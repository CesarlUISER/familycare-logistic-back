// backend/src/routes/usuarioRoutes.js
import express from "express";
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  resetPassword,
} from "../controllers/usuarioController.js";

const router = express.Router();

// GET /api/usuarios
router.get("/", listarUsuarios);

// POST /api/usuarios
router.post("/", crearUsuario);

// PATCH /api/usuarios/:id
router.patch("/:id", actualizarUsuario);

// POST /api/usuarios/:id/reset-password
router.post("/:id/reset-password", resetPassword);

export default router;

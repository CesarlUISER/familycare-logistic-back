// backend/src/routes/movimientoRoutes.js
import express from "express";
import {
  crearMovimiento,
  listarMovimientos,
  registrarEntradaConCaducidad, // 👈 nuevo import
} from "../controllers/movimientoController.js";

const router = express.Router();

// 🔹 Registrar entrada con lote y caducidad
router.post("/entrada", registrarEntradaConCaducidad);

// 🔹 Crear movimiento genérico (entrada/salida)
router.post("/", crearMovimiento);

// 🔹 Listar movimientos (opcional filtro por medicamento_id)
router.get("/", listarMovimientos);

export default router;

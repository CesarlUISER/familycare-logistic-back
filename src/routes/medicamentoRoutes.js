// backend/src/routes/medicamentoRoutes.js
import express from "express";
import {
  obtenerMedicamentos,
  obtenerPorCodigoBarras,  // 👈 añadimos import
  obtenerMedicamentoPorId,
  crearMedicamento,
  actualizarMedicamento,
  actualizarMedicamentoParcial,
  ajustarStock,
  alertasMedicamentos,
  eliminarMedicamento,
} from "../controllers/medicamentoController.js";

const router = express.Router();

// 📦 Buscar medicamento por código de barras
router.get("/by-barcode/:code", obtenerPorCodigoBarras);

// 🚨 Alerta de medicamentos (caducidad / stock bajo)
router.get("/alertas/listado", alertasMedicamentos);

// 🔍 Obtener todos los medicamentos (con paginado)
router.get("/", obtenerMedicamentos);

// ✅ Obtener un medicamento por ID
router.get("/:id", obtenerMedicamentoPorId);

// ➕ Crear un nuevo medicamento
router.post("/", crearMedicamento);

// ✏️ Actualizar un medicamento completo
router.put("/:id", actualizarMedicamento);

// 🩹 Actualizar parcialmente un medicamento
router.patch("/:id", actualizarMedicamentoParcial);

// 🔼 Ajustar stock con delta (positivo/negativo)
router.patch("/:id/ajustar-stock", ajustarStock);

// 🗑️ Eliminar un medicamento
router.delete("/:id", eliminarMedicamento);

export default router;

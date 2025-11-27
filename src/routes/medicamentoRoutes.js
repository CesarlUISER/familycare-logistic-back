// backend/src/routes/medicamentoRoutes.js
import express from "express";
import {
  obtenerMedicamentos,
  obtenerPorCodigoBarras,
  obtenerMedicamentoPorId,
  crearMedicamento,
  actualizarMedicamento,
  actualizarMedicamentoParcial,
  ajustarStock,
  alertasMedicamentos,
  eliminarMedicamento,
  reactivarMedicamento,
} from "../controllers/medicamentoController.js";

const router = express.Router();

router.get("/by-barcode/:code", obtenerPorCodigoBarras);
router.get("/alertas/listado", alertasMedicamentos);

router.get("/", obtenerMedicamentos);
router.get("/:id", obtenerMedicamentoPorId);

router.post("/", crearMedicamento);

router.put("/:id", actualizarMedicamento);
router.patch("/:id", actualizarMedicamentoParcial);

router.patch("/:id/ajustar-stock", ajustarStock);

router.delete("/:id", eliminarMedicamento);

// reactivar explícito (por si lo usas)
router.patch("/:id/reactivar", reactivarMedicamento);

export default router;

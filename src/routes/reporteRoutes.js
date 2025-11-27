import express from "express";
import {
  reporteMensual,
  inventarioActual,
  expirations
} from "../controllers/reporteController.js";

const router = express.Router();

// Inventario actual
router.get("/stock", inventarioActual);

// Próximos a caducar
router.get("/expirations", expirations);

// Reporte mensual
router.get("/mensual", reporteMensual);

export default router;

// backend/src/routes/reporteRoutes.js
import express from "express";
import { reporteMensual, stockActual } from "../controllers/reporteController.js";

const router = express.Router();

router.get("/mensual", reporteMensual);
router.get("/stock", stockActual);

export default router;

// backend/src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";

// Si alguna de estas rutas aún no existe, déjalas COMENTADAS.
import medicamentoRoutes from "./routes/medicamentoRoutes.js";
import categoriaRoutes from "./routes/categoriaRoutes.js";
import proveedorRoutes from "./routes/proveedorRoutes.js";
import movimientoRoutes from "./routes/movimientoRoutes.js";
import reporteRoutes from "./routes/reporteRoutes.js";  

dotenv.config();

const app = express();

// Middlewares base
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "familycare-api", ts: Date.now() });
});

// Rutas
app.use("/api/auth", authRoutes);

// ⚠️ Si todavía no tienes estas rutas listas, comenta estas 4 líneas:
app.use("/api/medicamentos", medicamentoRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/proveedores", proveedorRoutes);
app.use("/api/movimientos", movimientoRoutes);
app.use("/api/reportes", reporteRoutes);     
// 👇 ESTA LÍNEA ES CLAVE para resolver tu error
export default app;

// backend/src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";

import medicamentoRoutes from "./routes/medicamentoRoutes.js";
import categoriaRoutes from "./routes/categoriaRoutes.js";
import proveedorRoutes from "./routes/proveedorRoutes.js";
import movimientoRoutes from "./routes/movimientoRoutes.js";
import reporteRoutes from "./routes/reporteRoutes.js";
import usuarioRoutes from "./routes/usuarioRoutes.js";

import { requireAuth } from "./middlewares/authMiddleware.js";
import { requirePerm } from "./middlewares/permMiddleware.js";

dotenv.config();

const app = express();

// Middlewares base
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://familycare-logistic-front.onrender.com",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  })
);

// Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "familycare-api", ts: Date.now() });
});

// Rutas públicas
app.use("/api/auth", authRoutes);

// Rutas protegidas
app.use("/api/medicamentos", requireAuth, medicamentoRoutes);
app.use("/api/categorias", requireAuth, categoriaRoutes);
app.use("/api/proveedores", requireAuth, proveedorRoutes);
app.use("/api/movimientos", requireAuth, movimientoRoutes);
app.use("/api/reportes", requireAuth, reporteRoutes);

// 👉 Usuarios (solo quien tenga perm_usuarios)
app.use(
  "/api/usuarios",
  requireAuth,
  requirePerm("perm_usuarios"),
  usuarioRoutes
);

export default app;

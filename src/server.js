// backend/src/server.js
import dotenv from "dotenv";
import app from "./app.js";
import sequelize from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexión con MySQL verificada correctamente.");

    await sequelize.sync({ alter: true });
    console.log("🧱 Modelos sincronizados con la base de datos.");

    app.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error al conectar o sincronizar la base de datos:", err);
    process.exit(1);
  }
}

startServer();

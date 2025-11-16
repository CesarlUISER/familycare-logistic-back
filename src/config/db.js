import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config(); // Carga las variables del archivo .env

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false, // Desactiva logs SQL en consola
  }
);

try {
  await sequelize.authenticate();
  console.log('✅ Conexión a MySQL establecida correctamente.');
} catch (error) {
  console.error('❌ Error al conectar con MySQL:', error);
}

export default sequelize;

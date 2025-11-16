import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Categoria = sequelize.define('Categoria', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  descripcion: { type: DataTypes.STRING(255) },
}, {
  tableName: 'categorias',
  timestamps: false,
});

export default Categoria;

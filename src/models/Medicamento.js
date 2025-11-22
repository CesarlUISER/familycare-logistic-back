// backend/src/models/Medicamento.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Categoria from './Categoria.js';
import Lote from './Lote.js';

const Medicamento = sequelize.define('Medicamento', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  codigo_barras: {
    type: DataTypes.STRING(32),
    allowNull: true,
    unique: true,
    comment: 'EAN/UPC/GS1-128',
  },
  fecha_caducidad: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categorias',
      key: 'id',
    },
  },

  // 🔹 NUEVO: activo / inactivo
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'medicamentos',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['codigo_barras'] },
  ],
});

// 🔹 Asociación con Lote
Medicamento.hasMany(Lote, {
  foreignKey: 'medicamento_id',
  as: 'lotes',
});

Lote.belongsTo(Medicamento, {
  foreignKey: 'medicamento_id',
  as: 'medicamento',
});

// 🔹 Asociación con Categoria
Medicamento.belongsTo(Categoria, {
  foreignKey: 'categoria_id',
  as: 'categoria',
});

export default Medicamento;

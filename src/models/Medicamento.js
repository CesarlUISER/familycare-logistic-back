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
    allowNull: true,        // puedes dejarlo true si permites productos sin código
    unique: true,           // Sequelize sabe que es único (usa el índice que ya existe)
    comment: 'EAN/UPC/GS1-128',
  },
  fecha_caducidad: {
    type: DataTypes.DATE,
    allowNull: true,        // 👈 importante: debe coincidir con DATE NULL de la BD
  },
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categorias',
      key: 'id',
    },
  },
}, {
  tableName: 'medicamentos',
  timestamps: false,
  // 👇 quitamos el bloque indexes para no intentar crear otro índice único duplicado
  // indexes: [
  //   { unique: true, fields: ['codigo_barras'] },
  // ],
});

// Relaciones
Medicamento.hasMany(Lote, {
  foreignKey: 'medicamento_id',
  as: 'lotes',
});

Lote.belongsTo(Medicamento, {
  foreignKey: 'medicamento_id',
  as: 'medicamento',
});

export default Medicamento;

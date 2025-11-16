import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Proveedor = sequelize.define('Proveedor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: { isEmail: true },
  },
  direccion: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
}, {
  tableName: 'proveedores',
  timestamps: false,
});

export default Proveedor;

// backend/src/models/Usuario.js
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class Usuario extends Model {}

Usuario.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    rol: {
      type: DataTypes.ENUM("admin", "empleado"),
      allowNull: false,
      defaultValue: "empleado",
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    // Permisos por módulo
    perm_inventario: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    perm_entradas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    perm_salidas: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    perm_caducidades: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    perm_reportes: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    perm_usuarios: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false, // normalmente solo el doctor
    },
  },
  {
    sequelize,
    modelName: "Usuario",
    tableName: "usuarios",
    underscored: true,
  }
);

export default Usuario;

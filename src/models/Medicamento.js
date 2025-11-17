// backend/src/models/Medicamento.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Categoria from "./Categoria.js";
import Lote from "./Lote.js";

const Medicamento = sequelize.define(
  "Medicamento",
  {
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
      allowNull: true, // puede ser null cuando no tenga código
      unique: true,
      comment: "EAN/UPC/GS1-128",
    },
    fecha_caducidad: {
      // solo día/mes/año -> en DB es DATE
      type: DataTypes.DATE,
      allowNull: true, // en la tabla lo tenemos como NULL permitido
    },
    categoria_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "categorias",
        key: "id",
      },
    },
  },
  {
    tableName: "medicamentos",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["codigo_barras"],
      },
    ],
  }
);

/**
 * ASOCIACIONES
 */

// Medicamento → pertenece a una categoría
Medicamento.belongsTo(Categoria, {
  foreignKey: "categoria_id",
  as: "categoria",
});

// Categoría → tiene muchos medicamentos (opcional, pero útil)
Categoria.hasMany(Medicamento, {
  foreignKey: "categoria_id",
  as: "medicamentos",
});

// Medicamento → tiene muchos lotes
Medicamento.hasMany(Lote, {
  foreignKey: "medicamento_id",
  as: "lotes",
});

// Lote → pertenece a un medicamento
Lote.belongsTo(Medicamento, {
  foreignKey: "medicamento_id",
  as: "medicamento",
});

export default Medicamento;

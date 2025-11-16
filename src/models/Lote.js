// backend/src/models/Lote.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Medicamento from "./Medicamento.js";

const Lote = sequelize.define(
  "Lote",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    medicamento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "medicamentos",  // Aquí nos aseguramos que sea referenciado correctamente
        key: "id",
      },
      comment: "Referencia al medicamento principal",
    },

    codigo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: "Código de lote impreso en la caja o frasco",
    },

    caducidad: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Fecha de caducidad de este lote",
    },

    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Cantidad disponible de este lote",
    },
  },
  {
    tableName: "lotes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

// No debes definir la relación en el mismo archivo para evitar el error circular
// Las relaciones deben estar solo definidas en el archivo principal (por ejemplo, `index.js` o donde se inicialicen los modelos)

export default Lote;

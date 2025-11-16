import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import Medicamento from "./Medicamento.js";
import Lote from "./Lote.js";

const MovimientoStock = sequelize.define(
  "MovimientoStock",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    medicamento_id: { type: DataTypes.INTEGER, allowNull: false },

    tipo: { type: DataTypes.ENUM("entrada", "salida"), allowNull: false },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },

    motivo: { type: DataTypes.STRING, allowNull: true },
    documento_ref: { type: DataTypes.STRING, allowNull: true },

    // FK formal al lote
    lote_id: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: "movimientos_stock",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

// Relaciones
MovimientoStock.belongsTo(Medicamento, {
  foreignKey: "medicamento_id",
  as: "medicamento",
});
Medicamento.hasMany(MovimientoStock, {
  foreignKey: "medicamento_id",
  as: "movimientos",
});

// Relación con Lote
MovimientoStock.belongsTo(Lote, { foreignKey: "lote_id", as: "lote" });
Lote.hasMany(MovimientoStock, { foreignKey: "lote_id", as: "movimientos" });

export default MovimientoStock;

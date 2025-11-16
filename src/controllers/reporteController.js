// backend/src/controllers/reporteController.js
import { Op, fn, col, literal } from "sequelize";
import Medicamento from "../models/Medicamento.js";
import MovimientoStock from "../models/MovimientoStock.js";

// Utilidad: rango del mes (YYYY-MM)
function rangoMes(yyyyMm) {
  const [year, month] = String(yyyyMm).split("-").map(Number);
  const inicio = new Date(year, month - 1, 1);
  const fin = new Date(year, month, 0, 23, 59, 59);
  return { inicio, fin };
}

/** =========================
 *  REPORTE MENSUAL
 *  ========================= */
export const reporteMensual = async (req, res) => {
  try {
    const mes = req.query.mes || new Date().toISOString().slice(0, 7); // YYYY-MM
    const { inicio, fin } = rangoMes(mes);

    // 1) Totales generales
    const totalMedicamentos = await Medicamento.count();
    const totalStock = await Medicamento.sum("stock");

    // 2) Movimientos del mes
    const movimientos = await MovimientoStock.findAll({
      where: { created_at: { [Op.between]: [inicio, fin] } },
      raw: true,
    });

    const entradas = movimientos.filter((m) => m.tipo === "entrada").length;
    const salidas = movimientos.filter((m) => m.tipo === "salida").length;
    const caducidades = movimientos.filter(
      (m) => m.tipo === "salida" && m.motivo === "caducidad"
    );

    // Pérdida estimada por caducidad
    let perdidaTotal = 0;
    for (const mov of caducidades) {
      const med = await Medicamento.findByPk(mov.medicamento_id);
      if (med) perdidaTotal += (mov.cantidad || 0) * Number(med.precio || 0);
    }

    // 3) Top 5 por cantidad de movimientos (versión a prueba de ONLY_FULL_GROUP_BY)
    //    Paso 1: agrupar y contar por medicamento_id
    const topIds = await MovimientoStock.findAll({
      attributes: [
        "medicamento_id",
        [fn("COUNT", col("id")), "total_movimientos"],
      ],
      where: { created_at: { [Op.between]: [inicio, fin] } },
      group: ["medicamento_id"],
      order: [[literal("total_movimientos"), "DESC"]],
      limit: 5,
      raw: true,
    });

    //    Paso 2: traer nombres de medicamentos y armar resultado final
    let top = [];
    if (topIds.length) {
      const ids = topIds.map((r) => r.medicamento_id);
      const meds = await Medicamento.findAll({
        where: { id: ids },
        attributes: ["id", "nombre"],
        raw: true,
      });
      const mapNombre = new Map(meds.map((m) => [m.id, m.nombre]));
      top = topIds.map((r) => ({
        medicamento_id: r.medicamento_id,
        total_movimientos: Number(r.total_movimientos || 0),
        medicamento: {
          id: r.medicamento_id,
          nombre: mapNombre.get(r.medicamento_id) || `#${r.medicamento_id}`,
        },
      }));
    }

    // 4) Próximos a caducar (30 días)
    const hoy = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 30);
    const proximos = await Medicamento.findAll({
      where: { fecha_caducidad: { [Op.between]: [hoy, limite] } },
      attributes: ["id", "nombre", "fecha_caducidad", "stock"],
      order: [["fecha_caducidad", "ASC"]],
    });

    res.json({
      mes,
      resumen: {
        totalMedicamentos,
        totalStock,
        entradas,
        salidas,
        caducidades: caducidades.length,
        perdidaTotal,
      },
      top,
      proximos,
    });
  } catch (e) {
    console.error("❌ Error al generar reporte mensual:", e);
    res.status(500).json({ error: "Error al generar el reporte mensual" });
  }
};

/** =========================
 *  INVENTARIO ACTUAL (listado + totales)
 *  ========================= */
export const stockActual = async (req, res) => {
  try {
    const {
      q = "",
      page = 1,
      limit = 20,
      sort = "nombre",
      order = "ASC",
      min_stock,
      max_stock,
    } = req.query;

    const where = {};
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${q}%` } },
        { codigo_barras: { [Op.like]: `%${q}%` } },
      ];
    }
    if (min_stock !== undefined || max_stock !== undefined) {
      where.stock = {};
      if (min_stock !== undefined) where.stock[Op.gte] = Number(min_stock);
      if (max_stock !== undefined) where.stock[Op.lte] = Number(max_stock);
    }

    const pageN = Math.max(1, Number(page));
    const limitN = Math.max(1, Number(limit));
    const offset = (pageN - 1) * limitN;
    const sortCol = ["id", "nombre", "stock", "precio", "fecha_caducidad", "codigo_barras"].includes(sort)
      ? sort
      : "nombre";
    const ord = String(order).toUpperCase() === "DESC" ? "DESC" : "ASC";

    const { rows, count } = await Medicamento.findAndCountAll({
      where,
      limit: limitN,
      offset,
      order: [[sortCol, ord]],
      attributes: ["id", "nombre", "codigo_barras", "stock", "precio", "fecha_caducidad"],
      raw: true,
    });

    const all = await Medicamento.findAll({ where, attributes: ["stock", "precio"], raw: true });
    const items = count;
    const units = all.reduce((a, m) => a + (m.stock || 0), 0);
    const value = all.reduce((a, m) => a + (m.stock || 0) * Number(m.precio || 0), 0);

    res.json({
      page: pageN,
      limit: limitN,
      total: count,
      items,
      units,
      value,
      data: rows,
    });
  } catch (e) {
    console.error("❌ Error en stockActual:", e);
    res.status(500).json({ error: "Error al obtener el inventario actual" });
  }
};

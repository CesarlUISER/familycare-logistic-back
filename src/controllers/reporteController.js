// backend/src/controllers/reporteController.js
import { Op, fn, col, literal } from "sequelize";
import Medicamento from "../models/Medicamento.js";
import MovimientoStock from "../models/MovimientoStock.js";
import Lote from "../models/Lote.js";

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

    // 3) Top 5 por cantidad de movimientos
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

    // 4) Próximos a caducar (30 días) - este se usa solo en Reporte mensual
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
 *  INVENTARIO ACTUAL
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
    const sortCol = [
      "id",
      "nombre",
      "stock",
      "precio",
      "fecha_caducidad",
      "codigo_barras",
    ].includes(sort)
      ? sort
      : "nombre";
    const ord = String(order).toUpperCase() === "DESC" ? "DESC" : "ASC";

    const { rows } = await Medicamento.findAndCountAll({
      where,
      limit: limitN,
      offset,
      order: [[sortCol, ord]],
      attributes: [
        "id",
        "nombre",
        "descripcion",
        "codigo_barras",
        "stock",
        "precio",
        "fecha_caducidad",
        "activo",
      ],
      raw: true,
    });

    res.json({ data: rows });
  } catch (e) {
    console.error("❌ Error en stockActual:", e);
    res.status(500).json({ error: "Error al obtener el inventario actual" });
  }
};

/** =========================
 *  CADUCIDADES (pantalla aparte)
 *  =========================
 *  - Toma LOTES con caducidad futura y stock > 0
 *  - Además, toma MEDICAMENTOS que tengan fecha_caducidad y stock > 0
 *    y que no tengan lotes (datos antiguos).
 */
export const expirations = async (req, res) => {
  try {
    const hoy = new Date();

    // 1) Lotes con caducidad futura y stock > 0
    const lotes = await Lote.findAll({
      where: {
        caducidad: { [Op.gte]: hoy },
        stock: { [Op.gt]: 0 },
      },
      include: [
        {
          model: Medicamento,
          as: "medicamento",
          attributes: ["id", "nombre", "codigo_barras"],
        },
      ],
      order: [
        ["caducidad", "ASC"],
        ["id", "ASC"],
      ],
    });

    const fromLotes = lotes.map((l) => ({
      medicamento_id: l.medicamento_id,
      medicamento_nombre: l.medicamento?.nombre || "",
      codigo_barras: l.medicamento?.codigo_barras || "",
      lote_codigo: l.codigo,
      fecha_caducidad: l.caducidad,
      stock: l.stock || 0,
    }));

    // 2) Medicamentos con fecha_caducidad y stock>0 pero sin lotes (datos viejos)
    const idsConLote = new Set(lotes.map((l) => l.medicamento_id));

    const meds = await Medicamento.findAll({
      where: {
        fecha_caducidad: { [Op.gte]: hoy },
        stock: { [Op.gt]: 0 },
      },
      attributes: ["id", "nombre", "codigo_barras", "fecha_caducidad", "stock"],
      raw: true,
    });

    const fromMeds = meds
      .filter((m) => !idsConLote.has(m.id))
      .map((m) => ({
        medicamento_id: m.id,
        medicamento_nombre: m.nombre,
        codigo_barras: m.codigo_barras || "",
        lote_codigo: null,
        fecha_caducidad: m.fecha_caducidad,
        stock: m.stock || 0,
      }));

    // 3) Unimos y ordenamos por fecha de caducidad
    const data = [...fromLotes, ...fromMeds].sort((a, b) => {
      const da = a.fecha_caducidad ? new Date(a.fecha_caducidad).getTime() : 0;
      const db = b.fecha_caducidad ? new Date(b.fecha_caducidad).getTime() : 0;
      return da - db;
    });

    return res.json({ ok: true, data });
  } catch (e) {
    console.error("❌ Error en expirations:", e);
    return res
      .status(500)
      .json({ ok: false, error: "Error al obtener próximos a caducar" });
  }
};

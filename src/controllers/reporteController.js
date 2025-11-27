// backend/src/controllers/reporteController.js
import { Op, fn, col, literal } from "sequelize";
import Medicamento from "../models/Medicamento.js";
import MovimientoStock from "../models/MovimientoStock.js";
import Lote from "../models/Lote.js";

/** =========================
 *  Helpers
 *  ========================= */

// Rango de un mes (YYYY-MM)
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

    // 4) Próximos a caducar en 30 días (solo para el reporte mensual)
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
 *  =========================
 *  Incluye campo calculado:
 *  - a_resurtir: cantidad sugerida a resurtir
 *    basado en consumo de los últimos 14 días
 *    y cobertura de 14 días hacia adelante.
 *  Fórmula:
 *    consumo_14d = SUM(salidas últimos 14 días)
 *    cpd = consumo_14d / 14
 *    stockObjetivo = cpd * 14
 *    a_resurtir = max(0, ceil(stockObjetivo - stockActual))
 */
export const inventarioActual = async (req, res) => {
  try {
    // 1) Traemos todos los medicamentos
    const meds = await Medicamento.findAll({
      attributes: ["id", "nombre", "descripcion", "precio", "stock", "activo"],
      order: [["nombre", "ASC"]],
    });

    // 2) Obtenemos el consumo (salidas) de los últimos 14 días, agrupado por medicamento
    const hoy = new Date();
    const hace14 = new Date();
    hace14.setDate(hoy.getDate() - 14);

    const consumos = await MovimientoStock.findAll({
      attributes: [
        "medicamento_id",
        [fn("SUM", col("cantidad")), "consumo_14d"],
      ],
      where: {
        tipo: "salida",
        created_at: { [Op.between]: [hace14, hoy] },
      },
      group: ["medicamento_id"],
      raw: true,
    });

    const mapConsumo = new Map();
    for (const row of consumos) {
      mapConsumo.set(
        row.medicamento_id,
        Number(row.consumo_14d || 0)
      );
    }

    const diasHistorial = 14;
    const diasCobertura = 14;

    // 3) Calculamos a_resurtir por cada medicamento
    const medsConCalculo = meds.map((m) => {
      const stockActual = m.stock ?? 0;
      const consumoVentana = mapConsumo.get(m.id) ?? 0;

      const cpd =
        diasHistorial > 0 ? consumoVentana / diasHistorial : 0; // consumo promedio diario
      const stockObjetivo = cpd * diasCobertura;

      let aResurtir = 0;
      if (stockObjetivo > 0) {
        const diff = stockObjetivo - stockActual;
        aResurtir = diff > 0 ? Math.ceil(diff) : 0;
      }

      // Campo virtual que se incluirá en el JSON
      m.setDataValue("a_resurtir", aResurtir);

      return m;
    });

    // 4) Totales
    const items = medsConCalculo.length;
    const units = medsConCalculo.reduce(
      (acc, m) => acc + (m.stock ?? 0),
      0
    );
    const value = medsConCalculo.reduce(
      (acc, m) => acc + (m.stock ?? 0) * Number(m.precio ?? 0),
      0
    );

    return res.json({
      ok: true,
      items,
      units,
      value,
      data: medsConCalculo,
    });
  } catch (err) {
    console.error("❌ Error en inventarioActual:", err);
    return res
      .status(500)
      .json({ ok: false, error: "Error al obtener el inventario actual" });
  }
};

/** =========================
 *  PRÓXIMOS A CADUCAR (para pantalla de caducidades)
 *  ========================= */
export const expirations = async (req, res) => {
  try {
    // 1) LOTES con stock > 0 (no filtramos por fecha aquí)
    const lotes = await Lote.findAll({
      where: {
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

    // 2) MEDICAMENTOS sin lotes (datos viejos o sin control por lote)
    const idsConLote = new Set(lotes.map((l) => l.medicamento_id));

    const meds = await Medicamento.findAll({
      where: {
        stock: { [Op.gt]: 0 },
      },
      attributes: ["id", "nombre", "codigo_barras", "fecha_caducidad", "stock"],
      raw: true,
    });

    const fromMeds = meds
      .filter((m) => !idsConLote.has(m.id) && m.fecha_caducidad)
      .map((m) => ({
        medicamento_id: m.id,
        medicamento_nombre: m.nombre,
        codigo_barras: m.codigo_barras || "",
        lote_codigo: null,
        fecha_caducidad: m.fecha_caducidad,
        stock: m.stock || 0,
      }));

    const data = [...fromLotes, ...fromMeds].sort(
      (a, b) => new Date(a.fecha_caducidad) - new Date(b.fecha_caducidad)
    );

    res.json({ ok: true, data });
  } catch (e) {
    console.error("❌ Error en expirations:", e);
    res
      .status(500)
      .json({ ok: false, error: "Error al obtener próximos a caducar" });
  }
};

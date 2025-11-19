import sequelize from "../config/db.js";
import { Op } from "sequelize";
import Medicamento from "../models/Medicamento.js";
import MovimientoStock from "../models/MovimientoStock.js";
import Lote from "../models/Lote.js"; // Asegúrate de importar Lote también

/**
 * Normaliza una fecha en formato YYYY-MM-DD a Date, o null si viene vacía.
 */
function toDateOrNull(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    // Asegurarse de que la fecha es válida y no sea "0000-00-00 00:00:00"
    return Number.isNaN(d.getTime()) || value === "0000-00-00 00:00:00" ? null : d;
  } catch {
    return null;
  }
}




/**
 * Busca (o crea) un lote por combinación:
 *  - medicamento_id
 *  - codigo (puede ser null)
 *  - caducidad (puede ser null)
 */
async function findOrCreateLote({ medicamentoId, codigo, caducidad }, t) {
  const where = {
    medicamento_id: medicamentoId,
    codigo: codigo ?? null,
    caducidad: caducidad ?? null,
  };

  let lote = await Lote.findOne({ where, transaction: t });
  if (!lote) {
    lote = await Lote.create(
      {
        medicamento_id: medicamentoId,
        codigo: codigo ?? null,
        caducidad: caducidad ?? null,
        stock: 0,
      },
      { transaction: t }
    );
  }
  return lote;
}

/**
 * POST /api/movimientos
 * Crea un movimiento genérico (entrada | salida) y ajusta stock.
 */
export const crearMovimiento = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      medicamento_id,
      codigo_barras,   // 👈 NUEVO: para usar el lector de código de barras
      tipo,
      cantidad,
      motivo,
      documento_ref,
      lote,       // código del lote (opcional)
      caducidad,  // YYYY-MM-DD (opcional)
    } = req.body;

    if (!["entrada", "salida"].includes(tipo)) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "tipo debe ser 'entrada' o 'salida'" });
    }

    const cantN = Number(cantidad);
    if (!Number.isInteger(cantN) || cantN <= 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "cantidad debe ser entero positivo" });
    }

    // 🔍 Buscar medicamento por ID o por código de barras
    let med = null;

    if (medicamento_id) {
      med = await Medicamento.findByPk(medicamento_id, { transaction: t });
    } else if (codigo_barras) {
      med = await Medicamento.findOne({
        where: { codigo_barras },
        transaction: t,
      });
    }

    if (!med) {
      await t.rollback();
      return res
        .status(404)
        .json({ error: "Medicamento no encontrado (id o código de barras)" });
    }

    // ENTRADA
    if (tipo === "entrada") {
      const cadDate = toDateOrNull(caducidad); // Aquí se valida la fecha
      const loteRow = await findOrCreateLote(
        { medicamentoId: med.id, codigo: lote, caducidad: cadDate },
        t
      );

      // Actualiza stocks
      await loteRow.update(
        { stock: (loteRow.stock ?? 0) + cantN },
        { transaction: t }
      );
      await med.update(
        { stock: (med.stock ?? 0) + cantN },
        { transaction: t }
      );

      // Movimiento
      const mov = await MovimientoStock.create(
        {
          medicamento_id: med.id,
          tipo: "entrada",
          cantidad: cantN,
          motivo: motivo || "compra",
          documento_ref: documento_ref || null,
          lote_id: loteRow.id, // FK formal al lote
        },
        { transaction: t }
      );

      await t.commit();
      return res.status(201).json({
        ok: true,
        movimiento: mov,
        medicamento: { id: med.id, nombre: med.nombre, stock: med.stock },
        lote: {
          id: loteRow.id,
          codigo: loteRow.codigo,
          caducidad: loteRow.caducidad,
          stock: loteRow.stock,
        },
      });
    }

    // SALIDA
    if ((med.stock ?? 0) < cantN) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "Stock insuficiente para salida" });
    }

    let restante = cantN;
    let movimientosDetalle = [];
    let lotesAfectados = [];

    if (lote) {
      // Salida de un lote específico
      const cadDate = toDateOrNull(caducidad); // Aquí se valida la fecha
      const loteRow = await Lote.findOne({
        where: {
          medicamento_id: med.id,
          codigo: lote,
          ...(cadDate ? { caducidad: cadDate } : {}),
        },
        transaction: t,
      });

      if (!loteRow) {
        await t.rollback();
        return res
          .status(404)
          .json({ error: "Lote no encontrado para salida" });
      }
      if ((loteRow.stock ?? 0) < restante) {
        await t.rollback();
        return res.status(400).json({
          error: "Stock insuficiente en el lote indicado",
        });
      }

      await loteRow.update(
        { stock: loteRow.stock - restante },
        { transaction: t }
      );
      await med.update(
        { stock: med.stock - restante },
        { transaction: t }
      );

      const mov = await MovimientoStock.create(
        {
          medicamento_id: med.id,
          tipo: "salida",
          cantidad: restante,
          motivo: motivo || "venta",
          documento_ref: documento_ref || null,
          lote_id: loteRow.id,
        },
        { transaction: t }
      );

      movimientosDetalle.push(mov);
      lotesAfectados.push({
        id: loteRow.id,
        codigo: loteRow.codigo,
        caducidad: loteRow.caducidad,
        stock: loteRow.stock,
      });

      await t.commit();
      return res.status(201).json({
        ok: true,
        movimientos: movimientosDetalle,
        medicamento: { id: med.id, nombre: med.nombre, stock: med.stock },
        lotes: lotesAfectados,
      });
    }

    // FEFO: consumir del lote con caducidad más próxima
    const lotes = await Lote.findAll({
      where: { medicamento_id: med.id },
      order: [
        [sequelize.literal("caducidad IS NULL"), "ASC"],
        ["caducidad", "ASC"],
        ["id", "ASC"],
      ],
      transaction: t,
    });

    for (const l of lotes) {
      if (restante <= 0) break;
      const disp = l.stock ?? 0;
      if (disp <= 0) continue;

      const toTake = Math.min(restante, disp);

      await l.update({ stock: disp - toTake }, { transaction: t });
      await med.update(
        { stock: (med.stock ?? 0) - toTake },
        { transaction: t }
      );

      const mov = await MovimientoStock.create(
        {
          medicamento_id: med.id,
          tipo: "salida",
          cantidad: toTake,
          motivo: motivo || "venta",
          documento_ref: documento_ref || null,
          lote_id: l.id,
        },
        { transaction: t }
      );

      movimientosDetalle.push(mov);
      lotesAfectados.push({
        id: l.id,
        codigo: l.codigo,
        caducidad: l.caducidad,
        stock: l.stock - toTake,
      });

      restante -= toTake;
    }

    if (restante > 0) {
      await t.rollback();
      return res
        .status(500)
        .json({ error: "No se pudo completar la salida" });
    }

    await t.commit();
    return res.status(201).json({
      ok: true,
      movimientos: movimientosDetalle,
      medicamento: { id: med.id, nombre: med.nombre, stock: med.stock },
      lotes: lotesAfectados,
    });
  } catch (e) {
    await t.rollback();
    console.error("❌ Error al crear movimiento:", e);
    return res.status(500).json({ error: "Error al crear el movimiento" });
  }
};

/**
 * POST /api/movimientos/entrada
 * Azúcar sintáctica para registrar ENTRADA con lote y caducidad.
 * Body: { medicamentoId, cantidad, lote?, caducidad?, motivo?, documento_ref? }
 */
export const registrarEntradaConCaducidad = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { medicamentoId, cantidad, lote, caducidad, motivo, documento_ref } = req.body;

    const cantN = Number(cantidad);
    if (!Number.isInteger(cantN) || cantN <= 0) {
      await t.rollback();
      return res.status(400).json({ error: "cantidad debe ser entero positivo" });
    }

    const med = await Medicamento.findByPk(medicamentoId, { transaction: t });
    if (!med) {
      await t.rollback();
      return res.status(404).json({ error: "Medicamento no encontrado" });
    }

    const cadDate = toDateOrNull(caducidad);
    const loteRow = await findOrCreateLote(
      { medicamentoId: med.id, codigo: lote, caducidad: cadDate },
      t
    );

    await loteRow.update({ stock: (loteRow.stock ?? 0) + cantN }, { transaction: t });
    await med.update({ stock: (med.stock ?? 0) + cantN }, { transaction: t });

    const mov = await MovimientoStock.create(
      {
        medicamento_id: med.id,
        tipo: "entrada",
        cantidad: cantN,
        motivo: motivo || "compra",
        documento_ref: documento_ref || null,
        lote: lote ?? null,
        caducidad: cadDate ?? null,
        lote_id: loteRow.id,
      },
      { transaction: t }
    );

    await t.commit();
    return res.json({
      ok: true,
      movimiento: mov,
      stock: med.stock,
      lote: {
        id: loteRow.id,
        codigo: loteRow.codigo,
        caducidad: loteRow.caducidad,
        stock: loteRow.stock,
      },
    });
  } catch (e) {
    await t.rollback();
    console.error("❌ Error al registrar entrada:", e);
    return res.status(500).json({ error: "Error al registrar la entrada" });
  }
};

// al inicio del archivo ya debes tener:
// import { Op } from "sequelize";
// import MovimientoStock from "../models/MovimientoStock.js";
// import Medicamento from "../models/Medicamento.js";
// import Lote from "../models/Lote.js";

function normalizarTipo(tipoRaw) {
  if (!tipoRaw) return null;
  const t = String(tipoRaw).toLowerCase();

  if (t === "entrada" || t === "entradas") return "entrada";
  if (t === "salida" || t === "salidas") return "salida";

  // "todos" u otra cosa => sin filtro
  return null;
}

function parseFecha(fechaRaw, finDelDia = false) {
  if (!fechaRaw) return null;

  const str = String(fechaRaw).trim();

  // Formato ISO: 2025-11-19
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + "T00:00:00");
    if (finDelDia) d.setHours(23, 59, 59, 999);
    return d;
  }

  // Formato dd/mm/yyyy: 19/11/2025
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split("/");
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (finDelDia) d.setHours(23, 59, 59, 999);
    return d;
  }

  // Último intento: lo que entienda Date()
  const t = Date.parse(str);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    if (finDelDia) d.setHours(23, 59, 59, 999);
    return d;
  }

  return null;
}

export const listarMovimientos = async (req, res) => {
  try {
    const { tipo: tipoRaw, desde, hasta } = req.query;

    const where = {};

    // 🔹 Tipo de movimiento (entrada / salida / todos)
    const tipo = normalizarTipo(tipoRaw);
    if (tipo) {
      where.tipo = tipo; // "entrada" o "salida"
    }

    // 🔹 Filtro por rango de fechas en created_at
    const fechaDesde = parseFecha(desde, false);
    const fechaHasta = parseFecha(hasta, true);

    if (fechaDesde || fechaHasta) {
      where.created_at = {};
      if (fechaDesde) where.created_at[Op.gte] = fechaDesde;
      if (fechaHasta) where.created_at[Op.lte] = fechaHasta;
    }

    const movimientos = await MovimientoStock.findAll({
      where,
      include: [
        {
          model: Medicamento,
          as: "medicamento",
          attributes: ["id", "nombre", "codigo_barras"],
        },
        {
          model: Lote,
          as: "lote",
          attributes: ["id", "codigo", "caducidad"], // 👈 OJO: ya NO pedimos stock_lote
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 200,
    });

    res.json({ ok: true, data: movimientos });
  } catch (err) {
    console.error("❌ Error al listar movimientos:", err);
    res
      .status(500)
      .json({ ok: false, error: "Error al obtener los movimientos" });
  }
};

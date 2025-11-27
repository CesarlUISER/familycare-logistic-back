// backend/src/controllers/medicamentoController.js
import { Op } from "sequelize";
import sequelize from "../config/db.js";

import Medicamento from "../models/Medicamento.js";
import Categoria from "../models/Categoria.js";
import MovimientoStock from "../models/MovimientoStock.js";
import Lote from "../models/Lote.js";

/**
 * GET /api/medicamentos/by-barcode/:code
 */
export const obtenerPorCodigoBarras = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code)
      return res.status(400).json({ message: "Falta parámetro 'code'" });

    const item = await Medicamento.findOne({
      where: { codigo_barras: String(code).trim() },
      include: [
        { model: Categoria, as: "categoria", attributes: ["id", "nombre"] },
      ],
    });

    if (!item)
      return res.status(404).json({ message: "Medicamento no encontrado" });
    return res.json(item);
  } catch (error) {
    console.error("❌ Error al buscar por código de barras:", error);
    return res.status(500).json({ message: "Error al buscar medicamento" });
  }
};

// GET /api/medicamentos/alertas/listado?dias=30&stock=20
export const alertasMedicamentos = async (req, res) => {
  try {
    const dias = Number(req.query.dias ?? 30);
    const stockMin = Number(req.query.stock ?? 20);

    const hoy = new Date();
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + dias);

    const porCaducar = await Medicamento.findAll({
      where: { fecha_caducidad: { [Op.lte]: limite } },
      order: [["fecha_caducidad", "ASC"]],
    });

    const stockBajo = await Medicamento.findAll({
      where: { stock: { [Op.lte]: stockMin } },
      order: [["stock", "ASC"]],
    });

    res.json({ por_caducar: porCaducar, stock_bajo: stockBajo });
  } catch (error) {
    console.error("❌ Error en alertas:", error);
    res.status(500).json({ error: "Error al obtener alertas" });
  }
};

// GET /api/medicamentos
export const obtenerMedicamentos = async (req, res) => {
  try {
    const q = (req.query.q ?? "").trim();
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const sort = String(req.query.sort ?? "id");
    const order =
      String(req.query.order ?? "ASC").toUpperCase() === "DESC"
        ? "DESC"
        : "ASC";

    const offset = (page - 1) * limit;

    const where = {};
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${q}%` } },
        { descripcion: { [Op.like]: `%${q}%` } },
        { codigo_barras: { [Op.like]: `%${q}%` } },
      ];
    }
    if (
      req.query.min_stock !== undefined ||
      req.query.max_stock !== undefined
    ) {
      where.stock = {};
      if (req.query.min_stock !== undefined)
        where.stock[Op.gte] = Number(req.query.min_stock);
      if (req.query.max_stock !== undefined)
        where.stock[Op.lte] = Number(req.query.max_stock);
    }

    const { rows, count } = await Medicamento.findAndCountAll({
      where,
      limit,
      offset,
      order: [[sort, order]],
      include: [
        { model: Categoria, as: "categoria", attributes: ["id", "nombre"] },
      ],
    });

    res.json({
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (error) {
    console.error("❌ Error al obtener medicamentos (paginado):", error);
    res.status(500).json({ error: "Error al obtener los medicamentos" });
  }
};

// GET /api/medicamentos/:id
export const obtenerMedicamentoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const medicamento = await Medicamento.findByPk(id, {
      include: [
        { model: Categoria, as: "categoria", attributes: ["id", "nombre"] },
      ],
    });

    if (!medicamento) {
      return res.status(404).json({ error: "Medicamento no encontrado" });
    }

    res.json(medicamento);
  } catch (error) {
    console.error("❌ Error al obtener medicamento por ID:", error);
    res.status(500).json({ error: "Error al obtener el medicamento" });
  }
};

// POST /api/medicamentos
export const crearMedicamento = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      stock,
      fecha_caducidad,
      categoria_id,
      codigo_barras,
    } = req.body;

    if (!nombre || !precio) {
      return res.status(400).json({
        error: "Nombre y precio son obligatorios",
      });
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      precio: Number(precio),
      stock: Number.isFinite(Number(stock)) ? Number(stock) : 0,
      categoria_id: categoria_id ?? null,
      codigo_barras: codigo_barras?.trim() || null,
      // activo: default true
    };

    if (fecha_caducidad) {
      payload.fecha_caducidad = fecha_caducidad;
    }

    const nuevoMedicamento = await Medicamento.create(payload);

    return res.status(201).json(nuevoMedicamento);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "El código de barras ya existe" });
    }
    console.error("❌ Error al crear medicamento:", error);
    return res.status(500).json({ error: "Error al crear el medicamento" });
  }
};

// PUT /api/medicamentos/:id
export const actualizarMedicamento = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.body?.codigo_barras !== undefined) {
      req.body.codigo_barras = req.body.codigo_barras?.trim() || null;
    }

    const [updated] = await Medicamento.update(req.body, { where: { id } });

    if (updated) {
      const medicamentoActualizado = await Medicamento.findByPk(id, {
        include: [
          { model: Categoria, as: "categoria", attributes: ["id", "nombre"] },
        ],
      });
      res.json(medicamentoActualizado);
    } else {
      res.status(404).json({ error: "Medicamento no encontrado" });
    }
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "El código de barras ya existe" });
    }
    console.error("❌ Error al actualizar medicamento:", error);
    res.status(500).json({ error: "Error al actualizar el medicamento" });
  }
};

// PATCH /api/medicamentos/:id
export const actualizarMedicamentoParcial = async (req, res) => {
  try {
    const { id } = req.params;
    const medicamento = await Medicamento.findByPk(id);

    if (!medicamento) {
      return res.status(404).json({ error: "Medicamento no encontrado" });
    }

    if (req.body?.codigo_barras !== undefined) {
      req.body.codigo_barras = req.body.codigo_barras?.trim() || null;
    }

    await medicamento.update(req.body);
    res.json(medicamento);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "El código de barras ya existe" });
    }
    console.error("❌ Error al actualizar parcialmente el medicamento:", error);
    res
      .status(500)
      .json({ error: "Error al actualizar parcialmente el medicamento" });
  }
};

// PATCH /api/medicamentos/:id/ajustar-stock
export const ajustarStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { delta } = req.body;

    if (typeof delta !== "number" || Number.isNaN(delta)) {
      return res.status(400).json({ error: "Debe enviar 'delta' numérico" });
    }

    const medicamento = await Medicamento.findByPk(id);
    if (!medicamento) {
      return res.status(404).json({ error: "Medicamento no encontrado" });
    }

    const nuevoStock = (medicamento.stock ?? 0) + delta;
    if (nuevoStock < 0) {
      // 👈 permite llegar a 0, solo bloquea negativos
      return res.status(400).json({ error: "Stock insuficiente" });
    }

    await medicamento.update({ stock: nuevoStock });
    res.json(medicamento);
  } catch (error) {
    console.error("❌ Error al ajustar stock:", error);
    res.status(500).json({ error: "Error al ajustar el stock" });
  }
};

// Eliminar un medicamento (solo si stock = 0)
// Borra primero movimientos y lotes para respetar las FKs
export const eliminarMedicamento = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    const med = await Medicamento.findByPk(id, { transaction: t });
    if (!med) {
      await t.rollback();
      return res.status(404).json({ error: "Medicamento no encontrado" });
    }

    // Seguridad: no permitir borrar si aún tiene stock
    const stockActual = med.stock ?? 0;
    if (stockActual > 0) {
      await t.rollback();
      return res.status(400).json({
        error:
          "No se puede eliminar este medicamento porque aún tiene stock. " +
          "Primero registra las salidas hasta dejarlo en 0.",
      });
    }

    // 1) Borrar movimientos de stock relacionados
    await MovimientoStock.destroy({
      where: { medicamento_id: id },
      transaction: t,
    });

    // 2) Borrar lotes relacionados
    await Lote.destroy({
      where: { medicamento_id: id },
      transaction: t,
    });

    // 3) Borrar el medicamento
    await med.destroy({ transaction: t });

    await t.commit();
    return res.json({
      ok: true,
      mensaje: "Medicamento eliminado correctamente",
    });
  } catch (error) {
    await t.rollback();
    console.error("❌ Error al eliminar medicamento:", error);
    return res
      .status(500)
      .json({ error: "Error al eliminar el medicamento" });
  }
};

// PATCH /api/medicamentos/:id/barcode
export const actualizarCodigoBarras = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_barras } = req.body;

    if (!codigo_barras || typeof codigo_barras !== "string") {
      return res.status(400).json({ error: "codigo_barras requerido" });
    }
    if (codigo_barras.length < 6 || codigo_barras.length > 32) {
      return res.status(400).json({ error: "Longitud inválida (6-32)" });
    }

    const med = await Medicamento.findByPk(id);
    if (!med)
      return res.status(404).json({ error: "Medicamento no encontrado" });

    med.codigo_barras = codigo_barras.trim();
    await med.save();

    res.json({ ok: true, id: med.id, codigo_barras: med.codigo_barras });
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ error: "Ese código ya está asignado a otro producto" });
    }
    console.error("❌ Error al actualizar código de barras:", err);
    res.status(500).json({ error: "Error al actualizar código de barras" });
  }
};

// PATCH /api/medicamentos/:id/reactivar
export const reactivarMedicamento = async (req, res) => {
  try {
    const { id } = req.params;
    const med = await Medicamento.findByPk(id);
    if (!med)
      return res.status(404).json({ error: "Medicamento no encontrado" });

    await med.update({ activo: 1 });
    res.json({ ok: true, medicamento: med });
  } catch (err) {
    console.error("❌ Error al reactivar medicamento:", err);
    res.status(500).json({ error: "Error al reactivar el medicamento" });
  }
};

import Proveedor from '../models/Proveedor.js';

// Obtener todos los proveedores
export const obtenerProveedores = async (req, res) => {
  try {
    const proveedores = await Proveedor.findAll();
    res.json(proveedores);
  } catch (error) {
    console.error('❌ Error al obtener proveedores:', error);
    res.status(500).json({ error: 'Error al obtener los proveedores' });
  }
};

//obtenerProveedorPorId
export const obtenerProveedorPorId = async (req, res) => {
  try {
    const p = await Proveedor.findByPk(req.params.id);
    if (!p) return res.status(404).json({ error: 'Proveedor no encontrado' });
    res.json(p);
  } catch (e) {
    console.error('❌ GET proveedor por id:', e);
    res.status(500).json({ error: 'Error al obtener proveedor' });
  }
};


// Crear un proveedor
export const crearProveedor = async (req, res) => {
  try {
    const proveedor = await Proveedor.create(req.body);
    res.status(201).json(proveedor);
  } catch (error) {
    console.error('❌ Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error al crear el proveedor' });
  }
};

// Actualizar proveedor
export const actualizarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const proveedor = await Proveedor.findByPk(id);
    if (!proveedor) return res.status(404).json({ error: 'Proveedor no encontrado' });

    await proveedor.update(req.body);
    res.json(proveedor);
  } catch (error) {
    console.error('❌ Error al actualizar proveedor:', error);
    res.status(500).json({ error: 'Error al actualizar el proveedor' });
  }
};


// Eliminar proveedor
export const eliminarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await Proveedor.destroy({ where: { id } });
    if (!eliminado) return res.status(404).json({ error: 'Proveedor no encontrado' });

    res.json({ mensaje: 'Proveedor eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar proveedor:', error);
    res.status(500).json({ error: 'Error al eliminar el proveedor' });
  }
};

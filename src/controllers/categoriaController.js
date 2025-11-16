import Categoria from '../models/Categoria.js';

// Obtener todas las categorías
export const obtenerCategorias = async (req, res) => {
  try {
    const categorias = await Categoria.findAll();
    res.json(categorias);
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

// Crear una nueva categoría
export const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const nueva = await Categoria.create({ nombre, descripcion });
    res.status(201).json(nueva);
  } catch (error) {
    console.error('❌ Error al crear categoría:', error);
    res.status(500).json({ error: 'Error al crear la categoría' });
  }
};

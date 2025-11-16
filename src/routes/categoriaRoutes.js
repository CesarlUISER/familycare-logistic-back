import express from 'express';
import { obtenerCategorias, crearCategoria } from '../controllers/categoriaController.js';

const router = express.Router();

router.get('/', obtenerCategorias);
router.post('/', crearCategoria);

export default router;

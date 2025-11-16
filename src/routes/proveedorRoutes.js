import express from 'express';
import {
  obtenerProveedores,
  crearProveedor,
  obtenerProveedorPorId,
  actualizarProveedor,
  eliminarProveedor,
} from '../controllers/proveedorController.js';

const router = express.Router();

router.get('/', obtenerProveedores);
router.post('/', crearProveedor);
router.get('/:id', obtenerProveedorPorId);
router.put('/:id', actualizarProveedor);
router.delete('/:id', eliminarProveedor);

export default router;

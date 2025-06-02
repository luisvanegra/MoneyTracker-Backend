import express from 'express';
import Joi from 'joi';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Esquema de validación para categorías
const categorySchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  icon: Joi.string().min(1).max(50).required(),
  type: Joi.string().valid('income', 'expense').required()
});

// Obtener todas las categorías (filtradas por usuario o por defecto)
router.get('/', authenticateToken, async (req: any, res, next): Promise<void> => {
  try {
    const categories = await query(
      `SELECT id, name, color, icon, type, is_default, subcategories FROM categories 
       WHERE user_id IS NULL OR user_id = ? ORDER BY name`,
      [req.userId]
    ) as any[];

    res.json({
      success: true,
      data: {
        categories
      }
    });

  } catch (error) {
    next(error);
  }
});

// Crear nueva categoría personalizada
router.post('/', authenticateToken, async (req: any, res, next): Promise<void> => {
  try {
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      next(error);
      return;
    }

    const { name, color, icon, type } = value;

    // Verificar que no existe una categoría con el mismo nombre para el usuario
    const existingCategory = await query(
      `SELECT id FROM categories 
       WHERE name = ? AND type = ? AND (user_id = ? OR is_default = TRUE)`,
      [name, type, req.userId]
    ) as any[];

    if (existingCategory.length > 0) {
      res.status(409).json({
        success: false,
        message: 'Ya existe una categoría con ese nombre'
      });
      return;
    }

    const result = await query(
      `INSERT INTO categories (name, color, icon, type, user_id, is_default) 
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [name, color, icon, type, req.userId]
    ) as any;

    // Obtener la categoría creada
    const newCategory = await query(
      'SELECT id, name, color, icon, type, is_default FROM categories WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: {
        category: newCategory[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar categoría personalizada
router.put('/:id', authenticateToken, async (req: any, res, next): Promise<void> => {
  try {
    const { error, value } = categorySchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      next(error);
      return;
    }

    const { name, color, icon, type } = value;
    const categoryId = req.params.id;

    // Verificar que la categoría pertenece al usuario y no es por defecto
    const existingCategory = await query(
      'SELECT id, is_default FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, req.userId]
    ) as any[];

    if (existingCategory.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
      return;
    }

    if (existingCategory[0].is_default) {
      res.status(403).json({
        success: false,
        message: 'No puedes modificar categorías por defecto'
      });
      return;
    }

    await query(
      `UPDATE categories 
       SET name = ?, color = ?, icon = ?, type = ? 
       WHERE id = ? AND user_id = ?`,
      [name, color, icon, type, categoryId, req.userId]
    );

    // Obtener la categoría actualizada
    const updatedCategory = await query(
      'SELECT id, name, color, icon, type, is_default FROM categories WHERE id = ?',
      [categoryId]
    ) as any[];

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: {
        category: updatedCategory[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// Eliminar categoría personalizada
router.delete('/:id', authenticateToken, async (req: any, res, next): Promise<void> => {
  try {
    const categoryId = req.params.id;

    // Verificar que la categoría pertenece al usuario y no es por defecto
    const existingCategory = await query(
      'SELECT id, name, is_default FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, req.userId]
    ) as any[];

    if (existingCategory.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
      return;
    }

    if (existingCategory[0].is_default) {
      res.status(403).json({
        success: false,
        message: 'No puedes eliminar categorías por defecto'
      });
      return;
    }

    // Verificar si hay transacciones usando esta categoría
    const transactionsUsingCategory = await query(
      'SELECT COUNT(*) as count FROM transactions WHERE category = ? AND user_id = ?',
      [existingCategory[0].name, req.userId]
    ) as any[];

    if (transactionsUsingCategory[0].count > 0) {
      res.status(409).json({
        success: false,
        message: 'No puedes eliminar una categoría que tiene transacciones asociadas'
      });
      return;
    }

    await query(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, req.userId]
    );

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

export default router;

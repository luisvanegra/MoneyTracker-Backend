import express from 'express';
import Joi from 'joi';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Esquema de validación para transacciones
const transactionSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  type: Joi.string().valid('income', 'expense').required(),
  category: Joi.string().min(1).max(50).required(),
  subcategory: Joi.string().min(1).max(50).required(),
  description: Joi.string().max(500).allow('').optional(),
  date: Joi.date().iso().required()
});

// Obtener todas las transacciones del usuario
router.get('/', authenticateToken, async (req: any, res, next): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Filtros opcionales
    const { category, type, startDate, endDate } = req.query;

    let sql = `SELECT id, amount, type, category, subcategory, description, date, created_at FROM transactions`;
    const params: any[] = [];
    const whereClauses: string[] = [];

    // Siempre filtrar por user_id
    whereClauses.push(`user_id = ?`);
    params.push(req.userId);

    if (category) {
      whereClauses.push(`category = ?`);
      params.push(category);
    }

    if (type) {
      whereClauses.push(`type = ?`);
      params.push(type);
    }

    if (startDate && endDate) {
      whereClauses.push(`date BETWEEN ? AND ?`);
      params.push(startDate, endDate);
    }

    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    // Construir LIMIT y OFFSET directamente en la cadena SQL
    sql += ` ORDER BY date DESC, created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

    // Obtener transacciones
    // Los parámetros ahora solo incluyen los de la cláusula WHERE
    const transactions = await query(sql, params) as any[];

    // Contar total de transacciones (misma lógica de WHERE y params)
    let countSql = `SELECT COUNT(*) as total FROM transactions`;
    const countParams: any[] = []; // Parámetros solo para el COUNT query
    const countWhereClauses: string[] = [];

    // Copiar lógica de WHERE del query principal
    countWhereClauses.push(`user_id = ?`);
    countParams.push(req.userId);

     if (category) {
      countWhereClauses.push(`category = ?`);
      countParams.push(category);
    }

    if (type) {
      countWhereClauses.push(`type = ?`);
      countParams.push(type);
    }

    if (startDate && endDate) {
      countWhereClauses.push(`date BETWEEN ? AND ?`);
      countParams.push(startDate, endDate);
    }

    if (countWhereClauses.length > 0) {
      countSql += ` WHERE ${countWhereClauses.join(' AND ')}`;
    }

    // El query de COUNT no tiene LIMIT/OFFSET, por lo que sus parámetros solo son los de WHERE
    const totalResult = await query(countSql, countParams) as any[];

    const total = totalResult[0].total;
    const pages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      }
    });

  } catch (error) {
    next(error);
  }
});

// Crear nueva transacción
router.post('/', authenticateToken, async (req: any, res, next): Promise<void> => {
  try {
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      next(error);
      return;
    }

    const { amount, type, category, subcategory, description, date } = value;

    const result = await query(
      `INSERT INTO transactions (user_id, amount, type, category, subcategory, description, date) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, amount, type, category, subcategory, description || null, date]
    ) as any;

    // Obtener la transacción creada
    const newTransaction = await query(
      'SELECT id, amount, type, category, subcategory, description, date, created_at FROM transactions WHERE id = ?',
      [result.insertId]
    ) as any[];

    res.status(201).json({
      success: true,
      message: 'Transacción creada exitosamente',
      data: {
        transaction: newTransaction[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// Actualizar transacción
router.put('/:id', authenticateToken, async (req: any, res, next): Promise<void> => {
  try {
    const { error, value } = transactionSchema.validate(req.body);
    if (error) {
      error.isJoi = true;
      next(error);
      return;
    }

    const { amount, type, category, subcategory, description, date } = value;
    const transactionId = req.params.id;

    // Verificar que la transacción pertenece al usuario
    const existingTransaction = await query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, req.userId]
    ) as any[];

    if (existingTransaction.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
      return;
    }

    await query(
      `UPDATE transactions 
       SET amount = ?, type = ?, category = ?, subcategory = ?, description = ?, date = ? 
       WHERE id = ? AND user_id = ?`,
      [amount, type, category, subcategory, description || null, date, transactionId, req.userId]
    );

    // Obtener la transacción actualizada
    const updatedTransaction = await query(
      'SELECT id, amount, type, category, subcategory, description, date, created_at FROM transactions WHERE id = ?',
      [transactionId]
    ) as any[];

    res.json({
      success: true,
      message: 'Transacción actualizada exitosamente',
      data: {
        transaction: updatedTransaction[0]
      }
    });

  } catch (error) {
    next(error);
  }
});

// Eliminar transacción
router.delete('/:id', authenticateToken, async (req: any, res, next): Promise<void> => {
  try {
    const transactionId = req.params.id;

    // Verificar que la transacción pertenece al usuario
    const existingTransaction = await query(
      'SELECT id FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, req.userId]
    ) as any[];

    if (existingTransaction.length === 0) {
      res.status(404).json({
        success: false,
        message: 'Transacción no encontrada'
      });
      return;
    }

    await query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, req.userId]
    );

    res.json({
      success: true,
      message: 'Transacción eliminada exitosamente'
    });

  } catch (error) {
    next(error);
  }
});

// Obtener estadísticas del usuario
router.get('/stats', authenticateToken, async (req: any, res, next) => {
  try {
    const { month, year } = req.query;
    
    let dateFilter = '';
    const params = [req.userId];

    if (month && year) {
      dateFilter = 'AND MONTH(date) = ? AND YEAR(date) = ?';
      params.push(month, year);
    } else if (year) {
      dateFilter = 'AND YEAR(date) = ?';
      params.push(year);
    }

    // Obtener totales de ingresos y gastos
    const totals = await query(
      `SELECT 
         type,
         SUM(amount) as total,
         COUNT(*) as count
       FROM transactions 
       WHERE user_id = ? ${dateFilter}
       GROUP BY type`,
      params
    ) as any[];

    // Obtener gastos por categoría
    const categoryExpenses = await query(
      `SELECT 
         category,
         SUM(amount) as total,
         COUNT(*) as count
       FROM transactions 
       WHERE user_id = ? AND type = 'expense' ${dateFilter}
       GROUP BY category
       ORDER BY total DESC`,
      params
    ) as any[];

    let income = 0, expenses = 0;
    const incomeTotal = totals.find(item => item.type === 'income');
    const expenseTotal = totals.find(item => item.type === 'expense');

    if (incomeTotal) {
        income = parseFloat(incomeTotal.total);
    }

    if (expenseTotal) {
        expenses = parseFloat(expenseTotal.total);
    }

    // Asegurarse de que income y expenses son números válidos (no NaN)
    income = isNaN(income) ? 0 : income;
    expenses = isNaN(expenses) ? 0 : expenses;

    const balance = income - expenses;

    res.json({
      success: true,
      data: {
        summary: {
          income,
          expenses,
          balance
        },
        categoryBreakdown: categoryExpenses
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;

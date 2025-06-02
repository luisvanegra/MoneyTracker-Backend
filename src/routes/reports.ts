import express from 'express';
import XLSX from 'xlsx';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Obtener reporte mensual
router.get('/monthly', authenticateToken, async (req: any, res, next) => {
  try {
    const { month, year } = req.query;
    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    // Obtener transacciones del mes
    const transactions = await query(
      `SELECT amount, type, category, description, date
       FROM transactions 
       WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
       ORDER BY date DESC`,
      [req.userId, targetMonth, targetYear]
    ) as any[];

    // Calcular totales
    let totalIncome = 0;
    let totalExpenses = 0;
    const categoryBreakdown: { [key: string]: number } = {};
    const dailyTrend: { [key: string]: { income: number; expenses: number } } = {};

    transactions.forEach((transaction: any) => {
      const amount = parseFloat(transaction.amount);
      const date = transaction.date.toISOString().split('T')[0];

      if (transaction.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpenses += amount;
        categoryBreakdown[transaction.category] = (categoryBreakdown[transaction.category] || 0) + amount;
      }

      if (!dailyTrend[date]) {
        dailyTrend[date] = { income: 0, expenses: 0 };
      }
      dailyTrend[date][transaction.type === 'income' ? 'income' : 'expenses'] += amount;
    });

    // Convertir dailyTrend a array ordenado
    const dailyTrendArray = Object.entries(dailyTrend)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        month: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses,
        categoryBreakdown,
        dailyTrend: dailyTrendArray,
        transactionCount: transactions.length
      }
    });

  } catch (error) {
    next(error);
  }
});

// Obtener reporte anual
router.get('/yearly', authenticateToken, async (req: any, res, next) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Obtener transacciones agrupadas por mes
    const monthlyData = await query(
      `SELECT 
         MONTH(date) as month,
         type,
         SUM(amount) as total
       FROM transactions 
       WHERE user_id = ? AND YEAR(date) = ?
       GROUP BY MONTH(date), type
       ORDER BY month`,
      [req.userId, targetYear]
    ) as any[];

    // Procesar datos por mes
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      monthName: new Date(targetYear, i).toLocaleDateString('es-ES', { month: 'long' }),
      income: 0,
      expenses: 0,
      balance: 0
    }));

    monthlyData.forEach((item: any) => {
      const monthIndex = item.month - 1;
      const amount = parseFloat(item.total);
      
      if (item.type === 'income') {
        months[monthIndex].income = amount;
      } else {
        months[monthIndex].expenses = amount;
      }
    });

    // Calcular balance para cada mes
    months.forEach(month => {
      month.balance = month.income - month.expenses;
    });

    // Calcular totales anuales
    const yearlyTotals = months.reduce(
      (acc, month) => ({
        income: acc.income + month.income,
        expenses: acc.expenses + month.expenses
      }),
      { income: 0, expenses: 0 }
    );

    res.json({
      success: true,
      data: {
        year: targetYear,
        yearlyTotals: {
          ...yearlyTotals,
          balance: yearlyTotals.income - yearlyTotals.expenses
        },
        monthlyBreakdown: months
      }
    });

  } catch (error) {
    next(error);
  }
});

// Exportar transacciones a Excel
router.get('/export/excel', authenticateToken, async (req: any, res, next) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    
    let whereClause = 'WHERE user_id = ?';
    const params = [req.userId];

    if (startDate && endDate) {
      whereClause += ' AND date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    const transactions = await query(
      `SELECT 
         date as 'Fecha',
         type as 'Tipo',
         category as 'Categoría',
         description as 'Descripción',
         amount as 'Monto'
       FROM transactions 
       ${whereClause}
       ORDER BY date DESC`,
      params
    ) as any[];

    // Formatear datos para Excel
    const formattedData = transactions.map((t: any) => ({
      ...t,
      'Tipo': t.Tipo === 'income' ? 'Ingreso' : 'Gasto',
      'Monto': parseFloat(t.Monto),
      'Fecha': new Date(t.Fecha).toLocaleDateString('es-ES')
    }));

    // Crear libro de Excel
    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');

    // Configurar headers para descarga
    const fileName = `transacciones_${new Date().toISOString().split('T')[0]}.xlsx`;
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    next(error);
  }
});

// Nuevo endpoint para descargar reporte de transacciones en XLSX
router.get('/transactions.xlsx', authenticateToken, async (req: any, res, next) => {
  try {
    // Obtener todas las transacciones del usuario
    const transactions = await query(
      `SELECT id, amount, type, category, description, date, created_at 
       FROM transactions 
       WHERE user_id = ?
       ORDER BY date DESC, created_at DESC`,
      [req.userId]
    ) as any[];

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay transacciones para generar el reporte.'
      });
    }

    // Preparar datos para el archivo XLSX
    // Encabezados de la hoja de cálculo
    const ws_data = [
      ['ID', 'Monto', 'Tipo', 'Categoría', 'Descripción', 'Fecha', 'Fecha de Creación']
    ];

    // Formatear datos de las transacciones
    transactions.forEach((t: any) => {
      ws_data.push([
        t.id,
        parseFloat(t.amount),
        t.type,
        t.category,
        t.description || '',
        t.date ? new Date(t.date).toISOString().split('T')[0] : '', // Formato YYYY-MM-DD
        t.created_at ? new Date(t.created_at).toISOString() : '' // Formato ISO
      ]);
    });

    // Crear un nuevo libro de trabajo y una hoja de cálculo
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Ajustar ancho de las columnas (opcional)
    const col_widths = ws_data[0].map((_, i) => ({
        wch: Math.max(...ws_data.map(row => String(row[i] || '').length))
    }));
    ws['!cols'] = col_widths;

    // Añadir la hoja de cálculo al libro de trabajo
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');

    // Generar el archivo XLSX en formato binario
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    // Configurar cabeceras para la descarga
    res.setHeader('Content-Disposition', 'attachment; filename=transacciones.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(wbout);

  } catch (error) {
    console.error('Error generating XLSX report:', error);
    return next(error); // Pasar el error al manejador de errores centralizado
  }
});

export default router;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const xlsx_1 = __importDefault(require("xlsx"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/monthly', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { month, year } = req.query;
        const currentDate = new Date();
        const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
        const targetYear = year ? parseInt(year) : currentDate.getFullYear();
        const transactions = await (0, database_1.query)(`SELECT amount, type, category, description, date
       FROM transactions 
       WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ?
       ORDER BY date DESC`, [req.userId, targetMonth, targetYear]);
        let totalIncome = 0;
        let totalExpenses = 0;
        const categoryBreakdown = {};
        const dailyTrend = {};
        transactions.forEach((transaction) => {
            const amount = parseFloat(transaction.amount);
            const date = transaction.date.toISOString().split('T')[0];
            if (transaction.type === 'income') {
                totalIncome += amount;
            }
            else {
                totalExpenses += amount;
                categoryBreakdown[transaction.category] = (categoryBreakdown[transaction.category] || 0) + amount;
            }
            if (!dailyTrend[date]) {
                dailyTrend[date] = { income: 0, expenses: 0 };
            }
            dailyTrend[date][transaction.type === 'income' ? 'income' : 'expenses'] += amount;
        });
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/yearly', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { year } = req.query;
        const targetYear = year ? parseInt(year) : new Date().getFullYear();
        const monthlyData = await (0, database_1.query)(`SELECT 
         MONTH(date) as month,
         type,
         SUM(amount) as total
       FROM transactions 
       WHERE user_id = ? AND YEAR(date) = ?
       GROUP BY MONTH(date), type
       ORDER BY month`, [req.userId, targetYear]);
        const months = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            monthName: new Date(targetYear, i).toLocaleDateString('es-ES', { month: 'long' }),
            income: 0,
            expenses: 0,
            balance: 0
        }));
        monthlyData.forEach((item) => {
            const monthIndex = item.month - 1;
            const amount = parseFloat(item.total);
            if (item.type === 'income') {
                months[monthIndex].income = amount;
            }
            else {
                months[monthIndex].expenses = amount;
            }
        });
        months.forEach(month => {
            month.balance = month.income - month.expenses;
        });
        const yearlyTotals = months.reduce((acc, month) => ({
            income: acc.income + month.income,
            expenses: acc.expenses + month.expenses
        }), { income: 0, expenses: 0 });
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
    }
    catch (error) {
        next(error);
    }
});
router.get('/export/excel', auth_1.authenticateToken, async (req, res, next) => {
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
        const transactions = await (0, database_1.query)(`SELECT 
         date as 'Fecha',
         type as 'Tipo',
         category as 'Categoría',
         description as 'Descripción',
         amount as 'Monto'
       FROM transactions 
       ${whereClause}
       ORDER BY date DESC`, params);
        const formattedData = transactions.map((t) => ({
            ...t,
            'Tipo': t.Tipo === 'income' ? 'Ingreso' : 'Gasto',
            'Monto': parseFloat(t.Monto),
            'Fecha': new Date(t.Fecha).toLocaleDateString('es-ES')
        }));
        const worksheet = xlsx_1.default.utils.json_to_sheet(formattedData);
        const workbook = xlsx_1.default.utils.book_new();
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, 'Transacciones');
        const fileName = `transacciones_${new Date().toISOString().split('T')[0]}.xlsx`;
        const buffer = xlsx_1.default.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    }
    catch (error) {
        next(error);
    }
});
router.get('/transactions.xlsx', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const transactions = await (0, database_1.query)(`SELECT id, amount, type, category, description, date, created_at 
       FROM transactions 
       WHERE user_id = ?
       ORDER BY date DESC, created_at DESC`, [req.userId]);
        if (transactions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No hay transacciones para generar el reporte.'
            });
        }
        const ws_data = [
            ['ID', 'Monto', 'Tipo', 'Categoría', 'Descripción', 'Fecha', 'Fecha de Creación']
        ];
        transactions.forEach((t) => {
            ws_data.push([
                t.id,
                parseFloat(t.amount),
                t.type,
                t.category,
                t.description || '',
                t.date ? new Date(t.date).toISOString().split('T')[0] : '',
                t.created_at ? new Date(t.created_at).toISOString() : ''
            ]);
        });
        const wb = xlsx_1.default.utils.book_new();
        const ws = xlsx_1.default.utils.aoa_to_sheet(ws_data);
        const col_widths = ws_data[0].map((_, i) => ({
            wch: Math.max(...ws_data.map(row => String(row[i] || '').length))
        }));
        ws['!cols'] = col_widths;
        xlsx_1.default.utils.book_append_sheet(wb, ws, 'Transacciones');
        const wbout = xlsx_1.default.write(wb, { bookType: 'xlsx', type: 'buffer' });
        res.setHeader('Content-Disposition', 'attachment; filename=transacciones.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(wbout);
    }
    catch (error) {
        console.error('Error generating XLSX report:', error);
        return next(error);
    }
});
exports.default = router;
//# sourceMappingURL=reports.js.map
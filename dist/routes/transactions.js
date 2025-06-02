"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const transactionSchema = joi_1.default.object({
    amount: joi_1.default.number().positive().precision(2).required(),
    type: joi_1.default.string().valid('income', 'expense').required(),
    category: joi_1.default.string().min(1).max(50).required(),
    description: joi_1.default.string().max(500).allow('').optional(),
    date: joi_1.default.date().iso().required()
});
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const { category, type, startDate, endDate } = req.query;
        let sql = `SELECT id, amount, type, category, description, date, created_at FROM transactions`;
        const params = [];
        const whereClauses = [];
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
        sql += ` ORDER BY date DESC, created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
        const transactions = await (0, database_1.query)(sql, params);
        let countSql = `SELECT COUNT(*) as total FROM transactions`;
        const countParams = [];
        const countWhereClauses = [];
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
        const totalResult = await (0, database_1.query)(countSql, countParams);
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
    }
    catch (error) {
        next(error);
    }
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { error, value } = transactionSchema.validate(req.body);
        if (error) {
            error.isJoi = true;
            next(error);
            return;
        }
        const { amount, type, category, description, date } = value;
        const result = await (0, database_1.query)(`INSERT INTO transactions (user_id, amount, type, category, description, date) 
       VALUES (?, ?, ?, ?, ?, ?)`, [req.userId, amount, type, category, description || null, date]);
        console.log('DEBUG_INSERT_RESULT:', result);
        const newTransaction = await (0, database_1.query)('SELECT id, amount, type, category, description, date, created_at FROM transactions WHERE id = ?', [result.insertId]);
        res.status(201).json({
            success: true,
            message: 'Transacción creada exitosamente',
            data: {
                transaction: newTransaction[0]
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { error, value } = transactionSchema.validate(req.body);
        if (error) {
            error.isJoi = true;
            next(error);
            return;
        }
        const { amount, type, category, description, date } = value;
        const transactionId = req.params.id;
        const existingTransaction = await (0, database_1.query)('SELECT id FROM transactions WHERE id = ? AND user_id = ?', [transactionId, req.userId]);
        if (existingTransaction.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Transacción no encontrada'
            });
            return;
        }
        await (0, database_1.query)(`UPDATE transactions 
       SET amount = ?, type = ?, category = ?, description = ?, date = ? 
       WHERE id = ? AND user_id = ?`, [amount, type, category, description || null, date, transactionId, req.userId]);
        const updatedTransaction = await (0, database_1.query)('SELECT id, amount, type, category, description, date, created_at FROM transactions WHERE id = ?', [transactionId]);
        res.json({
            success: true,
            message: 'Transacción actualizada exitosamente',
            data: {
                transaction: updatedTransaction[0]
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const transactionId = req.params.id;
        const existingTransaction = await (0, database_1.query)('SELECT id FROM transactions WHERE id = ? AND user_id = ?', [transactionId, req.userId]);
        if (existingTransaction.length === 0) {
            res.status(404).json({
                success: false,
                message: 'Transacción no encontrada'
            });
            return;
        }
        await (0, database_1.query)('DELETE FROM transactions WHERE id = ? AND user_id = ?', [transactionId, req.userId]);
        res.json({
            success: true,
            message: 'Transacción eliminada exitosamente'
        });
    }
    catch (error) {
        next(error);
    }
});
router.get('/stats', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { month, year } = req.query;
        let dateFilter = '';
        const params = [req.userId];
        if (month && year) {
            dateFilter = 'AND MONTH(date) = ? AND YEAR(date) = ?';
            params.push(month, year);
        }
        else if (year) {
            dateFilter = 'AND YEAR(date) = ?';
            params.push(year);
        }
        const totals = await (0, database_1.query)(`SELECT 
         type,
         SUM(amount) as total,
         COUNT(*) as count
       FROM transactions 
       WHERE user_id = ? ${dateFilter}
       GROUP BY type`, params);
        const categoryExpenses = await (0, database_1.query)(`SELECT 
         category,
         SUM(amount) as total,
         COUNT(*) as count
       FROM transactions 
       WHERE user_id = ? AND type = 'expense' ${dateFilter}
       GROUP BY category
       ORDER BY total DESC`, params);
        let income = 0, expenses = 0;
        totals.forEach((item) => {
            if (item.type === 'income')
                income = parseFloat(item.total);
            if (item.type === 'expense')
                expenses = parseFloat(item.total);
        });
        res.json({
            success: true,
            data: {
                summary: {
                    income,
                    expenses,
                    balance: income - expenses
                },
                categoryBreakdown: categoryExpenses
            }
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=transactions.js.map
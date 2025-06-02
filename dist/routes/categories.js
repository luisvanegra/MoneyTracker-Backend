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
const categorySchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(50).required(),
    color: joi_1.default.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
    icon: joi_1.default.string().min(1).max(50).required(),
    type: joi_1.default.string().valid('income', 'expense').required()
});
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const categories = await (0, database_1.query)(`SELECT id, name, color, icon, type, is_default 
       FROM categories 
       WHERE is_default = TRUE OR user_id = ?
       ORDER BY is_default DESC, name ASC`, [req.userId]);
        res.json({
            success: true,
            data: {
                categories
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { error, value } = categorySchema.validate(req.body);
        if (error) {
            error.isJoi = true;
            next(error);
            return;
        }
        const { name, color, icon, type } = value;
        const existingCategory = await (0, database_1.query)(`SELECT id FROM categories 
       WHERE name = ? AND type = ? AND (user_id = ? OR is_default = TRUE)`, [name, type, req.userId]);
        if (existingCategory.length > 0) {
            res.status(409).json({
                success: false,
                message: 'Ya existe una categoría con ese nombre'
            });
            return;
        }
        const result = await (0, database_1.query)(`INSERT INTO categories (name, color, icon, type, user_id, is_default) 
       VALUES (?, ?, ?, ?, ?, FALSE)`, [name, color, icon, type, req.userId]);
        const newCategory = await (0, database_1.query)('SELECT id, name, color, icon, type, is_default FROM categories WHERE id = ?', [result.insertId]);
        res.status(201).json({
            success: true,
            message: 'Categoría creada exitosamente',
            data: {
                category: newCategory[0]
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { error, value } = categorySchema.validate(req.body);
        if (error) {
            error.isJoi = true;
            next(error);
            return;
        }
        const { name, color, icon, type } = value;
        const categoryId = req.params.id;
        const existingCategory = await (0, database_1.query)('SELECT id, is_default FROM categories WHERE id = ? AND user_id = ?', [categoryId, req.userId]);
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
        await (0, database_1.query)(`UPDATE categories 
       SET name = ?, color = ?, icon = ?, type = ? 
       WHERE id = ? AND user_id = ?`, [name, color, icon, type, categoryId, req.userId]);
        const updatedCategory = await (0, database_1.query)('SELECT id, name, color, icon, type, is_default FROM categories WHERE id = ?', [categoryId]);
        res.json({
            success: true,
            message: 'Categoría actualizada exitosamente',
            data: {
                category: updatedCategory[0]
            }
        });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const categoryId = req.params.id;
        const existingCategory = await (0, database_1.query)('SELECT id, name, is_default FROM categories WHERE id = ? AND user_id = ?', [categoryId, req.userId]);
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
        const transactionsUsingCategory = await (0, database_1.query)('SELECT COUNT(*) as count FROM transactions WHERE category = ? AND user_id = ?', [existingCategory[0].name, req.userId]);
        if (transactionsUsingCategory[0].count > 0) {
            res.status(409).json({
                success: false,
                message: 'No puedes eliminar una categoría que tiene transacciones asociadas'
            });
            return;
        }
        await (0, database_1.query)('DELETE FROM categories WHERE id = ? AND user_id = ?', [categoryId, req.userId]);
        res.json({
            success: true,
            message: 'Categoría eliminada exitosamente'
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map
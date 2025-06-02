"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);
    if (err.isJoi) {
        res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            errors: err.details.map((detail) => detail.message)
        });
        return;
    }
    if (err.code === 'ER_DUP_ENTRY') {
        res.status(409).json({
            success: false,
            message: 'El registro ya existe'
        });
        return;
    }
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor'
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map
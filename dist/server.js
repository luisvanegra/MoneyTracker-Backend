"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const categories_1 = __importDefault(require("./routes/categories"));
const reports_1 = __importDefault(require("./routes/reports"));
const geo_1 = __importDefault(require("./routes/geo"));
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = require("./config/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3001;
(0, database_1.connectDatabase)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:8080',
        'https://wallet-flow-control.vercel.app',
        'https://wallet-flow-control-production.up.railway.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
    }
});
app.use('/api/', limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
app.use('/api/auth', auth_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/reports', reports_1.default);
app.use('/api/geo', geo_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
app.use(errorHandler_1.errorHandler);
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=server.js.map
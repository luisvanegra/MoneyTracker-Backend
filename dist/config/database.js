"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.connectDatabase = exports.pool = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbConfig = process.env.MYSQL_URL ? process.env.MYSQL_URL : {
    host: process.env.DB_HOST || 'maglev.proxy.rlwy.net',
    port: parseInt(process.env.DB_PORT || '43682'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'moneytraker_db',
    ssl: {
        rejectUnauthorized: false
    },
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};
exports.pool = promise_1.default.createPool(dbConfig);
const connectDatabase = async () => {
    try {
        console.log('🔄 Conectando a la base de datos MySQL...');
        await exports.pool.query('SELECT 1');
        console.log('✅ Conexión exitosa a la base de datos MySQL Railway');
        console.log('📊 Base de datos respondiendo correctamente');
    }
    catch (error) {
        console.error('❌ Error conectando a la base de datos:', error);
        throw error;
    }
};
exports.connectDatabase = connectDatabase;
const query = async (sql, params = []) => {
    try {
        console.log('DEBUG_DB_QUERY: SQL ->', sql);
        console.log('DEBUG_DB_QUERY: Params ->', params);
        const [results] = await exports.pool.execute(sql, params);
        return results;
    }
    catch (error) {
        console.error('❌ Error ejecutando query:', error);
        throw error;
    }
};
exports.query = query;
process.on('SIGINT', async () => {
    await exports.pool.end();
    console.log('🔌 Pool de conexiones cerrado');
    process.exit(0);
});
//# sourceMappingURL=database.js.map
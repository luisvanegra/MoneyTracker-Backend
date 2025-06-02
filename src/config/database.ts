import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de la conexión a MySQL Railway
// Usar MYSQL_URL si está disponible (proporcionada por Railway con endpoint privado)
const dbConfig = process.env.MYSQL_URL ? process.env.MYSQL_URL : {
  host: process.env.DB_HOST || 'maglev.proxy.rlwy.net', // Fallback a endpoint público si no está MYSQL_URL y DB_HOST
  port: parseInt(process.env.DB_PORT || '43682'), // Fallback a endpoint público si no está MYSQL_URL y DB_PORT
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Es mejor no tener un default password hardcodeado
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

// Crear pool de conexiones
export const pool = mysql.createPool(dbConfig as mysql.PoolOptions);

export const connectDatabase = async () => {
  try {
    console.log('🔄 Conectando a la base de datos MySQL...');
    
    // Verificar la conexión
    await pool.query('SELECT 1');
    console.log('✅ Conexión exitosa a la base de datos MySQL Railway');
    console.log('📊 Base de datos respondiendo correctamente');
    
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error);
    throw error;
  }
};

export const query = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    // --- Iniciar Logging de Depuración ---
    console.log('DEBUG_DB_QUERY: SQL ->', sql);
    console.log('DEBUG_DB_QUERY: Params ->', params);
    // --- Fin Logging de Depuración ---
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('❌ Error ejecutando query:', error);
    throw error;
  }
};

// Cerrar pool al terminar la aplicación
process.on('SIGINT', async () => {
  await pool.end();
  console.log('🔌 Pool de conexiones cerrado');
  process.exit(0);
});

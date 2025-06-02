import mysql from 'mysql2/promise';
export declare const pool: mysql.Pool;
export declare const connectDatabase: () => Promise<void>;
export declare const query: (sql: string, params?: any[]) => Promise<any>;
//# sourceMappingURL=database.d.ts.map
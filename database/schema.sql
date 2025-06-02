-- =========================================
-- MONEYTRACKER DATABASE SCHEMA
-- =========================================
-- Base de datos para gestión de finanzas personales
-- Incluye usuarios, transacciones, categorías y reportes

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS moneytracker_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE moneytracker_db;

-- =========================================
-- TABLA DE USUARIOS
-- =========================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT 'Nombre completo del usuario',
  `email` varchar(255) NOT NULL COMMENT 'Correo electrónico del usuario',
  `password` varchar(255) NOT NULL COMMENT 'Contraseña hasheada',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del registro',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
  `first_name` varchar(100) NOT NULL DEFAULT '' COMMENT 'Primer nombre del usuario',
  `second_name` varchar(100) DEFAULT NULL COMMENT 'Segundo nombre del usuario (opcional)',
  `first_last_name` varchar(100) NOT NULL DEFAULT '' COMMENT 'Primer apellido del usuario',
  `second_last_name` varchar(100) NOT NULL DEFAULT '' COMMENT 'Segundo apellido del usuario',
  `age` int(11) DEFAULT NULL COMMENT 'Edad del usuario (obligatorio si se proporciona)',
  `nationality` varchar(100) DEFAULT NULL COMMENT 'Nacionalidad del usuario (opcional)',
  `address_barrio` varchar(255) DEFAULT NULL COMMENT 'Barrio de la dirección (opcional)',
  `address_ciudad` varchar(255) DEFAULT NULL COMMENT 'Ciudad de la dirección (opcional)',
  `address_demas` text DEFAULT NULL COMMENT 'Otros detalles de la dirección (opcional)',
  `address_codigo_postal` varchar(20) DEFAULT NULL COMMENT 'Código postal (opcional)',
  `occupation` ENUM('estudiante', 'trabajador', 'independiente', 'desempleado', 'otro') DEFAULT 'otro' COMMENT 'Ocupación del usuario',
  `profile_picture_url` varchar(255) DEFAULT NULL COMMENT 'URL de la foto de perfil (opcional)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuarios de la aplicación';

-- =========================================
-- TABLA DE CATEGORÍAS
-- =========================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT 'Nombre de la categoría',
    color VARCHAR(7) NOT NULL DEFAULT '#f59e0b' COMMENT 'Color en formato hexadecimal',
    icon VARCHAR(50) DEFAULT 'DollarSign' COMMENT 'Icono de Lucide React',
    type ENUM('income', 'expense') NOT NULL COMMENT 'Tipo: ingreso o gasto',
    user_id INT NULL COMMENT 'ID del usuario (NULL para categorías por defecto)',
    is_default BOOLEAN DEFAULT FALSE COMMENT 'Indica si es una categoría por defecto',
    subcategories JSON COMMENT 'Lista de subcategorías en formato JSON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Claves foráneas
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices
    INDEX idx_type (type),
    INDEX idx_user_type (user_id, type),
    INDEX idx_is_default (is_default)
) ENGINE=InnoDB COMMENT='Categorías de ingresos y gastos';

-- =========================================
-- TABLA DE TRANSACCIONES
-- =========================================
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'ID del usuario propietario',
    amount DECIMAL(10, 2) NOT NULL COMMENT 'Monto de la transacción',
    type ENUM('income', 'expense') NOT NULL COMMENT 'Tipo: ingreso o gasto',
    category VARCHAR(50) NOT NULL COMMENT 'Nombre de la categoría',
    subcategory VARCHAR(50) NOT NULL COMMENT 'Nombre de la subcategoría',
    description TEXT COMMENT 'Descripción opcional de la transacción',
    date DATE NOT NULL COMMENT 'Fecha de la transacción',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del registro',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Última actualización',
    
    -- Claves foráneas
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices para optimización de consultas
    INDEX idx_user_date (user_id, date),
    INDEX idx_user_type (user_id, type),
    INDEX idx_user_category (user_id, category),
    INDEX idx_date (date),
    INDEX idx_type (type),
    INDEX idx_amount (amount)
) ENGINE=InnoDB COMMENT='Transacciones de ingresos y gastos';

-- =========================================
-- INSERTAR CATEGORÍAS POR DEFECTO
-- =========================================

-- Categorías de Ingresos
INSERT INTO categories (name, color, icon, type, is_default, subcategories) VALUES
('Salario', '#10b981', 'Briefcase', 'income', TRUE, '[]'),
('Freelance', '#3b82f6', 'Laptop', 'income', TRUE, '[]'),
('Inversiones', '#8b5cf6', 'TrendingUp', 'income', TRUE, '[]'),
('Ventas', '#06b6d4', 'ShoppingCart', 'income', TRUE, '[]'),
('Bonificaciones', '#84cc16', 'Gift', 'income', TRUE, '[]'),
('Alquiler', '#f59e0b', 'Home', 'income', TRUE, '[]'),
('Intereses', '#ec4899', 'Percent', 'income', TRUE, '[]'),
('Otros Ingresos', '#6b7280', 'Plus', 'income', TRUE, '[]');

-- Categorías de Gastos
INSERT INTO categories (name, color, icon, type, is_default, subcategories) VALUES
('Alimentación', '#ef4444', 'UtensilsCrossed', 'expense', TRUE, '["Supermercado", "Restaurantes", "Cafetería"]'),
('Transporte', '#f97316', 'Car', 'expense', TRUE, '["Gasolina", "Transporte público", "Taxi/App"] '),
('Entretenimiento', '#ec4899', 'Gamepad2', 'expense', TRUE, '["Cine", "Streaming", "Eventos", "Hobbies"]'),
('Salud', '#06b6d4', 'Heart', 'expense', TRUE, '["Consultas médicas", "Medicamentos", "Seguro"] '),
('Educación', '#84cc16', 'GraduationCap', 'expense', TRUE, '["Matrícula", "Libros", "Cursos"]'),
('Compras', '#6366f1', 'ShoppingBag', 'expense', TRUE, '["Ropa", "Electrónica", "Hogar", "Online"]'),
('Servicios', '#f59e0b', 'Zap', 'expense', TRUE, '["Electricidad", "Agua", "Internet", "Teléfono"]'),
('Vivienda', '#8b5cf6', 'Home', 'expense', TRUE, '["Alquiler", "Hipoteca", "Mantenimiento", "Impuestos"] '),
('Seguros', '#10b981', 'Shield', 'expense', TRUE, '["Vehículo", "Hogar", "Vida"]'),
('Impuestos', '#dc2626', 'Calculator', 'expense', TRUE, '[]'),
('Regalos', '#f472b6', 'Gift', 'expense', TRUE, '[]'),
('Otros Gastos', '#6b7280', 'MoreHorizontal', 'expense', TRUE, '[]');

-- =========================================
-- VISTAS ÚTILES PARA REPORTES
-- =========================================

-- Vista para resumen mensual por usuario
CREATE VIEW monthly_summary AS
SELECT 
    user_id,
    YEAR(date) as year,
    MONTH(date) as month,
    type,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count
FROM transactions
GROUP BY user_id, YEAR(date), MONTH(date), type;

-- Vista para gastos por categoría
CREATE VIEW category_expenses AS
SELECT 
    user_id,
    category,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_amount
FROM transactions 
WHERE type = 'expense'
GROUP BY user_id, category;

-- =========================================
-- PROCEDIMIENTOS ALMACENADOS
-- =========================================

DELIMITER //

-- Procedimiento para obtener balance mensual
CREATE PROCEDURE GetMonthlyBalance(
    IN p_user_id INT,
    IN p_year INT,
    IN p_month INT
)
BEGIN
    SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
    FROM transactions 
    WHERE user_id = p_user_id 
        AND YEAR(date) = p_year 
        AND MONTH(date) = p_month;
END//

-- Procedimiento para obtener top categorías de gastos
CREATE PROCEDURE GetTopExpenseCategories(
    IN p_user_id INT,
    IN p_limit INT
)
BEGIN
    -- Si p_limit es NULL (no se proporcionó), establecer un valor por defecto
    IF p_limit IS NULL THEN
        SET p_limit = 10;
    END IF;

    SELECT 
        category,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count,
        ROUND((SUM(amount) / (SELECT SUM(amount) FROM transactions WHERE user_id = p_user_id AND type = 'expense')) * 100, 2) as percentage
    FROM transactions 
    WHERE user_id = p_user_id AND type = 'expense'
    GROUP BY category
    ORDER BY total_amount DESC
    LIMIT p_limit;
END//

DELIMITER ;

-- =========================================
-- TRIGGERS PARA AUDITORÍA
-- =========================================

-- Crear tabla de auditoría
CREATE TABLE transaction_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT,
    user_id INT,
    action ENUM('INSERT', 'UPDATE', 'DELETE'),
    old_values JSON,
    new_values JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

DELIMITER //

-- Trigger para INSERT
CREATE TRIGGER transaction_insert_audit 
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO transaction_audit (transaction_id, user_id, action, new_values)
    VALUES (NEW.id, NEW.user_id, 'INSERT', JSON_OBJECT(
        'amount', NEW.amount,
        'type', NEW.type,
        'category', NEW.category,
        'subcategory', NEW.subcategory,
        'description', NEW.description,
        'date', NEW.date
    ));
END//

-- Trigger para UPDATE
CREATE TRIGGER transaction_update_audit 
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO transaction_audit (transaction_id, user_id, action, old_values, new_values)
    VALUES (NEW.id, NEW.user_id, 'UPDATE', 
        JSON_OBJECT(
            'amount', OLD.amount,
            'type', OLD.type,
            'category', OLD.category,
            'subcategory', OLD.subcategory,
            'description', OLD.description,
            'date', OLD.date
        ),
        JSON_OBJECT(
            'amount', NEW.amount,
            'type', NEW.type,
            'category', NEW.category,
            'subcategory', NEW.subcategory,
            'description', NEW.description,
            'date', NEW.date
        )
    );
END//

-- Trigger para DELETE
CREATE TRIGGER transaction_delete_audit 
AFTER DELETE ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO transaction_audit (transaction_id, user_id, action, old_values)
    VALUES (OLD.id, OLD.user_id, 'DELETE', JSON_OBJECT(
        'amount', OLD.amount,
        'type', OLD.type,
        'category', OLD.category,
        'subcategory', OLD.subcategory,
        'description', OLD.description,
        'date', OLD.date
    ));
END//

DELIMITER ;

-- =========================================
-- ÍNDICES ADICIONALES PARA PERFORMANCE
-- =========================================

-- Índice compuesto para consultas de reportes
CREATE INDEX idx_transactions_reporting ON transactions (user_id, date, type, category);

-- Índice para búsquedas por rango de fechas
CREATE INDEX idx_transactions_date_range ON transactions (date, user_id);

-- Índice para ordenamiento por monto
CREATE INDEX idx_transactions_amount_desc ON transactions (user_id, amount DESC);

-- =========================================
-- CONFIGURACIÓN DE SEGURIDAD
-- =========================================

-- Crear usuario específico para la aplicación (opcional)
-- CREATE USER 'moneytracker_app'@'%' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON moneytracker.* TO 'moneytracker_app'@'%';
-- FLUSH PRIVILEGES;

-- =========================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- =========================================

-- Insertar usuario de ejemplo
INSERT INTO users (name, email, password) VALUES 
('Usuario Demo', 'demo@moneytracker.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/7SL.8Xc4u'); -- password: "demo123"

-- Insertar transacciones de ejemplo
SET @demo_user_id = LAST_INSERT_ID();

INSERT INTO transactions (user_id, amount, type, category, subcategory, description, date) VALUES
(@demo_user_id, 3000.00, 'income', 'Salario', 'Salario', 'Salario mensual enero', '2024-01-01'),
(@demo_user_id, 500.00, 'expense', 'Alimentación', 'Supermercado', 'Supermercado semanal', '2024-01-02'),
(@demo_user_id, 1200.00, 'expense', 'Vivienda', 'Alquiler', 'Alquiler enero', '2024-01-03'),
(@demo_user_id, 200.00, 'expense', 'Transporte', 'Gasolina', 'Gasolina para el coche', '2024-01-04'),
(@demo_user_id, 150.00, 'expense', 'Entretenimiento', 'Cine y cena', 'Salida al cine con amigos', '2024-01-05'),
(@demo_user_id, 800.00, 'income', 'Freelance', 'Proyecto', 'Pago por proyecto web', '2024-01-10'),
(@demo_user_id, 300.00, 'expense', 'Compras', 'Ropa', 'Compra de ropa de invierno', '2024-01-12'),
(@demo_user_id, 100.00, 'expense', 'Salud', 'Medicamentos', 'Compra de medicinas', '2024-01-15');

-- =========================================
-- VERIFICACIÓN FINAL
-- =========================================

-- Mostrar estructura de tablas
SHOW TABLES;

-- Verificar datos insertados
SELECT 'Usuarios' as tabla, COUNT(*) as registros FROM users
UNION ALL
SELECT 'Categorías', COUNT(*) FROM categories
UNION ALL
SELECT 'Transacciones', COUNT(*) FROM transactions;

-- Verificar integridad referencial
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'moneytracker' 
    AND REFERENCED_TABLE_NAME IS NOT NULL;

COMMIT;

-- Tabla de países
CREATE TABLE IF NOT EXISTS countries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de ciudades
CREATE TABLE IF NOT EXISTS cities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  country_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (country_id) REFERENCES countries(id)
);

-- Tabla de barrios
CREATE TABLE IF NOT EXISTS neighborhoods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  city_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (city_id) REFERENCES cities(id)
);

-- Insertar algunos países de ejemplo
INSERT INTO countries (name, code) VALUES
('Colombia', 'CO'),
('México', 'MX'),
('España', 'ES'),
('Argentina', 'AR'),
('Chile', 'CL');

-- Insertar algunas ciudades de ejemplo para Colombia
INSERT INTO cities (name, country_id) VALUES
('Bogotá', 1),
('Medellín', 1),
('Cali', 1),
('Barranquilla', 1),
('Cartagena', 1);

-- Insertar algunos barrios de ejemplo para Bogotá
INSERT INTO neighborhoods (name, city_id) VALUES
('Chapinero', 1),
('Usaquén', 1),
('Suba', 1),
('Kennedy', 1),
('Engativá', 1);

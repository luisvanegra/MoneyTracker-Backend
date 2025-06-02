"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const database_2 = require("../config/database");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/profile';
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y GIF.'));
        }
    }
});
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const [existingUsers] = await database_1.pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
            res.status(400).json({
                success: false,
                message: 'El correo electrónico ya está registrado'
            });
            return;
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const [result] = await database_1.pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
        const token = jsonwebtoken_1.default.sign({ userId: result.insertId }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                user: {
                    id: result.insertId,
                    name,
                    email
                },
                token
            }
        });
    }
    catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            message: 'Error al registrar usuario'
        });
    }
});
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }
        const [users] = await database_1.pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!Array.isArray(users) || users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }
        const user = users[0];
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET || 'default_secret', { expiresIn: '7d' });
        return res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                token
            }
        });
    }
    catch (error) {
        console.error('Error en login:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al iniciar sesión'
        });
    }
});
router.get('/profile', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const user = await (0, database_2.query)(`SELECT id, name, email, first_name, second_name, first_last_name, second_last_name, 
              age, nationality, address_barrio, address_ciudad, address_demas, 
              address_codigo_postal, occupation, profile_picture_url, created_at
       FROM users
       WHERE id = ?`, [req.userId]);
        if (user.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Perfil de usuario no encontrado.'
            });
        }
        return res.json({
            success: true,
            data: { user: user[0] }
        });
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        return next(error);
    }
});
router.put('/profile', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { first_name, second_name, first_last_name, second_last_name, age, nationality, address_barrio, address_ciudad, address_demas, address_codigo_postal, occupation } = req.body;
        const updates = [];
        const params = [];
        if (first_name !== undefined) {
            updates.push('first_name = ?');
            params.push(first_name);
        }
        if (second_name !== undefined) {
            updates.push('second_name = ?');
            params.push(second_name);
        }
        if (first_last_name !== undefined) {
            updates.push('first_last_name = ?');
            params.push(first_last_name);
        }
        if (second_last_name !== undefined) {
            updates.push('second_last_name = ?');
            params.push(second_last_name);
        }
        if (age !== undefined) {
            const parsedAge = parseInt(age);
            if (!isNaN(parsedAge) && parsedAge > 0) {
                updates.push('age = ?');
                params.push(parsedAge);
            }
            else if (age === null || age === '') {
                updates.push('age = NULL');
            }
            else {
                return res.status(400).json({ success: false, message: 'Edad inválida.' });
            }
        }
        if (nationality !== undefined) {
            updates.push('nationality = ?');
            params.push(nationality);
        }
        if (address_barrio !== undefined) {
            updates.push('address_barrio = ?');
            params.push(address_barrio);
        }
        if (address_ciudad !== undefined) {
            updates.push('address_ciudad = ?');
            params.push(address_ciudad);
        }
        if (address_demas !== undefined) {
            updates.push('address_demas = ?');
            params.push(address_demas);
        }
        if (address_codigo_postal !== undefined) {
            updates.push('address_codigo_postal = ?');
            params.push(address_codigo_postal);
        }
        const allowedOccupations = ['estudiante', 'trabajador', 'independiente', 'desempleado', 'otro'];
        if (occupation !== undefined) {
            if (occupation === null || occupation === '' || allowedOccupations.includes(occupation)) {
                updates.push('occupation = ?');
                params.push(occupation === '' ? 'otro' : occupation);
            }
            else {
                return res.status(400).json({ success: false, message: 'Ocupación inválida.' });
            }
        }
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No hay datos para actualizar.' });
        }
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(req.userId);
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await (0, database_2.query)(sql, params);
        const updatedUser = await (0, database_2.query)(`SELECT id, name, email, first_name, second_name, first_last_name, second_last_name, 
               age, nationality, address_barrio, address_ciudad, address_demas, 
               address_codigo_postal, occupation, profile_picture_url, created_at
        FROM users
        WHERE id = ?`, [req.userId]);
        return res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: { user: updatedUser[0] }
        });
    }
    catch (error) {
        console.error('Error updating user profile:', error);
        return next(error);
    }
});
router.post('/profile/upload', auth_1.authenticateToken, upload.single('profile_picture'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No se ha subido ningún archivo'
            });
        }
        const profilePictureUrl = `/uploads/profile/${req.file.filename}`;
        await (0, database_2.query)('UPDATE users SET profile_picture_url = ? WHERE id = ?', [profilePictureUrl, req.userId]);
        return res.json({
            success: true,
            message: 'Imagen de perfil actualizada exitosamente',
            data: { profilePictureUrl }
        });
    }
    catch (error) {
        console.error('Error uploading profile picture:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al subir la imagen de perfil'
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map
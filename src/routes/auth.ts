import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';
import { query } from '../config/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/profile';
    // Crear el directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // límite de 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes JPEG, PNG y GIF.'));
    }
  }
});

// Registro de usuario
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Verificar si el usuario ya existe
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
      return;
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    // Generar token
    const token = jwt.sign(
      { userId: (result as any).insertId },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: (result as any).insertId,
          name,
          email
        },
        token
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario'
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validar datos de entrada
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const user = users[0] as any;

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

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
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión'
    });
  }
});

// Obtener perfil
router.get('/profile', authenticateToken, async (req: any, res, next) => {
  try {
    const user = await query(
      `SELECT id, name, email, first_name, second_name, first_last_name, second_last_name, 
              age, nationality, address_barrio, address_ciudad, address_demas, 
              address_codigo_postal, occupation, profile_picture_url, created_at
       FROM users
       WHERE id = ?`,
      [req.userId]
    ) as any[];

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

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return next(error);
  }
});

// Ruta para actualizar el perfil del usuario autenticado
router.put('/profile', authenticateToken, async (req: any, res, next) => {
  try {
    // Validar los datos de entrada (usando Joi u otro validador si tienes uno)
    // Por ahora, haré una validación básica
    const { first_name, second_name, first_last_name, second_last_name,
            age, nationality, address_barrio, address_ciudad, address_demas,
            address_codigo_postal, occupation } = req.body;

    // Construir dinámicamente la consulta de actualización
    const updates: string[] = [];
    const params: any[] = [];

    if (first_name !== undefined) { updates.push('first_name = ?'); params.push(first_name); }
    if (second_name !== undefined) { updates.push('second_name = ?'); params.push(second_name); }
    if (first_last_name !== undefined) { updates.push('first_last_name = ?'); params.push(first_last_name); }
    if (second_last_name !== undefined) { updates.push('second_last_name = ?'); params.push(second_last_name); }
    // Validar y agregar edad si se proporciona
    if (age !== undefined) {
        const parsedAge = parseInt(age);
        if (!isNaN(parsedAge) && parsedAge > 0) {
            updates.push('age = ?'); params.push(parsedAge);
        } else if (age === null || age === '') { // Permitir edad nula o vacía
             updates.push('age = NULL'); // Omitir agregar age a params
        } else {
            return res.status(400).json({ success: false, message: 'Edad inválida.' });
        }
    }
    if (nationality !== undefined) { updates.push('nationality = ?'); params.push(nationality); }
    if (address_barrio !== undefined) { updates.push('address_barrio = ?'); params.push(address_barrio); }
    if (address_ciudad !== undefined) { updates.push('address_ciudad = ?'); params.push(address_ciudad); }
    if (address_demas !== undefined) { updates.push('address_demas = ?'); params.push(address_demas); }
    if (address_codigo_postal !== undefined) { updates.push('address_codigo_postal = ?'); params.push(address_codigo_postal); }
    // Validar y agregar ocupación si se proporciona
     const allowedOccupations = ['estudiante', 'trabajador', 'independiente', 'desempleado', 'otro'];
    if (occupation !== undefined) {
        if (occupation === null || occupation === '' || allowedOccupations.includes(occupation)) {
             updates.push('occupation = ?'); params.push(occupation === '' ? 'otro' : occupation);
        } else {
            return res.status(400).json({ success: false, message: 'Ocupación inválida.' });
        }
    }
    // NOTA: La foto de perfil requerirá un manejo especial con middleware de subida (como multer)

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay datos para actualizar.' });
    }

    // Añadir updated_at automáticamente
    updates.push('updated_at = CURRENT_TIMESTAMP');

    // Añadir el user_id al final de los parámetros para la cláusula WHERE
    params.push(req.userId);

    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    await query(sql, params);

     // Opcional: obtener el usuario actualizado para devolverlo
    const updatedUser = await query(
       `SELECT id, name, email, first_name, second_name, first_last_name, second_last_name, 
               age, nationality, address_barrio, address_ciudad, address_demas, 
               address_codigo_postal, occupation, profile_picture_url, created_at
        FROM users
        WHERE id = ?`,
       [req.userId]
     ) as any[];

    return res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
       data: { user: updatedUser[0] }
    });

  } catch (error) {
    console.error('Error updating user profile:', error);
    return next(error);
  }
});

// Endpoint para subir imagen de perfil
router.post('/profile/upload', authenticateToken, upload.single('profile_picture'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha subido ningún archivo'
      });
    }

    const profilePictureUrl = `/uploads/profile/${req.file.filename}`;

    // Actualizar la URL de la imagen en la base de datos
    await query(
      'UPDATE users SET profile_picture_url = ? WHERE id = ?',
      [profilePictureUrl, req.userId]
    );

    return res.json({
      success: true,
      message: 'Imagen de perfil actualizada exitosamente',
      data: { profilePictureUrl }
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al subir la imagen de perfil'
    });
  }
});

export default router;

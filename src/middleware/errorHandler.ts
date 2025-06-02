import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('❌ Error:', err);

  // Error de validación de Joi
  if (err.isJoi) {
    res.status(400).json({
      success: false,
      message: 'Datos de entrada inválidos',
      errors: err.details.map((detail: any) => detail.message)
    });
    return;
  }

  // Error de MySQL
  if (err.code === 'ER_DUP_ENTRY') {
    res.status(409).json({
      success: false,
      message: 'El registro ya existe'
    });
    return;
  }

  // Error por defecto
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
  });
};

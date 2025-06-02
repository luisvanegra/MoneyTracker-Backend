import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// Obtener todos los países
router.get('/countries', async (req, res) => {
  try {
    const countries = await query('SELECT * FROM countries ORDER BY name');
    res.json({
      success: true,
      data: countries
    });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los países'
    });
  }
});

// Obtener ciudades por país
router.get('/cities/:countryId', async (req, res) => {
  try {
    const { countryId } = req.params;
    const cities = await query(
      'SELECT * FROM cities WHERE country_id = ? ORDER BY name',
      [countryId]
    );
    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener las ciudades'
    });
  }
});

// Obtener barrios por ciudad
router.get('/neighborhoods/:cityId', async (req, res) => {
  try {
    const { cityId } = req.params;
    const neighborhoods = await query(
      'SELECT * FROM neighborhoods WHERE city_id = ? ORDER BY name',
      [cityId]
    );
    res.json({
      success: true,
      data: neighborhoods
    });
  } catch (error) {
    console.error('Error fetching neighborhoods:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los barrios'
    });
  }
});

export default router; 
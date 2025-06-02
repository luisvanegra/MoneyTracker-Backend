"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
router.get('/countries', async (req, res) => {
    try {
        const countries = await (0, database_1.query)('SELECT * FROM countries ORDER BY name');
        res.json({
            success: true,
            data: countries
        });
    }
    catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los países'
        });
    }
});
router.get('/cities/:countryId', async (req, res) => {
    try {
        const { countryId } = req.params;
        const cities = await (0, database_1.query)('SELECT * FROM cities WHERE country_id = ? ORDER BY name', [countryId]);
        res.json({
            success: true,
            data: cities
        });
    }
    catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las ciudades'
        });
    }
});
router.get('/neighborhoods/:cityId', async (req, res) => {
    try {
        const { cityId } = req.params;
        const neighborhoods = await (0, database_1.query)('SELECT * FROM neighborhoods WHERE city_id = ? ORDER BY name', [cityId]);
        res.json({
            success: true,
            data: neighborhoods
        });
    }
    catch (error) {
        console.error('Error fetching neighborhoods:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los barrios'
        });
    }
});
exports.default = router;
//# sourceMappingURL=geo.js.map
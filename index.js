require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Clave secreta para JWT
const SECRET_KEY = process.env.JWT_SECRET || 'temucosoft_simi_2026';

// Conexión a AWS RDS PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false } // Requerido para AWS RDS
});

// =====================
// MIDDLEWARE JWT
// =====================
const verificarToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1];
        jwt.verify(bearerToken, SECRET_KEY, (err, authData) => {
            if (err) {
                return res.status(403).json({ error: 'Token inválido o expirado. Acceso denegado.' });
            }
            req.authData = authData;
            next();
        });
    } else {
        res.status(403).json({ error: 'No se proporcionó un token. Acceso denegado.' });
    }
};

// =====================
// RUTA PÚBLICA: LOGIN
// =====================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Credenciales simuladas para PoC
    if (username === 'admin_simi' && password === 'simi2026') {
        const user = { id: 1, username, role: 'TI_Admin' };
        const token = jwt.sign({ user }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({
            mensaje: 'Autenticación exitosa',
            token
        });
    }
    return res.status(401).json({ error: 'Credenciales incorrectas' });
});

// =====================
// RUTAS PROTEGIDAS
// =====================

// GET productos
app.get('/api/productos', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar productos en RDS' });
    }
});

// POST producto
app.post('/api/productos', verificarToken, async (req, res) => {
    const { nombre, descripcion, precio, stock } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO productos (nombre, descripcion, precio, stock) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, descripcion, precio, stock]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al insertar producto en RDS' });
    }
});

// Ruta raíz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor SIMI ERP corriendo en puerto ${PORT}`);
});
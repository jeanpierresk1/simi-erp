require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_KEY = process.env.JWT_SECRET || 'temucosoft_simi_2026';

// Secreto MFA fijo para la PoC (en producción sería por usuario en BD)
const MFA_SECRET = speakeasy.generateSecret({
    name: 'Farmacias SIMI ERP',
    issuer: 'SIMI TI'
});

// Conexión a AWS RDS PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

// =====================
// MIDDLEWARE JWT
// =====================
const verificarToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    if (typeof bearerHeader !== 'undefined') {
        const bearerToken = bearerHeader.split(' ')[1];
        jwt.verify(bearerToken, SECRET_KEY, (err, authData) => {
            if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
            req.authData = authData;
            next();
        });
    } else {
        res.status(403).json({ error: 'No se proporcionó token.' });
    }
};

// =====================
// RUTA: QR MFA
// =====================
app.get('/api/mfa/qr', async (req, res) => {
    try {
        const qrDataURL = await QRCode.toDataURL(MFA_SECRET.otpauth_url);
        res.json({ qr: qrDataURL, secret: MFA_SECRET.base32 });
    } catch (err) {
        res.status(500).json({ error: 'Error generando QR' });
    }
});

// =====================
// RUTA: LOGIN
// =====================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin_simi' && password === 'simi2026') {
        // Token temporal solo para pasar al paso MFA
        const tempToken = jwt.sign({ user: { username }, mfaPending: true }, SECRET_KEY, { expiresIn: '5m' });
        return res.json({ mensaje: 'Credenciales correctas. Verifica tu MFA.', tempToken });
    }
    return res.status(401).json({ error: 'Credenciales incorrectas' });
});

// =====================
// RUTA: VERIFICAR MFA
// =====================
app.post('/api/mfa/verify', (req, res) => {
    const { tempToken, otpCode } = req.body;
    try {
        const decoded = jwt.verify(tempToken, SECRET_KEY);
        if (!decoded.mfaPending) return res.status(403).json({ error: 'Token inválido' });

        const verified = speakeasy.totp.verify({
            secret: MFA_SECRET.base32,
            encoding: 'base32',
            token: otpCode,
            window: 1
        });

        if (verified) {
            const token = jwt.sign(
                { user: { id: 1, username: decoded.user.username, role: 'TI_Admin' } },
                SECRET_KEY,
                { expiresIn: '1h' }
            );
            return res.json({ mensaje: 'MFA verificado. Acceso concedido.', token });
        } else {
            return res.status(401).json({ error: 'Código MFA incorrecto o expirado.' });
        }
    } catch {
        return res.status(403).json({ error: 'Token temporal inválido o expirado.' });
    }
});

// =====================
// RUTAS PROTEGIDAS
// =====================
app.get('/api/productos', verificarToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM productos ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al consultar RDS' });
    }
});

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
        res.status(500).json({ error: 'Error al insertar en RDS' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor SIMI ERP corriendo en puerto ${PORT}`);
});

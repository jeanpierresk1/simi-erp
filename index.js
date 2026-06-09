const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// Clave secreta para firmar el JWT 
const SECRET_KEY = 'temucosoft_simi_2026';

// Ruta pública: Portal de Autenticación (Simulación de Login)
app.post('/api/login', (req, res) => {
    // Para la PoC (Prueba de Concepto), simulamos que el usuario validó sus credenciales
    const user = {
        id: 1,
        username: 'admin_simi',
        role: 'TI_Admin'
    };

    // Generamos el token con expiración de 1 hora
    const token = jwt.sign({ user }, SECRET_KEY, { expiresIn: '1h' });
    
    res.json({
        mensaje: 'Autenticación exitosa',
        token: token
    });
});

// Middleware para verificar el Token (Acceso Condicional)
const verificarToken = (req, res, next) => {
    const bearerHeader = req.headers['authorization'];
    
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        
        jwt.verify(bearerToken, SECRET_KEY, (err, authData) => {
            if (err) {
                res.status(403).json({ error: 'Token inválido o expirado. Acceso denegado.' });
            } else {
                req.authData = authData;
                next();
            }
        });
    } else {
        res.status(403).json({ error: 'No se proporcionó un token. Acceso denegado.' });
    }
};

// Ruta protegida: Solo accesible con Token válido
app.get('/api/recursos', verificarToken, (req, res) => {
    res.json({
        mensaje: '¡Acceso concedido a los recursos del ERP SIMI!',
        datos_sesion: req.authData
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Frontend SIMI corriendo en el puerto ${PORT}`);
});
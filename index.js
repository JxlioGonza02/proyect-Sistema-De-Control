const express = require('express');
const mysql   = require('mysql2');
const cors    = require('cors');
const multer  = require('multer');

const app    = express();
const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ==============================
// Conexión a MySQL (Clever Cloud)
// ==============================
const db = mysql.createConnection({
    host    : 'beyhvpokzuey16ay7fyd-mysql.services.clever-cloud.com',
    port    : 3306,
    user    : 'ue793vykf4vqxvgz',
    password: 'vjX8CF0v9iaMNQGIIx5e',
    database: 'beyhvpokzuey16ay7fyd'
});

db.connect((err) => {
    if (err) {
        console.error('Error conectando a MySQL:', err.message);
    } else {
        console.log('Conectado a MySQL en Clever Cloud');
    }
});

// ==============================
// POST /api - Recibe datos del ESP32
// ==============================
app.post('/api', upload.none(), (req, res) => {
    const {
        motor1_estado = 0,
        motor1_rpm    = 0,
        motor2_estado = 0,
        motor2_rpm    = 0,
        vibracion     = 0
    } = req.body;

    const alerta = parseFloat(vibracion) > 2.5 ? 1 : 0;

    const sql = `INSERT INTO registros 
                 (motor1_estado, motor1_rpm, motor2_estado, motor2_rpm, vibracion, alerta)
                 VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(sql, [motor1_estado, motor1_rpm, motor2_estado, motor2_rpm, vibracion, alerta], (err, result) => {
        if (err) {
            console.error('Error insertando:', err.message);
            return res.status(500).json({ error: err.message });
        }

        // Si hay alerta, guardarla también
        if (alerta) {
            db.query(
                `INSERT INTO alertas (tipo, valor, descripcion) VALUES (?, ?, ?)`,
                ['vibracion_alta', vibracion, 'Vibracion excesiva detectada']
            );
        }

        res.json({ status: 'ok', id: result.insertId });
    });
});

// ==============================
// GET /api - Devuelve últimos 50 registros
// ==============================
app.get('/api', (req, res) => {
    db.query('SELECT * FROM registros ORDER BY fecha_hora DESC LIMIT 50', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==============================
// GET /api/alertas - Devuelve alertas
// ==============================
app.get('/api/alertas', (req, res) => {
    db.query('SELECT * FROM alertas ORDER BY fecha_hora DESC LIMIT 20', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==============================
// Iniciar servidor
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

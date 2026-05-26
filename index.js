const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ==============================
// Conexión a MySQL (Clever Cloud)
// ==============================
const db = mysql.createConnection({
    host: 'beyhvpokzuey16ay7fyd-mysql.services.clever-cloud.com',
    port: 3306,
    user: 'ue793vykf4vqxvgz',
    password: 'vjX8CF0v9iaMNQGIIx5e',
    database: 'beyhvpokzuey16ay7fyd'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
    } else {
        console.log('✅ Conectado a MySQL en Clever Cloud');
        
        // Crear tabla para vibraciones detalladas del ESP32
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS vibraciones_detalle (
                id INT AUTO_INCREMENT PRIMARY KEY,
                ax INT NOT NULL,
                ay INT NOT NULL,
                az INT NOT NULL,
                vibracion_total FLOAT,
                fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        db.query(createTableSQL, (err) => {
            if (err) console.error('Error creando tabla:', err.message);
            else console.log('✅ Tabla vibraciones_detalle lista');
        });
    }
});

// ==============================
// POST /api - Recibe datos del formulario web
// ==============================
app.post('/api', upload.none(), (req, res) => {
    const motor1_estado = req.body.motor1_estado || 0;
    const motor1_rpm = req.body.motor1_rpm || 0;
    const motor2_estado = req.body.motor2_estado || 0;
    const motor2_rpm = req.body.motor2_rpm || 0;
    const vibracion = req.body.vibracion || 0;
    
    const alerta = parseFloat(vibracion) > 2.5 ? 1 : 0;
    
    const sql = `INSERT INTO registros 
                 (motor1_estado, motor1_rpm, motor2_estado, motor2_rpm, vibracion, alerta)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [motor1_estado, motor1_rpm, motor2_estado, motor2_rpm, vibracion, alerta], (err, result) => {
        if (err) {
            console.error('Error insertando:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
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
// POST /api/esp32 - Recibe datos del ESP32 (MPU6050)
// ==============================
app.post('/api/esp32', (req, res) => {
    const { ax, ay, az } = req.body;
    
    console.log(`📊 Datos del ESP32: ax=${ax}, ay=${ay}, az=${az}`);
    
    // Calcular vibración total
    const vibracion_total = Math.sqrt(ax * ax + ay * ay + az * az) / 10000;
    const alerta = vibracion_total > 0.5 ? 1 : 0;
    
    // Guardar en registros
    const sql = `INSERT INTO registros 
                 (motor1_estado, motor1_rpm, motor2_estado, motor2_rpm, vibracion, alerta)
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [0, 0, 0, 0, vibracion_total, alerta], (err, result) => {
        if (err) {
            console.error('Error guardando:', err.message);
            return res.status(500).json({ error: err.message });
        }
        
        // Guardar detalle del ESP32
        db.query(
            `INSERT INTO vibraciones_detalle (ax, ay, az, vibracion_total) VALUES (?, ?, ?, ?)`,
            [ax, ay, az, vibracion_total]
        );
        
        res.json({ status: 'ok', id: result.insertId, vibracion: vibracion_total });
    });
});

// ==============================
// GET /api - Últimos 50 registros
// ==============================
app.get('/api', (req, res) => {
    db.query('SELECT * FROM registros ORDER BY fecha_hora DESC LIMIT 50', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==============================
// GET /api/esp32 - Últimos datos del ESP32
// ==============================
app.get('/api/esp32', (req, res) => {
    db.query('SELECT * FROM vibraciones_detalle ORDER BY fecha_hora DESC LIMIT 50', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ==============================
// GET /api/alertas - Últimas alertas
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
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   GET/POST /api        - Datos generales`);
    console.log(`   GET/POST /api/esp32  - Datos del ESP32`);
    console.log(`   GET /api/alertas     - Alertas`);
});
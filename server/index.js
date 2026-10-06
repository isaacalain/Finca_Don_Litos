const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Crear conexión directa con la base de datos en Aiven
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==========================================
// 1. OBTENER CABAÑAS / BUNGALOWS
// ==========================================
app.get('/api/cabanas', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM bungalows');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener bungalows:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. CREAR RESERVA + VALIDACIÓN + NOTIFICACIÓN
// ==========================================
app.post('/api/reservas', async (req, res) => {
  const { cabana_id, nombre_cliente, email_cliente, telefono_cliente, fecha_checkin, fecha_checkout, total } = req.body;

  try {
    // Insertar reserva
    const [result] = await db.query(
      `INSERT INTO reservas (cabana_id, nombre_cliente, email_cliente, telefono_cliente, fecha_checkin, fecha_checkout, total) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cabana_id, nombre_cliente, email_cliente, telefono_cliente, fecha_checkin, fecha_checkout, total]
    );

    const reservaId = result.insertId;

    // Obtener información del bungalow reservado para el correo
    const [bungalowRows] = await db.query('SELECT nombre FROM bungalows WHERE id_bungalow = ?', [cabana_id]);
    const nombreBungalow = bungalowRows.length > 0 ? bungalowRows[0].nombre : 'Cabaña';

    // Enviar correo de confirmación
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email_cliente,
      subject: `Confirmación de Reserva #${reservaId} - Finca Don Litos`,
      html: `
        <h2>¡Reserva Confirmada!</h2>
        <p>Hola <strong>${nombre_cliente}</strong>, hemos recibido tu reserva.</p>
        <ul>
          <li><strong>Cabaña:</strong> ${nombreBungalow}</li>
          <li><strong>Check-in:</strong> ${fecha_checkin}</li>
          <li><strong>Check-out:</strong> ${fecha_checkout}</li>
          <li><strong>Total:</strong> ₡${Number(total).toLocaleString('es-CR')}</li>
        </ul>
        <p>¡Te esperamos en Finca Don Litos!</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, reservaId });
  } catch (error) {
    console.error('Error al procesar reserva:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
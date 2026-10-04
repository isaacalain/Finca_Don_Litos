require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// Pool de conexión a MySQL en Aiven Cloud
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

// Configuración de Nodemailer con la cuenta oficial
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==========================================
// 1. OBTENER CABAÑAS
// ==========================================
app.get('/api/cabanas', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cabanas');
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener cabañas:', error);
    res.status(500).json({ error: 'Error al obtener la lista de cabañas' });
  }
});

// ==========================================
// 2. CREAR RESERVA + VALIDACIÓN + NOTIFICACIÓN
// ==========================================
app.post('/api/reservas', async (req, res) => {
  const { cabana_id, nombre_cliente, email_cliente, telefono_cliente, fecha_checkin, fecha_checkout, total } = req.body;

  try {
    // Validar solapamiento de fechas para la misma cabaña
    const [coincidencias] = await pool.query(
      `SELECT * FROM reservas 
       WHERE cabana_id = ? 
         AND (
           (fecha_checkin < ? AND fecha_checkout > ?) OR
           (fecha_checkin >= ? AND fecha_checkin < ?)
         )`,
      [cabana_id, fecha_checkout, fecha_checkin, fecha_checkin, fecha_checkout]
    );

    if (coincidencias.length > 0) {
      return res.status(400).json({ 
        error: 'La cabaña ya está reservada en las fechas seleccionadas.' 
      });
    }

    // Insertar la reserva en la base de datos
    const [result] = await pool.query(
      `INSERT INTO reservas (cabana_id, nombre_cliente, email_cliente, telefono_cliente, fecha_checkin, fecha_checkout, total) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cabana_id, nombre_cliente, email_cliente, telefono_cliente, fecha_checkin, fecha_checkout, total]
    );

    // Obtener el nombre de la cabaña
    const [[cabana]] = await pool.query('SELECT nombre FROM cabanas WHERE id = ?', [cabana_id]);
    const cabanaNombre = cabana ? cabana.nombre : 'Cabaña Finca Don Litos';

    // Enviar correo de confirmación al cliente
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const mailOptionsCliente = {
        from: `"Finca Don Litos" <${process.env.EMAIL_USER}>`,
        to: email_cliente,
        subject: `🌿 Confirmación de Reserva #${result.insertId} - Finca Don Litos`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2e4d25;">🌿 ¡Gracias por tu reserva en Finca Don Litos!</h2>
            <p>Hola <strong>${nombre_cliente}</strong>, hemos registrado tu solicitud con éxito.</p>
            <hr style="border: 1px solid #eee;" />
            <h3>Detalles de la Reserva:</h3>
            <ul>
              <li><strong>N° Reserva:</strong> #${result.insertId}</li>
              <li><strong>Cabaña:</strong> ${cabanaNombre}</li>
              <li><strong>Entrada (Check-in):</strong> ${fecha_checkin}</li>
              <li><strong>Salida (Check-out):</strong> ${fecha_checkout}</li>
              <li><strong>Total:</strong> ₡${Number(total).toLocaleString('es-CR')}</li>
            </ul>
            <p><strong>Amenidades:</strong> Piscina común, parqueo privado y somos 🐾 Pet Friendly.</p>
            <p>¡Te esperamos!</p>
          </div>
        `
      };

      transporter.sendMail(mailOptionsCliente, (err, info) => {
        if (err) console.error('Error al enviar correo:', err.message);
        else console.log('📧 Correo enviado con éxito:', info.response);
      });
    }

    res.status(201).json({ 
      mensaje: 'Reserva creada con éxito', 
      reservaId: result.insertId 
    });

  } catch (error) {
    console.error('Error al procesar reserva:', error);
    res.status(500).json({ error: 'Error al procesar la reserva' });
  }
});

// ==========================================
// 3. OBTENER RESERVAS (PANEL ADMIN)
// ==========================================
app.get('/api/reservas', async (req, res) => {
  try {
    const [reservas] = await pool.query(`
      SELECT 
        r.id,
        r.nombre_cliente,
        r.email_cliente,
        r.telefono_cliente,
        r.fecha_checkin,
        r.fecha_checkout,
        r.total,
        r.creado_en,
        c.nombre AS cabana_nombre
      FROM reservas r
      JOIN cabanas c ON r.cabana_id = c.id
      ORDER BY r.fecha_checkin DESC
    `);
    
    res.json(reservas);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ error: 'Error al obtener las reservas' });
  }
});

// ==========================================
// 4. CANCELAR RESERVA (PANEL ADMIN)
// ==========================================
app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM reservas WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    res.json({ mensaje: 'Reserva cancelada con éxito' });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ error: 'Error al cancelar la reserva' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en el puerto ${PORT}`);
});
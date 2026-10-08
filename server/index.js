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
// 2. OBTENER TODAS LAS RESERVAS (PANEL ADMIN)
// ==========================================
app.get('/api/reservas', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        r.id_reserva AS id,
        b.nombre AS cabana_nombre,
        CONCAT(r.nombre, ' ', r.apellidos) AS nombre_cliente,
        r.email AS email_cliente,
        r.telefono AS telefono_cliente,
        DATE_FORMAT(r.fecha_inicio, '%Y-%m-%d') AS fecha_checkin,
        DATE_FORMAT(r.fecha_fin, '%Y-%m-%d') AS fecha_checkout,
        r.monto_total AS total,
        r.estado
      FROM reservas r
      LEFT JOIN bungalows b ON r.id_bungalow = b.id_bungalow
      ORDER BY r.id_reserva DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. CREAR RESERVA (Con estado 'reservada')
// ==========================================
app.post('/api/reservas', async (req, res) => {
  const { cabana_id, nombre, apellidos, email, telefono, fecha_checkin, fecha_checkout, total, id_usuario } = req.body;

  try {
    const usuarioId = id_usuario || null;

    const [result] = await db.query(
      `INSERT INTO reservas (id_usuario, id_bungalow, nombre, apellidos, email, telefono, fecha_inicio, fecha_fin, monto_total, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'reservada')`,
      [usuarioId, cabana_id, nombre, apellidos, email, telefono, fecha_checkin, fecha_checkout, total]
    );

    const reservaId = result.insertId;

    const [bungalowRows] = await db.query('SELECT nombre FROM bungalows WHERE id_bungalow = ?', [cabana_id]);
    const nombreBungalow = bungalowRows.length > 0 ? bungalowRows[0].nombre : 'Cabaña';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Confirmación de Reserva #${reservaId} - Finca Don Litos`,
      html: `
        <h2>¡Reserva Recibida!</h2>
        <p>Hola <strong>${nombre} ${apellidos}</strong>, hemos registrado tu reserva.</p>
        <ul>
          <li><strong>Cabaña:</strong> ${nombreBungalow}</li>
          <li><strong>Check-in:</strong> ${fecha_checkin}</li>
          <li><strong>Check-out:</strong> ${fecha_checkout}</li>
          <li><strong>Total:</strong> ₡${Number(total).toLocaleString('es-CR')}</li>
          <li><strong>Estado:</strong> Reservada</li>
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

// ==========================================
// 4. CANCELAR RESERVA (CAMBIA ESTADO A 'cancelada', NO ELIMINA)
// ==========================================
app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      "UPDATE reservas SET estado = 'cancelada' WHERE id_reserva = ?", 
      [id]
    );
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Reserva marcada como cancelada' });
    } else {
      res.status(404).json({ error: 'Reserva no encontrada' });
    }
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({ error: error.message });
  }
});

// CAMBIAR ESTADO DE RESERVA (A 'pagada')
app.put('/api/reservas/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = ['reservada', 'pagada', 'cancelada'];

  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }

  try {
    const [result] = await db.query(
      'UPDATE reservas SET estado = ? WHERE id_reserva = ?',
      [estado, id]
    );
    if (result.affectedRows > 0) {
      res.json({ success: true, message: `Estado actualizado a ${estado}` });
    } else {
      res.status(404).json({ error: 'Reserva no encontrada' });
    }
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. CREAR RESERVA + VALIDACIÓN + NOTIFICACIÓN
// ==========================================
app.post('/api/reservas', async (req, res) => {
  const { cabana_id, nombre, apellidos, email, telefono, fecha_checkin, fecha_checkout, total, id_usuario } = req.body;

  try {
    const usuarioId = id_usuario || null;

    const [result] = await db.query(
      `INSERT INTO reservas (id_usuario, id_bungalow, nombre, apellidos, email, telefono, fecha_inicio, fecha_fin, monto_total, estado) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada')`,
      [usuarioId, cabana_id, nombre, apellidos, email, telefono, fecha_checkin, fecha_checkout, total]
    );

    const reservaId = result.insertId;

    const [bungalowRows] = await db.query('SELECT nombre FROM bungalows WHERE id_bungalow = ?', [cabana_id]);
    const nombreBungalow = bungalowRows.length > 0 ? bungalowRows[0].nombre : 'Cabaña';

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Confirmación de Reserva #${reservaId} - Finca Don Litos`,
      html: `
        <h2>¡Reserva Confirmada!</h2>
        <p>Hola <strong>${nombre} ${apellidos}</strong>, hemos recibido tu reserva.</p>
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

// ==========================================
// 4. ELIMINAR / CANCELAR RESERVA
// ==========================================
app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM reservas WHERE id_reserva = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Reserva eliminada con éxito' });
    } else {
      res.status(404).json({ error: 'Reserva no encontrada' });
    }
  } catch (error) {
    console.error('Error al eliminar reserva:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
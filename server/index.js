const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Conexión a la base de datos en Aiven
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
// 1. AUTENTICACIÓN / LOGIN DE ADMINISTRADOR
// ==========================================
app.post('/api/login', async (req, res) => {
  const { usuario, contrasena } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT * FROM usuarios WHERE correo = ? LIMIT 1`,
      [usuario]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Correo no registrado.' });
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(contrasena, user.contrasena);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
    }

    if (user.rol !== 'admin') {
      return res.status(403).json({ success: false, error: 'Acceso denegado: El usuario no es administrador.' });
    }

    res.json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id_usuario,
        nombre: user.nombre,
        apellidos: user.apellidos,
        correo: user.correo,
        rol: user.rol
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor.' });
  }
});

// ==========================================
// 2. GESTIÓN DE USUARIOS (ADMIN)
// ==========================================

// Obtener la lista de usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id_usuario, nombre, apellidos, correo, rol, DATE_FORMAT(creado_en, '%Y-%m-%d %H:%i') AS creado_en FROM usuarios ORDER BY id_usuario DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo usuario con validación estricta de espacios en blanco
app.post('/api/admin/crear-usuario', async (req, res) => {
  const { adminCorreo, adminPassword, nuevoNombre, nuevoApellido, nuevoCorreo, nuevaPassword, nuevoRol } = req.body;

  // Validación estricta para evitar campos vacíos o con puros espacios
  if (
    !nuevoNombre || !nuevoNombre.trim() ||
    !nuevoApellido || !nuevoApellido.trim() ||
    !nuevoCorreo || !nuevoCorreo.trim() ||
    !nuevaPassword || !nuevaPassword.trim()
  ) {
    return res.status(400).json({ 
      success: false, 
      error: 'Todos los campos son obligatorios y no pueden contener solo espacios en blanco.' 
    });
  }

  try {
    // A) Verificar credenciales del administrador que autoriza la creación
    const [adminRows] = await db.query(
      `SELECT * FROM usuarios WHERE correo = ? AND rol = 'admin' LIMIT 1`,
      [adminCorreo]
    );

    if (adminRows.length === 0) {
      return res.status(403).json({ success: false, error: 'Administrador no autorizado.' });
    }

    const adminUser = adminRows[0];
    const adminPasswordValida = await bcrypt.compare(adminPassword, adminUser.contrasena);

    if (!adminPasswordValida) {
      return res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta. Autorización denegada.' });
    }

    // B) Validar si el correo del nuevo usuario ya existe
    const [existente] = await db.query(
      `SELECT id_usuario FROM usuarios WHERE correo = ? LIMIT 1`,
      [nuevoCorreo.trim()]
    );

    if (existente.length > 0) {
      return res.status(400).json({ success: false, error: 'Ya existe un usuario registrado con ese correo electrónico.' });
    }

    // C) Encriptar la contraseña del nuevo usuario
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(nuevaPassword.trim(), saltRounds);

    // D) Insertar el usuario en MySQL con campos limpios de espacios extra
    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, apellidos, correo, contrasena, rol) VALUES (?, ?, ?, ?, ?)`,
      [nuevoNombre.trim(), nuevoApellido.trim(), nuevoCorreo.trim(), passwordHash, nuevoRol || 'cliente']
    );

    res.json({
      success: true,
      message: 'Usuario creado exitosamente',
      id_usuario: result.insertId
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, error: 'Error interno en el servidor.' });
  }
});

// Eliminar un usuario
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM usuarios WHERE id_usuario = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } else {
      res.status(404).json({ error: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. OBTENER CABAÑAS / BUNGALOWS
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
// 4. OBTENER FECHAS OCUPADAS POR CABAÑA
// ==========================================
app.get('/api/reservas/ocupadas/:cabana_id', async (req, res) => {
  const { cabana_id } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
        DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_checkin,
        DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_checkout
       FROM reservas 
       WHERE id_bungalow = ? AND estado != 'cancelada'`,
      [cabana_id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener fechas ocupadas:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. OBTENER TODAS LAS RESERVAS
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
// 6. CREAR RESERVA (Con anti-colisión)
// ==========================================
app.post('/api/reservas', async (req, res) => {
  const { cabana_id, nombre, apellidos, email, telefono, fecha_checkin, fecha_checkout, total, id_usuario } = req.body;

  try {
    const usuarioId = id_usuario || null;

    const [choques] = await db.query(
      `SELECT id_reserva FROM reservas 
       WHERE id_bungalow = ? 
       AND estado != 'cancelada'
       AND (
         (fecha_inicio <= ? AND fecha_fin >= ?) OR
         (fecha_inicio <= ? AND fecha_fin >= ?) OR
         (? <= fecha_inicio AND ? >= fecha_fin)
       )`,
      [cabana_id, fecha_checkin, fecha_checkin, fecha_checkout, fecha_checkout, fecha_checkin, fecha_checkout]
    );

    if (choques.length > 0) {
      return res.status(400).json({ error: 'Las fechas seleccionadas ya se encuentran reservadas.' });
    }

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
// 7. CANCELAR RESERVA
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

// ==========================================
// 8. CAMBIAR ESTADO DE RESERVA
// ==========================================
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
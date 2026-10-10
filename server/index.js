const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: 'mysql-313f4314-isaacalain5-d93c.l.aivencloud.com',
  port: 18277,
  user: 'avnadmin',
  password: 'AVNS_OHM1Uam0_3tZ6qPiFrz',
  database: 'finca_don_litos',
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Probar conexión al iniciar el servidor
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error en MySQL al conectar:', err);
  } else {
    console.log('✅ Conectado con éxito a la base de datos "finca_don_litos" en Aiven');
    connection.release();
  }
});

// ==========================================
// 1. ENDPOINT DE LOGIN
// ==========================================
app.post('/api/login', (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Por favor ingresa tu correo y contraseña.' 
    });
  }

  const correoLimpio = correo.trim().toLowerCase();
  const passwordLimpia = password.trim();

  const sql = 'SELECT * FROM usuarios WHERE LOWER(TRIM(correo)) = ? LIMIT 1';

  db.query(sql, [correoLimpio], async (err, results) => {
    if (err) {
      console.error('❌ Error en MySQL al consultar usuario:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Error interno en la base de datos.' 
      });
    }

    if (!results || results.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'El correo electrónico no está registrado.' 
      });
    }

    const usuario = results[0];

    try {
      const passwordValida = await bcrypt.compare(passwordLimpia, usuario.contrasena);

      if (!passwordValida) {
        return res.status(401).json({ 
          success: false, 
          error: 'Contraseña incorrecta.' 
        });
      }

      res.json({
        success: true,
        user: {
          id: usuario.id_usuario,
          id_usuario: usuario.id_usuario,
          nombre: usuario.nombre,
          apellidos: usuario.apellidos || '',
          correo: usuario.correo,
          rol: usuario.rol || 'cliente'
        }
      });
    } catch (bcryptErr) {
      console.error('Error al comparar contraseña con bcrypt:', bcryptErr);
      return res.status(500).json({ success: false, error: 'Error al verificar la seguridad de la contraseña.' });
    }
  });
});

// ==========================================
// 2. ENDPOINT DE REGISTRO PÚBLICO (Desde el Login)
// ==========================================
app.post('/api/usuarios', async (req, res) => {
  const { nombre, apellidos, correo, password, rol } = req.body;

  if (!nombre || !correo || !password) {
    return res.status(400).json({ success: false, error: 'Faltan campos obligatorios.' });
  }

  // 👉 Validar mínimo 6 caracteres en la contraseña
  if (password.trim().length < 6) {
    return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const correoLimpio = correo.trim().toLowerCase();
  const rolFinal = rol || 'cliente';
  const estadoInicial = 'activa';

  try {
    const checkSql = 'SELECT id_usuario FROM finca_don_litos.usuarios WHERE LOWER(TRIM(correo)) = ?';
    db.query(checkSql, [correoLimpio], async (err, existing) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: 'Error de servidor.' });
      }

      if (existing && existing.length > 0) {
        return res.status(400).json({ success: false, error: 'El correo electrónico ya está registrado.' });
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

      const insertSql = 'INSERT INTO finca_don_litos.usuarios (nombre, apellidos, correo, contrasena, rol, estado) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(insertSql, [nombre.trim(), apellidos ? apellidos.trim() : '', correoLimpio, hashedPassword, rolFinal, estadoInicial], (errInsert, result) => {
        if (errInsert) {
          console.error("❌ Error al insertar usuario desde registro:", errInsert);
          return res.status(500).json({ success: false, error: 'Error al registrar el usuario.' });
        }

        res.json({
          success: true,
          id_usuario: result.insertId,
          mensaje: 'Usuario registrado con éxito.'
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error al procesar el registro.' });
  }
});
// ==========================================
// 3. OBTENER LISTA DE USUARIOS
// ==========================================
app.get('/api/usuarios', (req, res) => {
  const sql = 'SELECT id_usuario, nombre, apellidos, correo, rol, estado, creado_en FROM usuarios ORDER BY id_usuario DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al consultar usuarios.' });
    }
    res.json(results);
  });
});

// ==========================================
// 4. ELIMINAR USUARIO (Asegurado con esquema completo)
// ==========================================
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { adminId, adminCorreo, adminPassword } = req.body;

  console.log("🔍 [DELETE] Intentando eliminar usuario ID:", id, "por admin ID:", adminId, "Correo:", adminCorreo);

  if (!adminPassword || (!adminId && !adminCorreo)) {
    return res.status(400).json({ success: false, error: 'Faltan credenciales del administrador.' });
  }

  const checkAdminSql = 'SELECT * FROM finca_don_litos.usuarios WHERE (id_usuario = ? OR LOWER(TRIM(correo)) = ?) LIMIT 1';
  db.query(checkAdminSql, [adminId || 0, (adminCorreo || '').trim().toLowerCase()], async (err, results) => {
    if (err) {
      console.error("❌ Error SQL:", err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos.' });
    }

    if (!results || results.length === 0) {
      console.log("⚠️ Administrador no encontrado en la BD.");
      return res.status(401).json({ success: false, error: 'Administrador no encontrado.' });
    }

    const admin = results[0];
    console.log("✅ Admin localizado:", admin.correo, "Rol actual en BD:", admin.rol);

    // Verificamos la contraseña con la columna 'contrasena'
    const adminPassValido = await bcrypt.compare(adminPassword.trim(), admin.contrasena);

    if (!adminPassValido) {
      console.log("⚠️ Contraseña de administrador incorrecta.");
      return res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta.' });
    }

    const sql = 'DELETE FROM finca_don_litos.usuarios WHERE id_usuario = ?';
    db.query(sql, [id], (errDel, result) => {
      if (errDel) {
        console.error(errDel);
        return res.status(500).json({ success: false, error: 'Error al eliminar el usuario.' });
      }
      res.json({ success: true, mensaje: 'Usuario eliminado exitosamente.' });
    });
  });
});

// ==========================================
// 4.1. CAMBIAR ESTADO DE USUARIO (Asegurado con esquema completo)
// ==========================================
app.put('/api/usuarios/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado, adminId, adminCorreo, adminPassword } = req.body;

  console.log("🔍 [PUT ESTADO] Usuario ID:", id, "Nuevo estado:", nuevoEstado, "por admin ID:", adminId, "Correo:", adminCorreo);

  if (!adminPassword || (!adminId && !adminCorreo)) {
    return res.status(400).json({ success: false, error: 'Faltan credenciales del administrador.' });
  }

  const checkAdminSql = 'SELECT * FROM finca_don_litos.usuarios WHERE (id_usuario = ? OR LOWER(TRIM(correo)) = ?) LIMIT 1';
  db.query(checkAdminSql, [adminId || 0, (adminCorreo || '').trim().toLowerCase()], async (err, results) => {
    if (err) {
      console.error("❌ Error SQL:", err);
      return res.status(500).json({ success: false, error: 'Error en la base de datos.' });
    }

    if (!results || results.length === 0) {
      console.log("⚠️ Administrador no encontrado en la BD.");
      return res.status(401).json({ success: false, error: 'Administrador no encontrado.' });
    }

    const admin = results[0];
    console.log("✅ Admin localizado:", admin.correo, "Rol actual en BD:", admin.rol);

    // Verificamos la contraseña con la columna 'contrasena'
    const adminPassValido = await bcrypt.compare(adminPassword.trim(), admin.contrasena);

    if (!adminPassValido) {
      console.log("⚠️ Contraseña de administrador incorrecta.");
      return res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta.' });
    }

    const sql = 'UPDATE finca_don_litos.usuarios SET estado = ? WHERE id_usuario = ?';
    db.query(sql, [nuevoEstado, id], (errUpd, result) => {
      if (errUpd) {
        console.error(errUpd);
        return res.status(500).json({ success: false, error: 'Error al actualizar el estado del usuario.' });
      }
      res.json({ success: true, mensaje: 'Estado actualizado exitosamente.' });
    });
  });
});

// ==========================================
// 5. ACTUALIZAR PERFIL
// ==========================================
app.put('/api/perfil', async (req, res) => {
  const { id_usuario, nombre, apellidos, correo, passwordActual, nuevaPassword } = req.body;

  if (!id_usuario || !passwordActual) {
    return res.status(400).json({ success: false, error: 'Datos insuficientes para validar la cuenta.' });
  }

  const checkSql = 'SELECT * FROM usuarios WHERE id_usuario = ? LIMIT 1';
  db.query(checkSql, [id_usuario], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }

    const usuario = results[0];

    try {
      const passwordValida = await bcrypt.compare(passwordActual.trim(), usuario.contrasena);
      if (!passwordValida) {
        return res.status(401).json({ success: false, error: 'La contraseña actual es incorrecta.' });
      }

      let passFinal = usuario.contrasena;
      if (nuevaPassword && nuevaPassword.trim() !== '') {
        passFinal = await bcrypt.hash(nuevaPassword.trim(), 10);
      }

      const correoLimpio = correo ? correo.trim().toLowerCase() : usuario.correo;

      const updateSql = 'UPDATE usuarios SET nombre = ?, apellidos = ?, correo = ?, contrasena = ? WHERE id_usuario = ?';
      db.query(updateSql, [nombre.trim(), apellidos.trim(), correoLimpio, passFinal, id_usuario], (errResult) => {
        if (errResult) {
          console.error(errResult);
          return res.status(500).json({ success: false, error: 'Error al actualizar el perfil.' });
        }

        res.json({
          success: true,
          user: {
            id: usuario.id_usuario,
            id_usuario: usuario.id_usuario,
            nombre: nombre.trim(),
            apellidos: apellidos.trim(),
            correo: correoLimpio,
            rol: usuario.rol
          }
        });
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, error: 'Error al actualizar la contraseña.' });
    }
  });
});
// ==========================================
// 6. CREAR USUARIO DESDE ADMIN
// ==========================================
app.post('/api/admin/crear-usuario', async (req, res) => {
  const { adminCorreo, adminPassword, nuevoNombre, nuevoApellido, nuevoCorreo, nuevaPassword, nuevoRol } = req.body;

  // Validación de mínimo 6 caracteres
  if (nuevaPassword && nuevaPassword.trim().length < 6) {
    return res.status(400).json({ success: false, error: 'La contraseña del nuevo usuario debe tener al menos 6 caracteres.' });
  }

  if (!adminCorreo || !adminPassword) {
    return res.status(401).json({ success: false, error: 'Faltan credenciales del administrador.' });
  }

  // Buscamos al administrador directamente por su correo exacto
  const findAdminSql = 'SELECT * FROM finca_don_litos.usuarios WHERE LOWER(TRIM(correo)) = ? LIMIT 1';
  
  db.query(findAdminSql, [adminCorreo.trim().toLowerCase()], async (err, results) => {
    if (err) {
      console.error("❌ Error en base de datos:", err);
      return res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }

    if (!results || results.length === 0) {
      return res.status(401).json({ success: false, error: 'Administrador no encontrado.' });
    }

    const admin = results[0];
    const adminPassValido = await bcrypt.compare(adminPassword.trim(), admin.contrasena);

    if (!adminPassValido) {
      return res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta.' });
    }

    const correoLimpio = nuevoCorreo.trim().toLowerCase();
    const hashedNewPassword = await bcrypt.hash(nuevaPassword.trim(), 10);
    const estadoInicial = 'activa';

    const insertSql = 'INSERT INTO finca_don_litos.usuarios (nombre, apellidos, correo, contrasena, estado) VALUES (?, ?, ?, ?, ?)';
    db.query(insertSql, [nuevoNombre.trim(), nuevoApellido.trim(), correoLimpio, hashedNewPassword, estadoInicial], (errInsert) => {
      if (errInsert) {
        console.error("❌ Error al insertar usuario:", errInsert);
        return res.status(500).json({ success: false, error: 'El correo electrónico ya existe o hubo un error al crear.' });
      }

      res.json({ success: true, mensaje: 'Usuario creado exitosamente por el administrador.' });
    });
  });
});
// ==========================================
// 7. OBTENER CABAÑAS (VISITANTE)
// ==========================================
app.get('/api/cabanas', (req, res) => {
  const sql = 'SELECT * FROM bungalows';
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al consultar cabañas.' });
    }
    res.json(results);
  });
});

// ==========================================
// 8. OBTENER FECHAS OCUPADAS
// ==========================================
app.get('/api/reservas/ocupadas/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT 
      DATE_FORMAT(fecha_inicio, '%Y-%m-%d') AS fecha_checkin, 
      DATE_FORMAT(fecha_fin, '%Y-%m-%d') AS fecha_checkout 
    FROM finca_don_litos.reservas 
    WHERE id_bungalow = ? AND estado != 'cancelada'
  `;

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error al obtener fechas ocupadas:', err);
      return res.status(500).json({ error: 'Error al obtener fechas ocupadas.' });
    }
    res.json(results);
  });
});

// ==========================================
// 9. OBTENER TODAS LAS RESERVAS
// ==========================================
app.get('/api/reservas', (req, res) => {
  const sql = `
    SELECT 
      r.id_reserva AS id,
      r.id_bungalow AS cabana_id,
      b.nombre AS cabana_nombre,
      r.nombre AS nombre_cliente,
      r.email AS email_cliente,
      r.telefono AS telefono_cliente,
      DATE_FORMAT(r.fecha_inicio, '%Y-%m-%d') AS fecha_checkin,
      DATE_FORMAT(r.fecha_fin, '%Y-%m-%d') AS fecha_checkout,
      r.monto_total AS total,
      r.estado
    FROM finca_don_litos.reservas r
    JOIN finca_don_litos.bungalows b ON r.id_bungalow = b.id_bungalow
    ORDER BY r.id_reserva DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al consultar reservas.' });
    }
    res.json(results);
  });
});

// ==========================================
// 10. CREAR RESERVA
// ==========================================
app.post('/api/reservas', (req, res) => {
  const { cabana_id, id_usuario, nombre, apellidos, email, telefono, fecha_checkin, fecha_checkout, total } = req.body;

  const nombreCompleto = `${nombre} ${apellidos}`.trim();

  const sql = `
    INSERT INTO reservas (id_bungalow, id_usuario, nombre, email, telefono, fecha_inicio, fecha_fin, monto_total, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'reservada')
  `;

  db.query(sql, [cabana_id, id_usuario || null, nombreCompleto, email, telefono, fecha_checkin, fecha_checkout, total], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Error al guardar la reserva.' });
    }

    res.json({
      success: true,
      id_reserva: result.insertId,
      mensaje: 'Reserva creada exitosamente'
    });
  });
});

// ==========================================
// 11. CAMBIAR ESTADO DE RESERVA
// ==========================================
app.put('/api/reservas/:id/estado', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const sql = 'UPDATE finca_don_litos.reservas SET estado = ? WHERE id_reserva = ?';
  db.query(sql, [estado, id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al cambiar estado de la reserva.' });
    }
    res.json({ success: true });
  });
});

// ==========================================
// 12. CANCELAR / ELIMINAR RESERVA
// ==========================================
app.delete('/api/reservas/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = 'UPDATE finca_don_litos.reservas SET estado = ? WHERE id_reserva = ?';
  db.query(sql, ['cancelada', id], (err, result) => {
    if (err) {
      console.error("❌ Error al cancelar reserva:", err);
      return res.status(500).json({ success: false, error: 'Error al cancelar la reserva.' });
    }
    res.json({ success: true, mensaje: 'Reserva cancelada exitosamente.' });
  });
});

// Iniciar Servidor
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
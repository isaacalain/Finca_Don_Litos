const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Resend } = require('resend');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());


// Configuración del cliente de correo Resend leyendo la variable de entorno
const resend = new Resend(process.env.RESEND_API_KEY);



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
// 2. ENDPOINT DE REGISTRO PÚBLICO
// ==========================================
app.post('/api/usuarios', async (req, res) => {
  const { nombre, apellidos, correo, password, rol } = req.body;

  if (!nombre || !correo || !password) {
    return res.status(400).json({ success: false, error: 'Faltan campos obligatorios.' });
  }

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

// Ruta para solicitar recuperación de contraseña
app.post('/api/forgot-password', async (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ success: false, error: 'El correo es obligatorio.' });
  }

  try {
    const [usuarios] = await db.promise().query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    
    if (usuarios.length === 0) {
      return res.status(404).json({ success: false, error: 'No existe una cuenta registrada con este correo.' });
    }

    const usuario = usuarios[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const formatoExpires = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    await db.promise().query(
      'UPDATE usuarios SET reset_token = ?, reset_token_expires = ? WHERE id_usuario = ?',
      [resetToken, formatoExpires, usuario.id_usuario]
    );

    // 🌐 URL de producción en Vercel (si estás probando en local cambia temporalmente a localhost)
    const frontendUrl = process.env.FRONTEND_URL || 'https://finca-don-litos.vercel.app';
    const enlaceReset = `${frontendUrl}/reset-password?token=${resetToken}`;

    // 🚀 Envío de correo mediante la API HTTP de Resend (evita bloqueos SMTP en Render)
    await resend.emails.send({
      from: 'Finca Don Litos <onboarding@resend.dev>',
      to: usuario.correo,
      subject: 'Recuperación de Contraseña - Finca Don Litos',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2e4d25;">Recuperación de Contraseña</h2>
          <p>Hola <strong>${usuario.nombre}</strong>,</p>
          <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente botón para continuar:</p>
          <a href="${enlaceReset}" style="display: inline-block; background-color: #2e4d25; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 15px 0;">Restablecer Contraseña</a>
          <p>Este enlace expirará en 15 minutos.</p>
          <p>Si tú no solicitaste esto, puedes ignorar este mensaje.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Se ha enviado un correo con las instrucciones.' });

  } catch (err) {
    console.error('Error en forgot-password:', err);
    res.status(500).json({ success: false, error: 'Error en el servidor al procesar la solicitud.' });
  }
});

// Ruta para restablecer la contraseña usando el token
app.post('/api/reset-password', async (req, res) => {
  const { token, nuevaPassword } = req.body;

  if (!token || !nuevaPassword) {
    return res.status(400).json({ success: false, error: 'El token y la nueva contraseña son obligatorios.' });
  }

  try {
    const [usuarios] = await db.promise().query(
      'SELECT * FROM usuarios WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (usuarios.length === 0) {
      return res.status(400).json({ success: false, error: 'El enlace es inválido o ya ha expirado.' });
    }

    const usuario = usuarios[0];
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nuevaPassword, saltRounds);

    await db.promise().query(
      'UPDATE usuarios SET contrasena = ?, reset_token = NULL, reset_token_expires = NULL WHERE id_usuario = ?',
      [hashedPassword, usuario.id_usuario || usuario.id]
    );

    res.json({ success: true, message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });

  } catch (err) {
    console.error('Error en reset-password:', err);
    res.status(500).json({ success: false, error: 'Error en el servidor al restablecer la contraseña.' });
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
// 4. ELIMINAR USUARIO
// ==========================================
app.delete('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { adminId, adminCorreo, adminPassword } = req.body;

  if (!adminPassword || (!adminId && !adminCorreo)) {
    return res.status(400).json({ success: false, error: 'Faltan credenciales del administrador.' });
  }

  const checkAdminSql = 'SELECT * FROM finca_don_litos.usuarios WHERE (id_usuario = ? OR LOWER(TRIM(correo)) = ?) LIMIT 1';
  db.query(checkAdminSql, [adminId || 0, (adminCorreo || '').trim().toLowerCase()], async (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Error en la base de datos.' });
    }

    if (!results || results.length === 0) {
      return res.status(401).json({ success: false, error: 'Administrador no encontrado.' });
    }

    const admin = results[0];
    const adminPassValido = await bcrypt.compare(adminPassword.trim(), admin.contrasena);

    if (!adminPassValido) {
      return res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta.' });
    }

    const sql = 'DELETE FROM finca_don_litos.usuarios WHERE id_usuario = ?';
    db.query(sql, [id], (errDel) => {
      if (errDel) {
        return res.status(500).json({ success: false, error: 'Error al eliminar el usuario.' });
      }
      res.json({ success: true, mensaje: 'Usuario eliminado exitosamente.' });
    });
  });
});

// ==========================================
// 4.1. CAMBIAR ESTADO DE USUARIO
// ==========================================
app.put('/api/usuarios/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { nuevoEstado, adminId, adminCorreo, adminPassword } = req.body;

  if (!adminPassword || (!adminId && !adminCorreo)) {
    return res.status(400).json({ success: false, error: 'Faltan credenciales del administrador.' });
  }

  const checkAdminSql = 'SELECT * FROM finca_don_litos.usuarios WHERE (id_usuario = ? OR LOWER(TRIM(correo)) = ?) LIMIT 1';
  db.query(checkAdminSql, [adminId || 0, (adminCorreo || '').trim().toLowerCase()], async (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Error en la base de datos.' });
    }

    if (!results || results.length === 0) {
      return res.status(401).json({ success: false, error: 'Administrador no encontrado.' });
    }

    const admin = results[0];
    const adminPassValido = await bcrypt.compare(adminPassword.trim(), admin.contrasena);

    if (!adminPassValido) {
      return res.status(401).json({ success: false, error: 'Contraseña de administrador incorrecta.' });
    }

    const sql = 'UPDATE finca_don_litos.usuarios SET estado = ? WHERE id_usuario = ?';
    db.query(sql, [nuevoEstado, id], (errUpd) => {
      if (errUpd) {
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
  const { adminCorreo, adminPassword, nuevoNombre, nuevoApellido, nuevoCorreo, nuevaPassword } = req.body;

  if (nuevaPassword && nuevaPassword.trim().length < 6) {
    return res.status(400).json({ success: false, error: 'La contraseña del nuevo usuario debe tener al menos 6 caracteres.' });
  }

  if (!adminCorreo || !adminPassword) {
    return res.status(401).json({ success: false, error: 'Faltan credenciales del administrador.' });
  }

  const findAdminSql = 'SELECT * FROM finca_don_litos.usuarios WHERE LOWER(TRIM(correo)) = ? LIMIT 1';
  
  db.query(findAdminSql, [adminCorreo.trim().toLowerCase()], async (err, results) => {
    if (err) {
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
        return res.status(500).json({ success: false, error: 'El correo electrónico ya existe o hubo un error al crear.' });
      }

      res.json({ success: true, mensaje: 'Usuario creado exitosamente por el administrador.' });
    });
  });
});

// ==========================================
// 7. OBTENER CABAÑAS
// ==========================================
app.get('/api/cabanas', (req, res) => {
  const sql = 'SELECT * FROM bungalows';
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Error al consultar cabañas.' });
    }
    res.json(results);
  });
});

// ==========================================
// OBTENER FECHAS OCUPADAS POR BUNGALOW
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
// 9. OBTENER TODAS LAS RESERVAS CON DETALLES DE PAGO
// ==========================================
app.get('/api/reservas', (req, res) => {
  const sql = `
    SELECT 
      r.id_reserva AS id,
      r.id_bungalow AS cabana_id,
      b.nombre AS cabana_nombre,
      r.nombre AS nombre_cliente,
      r.apellidos AS apellidos_cliente,
      r.email AS email_cliente,
      r.telefono AS telefono_cliente,
      DATE_FORMAT(r.fecha_inicio, '%Y-%m-%d') AS fecha_checkin,
      DATE_FORMAT(r.fecha_fin, '%Y-%m-%d') AS fecha_checkout,
      r.monto_total AS total,
      r.estado,
      COALESCE(p.metodo_pago, 'SINPE_MOVIL') AS metodo_pago,
      COALESCE(p.comprobante_url, 'N/A') AS comprobante_referencia,
      COALESCE(p.estado_pago, 'en_revision') AS estado_pago
    FROM finca_don_litos.reservas r
    JOIN finca_don_litos.bungalows b ON r.id_bungalow = b.id_bungalow
    LEFT JOIN finca_don_litos.pagos p ON r.id_reserva = p.id_reserva
    ORDER BY r.id_reserva DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error al consultar reservas con pagos:', err);
      return res.status(500).json({ error: 'Error al consultar reservas.' });
    }
    res.json(results);
  });
});

// ==========================================
// 10. CREAR RESERVA Y REGISTRAR PAGO SIMULADO
// ==========================================
app.post('/api/reservas', async (req, res) => {
  const { 
    cabana_id, 
    id_usuario, 
    nombre, 
    apellidos, 
    email, 
    telefono, 
    fecha_checkin, 
    fecha_checkout, 
    total, 
    metodo_pago, 
    comprobante_referencia 
  } = req.body;

  const nombreLimpio = nombre ? nombre.trim() : '';
  const apellidosLimpios = apellidos ? apellidos.trim() : '';
  const nombreParaCorreo = `${nombreLimpio} ${apellidosLimpios}`.trim();
  const metodoPagoFinal = metodo_pago || 'SINPE_MOVIL'; 
  
  const estadoPagoInicial = metodoPagoFinal === 'TARJETA' ? 'aprobado' : 'en_revision';
  const estadoReservaInicial = metodoPagoFinal === 'TARJETA' ? 'pagada' : 'reservada';

  // 1. Insertar la reserva principal guardando nombre y apellidos por separado
  const sqlReserva = `
    INSERT INTO reservas (id_bungalow, id_usuario, nombre, apellidos, email, telefono, fecha_inicio, fecha_fin, monto_total, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sqlReserva, [
    cabana_id, 
    id_usuario || null, 
    nombreLimpio, 
    apellidosLimpios, 
    email, 
    telefono, 
    fecha_checkin, 
    fecha_checkout, 
    total, 
    estadoReservaInicial
  ], (err, resultReserva) => {
    if (err) {
      console.error("❌ Error al guardar reserva:", err);
      return res.status(500).json({ success: false, error: 'Error al guardar la reserva.' });
    }

    const idReservaCreada = resultReserva.insertId;

    // 2. Insertar el registro financiero en la tabla 'pagos'
    const sqlPago = `
      INSERT INTO pagos (id_reserva, metodo_pago, comprobante_url, estado_pago)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sqlPago, [
      idReservaCreada, 
      metodoPagoFinal, 
      comprobante_referencia || 'SIN-COMPROBANTE', 
      estadoPagoInicial
    ], async (errPago) => {
      if (errPago) {
        console.error('⚠️ Error al registrar el pago en la tabla pagos:', errPago);
      }

      // 3. Enviar correo electrónico de confirmación mediante Resend (API HTTP)
      try {
        if (email) {
          await resend.emails.send({
            from: 'Finca Don Litos <onboarding@resend.dev>',
            to: email,
            subject: 'Confirmación de Reserva y Pago - Finca Don Litos',
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #2e4d25;">¡Reserva Registrada Exitosamente!</h2>
                <p>Hola <strong>${nombreParaCorreo}</strong>,</p>
                <p>Hemos recibido tu solicitud de reserva en <strong>Finca Don Litos</strong>.</p>
                <hr style="border: none; border-top: 1px solid #ccc;" />
                <p><strong>Detalles de la transacción:</strong></p>
                <ul>
                  <li><strong>Entrada/Check-in (15:00):</strong> ${fecha_checkin}</li>
                  <li><strong>Salida/Check-out (11:00):</strong> ${fecha_checkout}</li>
                  <li><strong>Monto Total:</strong> $${total}</li>
                  <li><strong>Método de Pago:</strong> ${metodoPagoFinal}</li>
                  <li><strong>Referencia / Comprobante:</strong> ${comprobante_referencia || 'N/A'}</li>
                  <li><strong>Estado del Pago:</strong> ${estadoPagoInicial}</li>
                </ul>
                <p>¡Te esperamos!</p>
              </div>
            `
          });
        }
      } catch (mailErr) {
        console.error('⚠️ Error al enviar correo de confirmación con Resend:', mailErr);
      }

      res.json({
        success: true,
        id_reserva: idReservaCreada,
        mensaje: 'Reserva y pago simulado registrados correctamente'
      });
    });
  });
});

// ==========================================
// 11. ACTUALIZAR ESTADO DE RESERVA Y SINCRONIZAR PAGO
// ==========================================
app.put('/api/admin/reservas/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = ['reservada', 'pagada', 'cancelada'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ success: false, error: 'Estado no válido.' });
  }

  try {
    // 1. Actualizar el estado en la tabla 'reservas'
    const sqlReserva = 'UPDATE finca_don_litos.reservas SET estado = ? WHERE id_reserva = ?';
    const [resultReserva] = await db.promise().query(sqlReserva, [estado, id]);

    if (resultReserva.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Reserva no encontrada.' });
    }

    // 2. Sincronizar automáticamente el estado financiero en la tabla 'pagos'
    let estadoPagoSync = 'en_revision';
    if (estado === 'pagada') estadoPagoSync = 'aprobado';
    if (estado === 'cancelada') estadoPagoSync = 'rechazado';

    const sqlPagoSync = 'UPDATE finca_don_litos.pagos SET estado_pago = ? WHERE id_reserva = ?';
    await db.promise().query(sqlPagoSync, [estadoPagoSync, id]);

    res.json({ success: true, mensaje: `Reserva actualizada a '${estado}' y pago sincronizado exitosamente.` });
  } catch (err) {
    console.error('❌ Error al actualizar el estado de la reserva:', err);
    res.status(500).json({ success: false, error: 'Error en el servidor al actualizar el estado.' });
  }
});

// Ruta para actualizar o registrar el comprobante de pago desde el panel de administración
app.put('/api/admin/pagos/comprobante', (req, res) => {
  const { id_reserva, comprobante } = req.body;
  
  if (!id_reserva || !comprobante) {
    return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });
  }

  // 1. Verificamos si ya existe un registro de pago para esta reserva
  db.query('SELECT id_pago FROM finca_don_litos.pagos WHERE id_reserva = ?', [id_reserva], (err, pagosExistentes) => {
    if (err) {
      console.error('❌ Error al buscar el pago:', err);
      return res.status(500).json({ success: false, error: 'Error en el servidor al buscar el pago.' });
    }

    if (pagosExistentes.length > 0) {
      // Si ya existe, lo actualizamos usando parámetros seguros (?)
      db.query(
        'UPDATE finca_don_litos.pagos SET comprobante_url = ?, estado_pago = ? WHERE id_reserva = ?',
        [comprobante.trim(), 'aprobado', id_reserva],
        (errUpdate) => {
          if (errUpdate) {
            console.error('❌ Error al actualizar el pago:', errUpdate);
            return res.status(500).json({ success: false, error: 'Error al actualizar el comprobante.' });
          }
          actualizarReservaYResponder();
        }
      );
    } else {
      // Si no existe, creamos el registro de pago automáticamente con parámetros seguros (?)
      db.query(
        'INSERT INTO finca_don_litos.pagos (id_reserva, metodo_pago, comprobante_url, estado_pago, fecha_pago) VALUES (?, ?, ?, ?, NOW())',
        [id_reserva, 'SINPE_MOVIL', comprobante.trim(), 'aprobado'],
        (errInsert) => {
          if (errInsert) {
            console.error('❌ Error al insertar el pago:', errInsert);
            return res.status(500).json({ success: false, error: 'Error al registrar el comprobante.' });
          }
          actualizarReservaYResponder();
        }
      );
    }
  });

  // Función auxiliar para actualizar la reserva a 'pagada' y enviar la respuesta final
  function actualizarReservaYResponder() {
    db.query(
      'UPDATE finca_don_litos.reservas SET estado = ? WHERE id_reserva = ?',
      ['pagada', id_reserva],
      (errReserva) => {
        if (errReserva) {
          console.error('❌ Error al actualizar el estado de la reserva:', errReserva);
        }
        res.json({ success: true, message: 'Comprobante registrado y pago aprobado correctamente.' });
      }
    );
  }
});

// ==========================================
// 12. CANCELAR / ELIMINAR RESERVA
// ==========================================
app.delete('/api/reservas/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = 'UPDATE finca_don_litos.reservas SET estado = ? WHERE id_reserva = ?';
  db.query(sql, ['cancelada', id], (err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Error al cancelar la reserva.' });
    }
    res.json({ success: true, mensaje: 'Reserva cancelada exitosamente.' });
  });
});

// Iniciar Servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});
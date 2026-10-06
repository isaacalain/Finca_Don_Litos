const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: { rejectUnauthorized: false }
    });

    console.log('Conectado a Aiven...');

    // 1. Crear tabla bungalows
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bungalows (
        id_bungalow INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(50) NOT NULL,
        capacidad INT NOT NULL,
        precio_noche DECIMAL(10,2) NOT NULL,
        estado ENUM('disponible', 'sucio', 'mantenimiento') DEFAULT 'disponible',
        descripcion TEXT,
        imagen_url VARCHAR(255)
      );
    `);
    console.log('✔ Tabla "bungalows" lista.');

    // 2. Crear tabla reservas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reservas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cabana_id INT NOT NULL,
        nombre_cliente VARCHAR(100) NOT NULL,
        email_cliente VARCHAR(100) NOT NULL,
        telefono_cliente VARCHAR(20) NOT NULL,
        fecha_checkin DATE NOT NULL,
        fecha_checkout DATE NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        estado ENUM('pendiente', 'confirmada', 'cancelada') DEFAULT 'pendiente',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cabana_id) REFERENCES bungalows(id_bungalow) ON DELETE CASCADE
      );
    `);
    console.log('✔ Tabla "reservas" lista.');

    // 3. Insertar bungalows si la tabla está vacía
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM bungalows');
    if (rows[0].count === 0) {
      await connection.query(`
        INSERT INTO bungalows (nombre, capacidad, precio_noche, estado, descripcion, imagen_url) 
        VALUES 
        ('Bungalow Vista Montaña', 4, 45000.00, 'disponible', 'Hermoso bungalow equipado con vista panorámica a las montañas y aire acondicionado.', 'https://images.unsplash.com/photo-1587061949409-02df41d5e562'),
        ('Bungalow Del Bosque', 2, 35000.00, 'disponible', 'Ideal para parejas, rodeado de naturaleza con terraza privada.', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'),
        ('Bungalow Familiar Premium', 6, 65000.00, 'disponible', 'Espaciosa cabaña familiar cerca de la piscina con todas las comodidades.', 'https://images.unsplash.com/photo-1510798831971-661eb04b3739');
      `);
      console.log('✔ Cabañas de prueba insertadas.');
    }

    await connection.end();
    console.log('🎉 Base de datos lista.');
  } catch (error) {
    console.error('Error al configurar la base de datos:', error.message);
  }
}

initDatabase();
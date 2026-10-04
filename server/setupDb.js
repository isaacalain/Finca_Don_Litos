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

    console.log('Conectado a Aiven para configurar la base de datos...');

    // 1. Tabla de Cabañas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cabanas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        descripcion TEXT,
        capacidad INT NOT NULL,
        precio_noche DECIMAL(10,2) NOT NULL,
        imagen_url VARCHAR(255),
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔ Tabla "cabanas" lista.');

    // 2. Tabla de Reservas
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
        FOREIGN KEY (cabana_id) REFERENCES cabanas(id) ON DELETE CASCADE
      );
    `);
    console.log('✔ Tabla "reservas" lista.');

    // 3. Limpiar e insertar las 3 cabañas oficiales en Colones (₡)
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE cabanas');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    await connection.query(`
      INSERT INTO cabanas (nombre, descripcion, capacidad, precio_noche, imagen_url) VALUES
      ('Cabaña Pareja', 'Ideal para escapadas en pareja. Acceso a piscina común, parqueo privado y pet friendly.', 2, 25000.00, 'https://images.unsplash.com/photo-1587061949409-02df41d5e562'),
      ('Cabaña Familiar', 'Espaciosa cabaña para familias medianas con todas las comodidades, piscina y zonas verdes.', 5, 45000.00, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb'),
      ('Cabaña Grupal Don Litos', 'Cabaña grande para hasta 7 personas. Amplia terraza, cerca de la piscina, parqueo y pet friendly.', 7, 60000.00, 'https://images.unsplash.com/photo-1510798831971-661eb04b3739')
    `);
    console.log('✔ Las 3 cabañas oficiales insertadas en Colones (₡).');

    await connection.end();
    console.log('🎉 Base de datos configurada e inicializada correctamente.');
  } catch (error) {
    console.error('Error al configurar la base de datos:', error.message);
  }
}

initDatabase();
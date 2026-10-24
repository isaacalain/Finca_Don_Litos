import React, { useState } from 'react';

export const Footer = () => {
  const [modalActivo, setModalActivo] = useState(null); // 'sobreNosotros', 'ubicacion', 'contacto', 'politicas' o null

  const cerrarModal = () => setModalActivo(null);

  return (
    <>
      {/* Estilos locales para los modales y el footer */}
      <style>{`
        .footer-container {
          background-color: #1a2332;
          color: #f8fafc;
          padding: 40px 20px 20px 20px;
          margin-top: 50px;
          font-family: inherit;
        }
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
        }
        .footer-section h3, .footer-section h4 {
          color: #ffffff;
          margin-bottom: 15px;
        }
        .footer-section p {
          color: #94a3b8;
          line-height: 1.6;
          font-size: 0.95rem;
        }
        .footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .footer-links li {
          margin-bottom: 10px;
        }
        .footer-links button {
          background: none;
          border: none;
          color: #38bdf8;
          cursor: pointer;
          font-size: 1rem;
          padding: 0;
          text-align: left;
          transition: color 0.2s;
        }
        .footer-links button:hover {
          color: #7dd3fc;
          text-decoration: underline;
        }
        .footer-bottom {
          max-width: 1200px;
          margin: 30px auto 0 auto;
          padding-top: 20px;
          border-top: 1px solid #334155;
          text-align: center;
          color: #64748b;
          font-size: 0.85rem;
        }

        /* Estilos Ventana Emergente (Modal) */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          box-sizing: border-box;
        }
        .modal-content {
          background: #ffffff;
          color: #1e293b;
          border-radius: 12px;
          padding: 30px;
          max-width: 520px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          position: relative;
          animation: modalFadeIn 0.2s ease-out;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .modal-header h3 {
          margin: 0;
          color: #0f172a;
          font-size: 1.25rem;
        }
        .btn-cerrar {
          background: #f1f5f9;
          border: none;
          font-size: 1.2rem;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
        }
        .btn-cerrar:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .modal-body p {
          margin: 10px 0;
          color: #334155;
          line-height: 1.6;
          font-size: 0.95rem;
        }
        .modal-body a {
          color: #0284c7;
          text-decoration: none;
          font-weight: 600;
        }
        .modal-body a:hover {
          text-decoration: underline;
        }
        .btn-whatsapp {
          display: inline-block;
          margin-top: 15px;
          background-color: #25d366;
          color: white !important;
          padding: 10px 18px;
          border-radius: 8px;
          text-decoration: none !important;
          font-weight: 600;
        }
        .btn-whatsapp:hover {
          background-color: #1da851;
        }
        .img-propietarios {
          width: 100%;
          max-height: 380px;
          object-fit: contain;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
          margin-bottom: 8px;
        }
      `}</style>

      {/* FOOTER */}
      <footer className="footer-container">
        <div className="footer-content">
          {/* Marca / Descripción */}
          <div className="footer-section">
            <h3>🌴 Finca Don Litos</h3>
            <p>
              Tu refugio perfecto en el Caribe costarricense. Rodeado de naturaleza,
              tranquilidad y la belleza salvaje de Puerto Viejo.
            </p>
          </div>

          {/* Enlaces de Información */}
          <div className="footer-section">
            <h4>Información</h4>
            <ul className="footer-links">
              <li>
                <button onClick={() => setModalActivo('sobreNosotros')}>
                  🌿 Sobre Nosotros
                </button>
              </li>
              <li>
                <button onClick={() => setModalActivo('ubicacion')}>
                  📍 Ubicación
                </button>
              </li>
              <li>
                <button onClick={() => setModalActivo('contacto')}>
                  📞 Contacto
                </button>
              </li>
              <li>
                <button onClick={() => setModalActivo('politicas')}>
                  🕒 Check-in & Políticas
                </button>
              </li>
            </ul>
          </div>

          {/* Redes y Contacto Rápido */}
          <div className="footer-section">
            <h4>Reservas</h4>
            <p>¿Tienes alguna duda sobre tu estadía?</p>
            <a
              href="https://wa.me/50685501877"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              💬 Chatear por WhatsApp
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Finca Don Litos. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* VENTANAS EMERGENTES (MODALES) */}

      {/* Modal: Sobre Nosotros */}
      {modalActivo === 'sobreNosotros' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🌿 Sobre Nosotros</h3>
              <button className="btn-cerrar" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal-body">
              {/* Contenedor de la foto de los propietarios */}
              <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                <img
                  src="/images/propietarios.jpg" // Asegúrate de colocar tu imagen en public/images/propietarios.jpg
                  alt="Propietarios de Finca Don Litos"
                  className="img-propietarios"
                  onError={(e) => {
                    // Muestra un recuadro si aún no pones la imagen
                    e.target.style.display = 'none';
                  }}
                />
                <small style={{ color: '#64748b', fontStyle: 'italic', display: 'block' }}>
                  Familia propietaria de Finca Don Litos.
                </small>
              </div>

              <p>
                Bienvenido a Finca Don Litos, un proyecto familiar ubicado en el hermoso distrito de Puerto Viejo, Talamanca, Limón, Costa Rica.
              </p>
              <p>
                Nos inspira brindar a cada visitante un espacio único donde predomine la tranquilidad, privacidad y comodidad. Nuestra finca combina la magia y belleza de la selva tropical costarricense con una ubicación estratégica a muy pocos minutos de las playas más hermosas e icónicas del Caribe Sur.
              </p>
              <p>
                Como anfitriones, nos apasiona recibir a nuestros huéspedes con la autenticidad y calidez de nuestra zona, garantizando una estadía relajante rodeada de flora y fauna local.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ubicación */}
      {modalActivo === 'ubicacion' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📍 Nuestra Ubicación</h3>
              <button className="btn-cerrar" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Dirección:</strong> Puerto Viejo, Talamanca, Limón, Costa Rica.</p>
              <p>
                Ubicados en un entorno natural privilegiado, rodeados de flora y fauna local, a pocos minutos de las mejores playas del Caribe Sur.
              </p>
              
              {/* Botón para abrir Google Maps */}
              <a
                href="https://maps.app.goo.gl/r4Z2MxbTBL6ZBiFa9" // Reemplaza esto con tu enlace real de Google Maps
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  marginTop: '15px',
                  backgroundColor: '#0284c7', // Color azul distintivo para mapas
                  color: 'white',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600'
                }}
              >
                🗺️ Ver ubicación en Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Contacto */}
      {modalActivo === 'contacto' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📞 Información de Contacto</h3>
              <button className="btn-cerrar" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Teléfono / WhatsApp:</strong> +506 85501877</p>
              <p><strong>Correo Electrónico:</strong> <a href="mailto:fincadonlitos1@gmail.com">fincadonlitos1@gmail.com</a></p>
              <p>Estamos disponibles para atender tus consultas sobre tarifas, disponibilidad y detalles de las cabañas.</p>
              <a
                href="https://wa.me/50685501877"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp"
              >
                Escribir al WhatsApp Directo
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Políticas */}
      {modalActivo === 'politicas' && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🕒 Horarios y Políticas</h3>
              <button className="btn-cerrar" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal-body">
              <p><strong>Check-in:</strong> A partir de las 3:00 PM</p>
              <p><strong>Check-out:</strong> Hasta las 11:00 AM</p>
              <p><strong>Métodos de Pago:</strong> SINPE Móvil, Transferencias y Tarjetas.</p>
              <p><strong>Recomendación:</strong> Respetar el entorno natural y el descanso de los demás huéspedes.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

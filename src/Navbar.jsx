import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Navbar = () => {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const navigate = useNavigate();

    const toggleMenu = () => {
        setMenuAbierto(!menuAbierto);
    };

    const cerrarMenu = () => {
        setMenuAbierto(false);
    };

    return (
        <>
            <style>{`
        .navbar-container {
          background-color: #1a2332;
          color: white;
          padding: 15px 25px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 900;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .navbar-logo {
          font-size: 1.3rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        /* Botón de 3 Rayitas / Hamburgesa */
        .hamburger-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          transition: transform 0.2s ease;
        }

        .hamburger-btn:hover {
          transform: scale(1.1);
        }

        /* Menú Desplegable (Overlay / Cortina) */
        .nav-menu-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(3px);
          z-index: 950;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.3s ease, visibility 0.3s ease;
        }

        .nav-menu-overlay.activo {
          opacity: 1;
          visibility: visible;
        }

        .nav-menu-drawer {
          position: fixed;
          top: 0;
          right: -300px;
          width: 280px;
          height: 100vh;
          background-color: #0f172a;
          box-shadow: -5px 0 25px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          padding: 25px 20px;
          display: flex;
          flex-direction: column;
          transition: right 0.3s ease-in-out;
        }

        .nav-menu-drawer.activo {
          right: 0;
        }

        .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #334155;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }

        .drawer-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #f8fafc;
        }

        .btn-cerrar-drawer {
          background: #1e293b;
          border: none;
          color: #94a3b8;
          font-size: 1.2rem;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-cerrar-drawer:hover {
          color: white;
          background: #334155;
        }

        .drawer-links {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .drawer-item {
          background: #1e293b;
          color: #e2e8f0;
          border: 1px solid #334155;
          padding: 12px 16px;
          border-radius: 8px;
          text-align: left;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
        }

        .drawer-item:hover {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
          transform: translateX(-3px);
        }

        .drawer-footer {
          margin-top: auto;
          text-align: center;
          color: #64748b;
          font-size: 0.8rem;
          border-top: 1px solid #1e293b;
          padding-top: 15px;
        }
      `}</style>

            {/* BARRA SUPERIOR */}
            <nav className="navbar-container">
                <div className="navbar-logo" onClick={() => { navigate('/cabanas'); cerrarMenu(); }}>
                    <img
                        src="/logo.png"
                        alt="Logo Finca Don Litos"
                        style={{ height: '90px', width: 'auto', objectFit: 'contain' }}
                    />
                    Finca Don Litos
                </div>

                {/* Botón 3 Rayitas */}
                <button className="hamburger-btn" onClick={toggleMenu} title="Menú">
                    ☰
                </button>
            </nav>

            {/* FONDO OSCURO AL ABRIR EL MENÚ */}
            <div
                className={`nav-menu-overlay ${menuAbierto ? 'activo' : ''}`}
                onClick={cerrarMenu}
            />

            {/* MENÚ DESPLEGABLE LATERAL */}
            <div className={`nav-menu-drawer ${menuAbierto ? 'activo' : ''}`}>
                <div className="drawer-header">
                    <h3>Menú de Navegación</h3>
                    <button className="btn-cerrar-drawer" onClick={cerrarMenu}>✕</button>
                </div>

                <div className="drawer-links">
                    <button
                        className="drawer-item"
                        onClick={() => { navigate('/cabanas'); cerrarMenu(); }}
                    >
                        🏠 Nuestras Cabañas
                    </button>

                    <a
                        href="https://wa.me/50685501877"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="drawer-item"
                        style={{ textDecoration: 'none' }}
                        onClick={cerrarMenu}
                    >
                        💬 Contactar por WhatsApp
                    </a>

                    <button
                        className="drawer-item"
                        onClick={() => { navigate('/login'); cerrarMenu(); }}
                    >
                        🔒 Acceso Administrador
                    </button>
                </div>

                <div className="drawer-footer">
                    Puerto Viejo, Limón 🇨🇷
                </div>
            </div>
        </>
    );
};
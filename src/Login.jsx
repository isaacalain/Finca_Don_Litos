import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setAutenticado }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  // Estados para el Modal de Crear Cuenta (Solo Clientes)
  const [mostrarModalRegistro, setMostrarModalRegistro] = useState(false);
  const [regNombre, setRegNombre] = useState('');
  const [regApellidos, setRegApellidos] = useState('');
  const [regCorreo, setRegCorreo] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [errorRegistro, setErrorRegistro] = useState('');
  const [registrando, setRegistrando] = useState(false);

  // Manejar el Login (Verifica contra la API o contra los usuarios registrados)
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    const correoLimpio = correo.trim().toLowerCase();
    const passwordLimpia = password.trim();

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          correo: correoLimpio, 
          password: passwordLimpia 
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('adminAutenticado', 'true');
        localStorage.setItem('adminUsuario', JSON.stringify(data.user));
        if (setAutenticado) setAutenticado(true);

        if (data.user.rol === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/cabanas', { replace: true });
        }
      } else {
        setError(data.error || 'Correo o contraseña incorrectos.');
      }
    } catch (err) {
      console.error(err);
      setError('No se pudo conectar con el servidor de autenticación.');
    } finally {
      setCargando(false);
    }
  };

  // Continuar como Visitante
  const handleContinuarComoVisitante = () => {
    const visitanteUser = {
      id_usuario: 0,
      id: 0,
      nombre: 'Visitante',
      apellidos: '',
      correo: '',
      rol: 'visitante'
    };
    localStorage.setItem('adminAutenticado', 'true');
    localStorage.setItem('adminUsuario', JSON.stringify(visitanteUser));
    if (setAutenticado) setAutenticado(true);
    navigate('/cabanas', { replace: true });
  };

  // Crear cuenta de cliente nueva desde el login
  const handleCrearCuentaCliente = async (e) => {
    e.preventDefault();
    setErrorRegistro('');
    setRegistrando(true);

    const nuevoCorreoLimpio = regCorreo.trim().toLowerCase();

    try {
      const response = await fetch('http://localhost:5000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: regNombre.trim(),
          apellidos: regApellidos.trim(),
          correo: nuevoCorreoLimpio,
          password: regPassword.trim(),
          rol: 'cliente'
        })
      });

      const data = await response.json();

      if (response.ok && (data.success || data.id_usuario)) {
        alert('✅ ¡Cuenta creada exitosamente! Has iniciado sesión.');
        
        const nuevoCliente = {
          id_usuario: data.id_usuario || data.id,
          id: data.id_usuario || data.id,
          nombre: regNombre.trim(),
          apellidos: regApellidos.trim(),
          correo: nuevoCorreoLimpio,
          rol: 'cliente'
        };

        localStorage.setItem('adminAutenticado', 'true');
        localStorage.setItem('adminUsuario', JSON.stringify(nuevoCliente));
        if (setAutenticado) setAutenticado(true);
        setMostrarModalRegistro(false);
        navigate('/cabanas', { replace: true });
      } else {
        setErrorRegistro(data.error || 'No se pudo crear la cuenta. El correo podría estar en uso.');
      }
    } catch (err) {
      console.error(err);
      setErrorRegistro('Error de conexión al registrar la cuenta.');
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Finca Don Litos</h2>
        <p style={styles.subtitle}>Inicia sesión para gestionar tus reservas</p>

        {error && <div style={styles.alertError}>⚠️ {error}</div>}

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Correo Electrónico:</label>
            <input
              type="email"
              required
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Contraseña:</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={cargando} style={styles.btnPrimary}>
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>o</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={handleContinuarComoVisitante}
            style={styles.btnVisitor}
          >
            👀 Continuar como Visitante
          </button>

          <button
            type="button"
            onClick={() => {
              setRegNombre('');
              setRegApellidos('');
              setRegCorreo('');
              setRegPassword('');
              setErrorRegistro('');
              setMostrarModalRegistro(true);
            }}
            style={styles.btnRegister}
          >
            📝 Crear una Cuenta de Cliente
          </button>
        </div>
      </div>

      {/* MODAL CREAR CUENTA DE CLIENTE */}
      {mostrarModalRegistro && (
        <div style={styles.modalOverlay} onClick={() => setMostrarModalRegistro(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#2e4d25', textAlign: 'center' }}>📝 Registro de Nuevo Cliente</h3>
            <p style={{ fontSize: '13px', color: '#666', textAlign: 'center', marginBottom: '15px' }}>
              Crea tu cuenta para realizar reservas rápidamente en Finca Don Litos.
            </p>

            {errorRegistro && (
              <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', textAlign: 'center' }}>
                ⚠️ {errorRegistro}
              </div>
            )}

            <form onSubmit={handleCrearCuentaCliente} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={styles.label}>Nombre:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ana"
                  value={regNombre}
                  onChange={(e) => setRegNombre(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Apellidos:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rojas Mora"
                  value={regApellidos}
                  onChange={(e) => setRegApellidos(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  placeholder="ana@email.com"
                  value={regCorreo}
                  onChange={(e) => setRegCorreo(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Contraseña:</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModalRegistro(false)}
                  style={styles.btnSecondaryModal}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registrando}
                  style={styles.btnPrimaryModal}
                >
                  {registrando ? 'Registrando...' : 'Registrarse y Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f6f8', padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" },
  card: { backgroundColor: '#fff', padding: '35px 30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
  title: { color: '#2e4d25', fontSize: '2rem', fontWeight: '800', textAlign: 'center', margin: '0 0 6px 0' },
  subtitle: { color: '#718096', fontSize: '0.92rem', textAlign: 'center', marginBottom: '24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontWeight: '600', fontSize: '0.88rem', color: '#2d3748' },
  input: { padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.95rem', boxSizing: 'border-box', width: '100%' },
  btnPrimary: { backgroundColor: '#2e4d25', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', marginTop: '6px', width: '100%' },
  btnVisitor: { backgroundColor: '#e2e8f0', color: '#2d3748', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '0.92rem', fontWeight: '600', cursor: 'pointer', width: '100%' },
  btnRegister: { backgroundColor: '#17a2b8', color: '#fff', border: 'none', padding: '11px', borderRadius: '8px', fontSize: '0.92rem', fontWeight: '600', cursor: 'pointer', width: '100%' },
  divider: { display: 'flex', alignItems: 'center', textAlign: 'center', margin: '20px 0', color: '#a0aec0' },
  dividerText: { flexGrow: 1, borderBottom: '1px solid #e2e8f0', position: 'relative', fontSize: '0.85rem' },
  alertError: { backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '16px', textAlign: 'center', fontWeight: '600' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modalContent: { backgroundColor: '#fff', padding: '28px', borderRadius: '16px', maxWidth: '420px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  btnPrimaryModal: { backgroundColor: '#2e4d25', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' },
  btnSecondaryModal: { backgroundColor: '#a0aec0', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }
};
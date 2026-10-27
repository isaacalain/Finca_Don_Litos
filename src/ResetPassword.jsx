import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Extrae el token de la URL
  const navigate = useNavigate();

  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    if (!token) {
      setError('Token de recuperación no encontrado o inválido.');
      return;
    }

    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);

    try {
      const response = await fetch('https://finca-don-litos.onrender.com/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaPassword })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMensaje('✅ ¡Contraseña actualizada con éxito! Redirigiendo al login...');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 3000);
      } else {
        setError(data.error || 'Ocurrió un error al restablecer la contraseña.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔒 Restablecer Contraseña</h2>
        <p style={styles.subtitle}>Escribe tu nueva contraseña para Finca Don Litos</p>

        {mensaje && <div style={styles.alertSuccess}>{mensaje}</div>}
        {error && <div style={styles.alertError}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Nueva Contraseña:</label>
            <input
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirmar Nueva Contraseña:</label>
            <input
              type="password"
              required
              placeholder="Repite tu contraseña"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={cargando} style={styles.btnPrimary}>
            {cargando ? 'Guardando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f6f8', padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" },
  card: { backgroundColor: '#fff', padding: '35px 30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px', boxSizing: 'border-box' },
  title: { color: '#2e4d25', fontSize: '1.8rem', fontWeight: '800', textAlign: 'center', margin: '0 0 6px 0' },
  subtitle: { color: '#718096', fontSize: '0.9rem', textAlign: 'center', marginBottom: '24px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontWeight: '600', fontSize: '0.88rem', color: '#2d3748' },
  input: { padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e0', fontSize: '0.95rem', boxSizing: 'border-box', width: '100%' },
  btnPrimary: { backgroundColor: '#2e4d25', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer', marginTop: '6px', width: '100%' },
  alertSuccess: { backgroundColor: '#d4edda', color: '#155724', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '16px', textAlign: 'center', fontWeight: '600' },
  alertError: { backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '8px', fontSize: '0.88rem', marginBottom: '16px', textAlign: 'center', fontWeight: '600' }
};
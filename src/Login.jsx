import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login({ setAutenticado }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, contrasena: password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('adminAutenticado', 'true');
        localStorage.setItem('adminUsuario', JSON.stringify(data.user));
        if (setAutenticado) setAutenticado(true);
        setError('');
        navigate('/admin', { replace: true });
      } else {
        setError(data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      console.error('Error al conectar con el servidor:', err);
      setError('Error de conexión al servidor. Asegúrate de que el backend esté activo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center', backgroundColor: '#fff' }}>
      <h2>🔐 Acceso Administrativo</h2>
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ {error}</p>}
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="Correo Electrónico (admin@fincadonlitos.com)" 
          value={usuario} 
          onChange={(e) => setUsuario(e.target.value)}
          required 
          style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          required 
          style={{ padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button 
          type="submit" 
          disabled={cargando}
          style={{ 
            padding: '10px', 
            backgroundColor: '#2e4d25', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: cargando ? 'not-allowed' : 'pointer', 
            fontSize: '16px',
            fontWeight: 'bold',
            opacity: cargando ? 0.7 : 1
          }}
        >
          {cargando ? 'Verificando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
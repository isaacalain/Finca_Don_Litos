import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Admin({ setAutenticado }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Cargar reservas desde la API
  const obtenerReservas = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reservas');
      if (!response.ok) throw new Error('Error al consultar las reservas');
      const data = await response.json();
      setReservas(data);
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar las reservas.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerReservas();
  }, []);

  // Función reutilizable para cambiar el estado a 'pagada' o 'reservada'
  const cambiarEstadoReserva = async (id, nuevoEstado) => {
    try {
      const response = await fetch(`http://localhost:5000/api/reservas/${id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });

      if (response.ok) {
        setReservas((prev) =>
          prev.map((reserva) =>
            reserva.id === id ? { ...reserva, estado: nuevoEstado } : reserva
          )
        );
        alert(`Reserva actualizada a '${nuevoEstado}' con éxito`);
      } else {
        alert('Error al actualizar el estado de la reserva');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al cambiar el estado');
    }
  };

  // Cancelar reserva (cambia el estado a 'cancelada')
  const handleCancelar = async (id) => {
    if (!window.confirm('¿Estás seguro de cancelar esta reserva?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/reservas/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReservas((prev) =>
          prev.map((reserva) =>
            reserva.id === id ? { ...reserva, estado: 'cancelada' } : reserva
          )
        );
        alert('Reserva marcada como cancelada');
      } else {
        alert('Error al cancelar la reserva');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al intentar cancelar');
    }
  };

  // Cerrar sesión limpiando el almacenamiento local
  const cerrarSesion = () => {
    localStorage.removeItem('adminAutenticado');
    setAutenticado(false);
    navigate('/login', { replace: true });
  };

  // Colores visuales de las etiquetas de estado
  const obtenerEstiloEstado = (estado) => {
    switch (estado) {
      case 'pagada':
        return { backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
      case 'cancelada':
        return { backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };
      case 'reservada':
      default:
        return { backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba' };
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#2e4d25', color: 'white', padding: '15px 20px', borderRadius: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>🛠️ Panel Administrador - Finca Don Litos</h1>

        <button 
          onClick={cerrarSesion} 
          style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Cerrar Sesión
        </button>
      </header>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {cargando ? (
        <p>Cargando reservas...</p>
      ) : reservas.length === 0 ? (
        <p>No hay reservas registradas en este momento.</p>
      ) : (
        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', padding: '15px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px' }}>N°</th>
                <th style={{ padding: '12px' }}>Cliente</th>
                <th style={{ padding: '12px' }}>Cabaña</th>
                <th style={{ padding: '12px' }}>Contacto</th>
                <th style={{ padding: '12px' }}>Check-in</th>
                <th style={{ padding: '12px' }}>Check-out</th>
                <th style={{ padding: '12px' }}>Total</th>
                <th style={{ padding: '12px' }}>Estado</th>
                <th style={{ padding: '12px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((reserva) => (
                <tr key={reserva.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>#{reserva.id}</td>
                  <td style={{ padding: '12px' }}><strong>{reserva.nombre_cliente}</strong></td>
                  <td style={{ padding: '12px' }}>{reserva.cabana_nombre}</td>
                  <td style={{ padding: '12px' }}>
                    <div>{reserva.email_cliente}</div>
                    <small style={{ color: '#666' }}>{reserva.telefono_cliente || 'Sin teléfono'}</small>
                  </td>
                  <td style={{ padding: '12px' }}>{reserva.fecha_checkin}</td>
                  <td style={{ padding: '12px' }}>{reserva.fecha_checkout}</td>
                  <td style={{ padding: '12px' }}>₡{Number(reserva.total).toLocaleString('es-CR')}</td>
                  
                  {/* Badge visual de Estado */}
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      textTransform: 'capitalize',
                      ...obtenerEstiloEstado(reserva.estado)
                    }}>
                      {reserva.estado || 'reservada'}
                    </span>
                  </td>

                  {/* Botones de Acción condicionales */}
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {/* Botón Marcar Pagada */}
                      {reserva.estado !== 'pagada' && reserva.estado !== 'cancelada' && (
                        <button
                          onClick={() => cambiarEstadoReserva(reserva.id, 'pagada')}
                          style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Marcar Pagada
                        </button>
                      )}

                      {/* Botón Cancelar */}
                      {reserva.estado !== 'cancelada' && (
                        <button 
                          onClick={() => handleCancelar(reserva.id)}
                          style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Cancelar
                        </button>
                      )}

                      {/* Botón Reactivar (solo se muestra en reservas canceladas) */}
                      {reserva.estado === 'cancelada' && (
                        <button
                          onClick={() => cambiarEstadoReserva(reserva.id, 'reservada')}
                          style={{ backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          Reactivar Reserva
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
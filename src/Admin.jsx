import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { eachDayOfInterval } from 'date-fns';

export default function Admin({ setAutenticado }) {
  const [tabActiva, setTabActiva] = useState('calendario'); // 'calendario', 'lista', 'usuarios'
  const [reservas, setReservas] = useState([]);
  const [cabanas, setCabanas] = useState([]);
  const [usuariosList, setUsuariosList] = useState([]);
  const [selectedCabanaId, setSelectedCabanaId] = useState('');
  const [fechaSeleccionadaAdmin, setFechaSeleccionadaAdmin] = useState(new Date());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Estados para Filtros y Buscador en la Lista de Reservas
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [filtroBungalow, setFiltroBungalow] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Estados para Formulario de Nuevo Usuario
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState('cliente');

  // Modal de Confirmación de Seguridad Admin
  const [mostrarModalAuth, setMostrarModalAuth] = useState(false);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [mensajeUserError, setMensajeUserError] = useState('');

  // 1. Cargar reservas, cabañas y usuarios desde la API
  const obtenerDatos = async () => {
    setCargando(true);
    try {
      const [resReservas, resCabanas, resUsuarios] = await Promise.all([
        fetch('http://localhost:5000/api/reservas'),
        fetch('http://localhost:5000/api/cabanas'),
        fetch('http://localhost:5000/api/usuarios')
      ]);

      if (!resReservas.ok) throw new Error('Error al consultar las reservas');

      const dataReservas = await resReservas.json();
      setReservas(dataReservas);

      if (resCabanas.ok) {
        const dataCabanas = await resCabanas.json();
        setCabanas(dataCabanas);
        if (dataCabanas.length > 0 && !selectedCabanaId) {
          setSelectedCabanaId(dataCabanas[0].id_bungalow);
        }
      }

      if (resUsuarios.ok) {
        const dataUsuarios = await resUsuarios.json();
        setUsuariosList(dataUsuarios);
      }
    } catch (err) {
      console.error(err);
      setError('No se pudieron cargar los datos del panel.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    obtenerDatos();
  }, []);

  // 2. Cambiar estado de reserva ('pagada' / 'reservada')
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

  // 3. Cancelar reserva (cambia a 'cancelada')
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

  // 4. Abrir modal de seguridad con validación estricta de espacios vacíos
  const prepararCrearUsuario = (e) => {
    e.preventDefault();

    if (
      !nuevoNombre.trim() ||
      !nuevoApellido.trim() ||
      !nuevoCorreo.trim() ||
      !nuevaPassword.trim()
    ) {
      alert('⚠️ Todos los campos son obligatorios. Por favor, no dejes espacios en blanco.');
      return;
    }

    setMensajeUserError('');
    setAdminPasswordConfirm('');
    setMostrarModalAuth(true);
  };

  // 5. Enviar creación de usuario a la API con confirmación de clave Admin
  const confirmarYCrearUsuario = async (e) => {
    e.preventDefault();

    if (!adminPasswordConfirm.trim()) {
      setMensajeUserError('Por favor ingresa tu contraseña de administrador.');
      return;
    }

    setGuardandoUsuario(true);
    setMensajeUserError('');

    const sessionAdmin = JSON.parse(localStorage.getItem('adminUsuario') || '{}');
    const adminCorreo = sessionAdmin.correo || 'admin1@fincadonlitos.com';

    try {
      const response = await fetch('http://localhost:5000/api/admin/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminCorreo,
          adminPassword: adminPasswordConfirm,
          nuevoNombre: nuevoNombre.trim(),
          nuevoApellido: nuevoApellido.trim(),
          nuevoCorreo: nuevoCorreo.trim(),
          nuevaPassword: nuevaPassword.trim(),
          nuevoRol
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Usuario ${nuevoCorreo.trim()} creado correctamente con rol '${nuevoRol}'`);
        setNuevoNombre('');
        setNuevoApellido('');
        setNuevoCorreo('');
        setNuevaPassword('');
        setNuevoRol('cliente');
        setMostrarModalAuth(false);
        obtenerDatos(); // Recargar tabla de usuarios
      } else {
        setMensajeUserError(data.error || 'Error al autorizar la creación.');
      }
    } catch (err) {
      console.error(err);
      setMensajeUserError('Error de conexión al intentar crear el usuario.');
    } finally {
      setGuardandoUsuario(false);
    }
  };

  // 6. Eliminar Usuario
  const handleEliminarUsuario = async (id, correo) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario ${correo}?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/usuarios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsuariosList((prev) => prev.filter((u) => u.id_usuario !== id));
        alert('Usuario eliminado con éxito');
      } else {
        alert('Error al eliminar el usuario');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar usuario');
    }
  };

  // 7. Cerrar sesión
  const cerrarSesion = () => {
    localStorage.removeItem('adminAutenticado');
    localStorage.removeItem('adminUsuario');
    if (setAutenticado) setAutenticado(false);
    navigate('/login', { replace: true });
  };

  // Estilos de badge de estado de reserva
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

  // Días ocupados para el calendario admin
  const obtenerFechasOcupadasDetalle = () => {
    let resultado = [];
    const cabanaSeleccionada = cabanas.find((c) => c.id_bungalow === Number(selectedCabanaId));
    const nombreCabana = cabanaSeleccionada ? cabanaSeleccionada.nombre : '';

    reservas
      .filter((r) => r.estado !== 'cancelada' && r.cabana_nombre === nombreCabana)
      .forEach((reserva) => {
        if (!reserva.fecha_checkin || !reserva.fecha_checkout) return;

        const [aIn, mIn, dIn] = reserva.fecha_checkin.split('-').map(Number);
        const [aOut, mOut, dOut] = reserva.fecha_checkout.split('-').map(Number);

        const inicio = new Date(aIn, mIn - 1, dIn, 0, 0, 0);
        const fin = new Date(aOut, mOut - 1, dOut, 0, 0, 0);

        const dias = eachDayOfInterval({ start: inicio, end: fin });
        dias.forEach((d) => {
          resultado.push({
            fecha: d,
            estado: reserva.estado,
            reservaOriginal: reserva
          });
        });
      });

    return resultado;
  };

  const fechasDetalle = obtenerFechasOcupadasDetalle();
  const arrayFechasOcupadas = fechasDetalle.map((item) => item.fecha);

  const getAdminDayClassName = (date) => {
    const coincidencia = fechasDetalle.find(
      (item) =>
        item.fecha.getFullYear() === date.getFullYear() &&
        item.fecha.getMonth() === date.getMonth() &&
        item.fecha.getDate() === date.getDate()
    );

    if (coincidencia) {
      return coincidencia.estado === 'pagada' ? 'dia-admin-pagada' : 'dia-admin-reservada';
    }
    return 'dia-admin-disponible';
  };

  // Reservas del día seleccionado
  const reservasDelDiaSeleccionado = () => {
    if (!fechaSeleccionadaAdmin) return [];

    const cabanaSeleccionada = cabanas.find((c) => c.id_bungalow === Number(selectedCabanaId));
    const nombreCabana = cabanaSeleccionada ? cabanaSeleccionada.nombre : '';

    return reservas.filter((r) => {
      if (r.estado === 'cancelada' || r.cabana_nombre !== nombreCabana) return false;
      if (!r.fecha_checkin || !r.fecha_checkout) return false;

      const [aIn, mIn, dIn] = r.fecha_checkin.split('-').map(Number);
      const [aOut, mOut, dOut] = r.fecha_checkout.split('-').map(Number);

      const inicio = new Date(aIn, mIn - 1, dIn, 0, 0, 0);
      const fin = new Date(aOut, mOut - 1, dOut, 0, 0, 0);

      const diaActual = new Date(
        fechaSeleccionadaAdmin.getFullYear(),
        fechaSeleccionadaAdmin.getMonth(),
        fechaSeleccionadaAdmin.getDate(),
        0, 0, 0
      );

      return diaActual >= inicio && diaActual <= fin;
    });
  };

  const reservasDelDia = reservasDelDiaSeleccionado();

  // Filtrado de la lista de reservas
  const reservasFiltradas = reservas.filter((reserva) => {
    const texto = busquedaTexto.toLowerCase().trim();
    const coincideTexto =
      texto === '' ||
      reserva.nombre_cliente?.toLowerCase().includes(texto) ||
      reserva.email_cliente?.toLowerCase().includes(texto) ||
      reserva.id?.toString().includes(texto);

    const coincideBungalow =
      filtroBungalow === 'todos' || reserva.cabana_nombre === filtroBungalow;

    const coincideEstado =
      filtroEstado === 'todos' || reserva.estado === filtroEstado;

    return coincideTexto && coincideBungalow && coincideEstado;
  });

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <style>{`
        .dia-admin-pagada {
          background-color: #28a745 !important;
          color: white !important;
          border-radius: 50% !important;
          font-weight: bold !important;
        }
        .dia-admin-reservada {
          background-color: #ffc107 !important;
          color: #212529 !important;
          border-radius: 50% !important;
          font-weight: bold !important;
        }
        .dia-admin-disponible {
          background-color: #ffffff;
        }
        .react-datepicker {
          width: 100%;
          font-family: inherit;
          border-radius: 12px;
          border: 1px solid #cbd5e0;
        }
        .react-datepicker__month-container {
          width: 100%;
        }
        .react-datepicker__header {
          background-color: #2e4d25;
        }
        .react-datepicker__current-month, 
        .react-datepicker__day-name {
          color: #ffffff !important;
        }
      `}</style>

      {/* Encabezado */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#2e4d25', color: 'white', padding: '15px 20px', borderRadius: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>🛠️ Panel Administrador - Finca Don Litos</h1>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={obtenerDatos}
            style={{ backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refrescar datos"
          >
            🔄 Actualizar
          </button>
          <button 
            onClick={cerrarSesion} 
            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
        <button
          onClick={() => setTabActiva('calendario')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: tabActiva === 'calendario' ? '#2e4d25' : '#e2e8f0',
            color: tabActiva === 'calendario' ? 'white' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📅 Ocupación por Calendario
        </button>

        <button
          onClick={() => setTabActiva('lista')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: tabActiva === 'lista' ? '#2e4d25' : '#e2e8f0',
            color: tabActiva === 'lista' ? 'white' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          📋 Lista de Reservas ({reservas.length})
        </button>

        <button
          onClick={() => setTabActiva('usuarios')}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: tabActiva === 'usuarios' ? '#2e4d25' : '#e2e8f0',
            color: tabActiva === 'usuarios' ? 'white' : '#333',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          👥 Gestión de Usuarios ({usuariosList.length})
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {cargando ? (
        <p>Cargando información...</p>
      ) : (
        <>
          {/* PESTAÑA 1: CALENDARIO DE OCUPACIÓN */}
          {tabActiva === 'calendario' && (
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Selecciona Cabaña:</label>
                <select
                  value={selectedCabanaId}
                  onChange={(e) => setSelectedCabanaId(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', maxWidth: '350px', fontSize: '15px' }}
                >
                  {cabanas.map((c) => (
                    <option key={c.id_bungalow} value={c.id_bungalow}>
                      {c.nombre} (Capacidad: {c.capacidad} personas)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', fontSize: '14px' }}>
                <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '50%', marginRight: '5px' }}></span><strong>Pagada / Confirmada</strong></div>
                <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#ffc107', borderRadius: '50%', marginRight: '5px' }}></span><strong>Reservada (Pendiente Pago)</strong></div>
                <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '50%', marginRight: '5px' }}></span><strong>Disponible</strong></div>
              </div>

              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <DatePicker
                    inline
                    selected={fechaSeleccionadaAdmin}
                    onChange={(date) => setFechaSeleccionadaAdmin(date)}
                    dayClassName={getAdminDayClassName}
                    highlightDates={arrayFechasOcupadas}
                  />
                </div>

                <div style={{ flex: '1 1 300px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                  <h3 style={{ marginTop: 0, color: '#2e4d25', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
                    📅 {fechaSeleccionadaAdmin ? fechaSeleccionadaAdmin.toLocaleDateString('es-CR') : 'Selecciona una fecha'}
                  </h3>

                  {reservasDelDia.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: '#666' }}>
                      <p style={{ fontSize: '1.1rem', margin: '0 0 5px 0' }}>🍃 <strong>Cabaña Libre</strong></p>
                      <small>No hay reservas registradas para esta fecha en la cabaña seleccionada.</small>
                    </div>
                  ) : (
                    reservasDelDia.map((r) => (
                      <div key={r.id} style={{ backgroundColor: 'white', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e0', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '1.05rem', color: '#1a365d' }}>#{r.id} - {r.nombre_cliente}</strong>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            ...obtenerEstiloEstado(r.estado)
                          }}>
                            {r.estado.toUpperCase()}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: '#4a5568', lineHeight: '1.5' }}>
                          <p style={{ margin: '0 0 4px 0' }}><strong>Check-in:</strong> {r.fecha_checkin}</p>
                          <p style={{ margin: '0 0 4px 0' }}><strong>Check-out:</strong> {r.fecha_checkout}</p>
                          <p style={{ margin: '0 0 4px 0' }}><strong>Email:</strong> {r.email_cliente}</p>
                          <p style={{ margin: '0 0 8px 0' }}><strong>Teléfono:</strong> {r.telefono_cliente || 'N/A'}</p>
                          <p style={{ margin: '0', fontSize: '0.95rem', color: '#2e4d25', fontWeight: 'bold' }}>
                            Total: ₡{Number(r.total).toLocaleString('es-CR')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: LISTA DE RESERVAS CON BUSCADOR Y FILTROS */}
          {tabActiva === 'lista' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', padding: '20px' }}>
              
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: '1 1 250px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#4a5568' }}>🔍 Buscar por Cliente, Email o #ID:</label>
                  <input
                    type="text"
                    placeholder="Escribe nombre, correo o # reserva..."
                    value={busquedaTexto}
                    onChange={(e) => setBusquedaTexto(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ flex: '1 1 200px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#4a5568' }}>🏡 Filtrar por Bungalow:</label>
                  <select
                    value={filtroBungalow}
                    onChange={(e) => setFiltroBungalow(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="todos">Todos los Bungalows</option>
                    {cabanas.map((c) => (
                      <option key={c.id_bungalow} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: '1 1 180px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#4a5568' }}>📌 Estado:</label>
                  <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '14px', boxSizing: 'border-box' }}
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="reservada">Reservada</option>
                    <option value="pagada">Pagada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                {(busquedaTexto || filtroBungalow !== 'todos' || filtroEstado !== 'todos') && (
                  <button
                    onClick={() => {
                      setBusquedaTexto('');
                      setFiltroBungalow('todos');
                      setFiltroEstado('todos');
                    }}
                    style={{ backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', padding: '9px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', marginTop: '18px' }}
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>

              <div style={{ marginBottom: '12px', fontSize: '14px', color: '#666' }}>
                Mostrando <strong>{reservasFiltradas.length}</strong> de <strong>{reservas.length}</strong> reservas.
              </div>

              <div style={{ overflowX: 'auto' }}>
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
                    {reservasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>
                          No se encontraron reservas con los filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      reservasFiltradas.map((reserva) => (
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

                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {reserva.estado !== 'pagada' && reserva.estado !== 'cancelada' && (
                                <button
                                  onClick={() => cambiarEstadoReserva(reserva.id, 'pagada')}
                                  style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  Marcar Pagada
                                </button>
                              )}

                              {reserva.estado !== 'cancelada' && (
                                <button 
                                  onClick={() => handleCancelar(reserva.id)}
                                  style={{ backgroundColor: '#ff4d4d', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                  Cancelar
                                </button>
                              )}

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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: GESTIÓN DE USUARIOS */}
          {tabActiva === 'usuarios' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', padding: '20px' }}>
              
              {/* Formulario de Creación de Usuarios con Nombre y Apellidos */}
              <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#2e4d25', fontSize: '18px' }}>➕ Registrar Nuevo Usuario</h3>
                <form onSubmit={prepararCrearUsuario} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px' }}>Nombre:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px' }}>Apellidos:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Pérez Gómez"
                      value={nuevoApellido}
                      onChange={(e) => setNuevoApellido(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px' }}>Correo Electrónico:</label>
                    <input
                      type="email"
                      required
                      placeholder="usuario@gmail.com"
                      value={nuevoCorreo}
                      onChange={(e) => setNuevoCorreo(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px' }}>Contraseña:</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ flex: '1 1 130px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px' }}>Rol:</label>
                    <select
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    style={{ backgroundColor: '#2e4d25', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Crear Usuario
                  </button>
                </form>
              </div>

              {/* Tabla de Usuarios Registrados */}
              <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '18px' }}>📜 Lista de Usuarios Registrados en MySQL</h3>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px' }}>ID</th>
                      <th style={{ padding: '12px' }}>Nombre Completo</th>
                      <th style={{ padding: '12px' }}>Correo</th>
                      <th style={{ padding: '12px' }}>Rol</th>
                      <th style={{ padding: '12px' }}>Creado en</th>
                      <th style={{ padding: '12px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosList.map((u) => (
                      <tr key={u.id_usuario} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px' }}>#{u.id_usuario}</td>
                        <td style={{ padding: '12px' }}>
                          <strong>{u.nombre} {u.apellidos || ''}</strong>
                        </td>
                        <td style={{ padding: '12px' }}>{u.correo}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            fontSize: '12px',
                            backgroundColor: u.rol === 'admin' ? '#d1ecf1' : '#e2e8f0',
                            color: u.rol === 'admin' ? '#0c5460' : '#333'
                          }}>
                            {u.rol ? u.rol.toUpperCase() : 'CLIENTE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: '#666', fontSize: '13px' }}>{u.creado_en || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>
                          <button
                            onClick={() => handleEliminarUsuario(u.id_usuario, u.correo)}
                            style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL DE AUTENTICACIÓN Y CONFIRMACIÓN DE SEGURIDAD PARA CREAR USUARIO */}
      {mostrarModalAuth && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px 30px',
            borderRadius: '10px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, color: '#2e4d25', textAlign: 'center' }}>🔒 Confirmación de Seguridad</h3>
            <p style={{ fontSize: '14px', color: '#555', textAlign: 'center', marginBottom: '15px' }}>
              Para proceder con la creación del usuario (<strong>{nuevoCorreo.trim()}</strong>), ingresa tu contraseña de Administrador:
            </p>

            {mensajeUserError && (
              <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '15px', textAlign: 'center' }}>
                ⚠️ {mensajeUserError}
              </div>
            )}

            <form onSubmit={confirmarYCrearUsuario}>
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Contraseña de Admin (finca123)"
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModalAuth(false)}
                  style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '9px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoUsuario}
                  style={{ backgroundColor: '#2e4d25', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', opacity: guardandoUsuario ? 0.7 : 1 }}
                >
                  {guardandoUsuario ? 'Verificando...' : 'Confirmar y Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
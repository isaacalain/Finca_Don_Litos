import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { eachDayOfInterval, isWithinInterval, isBefore, startOfDay, format } from 'date-fns';

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

  // Datos del Usuario Administrador Logueado
  const [usuarioLogueado, setUsuarioLogueado] = useState(() => {
    return JSON.parse(localStorage.getItem('adminUsuario') || '{}');
  });

  // Estado para abrir/cerrar el menú desplegable del perfil
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const menuRef = useRef(null);

  // Modal Mini Panel de Perfil
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editPasswordActual, setEditPasswordActual] = useState('');
  const [editNuevaPassword, setEditNuevaPassword] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');

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

  // Modal de Confirmación de Seguridad Admin para Crear Usuario
  const [mostrarModalAuth, setMostrarModalAuth] = useState(false);
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [mensajeUserError, setMensajeUserError] = useState('');

  // ==========================================
  // ESTADOS PARA ACCIONES SEGURAS DE USUARIO (Cambiar Estado / Eliminar con Pass)
  // ==========================================
  const [modalAccionUsuario, setModalAccionUsuario] = useState(false); // 'estado' o 'eliminar'
  const [usuarioObjetivo, setUsuarioObjetivo] = useState(null);
  const [nuevoEstadoObjetivo, setNuevoEstadoObjetivo] = useState('');
  const [passwordAdminAccion, setPasswordAdminAccion] = useState('');
  const [errorAccionUsuario, setErrorAccionUsuario] = useState('');
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  // ==========================================
  // ESTADOS PARA CREAR RESERVA DESDE ADMIN CON PASSWORD
  // ==========================================
  const [mostrarModalCrearReserva, setMostrarModalCrearReserva] = useState(false);
  const [reservaCabanaId, setReservaCabanaId] = useState('');
  const [reservaFechasOcupadas, setReservaFechasOcupadas] = useState([]);
  const [reservaFechasSeleccionadas, setReservaFechasSeleccionadas] = useState([null, null]);
  const [reservaCheckin, reservaCheckout] = reservaFechasSeleccionadas;
  const [reservaErrorFecha, setReservaErrorFecha] = useState('');
  const [formReservaData, setFormReservaData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: ''
  });
  const [adminPasswordReserva, setAdminPasswordReserva] = useState('');
  const [guardandoReservaAdmin, setGuardandoReservaAdmin] = useState(false);
  const [errorReservaAdmin, setErrorReservaAdmin] = useState('');

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuPerfilAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        if (dataCabanas.length > 0) {
          if (!selectedCabanaId) setSelectedCabanaId(dataCabanas[0].id_bungalow);
          if (!reservaCabanaId) setReservaCabanaId(dataCabanas[0].id_bungalow);
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

  // Cargar fechas ocupadas para el modal de crear reserva según la cabaña elegida
  useEffect(() => {
    if (!reservaCabanaId) {
      setReservaFechasOcupadas([]);
      setReservaFechasSeleccionadas([null, null]);
      setReservaErrorFecha('');
      return;
    }

    const obtenerFechasOcupadasAdminModal = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/reservas/ocupadas/${reservaCabanaId}`);
        const data = await response.json();

        let diasBloqueados = [];
        data.forEach((reserva) => {
          if (!reserva.fecha_checkin || !reserva.fecha_checkout) return;

          const [aIn, mIn, dIn] = reserva.fecha_checkin.split('-').map(Number);
          const [aOut, mOut, dOut] = reserva.fecha_checkout.split('-').map(Number);

          const inicio = new Date(aIn, mIn - 1, dIn, 0, 0, 0);
          const fin = new Date(aOut, mOut - 1, dOut, 0, 0, 0);

          const diasEnRango = eachDayOfInterval({ start: inicio, end: fin });
          diasBloqueados = [...diasBloqueados, ...diasEnRango];
        });

        setReservaFechasOcupadas(diasBloqueados);
      } catch (err) {
        console.error('Error al consultar fechas ocupadas para nueva reserva:', err);
      }
    };

    obtenerFechasOcupadasAdminModal();
  }, [reservaCabanaId]);

  // Manejar cambio en calendario del modal de reserva admin
  const handleReservaFechaChange = (update) => {
    const [start, end] = update;
    setReservaErrorFecha('');

    if (start && end) {
      const cruzaFechaOcupada = reservaFechasOcupadas.some((fechaBloqueada) =>
        isWithinInterval(fechaBloqueada, { start, end })
      );

      if (cruzaFechaOcupada) {
        setReservaErrorFecha('El rango seleccionado incluye días que ya están reservados.');
        setReservaFechasSeleccionadas([null, null]);
        return;
      }
    }

    setReservaFechasSeleccionadas(update);
  };

  const calcularTotalAdminReserva = () => {
    if (!reservaCheckin || !reservaCheckout || !reservaCabanaId) return 0;
    const cabanaSeleccionada = cabanas.find(c => c.id_bungalow === Number(reservaCabanaId));
    if (!cabanaSeleccionada) return 0;

    const diffTime = reservaCheckout - reservaCheckin;
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias * Number(cabanaSeleccionada.precio_noche) : 0;
  };

  // Abrir modal de nueva reserva
  const abrirModalCrearReserva = () => {
    setFormReservaData({ nombre: '', apellidos: '', email: '', telefono: '' });
    setReservaFechasSeleccionadas([null, null]);
    setAdminPasswordReserva('');
    setErrorReservaAdmin('');
    setReservaErrorFecha('');
    if (cabanas.length > 0) setReservaCabanaId(cabanas[0].id_bungalow);
    setMostrarModalCrearReserva(true);
  };

  const handleCrearReservaAdminSubmit = async (e) => {
    e.preventDefault();

    if (!reservaCheckin || !reservaCheckout) {
      alert('Por favor selecciona las fechas de Check-in y Check-out en el calendario.');
      return;
    }

    if (!adminPasswordReserva.trim()) {
      setErrorReservaAdmin('Por favor ingresa tu contraseña de administrador para confirmar.');
      return;
    }

    const total = calcularTotalAdminReserva();
    if (total <= 0) {
      alert('La fecha de check-out debe ser posterior a la fecha de check-in.');
      return;
    }

    setGuardandoReservaAdmin(true);
    setErrorReservaAdmin('');

    const strCheckin = format(reservaCheckin, 'yyyy-MM-dd');
    const strCheckout = format(reservaCheckout, 'yyyy-MM-dd');
    const adminCorreo = usuarioLogueado.correo || 'admin1@fincadonlitos.com';

    try {
      const verifyRes = await fetch('http://localhost:5000/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuarioLogueado.id,
          nombre: usuarioLogueado.nombre,
          apellidos: usuarioLogueado.apellidos || '',
          correo: adminCorreo,
          passwordActual: adminPasswordReserva.trim(),
          nuevaPassword: ''
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setErrorReservaAdmin('Contraseña de administrador incorrecta.');
        setGuardandoReservaAdmin(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabana_id: Number(reservaCabanaId),
          id_usuario: usuarioLogueado.id || null,
          nombre: formReservaData.nombre.trim(),
          apellidos: formReservaData.apellidos.trim(),
          email: formReservaData.email.trim(),
          telefono: formReservaData.telefono.trim(),
          fecha_checkin: strCheckin,
          fecha_checkout: strCheckout,
          total
        })
      });

      const resData = await response.json();

      if (resData.success) {
        alert('✅ Reserva creada con éxito desde el panel de administración.');
        setMostrarModalCrearReserva(false);
        obtenerDatos();
      } else {
        setErrorReservaAdmin(resData.error || 'Error al crear la reserva.');
      }
    } catch (err) {
      console.error(err);
      setErrorReservaAdmin('Error de conexión al intentar crear la reserva.');
    } finally {
      setGuardandoReservaAdmin(false);
    }
  };

  // 2. Abrir Modal de Perfil con datos precargados
  const abrirModalPerfil = () => {
    setEditNombre(usuarioLogueado.nombre || '');
    setEditApellido(usuarioLogueado.apellidos || '');
    setEditCorreo(usuarioLogueado.correo || '');
    setEditPasswordActual('');
    setEditNuevaPassword('');
    setErrorPerfil('');
    setMenuPerfilAbierto(false);
    setMostrarModalPerfil(true);
  };

  // 3. Guardar Cambios de Perfil
  const handleGuardarPerfil = async (e) => {
    e.preventDefault();

    if (!editNombre.trim() || !editCorreo.trim() || !editPasswordActual.trim()) {
      setErrorPerfil('Nombre, correo y contraseña actual son obligatorios.');
      return;
    }

    setGuardandoPerfil(true);
    setErrorPerfil('');

    try {
      const response = await fetch('http://localhost:5000/api/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuarioLogueado.id,
          nombre: editNombre.trim(),
          apellidos: editApellido.trim(),
          correo: editCorreo.trim(),
          passwordActual: editPasswordActual.trim(),
          nuevaPassword: editNuevaPassword.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Perfil actualizado correctamente');
        setUsuarioLogueado(data.user);
        localStorage.setItem('adminUsuario', JSON.stringify(data.user));
        setMostrarModalPerfil(false);
        obtenerDatos();
      } else {
        setErrorPerfil(data.error || 'Error al actualizar el perfil.');
      }
    } catch (err) {
      console.error(err);
      setErrorPerfil('Error de conexión al guardar el perfil.');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  // ==========================================
  // ACCIONES SEGURAS DE GESTIÓN DE USUARIOS
  // ==========================================
  const prepararCambioEstado = (usuario, estadoActual) => {
    const estadoDestino = estadoActual === 'deshabilitada' ? 'activa' : 'deshabilitada';
    setUsuarioObjetivo(usuario);
    setNuevoEstadoObjetivo(estadoDestino);
    setModalAccionUsuario('estado');
    setPasswordAdminAccion('');
    setErrorAccionUsuario('');
  };

  const prepararEliminarUsuario = (usuario) => {
    setUsuarioObjetivo(usuario);
    setModalAccionUsuario('eliminar');
    setPasswordAdminAccion('');
    setErrorAccionUsuario('');
  };

  const ejecutarAccionSeguraUsuario = async (e) => {
    e.preventDefault();
    if (!passwordAdminAccion.trim()) {
      setErrorAccionUsuario('Por favor ingresa tu contraseña de administrador.');
      return;
    }

    setProcesandoAccion(true);
    setErrorAccionUsuario('');

    const sessionAdmin = JSON.parse(localStorage.getItem('adminUsuario') || '{}');
    const adminId = sessionAdmin.id || sessionAdmin.id_usuario || usuarioLogueado.id || usuarioLogueado.id_usuario;
    const adminCorreo = sessionAdmin.correo || usuarioLogueado.correo;

    try {
      let url = '';
      let method = '';
      let bodyData = {
        adminId: adminId ? Number(adminId) : null,
        adminCorreo: adminCorreo ? adminCorreo.trim().toLowerCase() : '',
        adminPassword: passwordAdminAccion.trim()
      };

      if (modalAccionUsuario === 'eliminar') {
        url = `http://localhost:5000/api/usuarios/${usuarioObjetivo.id_usuario}`;
        method = 'DELETE';
      } else {
        url = `http://localhost:5000/api/usuarios/${usuarioObjetivo.id_usuario}/estado`;
        method = 'PUT';
        bodyData.nuevoEstado = nuevoEstadoObjetivo;
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Operación realizada con éxito.`);
        setModalAccionUsuario(false);
        obtenerDatos();
      } else {
        setErrorAccionUsuario(data.error || 'Contraseña incorrecta o error en la operación.');
      }
    } catch (err) {
      console.error(err);
      setErrorAccionUsuario('Error de conexión con el servidor.');
    } finally {
      setProcesandoAccion(false);
    }
  };

  // 4. Cambiar estado de reserva ('pagada' / 'reservada')
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

  // 5. Cancelar reserva
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

// 6. Abrir modal de seguridad para crear usuario
  const prepararCrearUsuario = (e) => {
    e.preventDefault();

    // Verificamos que las variables de estado existan y tengan valores
    if (
      !nuevoNombre || !nuevoNombre.trim() ||
      !nuevoApellido || !nuevoApellido.trim() ||
      !nuevoCorreo || !nuevoCorreo.trim() ||
      !nuevaPassword || !nuevaPassword.trim()
    ) {
      alert('⚠️ Todos los campos son obligatorios. Por favor, no dejes espacios en blanco.');
      return;
    }

    // Validación de mínimo 6 caracteres en el Frontend
    if (nuevaPassword.trim().length < 6) {
      alert('⚠️ La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setMensajeUserError('');
    setAdminPasswordConfirm('');
    setMostrarModalAuth(true);
  };
  // 7. Enviar creación de usuario a la API con la confirmación de la contraseña de admin
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
        obtenerDatos();
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
  // 9. Cerrar sesión
  const cerrarSesion = () => {
    localStorage.removeItem('adminAutenticado');
    localStorage.removeItem('adminUsuario');
    if (setAutenticado) setAutenticado(false);
    navigate('/login', { replace: true });
  };

  // Iniciales para el Avatar
  const obtenerIniciales = () => {
    const nombre = usuarioLogueado.nombre || 'Admin';
    const apellido = usuarioLogueado.apellidos || '';
    return (nombre.charAt(0) + (apellido ? apellido.charAt(0) : '')).toUpperCase();
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

  // Días ocupados para el calendario admin principal
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

  // Clases CSS para el calendario dentro del modal de crear reserva admin
  const getModalDayClassName = (date) => {
    if (isBefore(date, startOfDay(new Date()))) {
      return 'dia-pasado';
    }
    const ocupado = reservaFechasOcupadas.some(
      (d) =>
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
    );
    if (ocupado) {
      return 'dia-ocupado';
    }
    return 'dia-disponible';
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
        .dia-ocupado {
          background-color: #dc3545 !important;
          color: #ffffff !important;
          text-decoration: line-through !important;
          border-radius: 50% !important;
          cursor: not-allowed !important;
          opacity: 0.8;
        }
        .dia-disponible {
          background-color: #d4edda !important;
          color: #155724 !important;
          border-radius: 50% !important;
        }
        .dia-disponible:hover {
          background-color: #c3e6cb !important;
        }
        .react-datepicker__day--range-start,
        .react-datepicker__day--selecting-range-start {
          background-color: #1b4332 !important;
          color: #ffffff !important;
          font-weight: bold !important;
          border-radius: 50% 0 0 50% !important;
        }
        .react-datepicker__day--range-end {
          background-color: #1b4332 !important;
          color: #ffffff !important;
          font-weight: bold !important;
          border-radius: 0 50% 50% 0 !important;
        }
        .react-datepicker__day--in-range:not(.react-datepicker__day--range-start):not(.react-datepicker__day--range-end),
        .react-datepicker__day--in-selecting-range {
          background-color: #52b788 !important;
          color: #ffffff !important;
          border-radius: 0 !important;
        }
        .dia-pasado { opacity: 0.25; }
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

      {/* Encabezado Principal */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#2e4d25', color: 'white', padding: '15px 20px', borderRadius: '8px', flexWrap: 'wrap', gap: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>🛠️ Panel Administrador - Finca Don Litos</h1>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={obtenerDatos}
            style={{ backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refrescar datos"
          >
            🔄 Actualizar
          </button>

          {/* Menú Desplegable de Perfil */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <div 
              onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer', 
                backgroundColor: 'rgba(255,255,255,0.15)', 
                padding: '5px 12px 5px 6px', 
                borderRadius: '25px',
                transition: 'background-color 0.2s'
              }}
              title="Abrir menú de usuario"
            >
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#17a2b8',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '15px',
                border: '2px solid white'
              }}>
                {obtenerIniciales()}
              </div>
              <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{usuarioLogueado.nombre || 'Administrador'}</div>
                <small style={{ fontSize: '11px', opacity: 0.8 }}>▼ Menú</small>
              </div>
            </div>

            {/* Dropdown flotante */}
            {menuPerfilAbierto && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '48px',
                backgroundColor: 'white',
                color: '#333',
                borderRadius: '8px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                width: '200px',
                zIndex: 100,
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ padding: '12px 15px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{usuarioLogueado.nombre} {usuarioLogueado.apellidos}</div>
                  <div style={{ fontSize: '11px', color: '#666', wordBreak: 'break-all' }}>{usuarioLogueado.correo}</div>
                </div>

                <button
                  onClick={abrirModalPerfil}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#2e4d25',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderBottom: '1px solid #eee'
                  }}
                >
                  ⚙️ Editar Perfil
                </button>

                <button
                  onClick={cerrarSesion}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    color: '#dc3545',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Selector de Pestañas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px', flexWrap: 'wrap' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Selecciona Cabaña:</label>
                  <select
                    value={selectedCabanaId}
                    onChange={(e) => setSelectedCabanaId(e.target.value)}
                    style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', minWidth: '280px', fontSize: '15px' }}
                  >
                    {cabanas.map((c) => (
                      <option key={c.id_bungalow} value={c.id_bungalow}>
                        {c.nombre} (Capacidad: {c.capacidad} personas)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={abrirModalCrearReserva}
                  style={{ backgroundColor: '#2e4d25', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ➕ Crear Reserva Manual
                </button>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', fontSize: '14px', flexWrap: 'wrap' }}>
                <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#28a745', borderRadius: '50%', marginRight: '5px' }}></span><strong>Pagada / Confirmada</strong></div>
                <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#ffc107', borderRadius: '50%', marginRight: '5px' }}></span><strong>Reservada (Pendiente)</strong></div>
                <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#ffffff', border: '1px solid #ccc', borderRadius: '50%', marginRight: '5px' }}></span><strong>Disponible</strong></div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '25px', alignItems: 'start' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <DatePicker
                    selected={fechaSeleccionadaAdmin}
                    onChange={(date) => setFechaSeleccionadaAdmin(date)}
                    inline
                    dayClassName={getAdminDayClassName}
                  />
                </div>

                <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ marginTop: 0, color: '#2e4d25', borderBottom: '2px solid #2e4d25', paddingBottom: '8px' }}>
                    📅 Reservas para el {format(fechaSeleccionadaAdmin, 'dd/MM/yyyy')}
                  </h3>

                  {reservasDelDia.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>No hay reservas activas para esta fecha en esta cabaña.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '400px', overflowY: 'auto' }}>
                      {reservasDelDia.map((res) => (
                        <div key={res.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #cbd5e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <strong style={{ color: '#2e4d25' }}>Reserva #{res.id}</strong>
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', ...obtenerEstiloEstado(res.estado) }}>
                              {res.estado.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#444', lineHeight: '1.5' }}>
                            <div>👤 <strong>Cliente:</strong> {res.nombre_cliente}</div>
                            <div>✉️ <strong>Email:</strong> {res.email_cliente}</div>
                            <div>📞 <strong>Teléfono:</strong> {res.telefono_cliente || 'No especificado'}</div>
                            <div>📆 <strong>Estancia:</strong> {res.fecha_checkin} al {res.fecha_checkout}</div>
                            <div>💰 <strong>Total:</strong> ₡{Number(res.total).toLocaleString()}</div>
                          </div>

                          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {res.estado !== 'pagada' && (
                              <button
                                onClick={() => cambiarEstadoReserva(res.id, 'pagada')}
                                style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                Marcar Pagada
                              </button>
                            )}
                            {res.estado !== 'reservada' && (
                              <button
                                onClick={() => cambiarEstadoReserva(res.id, 'reservada')}
                                style={{ backgroundColor: '#ffc107', color: '#212529', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                Marcar Reservada
                              </button>
                            )}
                            <button
                              onClick={() => handleCancelar(res.id)}
                              style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 2: LISTA DE RESERVAS */}
          {tabActiva === 'lista' && (
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="🔍 Buscar por nombre, email o ID..."
                  value={busquedaTexto}
                  onChange={(e) => setBusquedaTexto(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', flex: 1, minWidth: '250px' }}
                />

                <select
                  value={filtroBungalow}
                  onChange={(e) => setFiltroBungalow(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="todos">Todas las Cabañas</option>
                  {cabanas.map((c) => (
                    <option key={c.id_bungalow} value={c.nombre}>{c.nombre}</option>
                  ))}
                </select>

                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="pagada">Pagada</option>
                  <option value="reservada">Reservada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#2e4d25', color: 'white' }}>
                      <th style={{ padding: '12px' }}>ID</th>
                      <th style={{ padding: '12px' }}>Cabaña</th>
                      <th style={{ padding: '12px' }}>Cliente</th>
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
                        <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No se encontraron reservas con esos filtros.</td>
                      </tr>
                    ) : (
                      reservasFiltradas.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px' }}>#{r.id}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.cabana_nombre}</td>
                          <td style={{ padding: '12px' }}>{r.nombre_cliente}</td>
                          <td style={{ padding: '12px' }}>{r.email_cliente}<br /><small>{r.telefono_cliente}</small></td>
                          <td style={{ padding: '12px' }}>{r.fecha_checkin}</td>
                          <td style={{ padding: '12px' }}>{r.fecha_checkout}</td>
                          <td style={{ padding: '12px' }}>₡{Number(r.total).toLocaleString()}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', ...obtenerEstiloEstado(r.estado) }}>
                              {r.estado}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                              {r.estado !== 'pagada' && (
                                <button type="button" onClick={() => cambiarEstadoReserva(r.id, 'pagada')} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Pagar</button>
                              )}
                              {r.estado !== 'cancelada' && (
                                <button type="button" onClick={() => handleCancelar(r.id)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Cancelar</button>
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
            <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              
              {/* Formulario para Crear Nuevo Usuario */}
              <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#2e4d25', textAlign: 'center', marginBottom: '20px' }}>➕ Registrar Nuevo Usuario</h3>
                
                <form onSubmit={prepararCrearUsuario} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Nombre:</label>
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Ej. Juan"
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Apellidos:</label>
                    <input
                      type="text"
                      value={nuevoApellido}
                      onChange={(e) => setNuevoApellido(e.target.value)}
                      placeholder="Ej. Pérez Gómez"
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Correo Electrónico:</label>
                    <input
                      type="email"
                      value={nuevoCorreo}
                      onChange={(e) => setNuevoCorreo(e.target.value)}
                      placeholder="usuario@gmail.com"
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Contraseña:</label>
                    <input
                      type="password"
                      value={nuevaPassword}
                      onChange={(e) => setNuevaPassword(e.target.value)}
                      placeholder="********"
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Rol:</label>
                    <select
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value)}
                      style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box', backgroundColor: 'white' }}
                    >
                      <option value="cliente">Cliente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <button
                      type="submit"
                      style={{ width: '100%', backgroundColor: '#2e4d25', color: 'white', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Crear Usuario
                    </button>
                  </div>
                </form>
              </div>

              {/* Tabla de Usuarios */}
              <h3 style={{ color: '#2e4d25', borderBottom: '2px solid #2e4d25', paddingBottom: '8px' }}>📜 Lista de Usuarios Registrados</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#2e4d25', color: 'white' }}>
                      <th style={{ padding: '12px' }}>ID</th>
                      <th style={{ padding: '12px' }}>Nombre Completo</th>
                      <th style={{ padding: '12px' }}>Correo</th>
                      <th style={{ padding: '12px' }}>Rol</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                      <th style={{ padding: '12px' }}>Creado en</th>
                      <th style={{ padding: '12px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosList.map((u) => (
                      <tr key={u.id_usuario} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px' }}>#{u.id_usuario}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.nombre} {u.apellidos}</td>
                        <td style={{ padding: '12px' }}>{u.correo}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: u.rol === 'admin' ? '#d1ecf1' : '#e2e8f0', color: u.rol === 'admin' ? '#0c5460' : '#333' }}>
                            {u.rol?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', backgroundColor: u.estado === 'deshabilitada' ? '#f8d7da' : '#d4edda', color: u.estado === 'deshabilitada' ? '#721c24' : '#155724' }}>
                            {u.estado || 'activa'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{u.creado_en}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => prepararCambioEstado(u, u.estado || 'activa')}
                              style={{ backgroundColor: '#ffc107', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                            >
                              {u.estado === 'deshabilitada' ? 'Activar' : 'Deshabilitar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => prepararEliminarUsuario(u)}
                              style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                            >
                              Eliminar
                            </button>
                          </div>
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

      {/* MODAL DE SEGURIDAD PARA CREAR USUARIO DESDE ADMIN */}
      {mostrarModalAuth && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#2e4d25' }}>🔐 Seguridad de Administrador</h3>
            <p style={{ fontSize: '14px', color: '#555' }}>
              Para autorizar la creación del usuario <strong>{nuevoCorreo}</strong>, ingresa tu contraseña de administrador:
            </p>

            <form onSubmit={confirmarYCrearUsuario}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Contraseña de Admin:</label>
                <input
                  type="password"
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="********"
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              {mensajeUserError && <p style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>{mensajeUserError}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModalAuth(false)}
                  style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoUsuario}
                  style={{ backgroundColor: '#2e4d25', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {guardandoUsuario ? 'Verificando...' : 'Confirmar y Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE SEGURIDAD PARA CAMBIAR ESTADO / ELIMINAR USUARIOS */}
      {modalAccionUsuario && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#2e4d25' }}>
              {modalAccionUsuario === 'eliminar' ? '⚠️ Confirmar Eliminación' : '🔐 Confirmar Cambio de Estado'}
            </h3>
            <p style={{ fontSize: '14px', color: '#555' }}>
              {modalAccionUsuario === 'eliminar' 
                ? `Estás a punto de eliminar al usuario ${usuarioObjetivo?.correo}. Ingresa tu contraseña de administrador para confirmar:` 
                : `Estás a punto de cambiar el estado de ${usuarioObjetivo?.correo} a '${nuevoEstadoObjetivo}'. Ingresa tu contraseña:`}
            </p>

            <form onSubmit={ejecutarAccionSeguraUsuario}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Contraseña de Administrador:</label>
                <input
                  type="password"
                  value={passwordAdminAccion}
                  onChange={(e) => setPasswordAdminAccion(e.target.value)}
                  placeholder="********"
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              {errorAccionUsuario && <p style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>{errorAccionUsuario}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalAccionUsuario(false)}
                  style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoAccion}
                  style={{ backgroundColor: modalAccionUsuario === 'eliminar' ? '#dc3545' : '#2e4d25', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {procesandoAccion ? 'Verificando...' : 'Confirmar Acción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CREAR RESERVA MANUAL DESDE ADMIN */}
      {mostrarModalCrearReserva && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, color: '#2e4d25' }}>➕ Nueva Reserva (Administración)</h3>

            <form onSubmit={handleCrearReservaAdminSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Seleccionar Cabaña:</label>
                <select
                  value={reservaCabanaId}
                  onChange={(e) => setReservaCabanaId(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  {cabanas.map((c) => (
                    <option key={c.id_bungalow} value={c.id_bungalow}>{c.nombre} (₡{Number(c.precio_noche).toLocaleString()} / noche)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Nombre Cliente:</label>
                  <input
                    type="text"
                    required
                    value={formReservaData.nombre}
                    onChange={(e) => setFormReservaData({ ...formReservaData, nombre: e.target.value })}
                    placeholder="Nombre"
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Apellidos:</label>
                  <input
                    type="text"
                    required
                    value={formReservaData.apellidos}
                    onChange={(e) => setFormReservaData({ ...formReservaData, apellidos: e.target.value })}
                    placeholder="Apellidos"
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Correo Electrónico:</label>
                  <input
                    type="email"
                    required
                    value={formReservaData.email}
                    onChange={(e) => setFormReservaData({ ...formReservaData, email: e.target.value })}
                    placeholder="correo@mail.com"
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Teléfono:</label>
                  <input
                    type="text"
                    required
                    value={formReservaData.telefono}
                    onChange={(e) => setFormReservaData({ ...formReservaData, telefono: e.target.value })}
                    placeholder="88888888"
                    style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Selecciona Fechas (Check-in / Check-out):</label>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <DatePicker
                    selected={reservaCheckin}
                    onChange={handleReservaFechaChange}
                    startDate={reservaCheckin}
                    endDate={reservaCheckout}
                    selectsRange
                    inline
                    minDate={new Date()}
                    dayClassName={getModalDayClassName}
                  />
                </div>
                {reservaErrorFecha && <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{reservaErrorFecha}</p>}
              </div>

              <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '6px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Monto Total Estimado:</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2e4d25' }}>₡{calcularTotalAdminReserva().toLocaleString()}</span>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>🔐 Contraseña de Administrador (Confirmación):</label>
                <input
                  type="password"
                  required
                  value={adminPasswordReserva}
                  onChange={(e) => setAdminPasswordReserva(e.target.value)}
                  placeholder="Tu contraseña de admin"
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              {errorReservaAdmin && <p style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>{errorReservaAdmin}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModalCrearReserva(false)}
                  style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoReservaAdmin}
                  style={{ backgroundColor: '#2e4d25', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {guardandoReservaAdmin ? 'Guardando...' : 'Crear Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDITAR PERFIL */}
      {mostrarModalPerfil && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#2e4d25' }}>⚙️ Editar Perfil de Administrador</h3>

            <form onSubmit={handleGuardarPerfil}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Nombre:</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Apellidos:</label>
                <input
                  type="text"
                  value={editApellido}
                  onChange={(e) => setEditApellido(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Correo Electrónico:</label>
                <input
                  type="email"
                  required
                  value={editCorreo}
                  onChange={(e) => setEditCorreo(e.target.value)}
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Nueva Contraseña (Opcional):</label>
                <input
                  type="password"
                  value={editNuevaPassword}
                  onChange={(e) => setEditNuevaPassword(e.target.value)}
                  placeholder="Dejar en blanco para mantener la actual"
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '13px' }}>Contraseña Actual (Obligatoria para guardar):</label>
                <input
                  type="password"
                  required
                  value={editPasswordActual}
                  onChange={(e) => setEditPasswordActual(e.target.value)}
                  placeholder="********"
                  style={{ width: '100%', padding: '9px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
                />
              </div>

              {errorPerfil && <p style={{ color: 'red', fontSize: '13px', marginBottom: '10px' }}>{errorPerfil}</p>}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMostrarModalPerfil(false)}
                  style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoPerfil}
                  style={{ backgroundColor: '#2e4d25', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {guardandoPerfil ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
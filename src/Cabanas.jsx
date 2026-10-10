import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { isWithinInterval, eachDayOfInterval, isBefore, startOfDay, format } from 'date-fns';

export const Cabanas = ({ setAutenticado }) => {
  const [cabanas, setCabanas] = useState([]);
  const [selectedCabana, setSelectedCabana] = useState(null);
  const [detailCabana, setDetailCabana] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();

  // Usuario Logueado o Visitante (Seguro con valor inicial por defecto)
  const [usuarioLogueado, setUsuarioLogueado] = useState(() => {
    try {
      const guardado = localStorage.getItem('adminUsuario');
      return guardado ? JSON.parse(guardado) : { rol: 'visitante' };
    } catch {
      return { rol: 'visitante' };
    }
  });

  const [mostrarModalAvisoLogin, setMostrarModalAvisoLogin] = useState(false);

  // Estado para el menú desplegable del perfil y modal de edición
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false);
  const menuRef = useRef(null);
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editApellido, setEditApellido] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editPasswordActual, setEditPasswordActual] = useState('');
  const [editNuevaPassword, setEditNuevaPassword] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [errorPerfil, setErrorPerfil] = useState('');

  // Estado de fechas ocupadas
  const [fechasOcupadas, setFechasOcupadas] = useState([]);
  const [fechasSeleccionadas, setFechasSeleccionadas] = useState([null, null]);
  const [fechaCheckin, fechaCheckout] = fechasSeleccionadas;
  const [errorFecha, setErrorFecha] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: ''
  });
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuPerfilAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/api/cabanas')
      .then((res) => res.json())
      .then((data) => setCabanas(data))
      .catch((err) => console.error('Error al cargar bungalows:', err));

    if (usuarioLogueado && usuarioLogueado.rol !== 'visitante') {
      setFormData((prev) => ({
        ...prev,
        nombre: usuarioLogueado.nombre || '',
        apellidos: usuarioLogueado.apellidos || '',
        email: usuarioLogueado.correo || ''
      }));
    }
  }, [usuarioLogueado]);

  useEffect(() => {
    if (!selectedCabana) {
      setFechasOcupadas([]);
      setFechasSeleccionadas([null, null]);
      setErrorFecha('');
      return;
    }

    const obtenerFechasOcupadas = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/reservas/ocupadas/${selectedCabana.id_bungalow}`);
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

        setFechasOcupadas(diasBloqueados);
      } catch (err) {
        console.error('Error al consultar fechas ocupadas:', err);
      }
    };

    obtenerFechasOcupadas();
  }, [selectedCabana]);

  const intentarReservar = (cabana) => {
    if (!usuarioLogueado || usuarioLogueado.rol === 'visitante' || !usuarioLogueado.nombre) {
      setMostrarModalAvisoLogin(true);
      return;
    }
    setSelectedCabana(cabana);
  };

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
          id_usuario: usuarioLogueado.id || usuarioLogueado.id_usuario,
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

  const cerrarSesion = () => {
    localStorage.removeItem('adminAutenticado');
    localStorage.removeItem('adminUsuario');
    if (setAutenticado) setAutenticado(false);
    setUsuarioLogueado({ rol: 'visitante' });
    navigate('/login', { replace: true });
  };

  const obtenerIniciales = () => {
    if (!usuarioLogueado || usuarioLogueado.rol === 'visitante' || !usuarioLogueado.nombre) return 'V';
    const nombre = usuarioLogueado.nombre || 'Cliente';
    const apellido = usuarioLogueado.apellidos || '';
    return (nombre.charAt(0) + (apellido ? apellido.charAt(0) : '')).toUpperCase();
  };

  const handleOpenDetail = (cabana) => {
    setDetailCabana(cabana);
    setCurrentImageIndex(0);
  };

  const getImages = (cabana) => {
    if (!cabana || !cabana.imagen_url) {
      return ['https://via.placeholder.com/600x400?text=Sin+Imagen'];
    }
    return cabana.imagen_url.split(',').map((url) => url.trim());
  };

  const nextImage = () => {
    const images = getImages(detailCabana);
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const prevImage = () => {
    const images = getImages(detailCabana);
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const estaOcupado = (date) => {
    return fechasOcupadas.some(
      (d) =>
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
    );
  };

  const getDayClassName = (date) => {
    if (isBefore(date, startOfDay(new Date()))) {
      return 'dia-pasado';
    }
    if (estaOcupado(date)) {
      return 'dia-ocupado';
    }
    return 'dia-disponible';
  };

  const handleFechaChange = (update) => {
    const [start, end] = update;
    setErrorFecha('');

    if (start && end) {
      const cruzaFechaOcupada = fechasOcupadas.some((fechaBloqueada) =>
        isWithinInterval(fechaBloqueada, { start, end })
      );

      if (cruzaFechaOcupada) {
        setErrorFecha('El rango seleccionado incluye días que ya están reservados.');
        setFechasSeleccionadas([null, null]);
        return;
      }
    }

    setFechasSeleccionadas(update);
  };

  const calcularTotal = () => {
    if (!fechaCheckin || !fechaCheckout || !selectedCabana) return 0;
    const diffTime = fechaCheckout - fechaCheckin;
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias * Number(selectedCabana.precio_noche) : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fechaCheckin || !fechaCheckout) {
      alert('Por favor selecciona las fechas de Check-in y Check-out en el calendario.');
      return;
    }

    const total = calcularTotal();

    if (total <= 0) {
      alert('La fecha de check-out debe ser posterior a la fecha de check-in.');
      return;
    }

    const strCheckin = format(fechaCheckin, 'yyyy-MM-dd');
    const strCheckout = format(fechaCheckout, 'yyyy-MM-dd');

    try {
      const response = await fetch('http://localhost:5000/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabana_id: selectedCabana.id_bungalow,
          id_usuario: usuarioLogueado && usuarioLogueado.rol !== 'visitante' ? (usuarioLogueado.id || usuarioLogueado.id_usuario) : null,
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          email: formData.email,
          telefono: formData.telefono,
          fecha_checkin: strCheckin,
          fecha_checkout: strCheckout,
          total
        })
      });

      const resData = await response.json();

      if (resData.success) {
        setMensaje('¡Reserva creada exitosamente! Se ha enviado un correo de confirmación.');
        setSelectedCabana(null);
        setFechasSeleccionadas([null, null]);
      } else {
        alert('Error al realizar la reserva: ' + (resData.error || 'Ocurrió un error'));
      }
    } catch (error) {
      console.error('Error al enviar la reserva:', error);
      alert('Ocurrió un error al conectar con el servidor.');
    }
  };

  return (
    <div style={styles.container}>
      <style>{`
        .dia-ocupado { background-color: #dc3545 !important; color: #ffffff !important; text-decoration: line-through !important; border-radius: 50% !important; cursor: not-allowed !important; opacity: 0.8; }
        .dia-disponible { background-color: #d4edda !important; color: #155724 !important; border-radius: 50% !important; }
        .dia-disponible:hover { background-color: #c3e6cb !important; }
        .react-datepicker__day--range-start, .react-datepicker__day--selecting-range-start { background-color: #1b4332 !important; color: #ffffff !important; font-weight: bold !important; border-radius: 50% 0 0 50% !important; }
        .react-datepicker__day--range-end { background-color: #1b4332 !important; color: #ffffff !important; font-weight: bold !important; border-radius: 0 50% 50% 0 !important; }
        .react-datepicker__day--in-range:not(.react-datepicker__day--range-start):not(.react-datepicker__day--range-end), .react-datepicker__day--in-selecting-range { background-color: #52b788 !important; color: #ffffff !important; border-radius: 0 !important; }
        .dia-pasado { opacity: 0.25; }
        .react-datepicker { font-family: inherit; border: 1px solid #cbd5e0; border-radius: 12px; overflow: hidden; width: 100%; }
        .react-datepicker__month-container { width: 100%; }
        .react-datepicker__header { background-color: #2e4d25; }
        .react-datepicker__current-month, .react-datepicker__day-name { color: #ffffff !important; }
      `}</style>

      {/* Menú Superior */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        {usuarioLogueado && usuarioLogueado.rol !== 'visitante' && usuarioLogueado.nombre ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <div 
              onClick={() => setMenuPerfilAbierto(!menuPerfilAbierto)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', backgroundColor: '#2e4d25', color: 'white', padding: '6px 14px 6px 8px', borderRadius: '25px', boxShadow: '0 2px 5px rgba(0,0,0,0.15)' }}
            >
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: '#17a2b8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', border: '2px solid white' }}>
                {obtenerIniciales()}
              </div>
              <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{usuarioLogueado.nombre}</div>
                <small style={{ fontSize: '10px', opacity: 0.8 }}>▼ Menú</small>
              </div>
            </div>

            {menuPerfilAbierto && (
              <div style={{ position: 'absolute', right: 0, top: '50px', backgroundColor: 'white', color: '#333', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', width: '200px', zIndex: 100, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '12px 15px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{usuarioLogueado.nombre} {usuarioLogueado.apellidos}</div>
                  <div style={{ fontSize: '11px', color: '#666', wordBreak: 'break-all' }}>{usuarioLogueado.correo}</div>
                </div>
                <button onClick={abrirModalPerfil} style={{ width: '100%', padding: '10px 15px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#2e4d25', borderBottom: '1px solid #eee' }}>
                  ⚙️ Editar Perfil
                </button>
                <button onClick={cerrarSesion} style={{ width: '100%', padding: '10px 15px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', color: '#dc3545' }}>
                  🚪 Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>Modo Visitante 👀</span>
            <button onClick={() => navigate('/login')} style={{ backgroundColor: '#2e4d25', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
              Iniciar Sesión / Registrarse
            </button>
          </div>
        )}
      </div>

      <header style={styles.header}>
        <span style={styles.headerBadge}> </span>
        <h1 style={styles.title}>Finca Don Litos</h1>
        <div style={styles.subtitleWrapper}>
          <span style={styles.subtitleTag}> Piscina común</span>
          <span style={styles.subtitleDot}>•</span>
          <span style={styles.subtitleTag}> Parqueo privado</span>
          <span style={styles.subtitleDot}>•</span>
          <span style={styles.subtitleTag}> Pet Friendly</span>
        </div>
      </header>

      {mensaje && <div style={styles.alertSuccess}>{mensaje}</div>}

      <div style={styles.grid}>
        {cabanas.map((cabana) => {
          const images = getImages(cabana);
          return (
            <div key={cabana.id_bungalow} style={styles.card} onClick={() => handleOpenDetail(cabana)}>
              <div style={styles.imageContainer}>
                <img src={images[0]} alt={cabana.nombre} style={styles.cardImage} />
              </div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{cabana.nombre}</h3>
                <p style={styles.cardDesc}>{cabana.descripcion}</p>
                
                <div style={styles.capacityBadge}>
                  👥 Hasta <strong>{cabana.capacidad} personas</strong>
                </div>

                <div style={styles.priceContainer}>
                  <span style={styles.priceAmount}>₡{Number(cabana.precio_noche || 0).toLocaleString('es-CR')}</span>
                  <span style={styles.priceUnit}> / noche</span>
                </div>

                <button
                  style={styles.btnPrimary}
                  onClick={(e) => {
                    e.stopPropagation();
                    intentarReservar(cabana);
                  }}
                >
                  Reservar Cabaña
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL AVISO VISITANTE */}
      {mostrarModalAvisoLogin && (
        <div style={styles.modalOverlay} onClick={() => setMostrarModalAvisoLogin(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#2e4d25', textAlign: 'center' }}>🔒 Inicia Sesión para Reservar</h3>
            <p style={{ fontSize: '0.95rem', color: '#4a5568', textAlign: 'center', lineHeight: '1.5', marginBottom: '20px' }}>
              Estás navegando como <strong>Visitante</strong>. Para poder realizar una reserva en Finca Don Litos, necesitas iniciar sesión en tu cuenta o registrarte.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => navigate('/login')} style={styles.btnPrimary}>
                🔑 Ir a Iniciar Sesión / Registrarme
              </button>
              <button type="button" onClick={() => setMostrarModalAvisoLogin(false)} style={styles.btnSecondary}>
                Seguir viendo cabañas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Detalle y Carrusel */}
      {detailCabana && (
        <div style={styles.modalOverlay} onClick={() => setDetailCabana(null)}>
          <div style={styles.detailModalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setDetailCabana(null)}>✕</button>

            <div style={styles.carouselContainer}>
              <img src={getImages(detailCabana)[currentImageIndex]} alt={detailCabana.nombre} style={styles.carouselImage} />
              {getImages(detailCabana).length > 1 && (
                <>
                  <button style={{ ...styles.carouselBtn, left: '10px' }} onClick={prevImage}>❮</button>
                  <button style={{ ...styles.carouselBtn, right: '10px' }} onClick={nextImage}>❯</button>
                  <div style={styles.imageCounter}>{currentImageIndex + 1} / {getImages(detailCabana).length}</div>
                </>
              )}
            </div>

            <div style={{ padding: '24px' }}>
              <h2 style={{ color: '#1a365d', marginTop: 0, fontSize: '1.6rem' }}>{detailCabana.nombre}</h2>
              <p style={{ color: '#4a5568', fontSize: '1rem', lineHeight: '1.6' }}>{detailCabana.descripcion}</p>
              <p style={{ color: '#2d3748' }}><strong>Capacidad:</strong> Hasta {detailCabana.capacidad} personas</p>
              <p style={{ fontSize: '1.4rem', color: '#2e4d25', fontWeight: 'bold' }}>
                ₡{Number(detailCabana.precio_noche || 0).toLocaleString('es-CR')} <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: 'normal' }}>/ noche</span>
              </p>

              <button
                style={{ ...styles.btnPrimary, marginTop: '12px' }}
                onClick={() => {
                  setDetailCabana(null);
                  intentarReservar(detailCabana);
                }}
              >
                Reservar Ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Formulario de Reserva */}
      {selectedCabana && (
        <div style={styles.modalOverlay} onClick={() => setSelectedCabana(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: '#1a365d', marginTop: 0, fontSize: '1.3rem' }}>Reservar {selectedCabana.nombre}</h3>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Nombre:</label>
              <input type="text" name="nombre" required style={styles.input} value={formData.nombre} onChange={handleChange} />

              <label style={styles.label}>Apellidos:</label>
              <input type="text" name="apellidos" required style={styles.input} value={formData.apellidos} onChange={handleChange} />

              <label style={styles.label}>Correo Electrónico:</label>
              <input type="email" name="email" required style={styles.input} value={formData.email} onChange={handleChange} />

              <label style={styles.label}>Teléfono:</label>
              <input type="tel" name="telefono" required style={styles.input} value={formData.telefono} onChange={handleChange} />

              <label style={styles.label}>Selecciona tu rango de hospedaje:</label>
              <div style={{ marginBottom: '10px', textAlign: 'center' }}>
                <DatePicker selectsRange startDate={fechaCheckin} endDate={fechaCheckout} onChange={handleFechaChange} inline minDate={new Date()} excludeDates={fechasOcupadas} dayClassName={getDayClassName} />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '14px' }}>
                <div style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: fechaCheckin ? '#e6f4ea' : '#f8f9fa', border: fechaCheckin ? '1px solid #2e4d25' : '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem' }}>
                  <small style={{ color: '#718096', display: 'block' }}>Check-in</small>
                  <strong style={{ color: '#2e4d25' }}>{fechaCheckin ? fechaCheckin.toLocaleDateString('es-CR') : 'Seleccionar'}</strong>
                </div>

                <div style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: fechaCheckout ? '#e6f4ea' : '#f8f9fa', border: fechaCheckout ? '1px solid #2e4d25' : '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.85rem' }}>
                  <small style={{ color: '#718096', display: 'block' }}>Check-out</small>
                  <strong style={{ color: '#2e4d25' }}>{fechaCheckout ? fechaCheckout.toLocaleDateString('es-CR') : 'Seleccionar'}</strong>
                </div>
              </div>

              {errorFecha && <p style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '0.88rem', margin: '0 0 10px 0' }}>⚠️ {errorFecha}</p>}

              {calcularTotal() > 0 && (
                <div style={styles.totalBox}>
                  <strong>Total a pagar: </strong>₡{calcularTotal().toLocaleString('es-CR')}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" style={styles.btnPrimary}>Confirmar Reserva</button>
                <button type="button" style={styles.btnSecondary} onClick={() => setSelectedCabana(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '30px 20px', boxSizing: 'border-box', fontFamily: "'Segoe UI', Roboto, sans-serif" },
  header: { textAlign: 'center', marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  headerBadge: { backgroundColor: '#e6f4ea', color: '#2e4d25', fontSize: '0.85rem', fontWeight: '600', padding: '4px 12px', borderRadius: '20px', marginBottom: '8px' },
  title: { color: '#2e4d25', fontSize: '2.6rem', fontWeight: '800', margin: '0 0 10px 0' },
  subtitleWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' },
  subtitleTag: { color: '#4a5568', fontSize: '0.95rem', fontWeight: '500' },
  subtitleDot: { color: '#cbd5e0', fontSize: '0.8rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px', justifyContent: 'center', width: '100%' },
  card: { border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', cursor: 'pointer' },
  imageContainer: { width: '100%', height: '220px', overflow: 'hidden', backgroundColor: '#1b2a1a' },
  cardImage: { width: '100%', height: '100%', objectFit: 'cover' },
  cardBody: { padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1, textAlign: 'center' },
  cardTitle: { color: '#2e4d25', fontSize: '1.35rem', fontWeight: '700', marginTop: 0, marginBottom: '10px' },
  cardDesc: { color: '#4a5568', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '14px', flexGrow: 1 },
  capacityBadge: { backgroundColor: '#f7fafc', border: '1px solid #edf2f7', color: '#4a5568', fontSize: '0.88rem', padding: '6px 12px', borderRadius: '8px', marginBottom: '14px', display: 'inline-block' },
  priceContainer: { marginBottom: '16px' },
  priceAmount: { fontSize: '1.4rem', color: '#2e4d25', fontWeight: '800' },
  priceUnit: { fontSize: '0.85rem', color: '#718096' },
  btnPrimary: { backgroundColor: '#2e4d25', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '700', width: '100%' },
  btnSecondary: { backgroundColor: '#a0aec0', color: '#fff', border: 'none', padding: '12px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600', width: '100%' },
  alertSuccess: { backgroundColor: '#c6f6d5', color: '#22543d', padding: '14px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center', fontWeight: '600' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '28px', borderRadius: '16px', maxWidth: '480px', width: '90%', maxHeight: '90vh', overflowY: 'auto' },
  detailModalContent: { backgroundColor: '#fff', borderRadius: '16px', maxWidth: '650px', width: '90%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' },
  closeBtn: { position: 'absolute', top: '12px', right: '12px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', zIndex: 10 },
  carouselContainer: { position: 'relative', height: '360px', backgroundColor: '#1a202c', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  carouselImage: { width: '100%', height: '100%', objectFit: 'contain' },
  carouselBtn: { position: 'absolute', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  imageCounter: { position: 'absolute', bottom: '12px', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontSize: '0.8rem' },
  label: { display: 'block', marginBottom: '6px', fontWeight: '600', fontSize: '0.88rem', color: '#2d3748' },
  input: { width: '100%', padding: '10px 14px', marginBottom: '14px', borderRadius: '8px', border: '1px solid #cbd5e0', boxSizing: 'border-box', fontSize: '0.95rem' },
  totalBox: { backgroundColor: '#f0fff4', border: '1px solid #c6f6d5', padding: '12px', borderRadius: '8px', marginTop: '10px', textAlign: 'center', fontSize: '1.1rem', color: '#2e4d25' }
};
import React, { useState, useEffect } from 'react';

export const Cabanas = () => {
  const [cabanas, setCabanas] = useState([]);
  const [selectedCabana, setSelectedCabana] = useState(null);
  const [detailCabana, setDetailCabana] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    telefono: '',
    fecha_checkin: '',
    fecha_checkout: ''
  });
  const [mensaje, setMensaje] = useState('');

  // Cargar bungalows desde el Backend
  useEffect(() => {
    fetch('http://localhost:5000/api/cabanas')
      .then((res) => res.json())
      .then((data) => setCabanas(data))
      .catch((err) => console.error('Error al cargar bungalows:', err));
  }, []);

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

  const calcularTotal = () => {
    if (!formData.fecha_checkin || !formData.fecha_checkout || !selectedCabana) return 0;
    const checkin = new Date(formData.fecha_checkin);
    const checkout = new Date(formData.fecha_checkout);
    const diffTime = checkout - checkin;
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias * Number(selectedCabana.precio_noche) : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = calcularTotal();

    if (total <= 0) {
      alert('La fecha de check-out debe ser posterior a la fecha de check-in.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabana_id: selectedCabana.id_bungalow,
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          email: formData.email,
          telefono: formData.telefono,
          fecha_checkin: formData.fecha_checkin,
          fecha_checkout: formData.fecha_checkout,
          total
        })
      });

      const resData = await response.json();

      if (resData.success) {
        setMensaje('¡Reserva creada exitosamente! Se ha enviado un correo de confirmación.');
        setSelectedCabana(null);
        setFormData({
          nombre: '',
          apellidos: '',
          email: '',
          telefono: '',
          fecha_checkin: '',
          fecha_checkout: ''
        });
      } else {
        alert('Error al realizar la reserva: ' + resData.error);
      }
    } catch (error) {
      console.error('Error al enviar la reserva:', error);
      alert('Ocurrió un error al conectar con el servidor.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Encabezado Estilizado */}
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
            <div
              key={cabana.id_bungalow}
              style={styles.card}
              onClick={() => handleOpenDetail(cabana)}
            >
              <div style={styles.imageContainer}>
                <img
                  src={images[0]}
                  alt={cabana.nombre}
                  style={styles.cardImage}
                />
              </div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{cabana.nombre}</h3>
                <p style={styles.cardDesc}>{cabana.descripcion}</p>
                
                <div style={styles.capacityBadge}>
                  👥 Hasta <strong>{cabana.capacidad} personas</strong>
                </div>

                <div style={styles.priceContainer}>
                  <span style={styles.priceAmount}>
                    ₡{Number(cabana.precio_noche || 0).toLocaleString('es-CR')}
                  </span>
                  <span style={styles.priceUnit}> / noche</span>
                </div>

                <button
                  style={styles.btnPrimary}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCabana(cabana);
                  }}
                >
                  Reservar Cabaña
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Detalle y Carrusel */}
      {detailCabana && (
        <div style={styles.modalOverlay} onClick={() => setDetailCabana(null)}>
          <div style={styles.detailModalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setDetailCabana(null)}>
              ✕
            </button>

            <div style={styles.carouselContainer}>
              <img
                src={getImages(detailCabana)[currentImageIndex]}
                alt={detailCabana.nombre}
                style={styles.carouselImage}
              />
              {getImages(detailCabana).length > 1 && (
                <>
                  <button style={{ ...styles.carouselBtn, left: '10px' }} onClick={prevImage}>
                    ❮
                  </button>
                  <button style={{ ...styles.carouselBtn, right: '10px' }} onClick={nextImage}>
                    ❯
                  </button>
                  <div style={styles.imageCounter}>
                    {currentImageIndex + 1} / {getImages(detailCabana).length}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '24px' }}>
              <h2 style={{ color: '#1a365d', marginTop: 0, fontSize: '1.6rem' }}>{detailCabana.nombre}</h2>
              <p style={{ color: '#4a5568', fontSize: '1rem', lineHeight: '1.6' }}>
                {detailCabana.descripcion}
              </p>
              <p style={{ color: '#2d3748' }}>
                <strong>Capacidad:</strong> Hasta {detailCabana.capacidad} personas
              </p>
              <p style={{ fontSize: '1.4rem', color: '#2e4d25', fontWeight: 'bold' }}>
                ₡{Number(detailCabana.precio_noche || 0).toLocaleString('es-CR')} <span style={{ fontSize: '0.9rem', color: '#718096', fontWeight: 'normal' }}>/ noche</span>
              </p>

              <button
                style={{ ...styles.btnPrimary, marginTop: '12px' }}
                onClick={() => {
                  setSelectedCabana(detailCabana);
                  setDetailCabana(null);
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
            <h3 style={{ color: '#1a365d', marginTop: 0, fontSize: '1.3rem' }}>
              Reservar {selectedCabana.nombre}
            </h3>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Nombre:</label>
              <input
                type="text"
                name="nombre"
                required
                style={styles.input}
                value={formData.nombre}
                onChange={handleChange}
              />

              <label style={styles.label}>Apellidos:</label>
              <input
                type="text"
                name="apellidos"
                required
                style={styles.input}
                value={formData.apellidos}
                onChange={handleChange}
              />

              <label style={styles.label}>Correo Electrónico:</label>
              <input
                type="email"
                name="email"
                required
                style={styles.input}
                value={formData.email}
                onChange={handleChange}
              />

              <label style={styles.label}>Teléfono:</label>
              <input
                type="tel"
                name="telefono"
                required
                style={styles.input}
                value={formData.telefono}
                onChange={handleChange}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Check-in:</label>
                  <input
                    type="date"
                    name="fecha_checkin"
                    required
                    style={styles.input}
                    value={formData.fecha_checkin}
                    onChange={handleChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Check-out:</label>
                  <input
                    type="date"
                    name="fecha_checkout"
                    required
                    style={styles.input}
                    value={formData.fecha_checkout}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {calcularTotal() > 0 && (
                <div style={styles.totalBox}>
                  <strong>Total a pagar: </strong>₡{calcularTotal().toLocaleString('es-CR')}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" style={styles.btnPrimary}>
                  Confirmar Reserva
                </button>
                <button
                  type="button"
                  style={styles.btnSecondary}
                  onClick={() => setSelectedCabana(null)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Objeto de Estilos Inline Renovados
const styles = {
  container: {
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    padding: '30px 20px',
    boxSizing: 'border-box',
    fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  headerBadge: {
    backgroundColor: '#e6f4ea',
    color: '#2e4d25',
    fontSize: '0.85rem',
    fontWeight: '600',
    padding: '4px 12px',
    borderRadius: '20px',
    marginBottom: '8px',
    letterSpacing: '0.5px'
  },
  title: {
    color: '#2e4d25',
    fontSize: '2.6rem',
    fontWeight: '800',
    margin: '0 0 10px 0',
    letterSpacing: '-0.5px'
  },
  subtitleWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    flexWrap: 'wrap'
  },
  subtitleTag: {
    color: '#4a5568',
    fontSize: '0.95rem',
    fontWeight: '500'
  },
  subtitleDot: {
    color: '#cbd5e0',
    fontSize: '0.8rem'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '28px',
    justifyContent: 'center',
    alignItems: 'stretch',
    width: '100%'
  },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  imageContainer: {
    width: '100%',
    height: '220px',
    overflow: 'hidden',
    backgroundColor: '#1b2a1a'
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    display: 'block'
  },
  cardBody: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    textAlign: 'center'
  },
  cardTitle: {
    color: '#2e4d25',
    fontSize: '1.35rem',
    fontWeight: '700',
    marginTop: 0,
    marginBottom: '10px'
  },
  cardDesc: {
    color: '#4a5568',
    fontSize: '0.92rem',
    lineHeight: '1.5',
    marginBottom: '14px',
    flexGrow: 1
  },
  capacityBadge: {
    backgroundColor: '#f7fafc',
    border: '1px solid #edf2f7',
    color: '#4a5568',
    fontSize: '0.88rem',
    padding: '6px 12px',
    borderRadius: '8px',
    marginBottom: '14px',
    display: 'inline-block'
  },
  priceContainer: {
    marginBottom: '16px'
  },
  priceAmount: {
    fontSize: '1.4rem',
    color: '#2e4d25',
    fontWeight: '800'
  },
  priceUnit: {
    fontSize: '0.85rem',
    color: '#718096',
    fontWeight: 'normal'
  },
  btnPrimary: {
    backgroundColor: '#2e4d25',
    color: '#fff',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '700',
    width: '100%',
    transition: 'background-color 0.2s ease'
  },
  btnSecondary: {
    backgroundColor: '#a0aec0',
    color: '#fff',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    width: '100%'
  },
  alertSuccess: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
    padding: '14px',
    borderRadius: '8px',
    marginBottom: '24px',
    textAlign: 'center',
    fontWeight: '600'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '28px',
    borderRadius: '16px',
    maxWidth: '450px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  detailModalContent: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    maxWidth: '650px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    zIndex: 10,
    fontSize: '1rem'
  },
  carouselContainer: {
    position: 'relative',
    height: '360px',
    backgroundColor: '#1a202c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain'
  },
  carouselBtn: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    fontSize: '1.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  imageCounter: {
    position: 'absolute',
    bottom: '12px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem'
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    fontSize: '0.88rem',
    color: '#2d3748'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    marginBottom: '14px',
    borderRadius: '8px',
    border: '1px solid #cbd5e0',
    boxSizing: 'border-box',
    fontSize: '0.95rem'
  },
  totalBox: {
    backgroundColor: '#f0fff4',
    border: '1px solid #c6f6d5',
    padding: '12px',
    borderRadius: '8px',
    marginTop: '10px',
    textAlign: 'center',
    fontSize: '1.1rem',
    color: '#2e4d25'
  }
};
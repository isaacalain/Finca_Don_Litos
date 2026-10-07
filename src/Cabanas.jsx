import React, { useState, useEffect } from 'react';

export const Cabanas = () => {
  const [cabanas, setCabanas] = useState([]);
  const [selectedCabana, setSelectedCabana] = useState(null);
  const [detailCabana, setDetailCabana] = useState(null); // Bungalow seleccionado para ver detalle/carrusel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    fechaCheckin: '',
    fechaCheckout: ''
  });
  const [mensaje, setMensaje] = useState('');

  // 1. Cargar bungalows desde el Backend
  useEffect(() => {
    fetch('http://localhost:5000/api/cabanas')
      .then((res) => res.json())
      .then((data) => setCabanas(data))
      .catch((err) => console.error('Error al cargar bungalows:', err));
  }, []);

  // Abrir modal de detalle
  const handleOpenDetail = (cabana) => {
    setDetailCabana(cabana);
    setCurrentImageIndex(0);
  };

  // Obtener array de imágenes del bungalow (soporta URLs separadas por coma)
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

  // Manejar el cambio en los inputs del formulario
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Calcular el total de la estancia
  const calcularTotal = () => {
    if (!formData.fechaCheckin || !formData.fechaCheckout || !selectedCabana) return 0;
    const checkin = new Date(formData.fechaCheckin);
    const checkout = new Date(formData.fechaCheckout);
    const diffTime = checkout - checkin;
    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias * Number(selectedCabana.precio_noche) : 0;
  };

  // Enviar el formulario de reserva
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
          nombre_cliente: formData.nombre,
          email_cliente: formData.email,
          telefono_cliente: formData.telefono,
          fecha_checkin: formData.fechaCheckin,
          fecha_checkout: formData.fechaCheckout,
          total
        })
      });

      const resData = await response.json();

      if (resData.success) {
        setMensaje('¡Reserva creada exitosamente! Se ha enviado un correo de confirmación.');
        setSelectedCabana(null);
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          fechaCheckin: '',
          fechaCheckout: ''
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
      <header style={styles.header}>
        <h1 style={styles.title}>Finca Don Litos</h1>
        <p style={styles.subtitle}>Piscina común | Parqueo | Pet Friendly</p>
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
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <h3 style={{ color: '#2e4d25', marginTop: 0, marginBottom: '8px' }}>
                  {cabana.nombre}
                </h3>
                <p style={{ color: '#555', fontSize: '0.9rem', marginBottom: '12px', flexGrow: 1 }}>
                  {cabana.descripcion}
                </p>
                <p style={{ margin: '4px 0' }}>
                  <strong>Capacidad:</strong> Hasta {cabana.capacidad} personas
                </p>
                <p style={{ fontSize: '1.2rem', color: '#5a4226', fontWeight: 'bold', margin: '8px 0 16px 0' }}>
                  ₡{Number(cabana.precio_noche || 0).toLocaleString('es-CR')}
                  <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}> / noche</span>
                </p>
                <button
                  style={styles.btnPrimary}
                  onClick={(e) => {
                    e.stopPropagation(); // Evita que abra el modal de detalle al hacer clic en reservar
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

      {/* Modal 1: Detalle y Carrusel de Imágenes */}
      {detailCabana && (
        <div style={styles.modalOverlay} onClick={() => setDetailCabana(null)}>
          <div style={styles.detailModalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setDetailCabana(null)}>
              ✕
            </button>

            {/* Carrusel de fotos */}
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

            {/* Información del Bungalow */}
            <div style={{ padding: '20px' }}>
              <h2 style={{ color: '#2e4d25', marginTop: 0 }}>{detailCabana.nombre}</h2>
              <p style={{ color: '#555', fontSize: '1rem', lineHeight: '1.5' }}>
                {detailCabana.descripcion}
              </p>
              <p><strong>Capacidad:</strong> Hasta {detailCabana.capacidad} personas</p>
              <p style={{ fontSize: '1.3rem', color: '#5a4226', fontWeight: 'bold' }}>
                ₡{Number(detailCabana.precio_noche || 0).toLocaleString('es-CR')} / noche
              </p>

              <button
                style={{ ...styles.btnPrimary, marginTop: '10px' }}
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
            <h3 style={{ color: '#2e4d25', marginTop: 0 }}>
              Reservar {selectedCabana.nombre}
            </h3>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Nombre Completo:</label>
              <input
                type="text"
                name="nombre"
                required
                style={styles.input}
                value={formData.nombre}
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
                    name="fechaCheckin"
                    required
                    style={styles.input}
                    value={formData.fechaCheckin}
                    onChange={handleChange}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Check-out:</label>
                  <input
                    type="date"
                    name="fechaCheckout"
                    required
                    style={styles.input}
                    value={formData.fechaCheckout}
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

// Objeto de Estilos Inline
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    color: '#2e4d25',
    margin: '0 0 5px 0'
  },
  subtitle: {
    color: '#666',
    margin: 0
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    justifyContent: 'center'
  },
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
  },
  imageContainer: {
    backgroundColor: '#1b2a1a',
    height: '200px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block'
  },
  btnPrimary: {
    backgroundColor: '#2e4d25',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
    width: '100%'
  },
  btnSecondary: {
    backgroundColor: '#888',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    width: '100%'
  },
  alertSuccess: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '450px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  detailModalContent: {
    backgroundColor: '#fff',
    borderRadius: '12px',
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
    backgroundColor: '#1b2a1a',
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
    bottom: '10px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.8rem'
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    color: '#333'
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    marginBottom: '12px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    boxSizing: 'border-box'
  },
  totalBox: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '6px',
    marginTop: '10px',
    textAlign: 'center',
    fontSize: '1.1rem',
    color: '#2e4d25'
  }
};
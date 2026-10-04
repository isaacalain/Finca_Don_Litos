import React, { useEffect, useState } from 'react';

export const Cabanas = () => {
  const [cabanas, setCabanas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCabana, setSelectedCabana] = useState(null);
  
  // Datos del formulario de reserva
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    checkin: '',
    checkout: ''
  });
  const [total, setTotal] = useState(0);
  const [reservaExitosa, setReservaExitosa] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/cabanas')
      .then((res) => res.json())
      .then((data) => {
        setCabanas(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error al cargar cabañas:', err);
        setLoading(false);
      });
  }, []);

  // Calcular el total en colones automáticamente según las noches
  useEffect(() => {
    if (formData.checkin && formData.checkout && selectedCabana) {
      const f1 = new Date(formData.checkin);
      const f2 = new Date(formData.checkout);
      const diffTime = f2 - f1;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        setTotal(diffDays * Number(selectedCabana.precio_noche));
      } else {
        setTotal(0);
      }
    }
  }, [formData.checkin, formData.checkout, selectedCabana]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (total <= 0) {
      alert('Por favor selecciona un rango de fechas válido.');
      return;
    }

    const payload = {
      cabana_id: selectedCabana.id,
      nombre_cliente: formData.nombre,
      email_cliente: formData.email,
      telefono_cliente: formData.telefono,
      fecha_checkin: formData.checkin,
      fecha_checkout: formData.checkout,
      total: total
    };

    try {
      const res = await fetch('http://localhost:5000/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setReservaExitosa({
          id: data.reservaId,
          cabana: selectedCabana.nombre,
          ...formData,
          total
        });
        setSelectedCabana(null);
      } else {
        alert('Error al realizar la reserva: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor.');
    }
  };

  if (loading) return <p style={{ textAlign: 'center', color: '#2e4d25', marginTop: '40px' }}>Cargando cabañas de Finca Don Litos...</p>;

  // Pantalla de Confirmación de Reserva
  if (reservaExitosa) {
    return (
      <div style={styles.confirmBox}>
        <h2 style={{ color: '#2e4d25' }}>🎉 ¡Reserva Confirmada!</h2>
        <p>Gracias <strong>{reservaExitosa.nombre}</strong>, hemos registrado tu reserva exitosamente.</p>
        <div style={styles.receipt}>
          <p><strong>N° de Reserva:</strong> #{reservaExitosa.id}</p>
          <p><strong>Cabaña:</strong> {reservaExitosa.cabana}</p>
          <p><strong>Entrada:</strong> {reservaExitosa.checkin}</p>
          <p><strong>Salida:</strong> {reservaExitosa.checkout}</p>
          <p><strong>Monto Total:</strong> ₡{reservaExitosa.total.toLocaleString('es-CR')}</p>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#666' }}>
          📧 Se ha enviado una copia a <strong>{reservaExitosa.email}</strong>.
        </p>
        <button style={styles.btnPrimary} onClick={() => setReservaExitosa(null)}>Volver al Inicio</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={{ color: '#2e4d25', margin: 0 }}>🌿 Finca Don Litos</h1>
        <p style={{ color: '#5a4226', fontWeight: 'bold' }}>Piscina común | Parqueo | Pet Friendly 🐾</p>
      </header>

      <div style={styles.grid}>
        {cabanas.map((cabana) => (
          <div key={cabana.id} style={styles.card}>
            <img src={cabana.imagen_url} alt={cabana.nombre} style={styles.cardImg} />
            <div style={{ padding: '16px' }}>
              <h3 style={{ color: '#2e4d25', marginTop: 0 }}>{cabana.nombre}</h3>
              <p style={{ color: '#555', fontSize: '0.9rem' }}>{cabana.descripcion}</p>
              <p><strong>Capacidad:</strong> Hasta {cabana.capacidad} personas</p>
              <p style={{ fontSize: '1.2rem', color: '#5a4226', fontWeight: 'bold' }}>
                ₡{Number(cabana.precio_noche).toLocaleString('es-CR')} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>/ noche</span>
              </p>
              <button style={styles.btnPrimary} onClick={() => setSelectedCabana(cabana)}>
                Reservar Cabaña
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal / Formulario de Reserva */}
      {selectedCabana && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={{ color: '#2e4d25', marginTop: 0 }}>Reservar {selectedCabana.nombre}</h3>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Nombre Completo:</label>
              <input type="text" required style={styles.input} value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />

              <label style={styles.label}>Correo Electrónico:</label>
              <input type="email" required style={styles.input} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />

              <label style={styles.label}>Teléfono:</label>
              <input type="tel" required style={styles.input} value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Check-in:</label>
                  <input type="date" required style={styles.input} value={formData.checkin} onChange={(e) => setFormData({ ...formData, checkin: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Check-out:</label>
                  <input type="date" required style={styles.input} value={formData.checkout} onChange={(e) => setFormData({ ...formData, checkout: e.target.value })} />
                </div>
              </div>

              <div style={styles.totalBox}>
                <span>Total estimado:</span>
                <strong style={{ fontSize: '1.3rem', color: '#2e4d25' }}>₡{total.toLocaleString('es-CR')}</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
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

// Estilos rústicos-tropicales (Verde Bosque + Café Madera)
const styles = {
  container: { padding: '20px', fontFamily: 'Arial, sans-serif', backgroundColor: '#f9f8f3', minHeight: '100vh' },
  header: { textAlign: 'center', marginBottom: '30px' },
  grid: { display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' },
  card: { border: '1px solid #dcd7c9', borderRadius: '12px', width: '320px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  cardImg: { width: '100%', height: '190px', objectFit: 'cover' },
  btnPrimary: { width: '100%', padding: '10px', backgroundColor: '#2e4d25', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
  btnSecondary: { width: '100%', padding: '10px', backgroundColor: '#8c8275', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: '#fff', padding: '25px', borderRadius: '12px', width: '400px', maxWidth: '90%' },
  label: { display: 'block', fontSize: '0.85rem', color: '#444', marginTop: '10px', marginBottom: '3px' },
  input: { width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
  totalBox: { marginTop: '15px', padding: '10px', backgroundColor: '#eef5ec', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  confirmBox: { maxWidth: '500px', margin: '50px auto', padding: '30px', backgroundColor: '#fff', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  receipt: { backgroundColor: '#f9f8f3', padding: '15px', borderRadius: '8px', textAlign: 'left', margin: '20px 0' }
};
export default Cabanas;
import React from 'react';

export default function SobreNosotrosModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()} // Evita cerrar al hacer clic dentro
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          maxWidth: '550px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          position: 'relative',
          padding: '25px',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        {/* Botón de Cierre */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            fontSize: '22px',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ✕
        </button>

        <h2 style={{ color: '#2e4d25', marginTop: 0, marginBottom: '10px', textAlign: 'center', fontSize: '24px' }}>
          🌿 Sobre Nosotros
        </h2>
        <p style={{ textAlign: 'center', color: '#1b4332', fontWeight: 'bold', fontSize: '14px', marginBottom: '20px' }}>
          📍 Puerto Viejo, Talamanca, Limón
        </p>

        {/* Foto de los Propietarios */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img
            src="/images/propietarios.jpg" // Cambia esta ruta por la de tu foto
            alt="Propietarios de Finca Don Litos"
            style={{
              width: '100%',
              maxHeight: '260px',
              objectFit: 'cover',
              borderRadius: '12px',
              border: '3px solid #e2e8f0'
            }}
          />
          <small style={{ color: '#666', fontStyle: 'italic', display: 'block', marginTop: '6px' }}>
            Nuestra familia lista para darte la bienvenida al Caribe Sur.
          </small>
        </div>

        {/* Texto Descriptivo */}
        <div style={{ color: '#333', lineHeight: '1.6', fontSize: '14px', textAlign: 'justify' }}>
          <p>
            Bienvenido a <strong>Finca Don Litos</strong>, tu refugio perfecto en el corazón de <strong>Puerto Viejo de Talamanca</strong>. Nacimos con la ilusión de ofrecer un espacio donde la exuberante naturaleza caribeña y el descanso se encuentren en perfecta armonía.
          </p>
          <p>
            Nos ubicamos en un entorno privilegiado, rodeados por la calma de la selva tropical pero a solo minutos de las hermosas playas de aguas cristalinas que caracterizan a Limón. Aquí disfrutarás de la verdadera <strong>tranquilidad, privacidad y comodidad</strong> que buscas para desconectarte del estrés diario.
          </p>
          <p>
            Como propietarios, nos apasiona recibir a cada huésped con la calidez y hospitalidad que nos distingue, asegurándonos de que te sientas como en casa mientras exploras los tesoros de nuestra región.
          </p>
        </div>

        {/* Cierre */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            backgroundColor: '#2e4d25',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          ¡Entendido, gracias!
        </button>
      </div>
    </div>
  );
}
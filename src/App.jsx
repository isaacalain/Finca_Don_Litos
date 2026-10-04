import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Cabanas } from './Cabanas';
import Admin from './Admin';
import Login from './Login';

export default function App() {
  // Inicializamos el estado comprobando localStorage directamente
  const [autenticado, setAutenticado] = useState(() => {
    return localStorage.getItem('adminAutenticado') === 'true';
  });

  return (
    <Router>
      <Routes>
        {/* Vista pública del cliente */}
        <Route path="/" element={<Cabanas />} />

        {/* Pantalla de Inicio de Sesión */}
        <Route 
          path="/login" 
          element={<Login setAutenticado={setAutenticado} />} 
        />

        {/* Ruta protegida del Admin */}
        <Route 
          path="/admin" 
          element={autenticado ? <Admin setAutenticado={setAutenticado} /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </Router>
  );
}
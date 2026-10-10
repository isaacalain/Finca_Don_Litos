import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import { Cabanas } from './Cabanas';
import Admin from './Admin';

function App() {
  const [autenticado, setAutenticado] = useState(
    () => localStorage.getItem('adminAutenticado') === 'true'
  );

  return (
    <Router>
      <Routes>
        {/* Redirigir la raíz al login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Ruta del Login */}
        <Route path="/login" element={<Login setAutenticado={setAutenticado} />} />

        {/* Ruta de Cabañas (Aquí es donde navega el visitante y el cliente) */}
        <Route path="/cabanas" element={<Cabanas setAutenticado={setAutenticado} />} />

        {/* Ruta del Panel de Administrador */}
        <Route 
          path="/admin" 
          element={
            autenticado ? (
              <Admin setAutenticado={setAutenticado} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Cualquier otra ruta desconocida redirige al login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
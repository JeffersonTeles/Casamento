import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import GuestRsvp from './pages/GuestRsvp';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={(
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        )}
      />
      <Route path="/confirmar/:token" element={<GuestRsvp />} />
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Página não encontrada.
        </div>
      } />
    </Routes>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AddSale from './pages/AddSale';
import Records from './pages/Records';
import CreateInvoice from './pages/CreateInvoice';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="add" element={<AddSale />} />
            <Route path="records" element={<Records />} />
            <Route path="invoice" element={<CreateInvoice />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

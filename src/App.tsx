import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Companies } from './pages/admin/Companies';
import { Shops } from './pages/admin/Shops';
import { DaySheet } from './pages/admin/DaySheet';
import { UserManagement } from './pages/admin/UserManagement';
import { Reports } from './pages/admin/Reports';
import { Billing } from './pages/admin/Billing';
import { UserDashboard } from './pages/user/UserDashboard';
import { Pickup } from './pages/user/Pickup';
import { Delivery } from './pages/user/Delivery';
import { Profile } from './pages/Profile';

// Bike Shop Imports
import { BikeLayout } from './pages/bike-shop/BikeLayout';
import { BikeHome } from './pages/bike-shop/BikeHome';
import { BikeDetails } from './pages/bike-shop/BikeDetails';
import { BikeCart } from './pages/bike-shop/BikeCart';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { profile } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Bike Shop Demo Routes (Public for demo) */}
      <Route path="/bike-shop" element={<BikeLayout />}>
        <Route index element={<BikeHome />} />
        <Route path="product/:id" element={<BikeDetails />} />
        <Route path="cart" element={<BikeCart />} />
        <Route path="*" element={<div className="p-8 text-white">Page under construction</div>} />
      </Route>

      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* Common Routes */}
        <Route index element={profile?.role === 'admin' ? <AdminDashboard /> : <UserDashboard />} />
        <Route path="profile" element={<Profile />} />

        {/* Admin Routes */}
        <Route path="companies" element={<ProtectedRoute allowedRoles={['admin']}><Companies /></ProtectedRoute>} />
        <Route path="shops" element={<ProtectedRoute allowedRoles={['admin']}><Shops /></ProtectedRoute>} />
        <Route path="day-sheet" element={<ProtectedRoute allowedRoles={['admin']}><DaySheet /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
        <Route path="billing" element={<ProtectedRoute allowedRoles={['admin']}><Billing /></ProtectedRoute>} />

        {/* User Routes */}
        <Route path="pickup" element={<ProtectedRoute allowedRoles={['admin', 'user']}><Pickup /></ProtectedRoute>} />
        <Route path="delivery" element={<ProtectedRoute allowedRoles={['admin', 'user']}><Delivery /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
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
import { TodayActivity } from './pages/user/TodayActivity';
import { Profile } from './pages/Profile';
import { VoucherEntry } from './pages/VoucherEntry';
import { VoucherAdmin } from './pages/admin/VoucherAdmin';
import { Dispatch } from './pages/admin/Dispatch';
import { Reconciliation } from './pages/admin/Reconciliation';
import { CourierExchange } from './pages/admin/CourierExchange';



const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, profile, loading } = useAuth();

  // Only show loading if we have NO user and we are still loading.
  // If we HAVE a user, don't show loading screen even if profile is still fetching in background,
  // unless we specifically need the profile for allowedRoles.
  if (loading && !user) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#e0e5ec' }}>
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xl mb-4">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
      <p className="text-slate-500 font-semibold text-sm tracking-wider">MD LOGISTICS</p>
    </div>
  );
  
  if (!user && !loading) return <Navigate to="/login" />;
  
  // If we need roles and profile is still loading, THEN we wait.
  if (allowedRoles && loading && !profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#e0e5ec' }}>
      <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
  
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { profile, isMasterAdmin } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/entry" element={<VoucherEntry />} />
      


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
        <Route path="billing" element={<ProtectedRoute allowedRoles={['admin']}>{isMasterAdmin ? <Billing /> : <Navigate to="/" />}</ProtectedRoute>} />
        <Route path="vouchers" element={<ProtectedRoute allowedRoles={['admin']}><VoucherAdmin /></ProtectedRoute>} />
        <Route path="dispatch" element={<ProtectedRoute allowedRoles={['admin']}><Dispatch /></ProtectedRoute>} />
        <Route path="reconciliation" element={<ProtectedRoute allowedRoles={['admin']}>{isMasterAdmin ? <Reconciliation /> : <Navigate to="/" />}</ProtectedRoute>} />
        <Route path="courier-exchange" element={<ProtectedRoute allowedRoles={['admin']}><CourierExchange /></ProtectedRoute>} />

        {/* User Routes */}
        <Route path="pickup" element={<ProtectedRoute allowedRoles={['admin', 'user']}><Pickup /></ProtectedRoute>} />
        <Route path="delivery" element={<ProtectedRoute allowedRoles={['admin', 'user']}><Delivery /></ProtectedRoute>} />
        <Route path="today-activity" element={<ProtectedRoute allowedRoles={['admin', 'user']}><TodayActivity /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/Layout';
import { Suspense, lazy } from 'react';

// Lazy loaded pages for better performance
const Login = lazy(() => import('./pages/Login').then(module => ({ default: module.Login })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const Companies = lazy(() => import('./pages/admin/Companies').then(module => ({ default: module.Companies })));
const Shops = lazy(() => import('./pages/admin/Shops').then(module => ({ default: module.Shops })));
const DaySheet = lazy(() => import('./pages/admin/DaySheet').then(module => ({ default: module.DaySheet })));
const UserManagement = lazy(() => import('./pages/admin/UserManagement').then(module => ({ default: module.UserManagement })));
const Reports = lazy(() => import('./pages/admin/Reports').then(module => ({ default: module.Reports })));
const Billing = lazy(() => import('./pages/admin/Billing').then(module => ({ default: module.Billing })));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard').then(module => ({ default: module.UserDashboard })));
const Pickup = lazy(() => import('./pages/user/Pickup').then(module => ({ default: module.Pickup })));
const Delivery = lazy(() => import('./pages/user/Delivery').then(module => ({ default: module.Delivery })));
const TodayActivity = lazy(() => import('./pages/user/TodayActivity').then(module => ({ default: module.TodayActivity })));
const Profile = lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const VoucherEntry = lazy(() => import('./pages/VoucherEntry').then(module => ({ default: module.VoucherEntry })));
const VoucherAdmin = lazy(() => import('./pages/admin/VoucherAdmin').then(module => ({ default: module.VoucherAdmin })));
const Dispatch = lazy(() => import('./pages/admin/Dispatch').then(module => ({ default: module.Dispatch })));
const Reconciliation = lazy(() => import('./pages/admin/Reconciliation').then(module => ({ default: module.Reconciliation })));
const CourierExchange = lazy(() => import('./pages/admin/CourierExchange').then(module => ({ default: module.CourierExchange })));
const RouteSetup = lazy(() => import('./pages/admin/RouteSetup').then(module => ({ default: module.RouteSetup })));
const RoutePrintList = lazy(() => import('./pages/admin/RoutePrintList').then(module => ({ default: module.RoutePrintList })));

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
  const { profile, isMasterAdmin, loading } = useAuth();

  // Loading fallback for lazy loaded components
  const SuspenseFallback = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/entry" element={<VoucherEntry />} />
        

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* Common Routes */}
          <Route index element={
            loading ? (
              <SuspenseFallback />
            ) : profile?.role === 'admin' ? <AdminDashboard /> : <UserDashboard />
          } />
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
          <Route path="routes" element={<ProtectedRoute allowedRoles={['admin']}><RouteSetup /></ProtectedRoute>} />
          <Route path="route-print" element={<ProtectedRoute allowedRoles={['admin']}><RoutePrintList /></ProtectedRoute>} />

          {/* User Routes */}
          <Route path="pickup" element={<ProtectedRoute allowedRoles={['admin', 'user']}><Pickup /></ProtectedRoute>} />
          <Route path="delivery" element={<ProtectedRoute allowedRoles={['admin', 'user']}><Delivery /></ProtectedRoute>} />
          <Route path="today-activity" element={<ProtectedRoute allowedRoles={['admin', 'user']}><TodayActivity /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

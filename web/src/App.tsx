import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth, AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import CheckInPage from './pages/CheckInPage';
import DashboardPage from './pages/DashboardPage';
import MenuPage from './pages/MenuPage';
import UsersPage from './pages/UsersPage';
import WalletPage from './pages/WalletPage';
import HostelsPage from './pages/HostelsPage';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

function NotAuthorized() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, background:'#0f172a', color:'#f1f5f9' }}>
      <div style={{ fontSize: 64 }}>🚫</div>
      <h2>Not Authorized</h2>
      <p style={{ color:'#64748b' }}>Your role doesn&apos;t have access to this page.</p>
    </div>
  );
}

function IndexRedirect() {
  const { user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/users" replace />;
  }
  return <Navigate to="/checkin" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/not-authorized" element={<NotAuthorized />} />

            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<IndexRedirect />} />
              <Route path="/checkin" element={
                <ProtectedRoute allowedRoles={['COUNTER_STAFF','MESS_COMMITTEE','WARDEN_ADMIN']}>
                  <CheckInPage />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['MESS_COMMITTEE','WARDEN_ADMIN']}>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/menu" element={
                <ProtectedRoute allowedRoles={['MESS_COMMITTEE','WARDEN_ADMIN']}>
                  <MenuPage />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute allowedRoles={['WARDEN_ADMIN','SUPER_ADMIN']}>
                  <UsersPage />
                </ProtectedRoute>
              } />
              <Route path="/wallet" element={
                <ProtectedRoute allowedRoles={['WARDEN_ADMIN']}>
                  <WalletPage />
                </ProtectedRoute>
              } />
              <Route path="/hostels" element={
                <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                  <HostelsPage />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<IndexRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

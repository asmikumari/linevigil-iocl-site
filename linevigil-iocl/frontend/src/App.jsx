import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ContractorDashboard from './pages/ContractorDashboard';
import ContractorRequests from './pages/ContractorRequests';
import ContractorMap from './pages/ContractorMap';
import ContractorNotifications from './pages/ContractorNotifications';
import ContractorMessages from './pages/ContractorMessages';
import ContractorProfile from './pages/ContractorProfile';
import AdminDashboard from './pages/AdminDashboard';
import PatrolDashboard from './pages/PatrolDashboard';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-screen flex items-center justify-center font-black text-slate-300 uppercase tracking-widest animate-pulse">Loading LineVigil System...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
    console.warn(`Access denied. Role '${user.role}' not permitted. Redirecting to login.`);
    return <Navigate to="/login" />;
  }
  return children;
};

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'patrol') return <Navigate to="/patrol" />;
  if (user.role === 'contractor') return <Navigate to="/dashboard" />;
  console.warn(`Invalid user role detected: '${user?.role}'. Redirecting to login.`);
  return <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="w-full min-h-screen font-sans antialiased text-slate-900">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/new" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard/requests" element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorRequests />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/map" element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorMap />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/notifications" element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorNotifications />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/messages" element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorMessages />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/profile" element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorProfile />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/patrol" element={
              <ProtectedRoute allowedRoles={['patrol']}>
                <PatrolDashboard />
              </ProtectedRoute>
            } />
            <Route path="/patrol/*" element={
              <ProtectedRoute allowedRoles={['patrol']}>
                <PatrolDashboard />
              </ProtectedRoute>
            } />

            <Route path="/" element={<HomeRedirect />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

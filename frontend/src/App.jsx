import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LiveCallsPage from './pages/LiveCallsPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import CdrPage from './pages/CdrPage';
import RatesPage from './pages/RatesPage';
import FundsPage from './pages/FundsPage';
import SipPage from './pages/SipPage';
import AdminPage from './pages/AdminPage';
import TutorialsPage from './pages/TutorialsPage';

function PrivateRoute({ children, adminOnly }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="live" element={<LiveCallsPage />} />
        <Route path="cdr" element={<CdrPage />} />
        <Route path="rates" element={<RatesPage />} />
        <Route path="funds" element={<FundsPage />} />
        <Route path="sip" element={<SipPage />} />
        <Route path="tutorials" element={<TutorialsPage />} />
        <Route
          path="admin"
          element={
            <PrivateRoute adminOnly>
              <AdminPage />
            </PrivateRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

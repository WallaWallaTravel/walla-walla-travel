import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useComplianceSync } from '@/hooks/useComplianceSync';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Drivers from '@/pages/Drivers';
import Vehicles from '@/pages/Vehicles';
import Requirements from '@/pages/Requirements';
import SelfAudit from '@/pages/SelfAudit';
import Login from '@/pages/Login';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  // Enable real-time sync for compliance data
  useComplianceSync();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="drivers" element={<Drivers />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="requirements" element={<Requirements />} />
        <Route path="self-audit" element={<SelfAudit />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

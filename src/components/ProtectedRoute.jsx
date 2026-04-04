import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="flex-center" style={{ minHeight: '100vh' }}>Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirecionamento de segurança se o papel estiver errado
    if (profile.role === 'ALUNO') return <Navigate to="/aluno" replace />;
    if (profile.role === 'PROFESSOR') return <Navigate to="/professor" replace />;
    if (profile.role === 'ADMIN') return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas (serão criadas a seguir)
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardAluno from './pages/Dashboard';
import DashboardProfessor from './pages/ProfessorApp';
import DashboardAdmin from './pages/AdminApp';
import './index.css';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Rota Privada: Somente Alunos */}
      <Route element={<ProtectedRoute allowedRoles={['ALUNO']} />}>
        <Route path="/aluno" element={<DashboardAluno />} />
      </Route>

      {/* Rota Privada: Somente Professores */}
      <Route element={<ProtectedRoute allowedRoles={['PROFESSOR']} />}>
        <Route path="/professor" element={<DashboardProfessor />} />
      </Route>

      {/* Rota Privada: Somente Admins */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<DashboardAdmin />} />
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

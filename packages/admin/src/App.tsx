import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Questions from './pages/Questions';
import Exams from './pages/Exams';
import ExamEdit from './pages/ExamEdit';
import Monitor from './pages/Monitor';
import Reports from './pages/Reports';
import Grading from './pages/Grading';
import Users from './pages/Users';
import { useAuthStore } from './stores/auth';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="questions" element={<Questions />} />
        <Route path="exams" element={<Exams />} />
        <Route path="exams/:id/edit" element={<ExamEdit />} />
        <Route path="monitor" element={<Monitor />} />
        <Route path="reports" element={<Reports />} />
        <Route path="grading" element={<Grading />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  );
};

export default App;

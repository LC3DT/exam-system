import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ExamList from './pages/ExamList';
import ExamRoom from './pages/ExamRoom';
import { useAuthStore } from './stores/auth';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/exams" element={<ProtectedRoute><ExamList /></ProtectedRoute>} />
    <Route path="/exam/:examId" element={<ProtectedRoute><ExamRoom /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;

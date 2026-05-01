import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';

const Login = React.lazy(() => import('./pages/Login'));
const ExamList = React.lazy(() => import('./pages/ExamList'));
const ExamRoom = React.lazy(() => import('./pages/ExamRoom'));

const LoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
    <p style={{ color: '#999', fontSize: 14 }}>加载中...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
};

const App: React.FC = () => (
  <Routes>
    <Route path="/login" element={<Suspense fallback={<LoadingFallback />}><Login /></Suspense>} />
    <Route path="/exams" element={<ProtectedRoute><ExamList /></ProtectedRoute>} />
    <Route path="/exam/:examId" element={<ProtectedRoute><ExamRoom /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import { useAuthStore } from './stores/auth';

const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Questions = React.lazy(() => import('./pages/Questions'));
const Exams = React.lazy(() => import('./pages/Exams'));
const ExamEdit = React.lazy(() => import('./pages/ExamEdit'));
const Monitor = React.lazy(() => import('./pages/Monitor'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Grading = React.lazy(() => import('./pages/Grading'));
const Users = React.lazy(() => import('./pages/Users'));

const LoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
    <p style={{ color: '#999', fontSize: 14 }}>加载中...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={
        <Suspense fallback={<LoadingFallback />}><Login /></Suspense>
      } />
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

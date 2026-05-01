import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';

const Login: React.FC = () => {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      setAuth(res.data.accessToken, res.data.user);
      navigate('/exams');
    } catch {
      setError('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: 'linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%)' }}>
      <div style={{ width: 360, padding: 40, background: '#fff', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8, color: '#1a73e8' }}>在线考试系统</h2>
        <p style={{ textAlign: 'center', color: '#999', marginBottom: 32, fontSize: 14 }}>考生登录</p>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #d9d9d9', borderRadius: 8, fontSize: 15, outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" required style={{ width: '100%', padding: '12px 16px', border: '1px solid #d9d9d9', borderRadius: 8, fontSize: 15, outline: 'none' }} />
          </div>
          {error && <p style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', fontWeight: 600 }}>
            {loading ? '登录中...' : '进入考试'}
          </button>
        </form>
        <p style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 20 }}>提示: 测试账号 student / student123</p>
      </div>
    </div>
  );
};

export default Login;

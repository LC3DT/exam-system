import React from 'react';
import { Card, Form, Input, Button, message, Space, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      setAuth(res.data.accessToken, res.data.user);
      message.success('登录成功');
      navigate('/dashboard');
    } catch {
      message.error('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 420, padding: '40px 20px', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: 0 }}>在线考试系统</Title>
          <Text type="secondary">管理后台登录</Text>
        </Space>
        <Form onFinish={onFinish} size="large">
          <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>登 录</Button>
          </Form.Item>
        </Form>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', textAlign: 'center' }}>
          默认账号: admin / teacher / student | 密码同用户名+123
        </Text>
      </Card>
    </div>
  );
};

export default Login;

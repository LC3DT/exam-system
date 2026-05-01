import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  EyeOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../stores/auth';

const { Header, Sider, Content } = Layout;

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const menuItems = React.useMemo(() => [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/questions', icon: <QuestionCircleOutlined />, label: '题库管理' },
    { key: '/exams', icon: <FileTextOutlined />, label: '试卷管理' },
    { key: '/monitor', icon: <EyeOutlined />, label: '考场监控' },
    { key: '/grading', icon: <CheckCircleOutlined />, label: '阅卷管理' },
    { key: '/reports', icon: <BarChartOutlined />, label: '统计分析' },
    { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  ], []);

  const currentKey = '/' + location.pathname.split('/')[1];

  const handleLogout = React.useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const userMenu = React.useMemo(() => ({
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout }],
  }), [handleLogout]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={220}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: collapsed ? 16 : 18, fontWeight: 700, letterSpacing: 1 }}>
          {collapsed ? '考试' : '在线考试系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[currentKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? '展开菜单' : '折叠菜单'}
          />
          <Dropdown menu={userMenu}>
            <div
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Avatar icon={<UserOutlined />} />
              <span>{user?.realName || user?.username}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;

import React from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, message, Typography, Tag } from 'antd';
import { PlusOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;

const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '教师', value: 'teacher' },
  { label: '学生', value: 'student' },
];

const roleColorMap: Record<string, string> = { admin: 'red', teacher: 'blue', student: 'green' };

const Users: React.FC = () => {
  const [data, setData] = React.useState({ items: [], total: 0 });
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [form] = Form.useForm();
  const [query, setQuery] = React.useState({ page: 1, pageSize: 20 });

  const fetch = React.useCallback(async () => {
    setLoading(true);
    try { const res = await api.get('/users', { params: query }); setData(res.data); } finally { setLoading(false); }
  }, [query]);

  React.useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.put(`/users/${editing.id}`, values);
      message.success('更新成功');
    } else {
      await api.post('/users', values);
      message.success('创建成功');
    }
    setModalOpen(false); setEditing(null); form.resetFields(); fetch();
  };

  const handleResetPassword = React.useCallback(async (id: string) => {
    let newPwd = '';
    Modal.confirm({
      title: '重置密码',
      content: <Input.Password placeholder="新密码" onChange={(e) => { newPwd = e.target.value; }} />,
      onOk: async () => {
        await api.put(`/users/${id}/reset-password`, { password: newPwd || '123456' });
        message.success('密码已重置');
      },
    });
  }, []);

  const handlePagination = React.useCallback((p: number, ps: number) => {
    setQuery({ page: p, pageSize: ps });
  }, []);

  const openCreate = React.useCallback(() => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }, [form]);

  const openEdit = React.useCallback((record: any) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  }, [form]);

  const columns = React.useMemo(() => [
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'realName' },
    { title: '角色', dataIndex: 'role', render: (v: string) => <Tag color={roleColorMap[v]}>{roleOptions.find((r) => r.value === v)?.label}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', render: (v: string) => new Date(v).toLocaleString() },
    {
      title: '操作', width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Button size="small" icon={<LockOutlined />} onClick={() => handleResetPassword(record.id)}>重置密码</Button>
        </Space>
      ),
    },
  ], [openEdit, handleResetPassword]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>用户管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加用户</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data.items} loading={loading}
        pagination={{ total: data.total, current: query.page, pageSize: query.pageSize, onChange: handlePagination }} />
      <Modal title={editing ? '编辑用户' : '添加用户'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input disabled={!!editing} /></Form.Item>
          <Form.Item name="realName" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          {!editing && <Form.Item name="password" label="密码" rules={[{ required: true }]}><Input.Password /></Form.Item>}
          <Form.Item name="role" label="角色" rules={[{ required: true }]}><Select options={roleOptions} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;

import React from 'react';
import { Table, Button, Space, Modal, Form, Input, Select, InputNumber, Tag, message, Popconfirm, Typography, Upload } from 'antd';
import { PlusOutlined, UploadOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;
const { TextArea } = Input;

const typeOptions = [
  { label: '单选题', value: 'single' },
  { label: '多选题', value: 'multiple' },
  { label: '判断题', value: 'judge' },
  { label: '填空题', value: 'fill' },
  { label: '主观题', value: 'essay' },
];

const TypeTag: React.FC<{ type: string }> = React.memo(({ type }) => (
  <Tag>{typeOptions.find((t) => t.value === type)?.label || type}</Tag>
));

const Questions: React.FC = () => {
  const [data, setData] = React.useState({ items: [], total: 0 });
  const [loading, setLoading] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any>(null);
  const [form] = Form.useForm();
  const [query, setQuery] = React.useState<{ page: number; pageSize: number; type?: string; knowledgePoint?: string }>({ page: 1, pageSize: 20 });

  const fetchData = React.useCallback(async (q = query) => {
    setLoading(true);
    try {
      const res = await api.get('/questions', { params: q });
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [query]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.put(`/questions/${editing.id}`, values);
      message.success('更新成功');
    } else {
      await api.post('/questions', values);
      message.success('创建成功');
    }
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/questions/${id}`);
    message.success('已删除');
    fetchData();
  };

  const openCreate = React.useCallback(() => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ type: 'single', difficulty: 0.5, estimatedTime: 60 });
    setModalOpen(true);
  }, [form]);

  const openEdit = React.useCallback((record: any) => {
    setEditing(record);
    setModalOpen(true);
    setTimeout(() => form.setFieldsValue(record), 100);
  }, [form]);

  const handleTypeFilter = React.useCallback((v: string | undefined) => {
    setQuery((prev) => ({ ...prev, page: 1, type: v }));
  }, []);

  const handleKnowledgeFilter = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    setQuery((prev) => ({ ...prev, page: 1, knowledgePoint: (e.target as HTMLInputElement).value }));
  }, []);

  const handlePagination = React.useCallback((p: number, ps: number) => {
    setQuery((prev) => ({ ...prev, page: p, pageSize: ps }));
  }, []);

  const columns = React.useMemo(() => [
    { title: '类型', dataIndex: 'type', width: 80, render: (_: string, record: any) => <TypeTag type={record.type} /> },
    { title: '题目内容', dataIndex: 'content', render: (v: any) => (typeof v === 'string' ? v : v?.text || '').slice(0, 60) + ((typeof v === 'string' ? v : v?.text || '').length > 60 ? '...' : '') },
    { title: '知识点', dataIndex: 'knowledgePoint', width: 120 },
    { title: '难度', dataIndex: 'difficulty', width: 80 },
    { title: '预计用时(s)', dataIndex: 'estimatedTime', width: 100 },
    { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => <Tag color={v === 'published' ? 'green' : 'red'}>{v === 'published' ? '已发布' : '已删除'}</Tag> },
    {
      title: '操作', width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], [openEdit]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>题库管理</Title>
        <Space>
          <Upload accept=".xlsx,.xls" showUploadList={false} customRequest={async (opt: any) => { const fd = new FormData(); fd.append('file', opt.file); await api.post('/questions/import', fd); message.success('导入完成'); fetchData(); }}>
            <Button icon={<UploadOutlined />}>导入Excel</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加题目</Button>
        </Space>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select placeholder="题型" allowClear style={{ width: 120 }} options={typeOptions} onChange={handleTypeFilter} />
          <Input placeholder="知识点搜索" style={{ width: 200 }} onPressEnter={handleKnowledgeFilter} allowClear />
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={data.items} loading={loading}
        pagination={{ total: data.total, current: query.page, pageSize: query.pageSize, showTotal: (t) => `共 ${t} 题`, onChange: handlePagination }} />

      <Modal title={editing ? '编辑题目' : '添加题目'} open={modalOpen} onOk={handleSave} onCancel={() => { setModalOpen(false); setEditing(null); }} width={720} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="题型" rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="content" label="题目内容" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder='JSON格式如: {"text":"题目描述"}。支持 **粗体**、`代码`、$公式$、$$LaTeX$$、<html>标签</html>' />
          </Form.Item>
          <Form.Item name="options" label="选项">
            <TextArea rows={3} placeholder='JSON格式如: [{"label":"A","content":"选项内容"}]' />
          </Form.Item>
          <Form.Item name="answer" label="答案" rules={[{ required: true }]}>
            <TextArea rows={2} placeholder='JSON格式如: {"correct":"A"} 或多选 {"correct":["A","B"]}' />
          </Form.Item>
          <Space size="large">
            <Form.Item name="knowledgePoint" label="知识点" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="difficulty" label="难度 (0.1-1.0)" rules={[{ required: true }]}>
              <InputNumber min={0.1} max={1} step={0.1} />
            </Form.Item>
            <Form.Item name="estimatedTime" label="预计用时(秒)">
              <InputNumber min={10} max={3600} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default Questions;

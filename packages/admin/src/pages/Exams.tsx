import React from 'react';
import { Table, Button, Space, Tag, message, Typography, Modal } from 'antd';
import { PlusOutlined, EyeOutlined, EditOutlined, SendOutlined, PlayCircleOutlined, StopOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const { Title } = Typography;

const statusMap: Record<string, { color: string; text: string }> = {
  draft: { color: 'default', text: '草稿' },
  published: { color: 'blue', text: '已发布' },
  ongoing: { color: 'green', text: '进行中' },
  finished: { color: 'gray', text: '已结束' },
};

const Exams: React.FC = () => {
  const [data, setData] = React.useState({ items: [], total: 0 });
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const [query, setQuery] = React.useState({ page: 1, pageSize: 20 });

  const fetch = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/exams', { params: query });
      setData(res.data);
    } finally { setLoading(false); }
  }, [query]);

  React.useEffect(() => { fetch(); }, [fetch]);

  const handlePublish = React.useCallback(async (id: string) => {
    await api.post(`/exams/${id}/publish`);
    message.success('已发布');
    fetch();
  }, [fetch]);

  const handleStart = React.useCallback(async (id: string) => {
    await api.post(`/exams/${id}/start`);
    message.success('已开考，考生可以进入答题');
    fetch();
  }, [fetch]);

  const handleFinish = React.useCallback((id: string) => {
    Modal.confirm({
      title: '确认结束考试',
      content: '结束后考生将无法继续答题，确定吗？',
      onOk: async () => {
        await api.post(`/exams/${id}/finish`);
        message.success('考试已结束');
        fetch();
      },
    });
  }, [fetch]);

  const handlePagination = React.useCallback((p: number, ps: number) => {
    setQuery({ page: p, pageSize: ps });
  }, []);

  const columns = React.useMemo(() => [
    { title: '试卷名称', dataIndex: 'title' },
    { title: '总分', dataIndex: 'totalScore', width: 80 },
    { title: '时长(分钟)', dataIndex: 'durationMinutes', width: 100 },
    { title: '组卷模式', dataIndex: 'paperMode', width: 100, render: (v: string) => v === 'fixed' ? '固定' : '随机' },
    { title: '状态', dataIndex: 'status', width: 100, render: (v: string) => {
      const s = statusMap[v] || { color: 'default', text: v };
      return <Tag color={s.color}>{s.text}</Tag>;
    }},
    { title: '开始时间', dataIndex: 'startTime', width: 180, render: (v: string) => new Date(v).toLocaleString() },
    {
      title: '操作', width: 280,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/exams/${record.id}/edit`)}>查看</Button>
          {record.status === 'draft' && (
            <>
              <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/exams/${record.id}/edit`)}>编辑</Button>
              <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handlePublish(record.id)}>发布</Button>
            </>
          )}
          {record.status === 'published' && (
            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStart(record.id)}>开考</Button>
          )}
          {record.status === 'ongoing' && (
            <>
              <Button size="small" icon={<PlayCircleOutlined />} onClick={() => handleStart(record.id)}>继续开考</Button>
              <Button size="small" danger icon={<StopOutlined />} onClick={() => handleFinish(record.id)}>结束</Button>
            </>
          )}
          {record.status === 'finished' && (
            <Button size="small" icon={<BarChartOutlined />} onClick={() => navigate('/reports')}>查看报告</Button>
          )}
        </Space>
      ),
    },
  ], [navigate, handlePublish, handleStart, handleFinish]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>试卷管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/exams/new/edit')}>创建试卷</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data.items} loading={loading}
        pagination={{ total: data.total, current: query.page, pageSize: query.pageSize, onChange: handlePagination }} />
    </div>
  );
};

export default Exams;

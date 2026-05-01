import React from 'react';
import { Card, Table, Tag, Button, Select, Row, Col, Statistic, message, Typography } from 'antd';
import { StopOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;

const violationColumns = [
  { title: '考生', dataIndex: ['student', 'realName'] },
  { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="red">{v}</Tag> },
  { title: '描述', dataIndex: 'description' },
  { title: '时间', dataIndex: 'detectedAt', render: (v: string) => new Date(v).toLocaleTimeString() },
];

const Monitor: React.FC = () => {
  const [exams, setExams] = React.useState<any[]>([]);
  const [selectedExam, setSelectedExam] = React.useState<string | null>(null);
  const [liveData, setLiveData] = React.useState<any>(null);

  React.useEffect(() => {
    api.get('/exams', { params: { status: 'ongoing' } }).then((res) => setExams(res.data.items)).catch((err) => console.error('Failed to load exams:', err));
  }, []);

  React.useEffect(() => {
    if (!selectedExam) return;
    const fetchStatus = async () => {
      try {
        const res = await api.get(`/sessions/${selectedExam}/live`);
        setLiveData(res.data);
      } catch (err) {
        console.error('Polling error:', err);
      }
    };
    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => clearInterval(timer);
  }, [selectedExam]);

  const handleTerminate = React.useCallback(async (sessionId: string) => {
    try {
      await api.post(`/sessions/${sessionId}/terminate`, { reason: '管理员强制收卷' });
      message.success('已强制收卷');
    } catch (err) {
      console.error('Terminate failed:', err);
      message.error('操作失败');
    }
  }, []);

  return (
    <div>
      <Title level={4}>考场监控</Title>
      <div style={{ marginBottom: 16 }}>
        <Select placeholder="选择进行中的考试" style={{ width: 300 }} options={exams.map((e) => ({ label: e.title, value: e.id }))} value={selectedExam} onChange={setSelectedExam} />
      </div>

      {liveData && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}><Card><Statistic title="在线考生" value={liveData.onlineCount} valueStyle={{ color: '#1677ff' }} /></Card></Col>
            <Col span={6}><Card><Statistic title="已交卷" value={liveData.submittedCount} valueStyle={{ color: '#52c41a' }} /></Card></Col>
            <Col span={6}><Card><Statistic title="已终止" value={liveData.terminatedCount} valueStyle={{ color: '#ff4d4f' }} /></Card></Col>
            <Col span={6}><Card><Statistic title="总人数" value={liveData.total} /></Card></Col>
          </Row>

          <Card title="违规记录" style={{ marginBottom: 16 }}>
            {liveData.recentViolations?.length > 0 ? (
              <Table rowKey="id" dataSource={liveData.recentViolations} columns={[
                ...violationColumns,
                { title: '操作', render: (_: any, record: any) => (
                  <Button size="small" danger icon={<StopOutlined />} onClick={() => handleTerminate(record.id)}>强制收卷</Button>
                )},
              ]} size="small" />
            ) : <span style={{ color: '#999' }}>暂无违规记录</span>}
          </Card>
        </>
      )}
    </div>
  );
};

export default Monitor;

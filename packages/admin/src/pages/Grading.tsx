import React from 'react';
import { Card, Form, Select, Button, Table, Input, InputNumber, message, Space, Typography, Tag } from 'antd';
import api from '../api/client';

const { Title } = Typography;

const Grading: React.FC = () => {
  const [exams, setExams] = React.useState<any[]>([]);
  const [selectedExam, setSelectedExam] = React.useState<string | null>(null);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    api.get('/exams').then((res) => setExams(res.data.items));
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/grading/tasks');
      setTasks(res.data);
    } finally { setLoading(false); }
  };

  const handleGrade = async (taskId: string, values: { score: number; comment?: string }) => {
    await api.post(`/grading/tasks/${taskId}/grade`, values);
    message.success('评分成功');
    fetchTasks();
  };

  return (
    <div>
      <Title level={4}>阅卷管理</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title="我的阅卷任务">
          <Table rowKey="id" dataSource={tasks} loading={loading} columns={[
            { title: '任务ID', dataIndex: 'id', width: 120, render: (v: string) => v.slice(0, 8) },
            { title: '考试', dataIndex: 'examId', width: 120, render: (v: string) => v.slice(0, 8) },
            { title: '状态', dataIndex: 'status', width: 80, render: (v: string) => v === 'pending' ? <Tag color="blue">待批阅</Tag> : <Tag color="green">已完成</Tag> },
            {
              title: '操作', render: (_: any, record: any) => (
                record.status === 'pending' ? (
                  <EditableGradeCell onGrade={(values: any) => handleGrade(record.id, values)} />
                ) : <span>{record.score}分</span>
              ),
            },
          ]} size="small" />
        </Card>
      </Space>
    </div>
  );
};

const EditableGradeCell: React.FC<{ onGrade: (v: any) => void }> = ({ onGrade }) => {
  const [score, setScore] = React.useState<number>(0);
  const [comment, setComment] = React.useState('');
  return (
    <Space>
      <InputNumber size="small" value={score} onChange={(v) => setScore(v || 0)} min={0} max={100} style={{ width: 70 }} placeholder="分数" />
      <Input size="small" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="评语" style={{ width: 150 }} />
      <Button size="small" type="primary" onClick={() => onGrade({ score, comment })}>提交</Button>
    </Space>
  );
};

export default Grading;

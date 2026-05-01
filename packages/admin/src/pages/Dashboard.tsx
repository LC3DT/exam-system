import React from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import { TeamOutlined, FileTextOutlined, CheckCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import api from '../api/client';

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [stats, setStats] = React.useState({ questions: 0, exams: 0, students: 0 });

  React.useEffect(() => {
    Promise.all([
      api.get('/questions', { params: { pageSize: 1 } }),
      api.get('/exams', { params: { pageSize: 1 } }),
      api.get('/users', { params: { role: 'student', pageSize: 1 } }),
    ]).then(([q, e, u]) => {
      setStats({ questions: q.data.total, exams: e.data.total, students: u.data.total });
    });
  }, []);

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>仪表盘</Title>
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="题库总量" value={stats.questions} prefix={<QuestionCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="试卷数量" value={stats.exams} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="考生人数" value={stats.students} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="系统运行" value="正常" prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

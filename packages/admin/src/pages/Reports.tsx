import React from 'react';
import { Card, Select, Statistic, Row, Col, Table, Tag, Typography } from 'antd';
import api from '../api/client';

const { Title } = Typography;

const questionColumns = [
  { title: '题目ID', dataIndex: 'id', width: 120, render: (v: string) => v.slice(0, 8) },
  { title: '题型', dataIndex: 'type', width: 80 },
  { title: '知识点', dataIndex: 'knowledgePoint' },
  { title: '难度', dataIndex: 'difficulty', width: 80 },
  { title: '正确率', dataIndex: 'correctRate', width: 100, render: (v: number) => `${(v * 100).toFixed(0)}%` },
  { title: '异常', dataIndex: 'isAnomalous', width: 80, render: (v: boolean) => v ? <Tag color="red">异常</Tag> : <Tag color="green">正常</Tag> },
];

const Reports: React.FC = () => {
  const [exams, setExams] = React.useState<any[]>([]);
  const [selectedExam, setSelectedExam] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<any>(null);
  const [questionAnalysis, setQuestionAnalysis] = React.useState<any[]>([]);

  React.useEffect(() => {
    api.get('/exams', { params: { status: 'finished' } }).then((res) => setExams(res.data.items)).catch((err) => console.error('Failed to load exams:', err));
  }, []);

  React.useEffect(() => {
    if (!selectedExam) return;
    Promise.all([
      api.get(`/reports/exam/${selectedExam}`),
      api.get(`/reports/exam/${selectedExam}/questions`),
    ]).then(([r, q]) => {
      setReport(r.data);
      setQuestionAnalysis(q.data);
    }).catch((err) => console.error('Failed to load report:', err));
  }, [selectedExam]);

  return (
    <div>
      <Title level={4}>统计分析</Title>
      <div style={{ marginBottom: 16 }}>
        <Select placeholder="选择已结束的考试" style={{ width: 300 }} options={exams.map((e) => ({ label: e.title, value: e.id }))} value={selectedExam} onChange={setSelectedExam} />
      </div>

      {report && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={4}><Card><Statistic title="最高分" value={report.highest} valueStyle={{ color: '#52c41a' }} suffix={`/ ${report.totalScore}`} /></Card></Col>
            <Col span={4}><Card><Statistic title="最低分" value={report.lowest} valueStyle={{ color: '#ff4d4f' }} suffix={`/ ${report.totalScore}`} /></Card></Col>
            <Col span={4}><Card><Statistic title="平均分" value={report.average} /></Card></Col>
            <Col span={4}><Card><Statistic title="及格率" value={report.passRate} suffix="%" /></Card></Col>
            <Col span={4}><Card><Statistic title="参考人数" value={report.totalStudents} /></Card></Col>
            <Col span={4}><Card><Statistic title="满分" value={report.totalScore} /></Card></Col>
          </Row>

          <Card title="试题分析" style={{ marginBottom: 16 }}>
            <Table rowKey="id" dataSource={questionAnalysis} columns={questionColumns} size="small" />
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;

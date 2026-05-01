import React from 'react';
import { Card, Form, Input, InputNumber, Select, Button, Space, DatePicker, Switch, message, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import dayjs from 'dayjs';

const { Title } = Typography;

const ExamEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);
  const [sections, setSections] = React.useState<any[]>([]);
  const isNew = !id || id === 'new';

  React.useEffect(() => {
    if (!isNew) {
      api.get(`/exams/${id}`).then((res) => {
        const exam = res.data;
        form.setFieldsValue({
          ...exam,
          startTime: dayjs(exam.startTime),
          endTime: dayjs(exam.endTime),
        });
        setSections(exam.sections || []);
      });
    }
  }, [id]);

  const addSection = () => {
    setSections([...sections, { name: '', scorePerQuestion: 5, fixedQuestionIds: [], randomStrategies: [] }]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: string, value: any) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      startTime: values.startTime.toISOString(),
      endTime: values.endTime.toISOString(),
      sections,
    };

    setLoading(true);
    try {
      if (isNew) {
        await api.post('/exams', payload);
        message.success('创建成功');
      } else {
        await api.put(`/exams/${id}`, payload);
        message.success('保存成功');
      }
      navigate('/exams');
    } catch {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    await handleSave();
    if (id) {
      await api.post(`/exams/${id}/publish`);
      message.success('已发布');
      navigate('/exams');
    }
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>{isNew ? '创建试卷' : '编辑试卷'}</Title>
      <Form form={form} layout="vertical" initialValues={{ paperMode: 'fixed', shuffleOptions: false, shuffleQuestions: false }}>
        <Space size="large" style={{ width: '100%' }}>
          <Form.Item name="title" label="试卷名称" rules={[{ required: true }]}>
            <Input style={{ width: 300 }} />
          </Form.Item>
          <Form.Item name="totalScore" label="总分" rules={[{ required: true }]}>
            <InputNumber min={1} max={1000} />
          </Form.Item>
          <Form.Item name="durationMinutes" label="时长(分钟)" rules={[{ required: true }]}>
            <InputNumber min={1} max={600} />
          </Form.Item>
        </Space>
        <Space size="large">
          <Form.Item name="paperMode" label="组卷模式">
            <Select options={[{ label: '固定组卷', value: 'fixed' }, { label: '随机组卷', value: 'random' }]} />
          </Form.Item>
          <Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" />
          </Form.Item>
          <Form.Item name="endTime" label="结束时间" rules={[{ required: true }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm" />
          </Form.Item>
          <Form.Item name="shuffleQuestions" label="题目乱序" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="shuffleOptions" label="选项乱序" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Space>
      </Form>

      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0 }}>大题设置</Title>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addSection}>新增大题</Button>
        </div>
        {sections.map((section, i) => (
          <Card key={i} size="small" style={{ marginBottom: 12 }} title={`大题 ${i + 1}`} extra={<Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeSection(i)} />}>
            <Space>
              <Input placeholder="大题名称" value={section.name} onChange={(e) => updateSection(i, 'name', e.target.value)} style={{ width: 200 }} />
              <span>每题分数:</span>
              <InputNumber value={section.scorePerQuestion} onChange={(v) => updateSection(i, 'scorePerQuestion', v)} min={1} />
              <Input placeholder="题目ID(逗号分隔)" value={(section.fixedQuestionIds || []).join(',')} onChange={(e) => updateSection(i, 'fixedQuestionIds', e.target.value.split(',').filter(Boolean))} style={{ width: 300 }} />
            </Space>
          </Card>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={loading}>保存草稿</Button>
          <Button icon={<SendOutlined />} onClick={handlePublish} loading={loading}>保存并发布</Button>
          <Button onClick={() => navigate('/exams')}>取消</Button>
        </Space>
      </div>
    </div>
  );
};

export default ExamEdit;

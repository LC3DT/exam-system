import React from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

interface ExamInfo {
  id: string;
  title: string;
  totalScore: number;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  paperMode: string;
  status: string;
}

const ExamList: React.FC = () => {
  const navigate = useNavigate();
  const [exams, setExams] = React.useState<ExamInfo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/exams');
        const available = (res.data.items || []).filter(
          (e: ExamInfo) => e.status === 'published' || e.status === 'ongoing',
        );
        setExams(available);
      } catch (err) {
        console.error('Failed to load exams:', err);
        setError('加载考试列表失败，请刷新重试');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f2f5' }}>
        <p style={{ fontSize: 16, color: '#999' }}>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f2f5', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 16, color: '#ff4d4f' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: '#f0f2f5', padding: '40px 20px' }}>
      <h2 style={{ textAlign: 'center', color: '#1a73e8', marginBottom: 32 }}>可用考试</h2>
      {exams.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', marginTop: 60 }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📋</p>
          <p style={{ fontSize: 16 }}>暂无可参加的考试</p>
        </div>
      ) : (
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {exams.map((exam) => (
            <div
              key={exam.id}
              onClick={() => navigate(`/exam/${exam.id}`)}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: '20px 24px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => { (e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,115,232,0.15)'); (e.currentTarget.style.transform = 'translateY(-2px)'); }}
              onMouseLeave={(e) => { (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'); (e.currentTarget.style.transform = 'none'); }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, color: '#333' }}>{exam.title}</h3>
                <div style={{ marginTop: 8, fontSize: 13, color: '#999' }}>
                  总分 {exam.totalScore} 分 · 时长 {exam.durationMinutes} 分钟 · {exam.paperMode === 'fixed' ? '固定组卷' : '随机组卷'}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: '#bbb' }}>
                  {new Date(exam.startTime).toLocaleString()} ~ {new Date(exam.endTime).toLocaleString()}
                </div>
              </div>
              <div style={{
                background: exam.status === 'ongoing' ? '#e8f5e9' : '#e3f2fd',
                color: exam.status === 'ongoing' ? '#2e7d32' : '#1565c0',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
              }}>
                {exam.status === 'ongoing' ? '进行中' : '可参加'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExamList;

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';

interface Question {
  questionId: string;
  order: number;
  type: string;
  content: any;
  options?: any[];
  answer?: any;
}

const ExamRoom: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = React.useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [submitted, setSubmitted] = React.useState(false);
  const [warning, setWarning] = React.useState('');
  const [finalScore, setFinalScore] = React.useState<{ score: number; total: number } | null>(null);

  React.useEffect(() => {
    enterExam();
  }, [examId]);

  React.useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const enterExam = async () => {
    try {
      const instanceRes = await api.post(`/exams/${examId}/enter`);
      const instance = instanceRes.data;
      const questions = instance.questions;
      const sessionRes = await api.post(`/sessions/${examId}/start`);

      setQuestions(questions);
      setSessionId(sessionRes.data.id);
      setTimeLeft(instance.durationMinutes * 60 || 3600);
    } catch (err: any) {
      setWarning(err.response?.data?.message || '进入考试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (sessionId) {
      api.post(`/sessions/${sessionId}/answer`, { questionId, answer: { correct: value }, markedForReview: markedForReview.has(questionId) }).catch(() => {});
    }
  };

  const handleMark = (questionId: string) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!sessionId || submitted) return;
    setSubmitted(true);
    try {
      const res = await api.post(`/sessions/${sessionId}/submit`);
      setFinalScore({ score: res.data.score, total: res.data.total });
    } catch {
      setFinalScore({ score: 0, total: 100 });
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f2f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <p style={{ fontSize: 18, color: '#666' }}>正在加载试卷...</p>
        </div>
      </div>
    );
  }

  if (warning) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#fff' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 24, color: '#ff4d4f', marginBottom: 16 }}>{warning}</p>
          <button onClick={() => navigate('/login')} style={{ padding: '10px 30px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 15 }}>返回登录</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const pct = finalScore ? Math.round((finalScore.score / finalScore.total) * 100) : 0;
    const passed = pct >= 60;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f0f2f5' }}>
        <div style={{ textAlign: 'center', background: '#fff', padding: '48px 60px', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>{passed ? '🎉' : '📝'}</div>
          <p style={{ fontSize: 24, fontWeight: 700, color: passed ? '#52c41a' : '#faad14', marginBottom: 4 }}>
            {passed ? '交卷成功' : '已交卷'}
          </p>
          {finalScore && (
            <>
              <div style={{ fontSize: 40, fontWeight: 700, color: passed ? '#52c41a' : '#ff4d4f', margin: '16px 0' }}>
                {finalScore.score} <span style={{ fontSize: 20, color: '#999', fontWeight: 400 }}>/ {finalScore.total}</span>
              </div>
              <div style={{ width: 200, height: 8, background: '#f0f0f0', borderRadius: 4, margin: '0 auto 16px' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: passed ? '#52c41a' : '#faad14', borderRadius: 4 }} />
              </div>
              <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
                正确率 {pct}% · {pct >= 60 ? '及格' : '未及格'}
              </p>
            </>
          )}
          <button onClick={() => navigate('/exams')} style={{ padding: '10px 40px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 600 }}>
            返回考试列表
          </button>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isTimeWarning = timeLeft < 300;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>
      {/* 水印覆盖层 */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden', opacity: 0.04 }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} style={{ position: 'absolute', top: `${(i % 5) * 25}%`, left: `${(i % 5) * 25 - 5}%`, transform: 'rotate(-25deg)', fontSize: 22, fontWeight: 700, color: '#000', whiteSpace: 'nowrap' }}>
            {user?.realName || user?.username || 'candidate'} · {user?.id?.slice(0, 8) || ''}
          </div>
        ))}
      </div>

      {/* 顶部倒计时栏 */}
      <div style={{ background: isTimeWarning ? '#ff4d4f' : '#1a73e8', color: '#fff', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>在线考试</div>
        <div style={{ fontSize: isTimeWarning ? 28 : 22, fontWeight: 700, fontFamily: 'monospace' }}>{formatTime(timeLeft)}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>进度 {progressPct}%</span>
          <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3 }}>
            <div style={{ width: `${progressPct}%`, height: '100%', background: '#fff', borderRadius: 3 }} />
          </div>
          <button onClick={handleSubmit} style={{ padding: '6px 20px', background: isTimeWarning ? '#fff' : 'rgba(255,255,255,0.2)', color: isTimeWarning ? '#ff4d4f' : '#fff', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14, marginLeft: 12 }}>
            交 卷
          </button>
        </div>
      </div>

      {/* 中部答题区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 主答题区 */}
        <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
          {current && (
            <div>
              <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span style={{ background: '#1a73e8', color: '#fff', padding: '2px 10px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>第 {currentIndex + 1} 题</span>
                <span style={{ color: '#999', fontSize: 13 }}>{current.type === 'single' ? '单选题' : current.type === 'multiple' ? '多选题' : current.type === 'judge' ? '判断题' : current.type === 'fill' ? '填空题' : '问答题'}</span>
              </div>

              <div style={{ fontSize: 16, lineHeight: 1.8, marginBottom: 24, color: '#333' }}>
                {typeof current.content === 'string' ? current.content : current.content?.text || ''}
              </div>

              {/* 选项区域 */}
              {['single', 'multiple'].includes(current.type) && current.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(Array.isArray(current.options) ? current.options : []).map((opt: any, i: number) => {
                    const selected = current.type === 'multiple'
                      ? (Array.isArray(answers[current.questionId]) && answers[current.questionId].includes(opt.label))
                      : answers[current.questionId] === opt.label;
                    return (
                      <div key={opt.label}
                        onClick={() => {
                          if (current.type === 'multiple') {
                            const prev = Array.isArray(answers[current.questionId]) ? answers[current.questionId] : [];
                            const next = prev.includes(opt.label) ? prev.filter((v: string) => v !== opt.label) : [...prev, opt.label];
                            handleAnswer(current.questionId, next);
                          } else {
                            handleAnswer(current.questionId, opt.label);
                          }
                        }}
                        style={{ padding: '14px 20px', border: `2px solid ${selected ? '#1a73e8' : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer', background: selected ? '#e8f0fe' : '#fff', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.2s', fontSize: 15 }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: selected ? '#1a73e8' : '#f0f0f0', color: selected ? '#fff' : '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0, fontSize: 13 }}>{opt.label}</span>
                        <span>{opt.content}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 判断题 */}
              {current.type === 'judge' && (
                <div style={{ display: 'flex', gap: 20 }}>
                  {['true', 'false'].map((v) => (
                    <div key={v}
                      onClick={() => handleAnswer(current.questionId, v === 'true')}
                      style={{ flex: 1, padding: '20px', border: `2px solid ${answers[current.questionId] === (v === 'true') ? '#1a73e8' : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer', background: answers[current.questionId] === (v === 'true') ? '#e8f0fe' : '#fff', textAlign: 'center', fontSize: 18, fontWeight: 600, transition: 'all 0.2s' }}>
                      {v === 'true' ? '✓ 正确' : '✗ 错误'}
                    </div>
                  ))}
                </div>
              )}

              {/* 填空题 / 问答题 */}
              {['fill', 'essay', 'code'].includes(current.type) && (
                <textarea
                  value={answers[current.questionId] || ''}
                  onChange={(e) => handleAnswer(current.questionId, e.target.value)}
                  placeholder="请输入答案..."
                  rows={current.type === 'essay' ? 10 : 3}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #d9d9d9', borderRadius: 8, fontSize: 15, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
                />
              )}

              {/* 标记按钮 */}
              <div style={{ marginTop: 24 }}>
                <button
                  onClick={() => handleMark(current.questionId)}
                  style={{ padding: '8px 20px', border: `2px solid ${markedForReview.has(current.questionId) ? '#faad14' : '#d9d9d9'}`, borderRadius: 6, background: markedForReview.has(current.questionId) ? '#fffbe6' : '#fff', color: markedForReview.has(current.questionId) ? '#faad14' : '#666', cursor: 'pointer', fontSize: 14 }}>
                  {markedForReview.has(current.questionId) ? '⭐ 已标记' : '☆ 标记待查'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 右侧答题卡 */}
        <div style={{ width: 260, borderLeft: '1px solid #e0e0e0', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
            <h4 style={{ margin: 0, fontSize: 15, color: '#333' }}>答题卡</h4>
            <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{answeredCount}/{questions.length} 已答</div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {questions.map((q, i) => {
                const isAnswered = !!answers[q.questionId];
                const isMarked = markedForReview.has(q.questionId);
                const isCurrent = i === currentIndex;
                let bg = '#f5f5f5';
                let color = '#666';
                let border = '1px solid #e0e0e0';
                if (isAnswered) { bg = '#e8f0fe'; color = '#1a73e8'; border = '1px solid #1a73e8'; }
                if (isMarked) { bg = '#fffbe6'; color = '#faad14'; border = '1px solid #faad14'; }
                if (isCurrent) { border = '2px solid #1a73e8'; }

                return (
                  <div key={q.questionId}
                    onClick={() => setCurrentIndex(i)}
                    style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: bg, color, border }}>
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0', fontSize: 11, color: '#999' }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}><span style={{ width: 12, height: 12, background: '#e8f0fe', borderRadius: 2, border: '1px solid #1a73e8', display: 'inline-block' }} /><span>已答</span></div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}><span style={{ width: 12, height: 12, background: '#fffbe6', borderRadius: 2, border: '1px solid #faad14', display: 'inline-block' }} /><span>标记</span></div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}><span style={{ width: 12, height: 12, background: '#f5f5f5', borderRadius: 2, border: '1px solid #e0e0e0', display: 'inline-block' }} /><span>未答</span></div>
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <div style={{ background: '#fff', borderTop: '1px solid #e0e0e0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}
          style={{ padding: '8px 24px', border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', opacity: currentIndex === 0 ? 0.5 : 1, fontSize: 14 }}>
          上一题
        </button>
        <span style={{ color: '#999', fontSize: 14 }}>{currentIndex + 1} / {questions.length}</span>
        <button onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))} disabled={currentIndex === questions.length - 1}
          style={{ padding: '8px 24px', border: '1px solid #d9d9d9', borderRadius: 6, background: '#fff', cursor: currentIndex === questions.length - 1 ? 'not-allowed' : 'pointer', opacity: currentIndex === questions.length - 1 ? 0.5 : 1, fontSize: 14 }}>
          下一题
        </button>
      </div>
    </div>
  );
};

export default ExamRoom;

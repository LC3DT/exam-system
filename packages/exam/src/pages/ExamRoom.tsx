import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../api/client';
import { useAuthStore } from '../stores/auth';
import { shuffleArray } from '../utils/shuffle';
import AntiCheatGuard from '../components/AntiCheatGuard';
import './ExamRoom.css';

interface Question {
  questionId: string;
  order: number;
  type: string;
  content: any;
  options?: any[];
  answer?: any;
  shuffledOptions?: any[];
}

function renderContent(text: string): string {
  let prepared = text
    .replace(/\n/g, '<br/>')
    .replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:1px 4px;border-radius:3px;font-family:monospace">$1</code>')
    .replace(/\$\$([^$]+)\$\$/g, '<span style="font-family:serif;font-style:italic;color:#555">$1</span>')
    .replace(/\$([^$]+)\$/g, '<span style="font-family:serif;font-style:italic;color:#555">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/<html>([\s\S]*)<\/html>/g, '$1');
  return DOMPurify.sanitize(prepared, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'span', 'br', 'p', 'div', 'pre'], ALLOWED_ATTR: ['style', 'class'] });
}

const Watermark: React.FC<{ text: string }> = React.memo(({ text }) => (
  <div className="exam-watermark">
    {Array.from({ length: 15 }).map((_, i) => (
      <div key={i} className="exam-watermark-text" style={{ top: `${(i % 5) * 25}%`, left: `${(i % 5) * 25 - 5}%` }}>
        {text}
      </div>
    ))}
  </div>
));

const formatTime = (s: number): string => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const ExamRoom: React.FC = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userName = useAuthStore((s) => s.user?.realName || s.user?.username || 'candidate');
  const userId = useAuthStore((s) => s.user?.id?.slice(0, 8) || '');
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [questions, setQuestions] = React.useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [markedForReview, setMarkedForReview] = React.useState<Set<string>>(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('marked') || '[]')); } catch { return new Set<string>(); }
  });
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [submitted, setSubmitted] = React.useState(false);
  const [confirmSubmit, setConfirmSubmit] = React.useState(false);
  const [warning, setWarning] = React.useState('');
  const [finalScore, setFinalScore] = React.useState<{ score: number; total: number } | null>(null);
  const [showAnswerCard, setShowAnswerCard] = React.useState(false);
  const [guardPassed, setGuardPassed] = React.useState(false);
  const fullscreenChangeCount = React.useRef(0);
  const submittedRef = React.useRef(false);

  React.useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && sessionId) {
        api.post(`/sessions/${sessionId}/violation`, { type: 'tab_switch', description: '检测到切屏行为' }).catch(() => {});
      }
    };
    const handleFullscreen = () => {
      if (!document.fullscreenElement && sessionId) {
        fullscreenChangeCount.current++;
        api.post(`/sessions/${sessionId}/violation`, {
          type: 'fullscreen_exit',
          description: `退出全屏 (第${fullscreenChangeCount.current}次)`
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('fullscreenchange', handleFullscreen);
    };
  }, [sessionId]);

  const persistMarked = React.useCallback((marks: Set<string>) => {
    sessionStorage.setItem('marked', JSON.stringify([...marks]));
  }, []);

  React.useEffect(() => {
    enterExam();
    const blockContext = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('copy', blockContext);
    document.addEventListener('paste', blockContext);
    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('copy', blockContext);
      document.removeEventListener('paste', blockContext);
    };
  }, [examId]);

  React.useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (!submittedRef.current) {
            submittedRef.current = true;
            handleSubmit();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const enterExam = async () => {
    try {
      const instanceRes = await api.post(`/exams/${examId}/enter`);
      const instance = instanceRes.data;
      const qs = instance.questions.map((q: any) => ({
        ...q,
        shuffledOptions: q.options ? shuffleArray(q.options) : undefined,
      }));

      const sessionRes = await api.post(`/sessions/${examId}/start`);
      setQuestions(qs);
      setSessionId(sessionRes.data.id);
      setTimeLeft(instance.durationMinutes * 60 || 3600);
    } catch (err: any) {
      console.error('Enter exam failed:', err);
      setWarning(err.response?.data?.message || '进入考试失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = React.useCallback((questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (sessionId) {
      api.post(`/sessions/${sessionId}/answer`, {
        questionId,
        answer: { correct: value },
        markedForReview: markedForReview.has(questionId),
      }).catch(() => {});
    }
  }, [sessionId, markedForReview]);

  const handleMark = React.useCallback((questionId: string) => {
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      next.has(questionId) ? next.delete(questionId) : next.add(questionId);
      persistMarked(next);
      return next;
    });
  }, [persistMarked]);

  const handleSubmit = React.useCallback(async () => {
    if (!sessionId || submittedRef.current) return;
    if (!confirmSubmit) {
      setConfirmSubmit(true);
      const unanswered = questions.filter(q => !answers[q.questionId]).length;
      if (unanswered > 0) return;
    }
    setConfirmSubmit(false);
    setSubmitted(true);
    submittedRef.current = true;
    try {
      const res = await api.post(`/sessions/${sessionId}/submit`);
      sessionStorage.removeItem('marked');
      setFinalScore({ score: res.data.score, total: res.data.total });
    } catch (err) {
      console.error('Submit failed:', err);
      setFinalScore({ score: 0, total: 100 });
    }
  }, [sessionId, confirmSubmit, questions, answers]);

  const cancelSubmit = React.useCallback(() => setConfirmSubmit(false), []);

  if (loading) {
    return (
      <div className="exam-loading">
        <div className="exam-loading-inner">
          <div className="exam-loading-icon">📝</div>
          <p>正在加载试卷...</p>
          <div className="exam-skeleton">
            <div className="skeleton-line w80" />
            <div className="skeleton-line w60" />
            <div className="skeleton-line w90" />
          </div>
        </div>
      </div>
    );
  }

  if (!guardPassed) {
    return <AntiCheatGuard examId={examId!} onReady={() => setGuardPassed(true)} />;
  }

  if (warning) {
    return (
      <div className="exam-loading">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 24, color: '#ff4d4f', marginBottom: 16 }}>{warning}</p>
          <button onClick={() => navigate('/login')} className="exam-btn">返回登录</button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const pct = finalScore ? Math.round((finalScore.score / finalScore.total) * 100) : 0;
    const passed = pct >= 60;
    return (
      <div className="exam-result">
        <div className="exam-result-card">
          <div className="exam-result-icon">{passed ? '🎉' : '📝'}</div>
          <p className="exam-result-title">{passed ? '交卷成功' : '已交卷'}</p>
          {finalScore && (
            <>
              <div className="exam-result-score" style={{ color: passed ? '#52c41a' : '#ff4d4f' }}>
                {finalScore.score} <span>/ {finalScore.total}</span>
              </div>
              <div className="exam-result-bar">
                <div className="exam-result-bar-fill" style={{ width: `${pct}%`, background: passed ? '#52c41a' : '#faad14' }} />
              </div>
              <p className="exam-result-pct">正确率 {pct}% · {pct >= 60 ? '及格' : '未及格'}</p>
            </>
          )}
          <button onClick={() => navigate('/exams')} className="exam-btn">返回考试列表</button>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const isTimeWarning = timeLeft < 300;
  const unansweredCount = questions.filter(q => !answers[q.questionId]).length;

  const waterMarkText = `${userName} · ${userId}`;

  return (
    <div className="exam-container">
      <Watermark text={waterMarkText} />

      <div className="exam-header" style={{ background: isTimeWarning ? '#ff4d4f' : '#1a73e8' }}>
        <div className="exam-header-left">
          <span className="exam-header-title">在线考试</span>
          <button className="exam-answer-card-toggle" onClick={() => setShowAnswerCard(!showAnswerCard)}>答题卡</button>
        </div>
        <div className="exam-header-time">{formatTime(timeLeft)}</div>
        <div className="exam-header-right">
          <span className="exam-header-progress">进度 {progressPct}%</span>
          <div className="exam-header-bar"><div className="exam-header-bar-fill" style={{ width: `${progressPct}%` }} /></div>
          <button onClick={handleSubmit} className="exam-submit-btn" style={{ background: isTimeWarning ? '#fff' : 'rgba(255,255,255,0.2)', color: isTimeWarning ? '#ff4d4f' : '#fff' }}>
            交 卷
          </button>
        </div>
      </div>

      {confirmSubmit && (
        <div className="exam-confirm-overlay" onClick={cancelSubmit}>
          <div className="exam-confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>确认交卷</h3>
            {unansweredCount > 0 ? (
              <p style={{ color: '#faad14' }}>还有 <b>{unansweredCount}</b> 道题未作答，确定要交卷吗？</p>
            ) : (
              <p>请再次确认交卷，交卷后将无法修改。</p>
            )}
            <div className="exam-confirm-actions">
              <button onClick={cancelSubmit} className="exam-confirm-cancel">继续答题</button>
              <button onClick={handleSubmit} className="exam-confirm-ok">确认交卷</button>
            </div>
          </div>
        </div>
      )}

      <div className="exam-body">
        <div className="exam-main">
          {current && (
            <ExamQuestion
              question={current}
              index={currentIndex}
              answer={answers[current.questionId]}
              marked={markedForReview.has(current.questionId)}
              onAnswer={handleAnswer}
              onMark={handleMark}
            />
          )}
        </div>

        <div className={`exam-answer-card ${showAnswerCard ? 'visible' : ''}`}>
          <div className="exam-answer-card-header">
            <h4>答题卡</h4>
            <span className="exam-answer-card-count">{answeredCount}/{questions.length} 已答</span>
            <button className="exam-answer-card-close" onClick={() => setShowAnswerCard(false)}>✕</button>
          </div>
          <div className="exam-answer-card-grid">
            {questions.map((q, i) => {
              const isAnswered = !!answers[q.questionId];
              const isMarked = markedForReview.has(q.questionId);
              const isCurrent = i === currentIndex;
              return (
                <div key={q.questionId}
                  onClick={() => { setCurrentIndex(i); setShowAnswerCard(false); }}
                  className={`exam-answer-card-num ${isAnswered ? 'answered' : ''} ${isMarked ? 'marked' : ''} ${isCurrent ? 'current' : ''}`}>
                  {i + 1}
                </div>
              );
            })}
          </div>
          <div className="exam-answer-card-legend">
            <span className="legend-dot answered" /><span>已答</span>
            <span className="legend-dot marked" /><span>标记</span>
            <span className="legend-dot" /><span>未答</span>
          </div>
        </div>
      </div>

      <div className="exam-footer">
        <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>上一题</button>
        <span>{currentIndex + 1} / {questions.length}</span>
        <button onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))} disabled={currentIndex === questions.length - 1}>下一题</button>
      </div>
    </div>
  );
};

interface ExamQuestionProps {
  question: Question;
  index: number;
  answer: any;
  marked: boolean;
  onAnswer: (questionId: string, value: any) => void;
  onMark: (questionId: string) => void;
}

const ExamQuestion: React.FC<ExamQuestionProps> = React.memo(({ question, index, answer, marked, onAnswer, onMark }) => {
  const q = question;

  const optionsEl = React.useMemo(() => {
    const opts = q.shuffledOptions || q.options || [];
    return opts.map((opt: any) => {
      const selected = q.type === 'multiple'
        ? (Array.isArray(answer) && answer.includes(opt.label))
        : answer === opt.label;
      return (
        <div key={opt.label}
          onClick={() => {
            if (q.type === 'multiple') {
              const prev = Array.isArray(answer) ? answer : [];
              const next = prev.includes(opt.label) ? prev.filter((v: string) => v !== opt.label) : [...prev, opt.label];
              onAnswer(q.questionId, next);
            } else {
              onAnswer(q.questionId, opt.label);
            }
          }}
          className={`exam-option ${selected ? 'active' : ''}`}>
          <span className="exam-option-badge" style={{ background: selected ? '#1a73e8' : '#f0f0f0', color: selected ? '#fff' : '#666' }}>{opt.label}</span>
          <span>{opt.content}</span>
        </div>
      );
    });
  }, [q.questionId, q.type, q.shuffledOptions, q.options, answer, onAnswer]);

  const contentHtml = React.useMemo(() => ({
    __html: renderContent(typeof q.content === 'string' ? q.content : q.content?.text || '')
  }), [q.content]);

  return (
    <div>
      <div className="exam-q-meta">
        <span className="exam-q-num">第 {index + 1} 题</span>
        <span className="exam-q-type">
          {q.type === 'single' ? '单选题' : q.type === 'multiple' ? '多选题' : q.type === 'judge' ? '判断题' : q.type === 'fill' ? '填空题' : '问答题'}
        </span>
      </div>
      <div className="exam-q-content" dangerouslySetInnerHTML={contentHtml} />

      {['single', 'multiple'].includes(q.type) && q.options && (
        <div className="exam-options">{optionsEl}</div>
      )}

      {q.type === 'judge' && (
        <div className="exam-judge">
          {['true', 'false'].map((v) => (
            <div key={v} onClick={() => onAnswer(q.questionId, v === 'true')}
              className={`exam-judge-btn ${answer === (v === 'true') ? 'active' : ''}`}>
              {v === 'true' ? '✓ 正确' : '✗ 错误'}
            </div>
          ))}
        </div>
      )}

      {['fill', 'essay', 'code'].includes(q.type) && (
        <textarea
          value={answer || ''}
          onChange={(e) => onAnswer(q.questionId, e.target.value)}
          placeholder="请输入答案..."
          rows={q.type === 'essay' ? 10 : 3}
          className="exam-textarea"
        />
      )}

      <div style={{ marginTop: 24 }}>
        <button onClick={() => onMark(q.questionId)}
          className={`exam-mark-btn ${marked ? 'active' : ''}`}>
          {marked ? '⭐ 已标记' : '☆ 标记待查'}
        </button>
      </div>
    </div>
  );
});

export default ExamRoom;

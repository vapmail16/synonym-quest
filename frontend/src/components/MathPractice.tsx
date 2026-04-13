import React, { useCallback, useEffect, useState } from 'react';
import config from '../config/api';
import authService from '../services/authService';

export interface MathTopicRow {
  id: string;
  bankId: string;
  topic: string;
  difficulty: string;
  skill: string;
  imageRequired: boolean;
  questionCount: number;
}

export interface MathQuestionRow {
  id: string;
  externalId: string;
  questionText: string;
  options: { label: string; value: string }[];
  correctAnswer: string;
  explanation: string;
  working: string | null;
  svgData: string | null;
  imageAltText: string | null;
  imageRequired: boolean;
}

const MathPractice: React.FC = () => {
  const [topics, setTopics] = useState<MathTopicRow[]>([]);
  const [questions, setQuestions] = useState<MathQuestionRow[]>([]);
  const [bankId, setBankId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<MathQuestionRow | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${authService.getToken()}`,
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(config.MATH_ENDPOINTS.TOPICS, { headers: headers() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load topics');
        if (!cancelled) setTopics(json.data || []);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [headers]);

  useEffect(() => {
    if (!bankId) {
      setQuestions([]);
      setActive(null);
      setActiveId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(config.MATH_ENDPOINTS.QUESTIONS(bankId), { headers: headers() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load questions');
        if (!cancelled) {
          setQuestions(json.data || []);
          setActiveId(null);
          setActive(null);
          setSelectedOption(null);
          setShowAnswer(false);
          setShowExplanation(false);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bankId, headers]);

  const loadQuestion = useCallback(
    async (id: string) => {
      setShowAnswer(false);
      setShowExplanation(false);
      setSelectedOption(null);
      try {
        const res = await fetch(config.MATH_ENDPOINTS.QUESTION(id), { headers: headers() });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load question');
        setActive(json.data);
        setActiveId(id);
      } catch (e: any) {
        setError(e.message);
      }
    },
    [headers]
  );

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading maths topics…</div>
    );
  }

  if (error && topics.length === 0) {
    return (
      <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
        <p style={{ color: '#b91c1c' }}>{error}</p>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ color: '#1e293b' }}>11+ Maths</h2>
        <p style={{ color: '#64748b' }}>
          No topics in the database yet. Ask a parent to run{' '}
          <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>npm run seed:math</code>{' '}
          in the backend folder, then restart the server.
        </p>
      </div>
    );
  }

  const correctOption = active?.options.find(o => o.label === active.correctAnswer);
  const topicMeta = topics.find(t => t.bankId === bankId);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
      <h2 style={{ marginTop: 0, color: '#1e293b' }}>11+ Maths practice</h2>
      <p style={{ color: '#64748b', marginBottom: '1.25rem' }}>
        Pick a topic, then a question. Tap an option to choose. Reveal the answer and explanation only when you are ready.
      </p>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="math-topic" style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: '#334155' }}>
          Topic
        </label>
        <select
          id="math-topic"
          value={bankId || ''}
          onChange={e => setBankId(e.target.value || null)}
          style={{
            width: '100%',
            maxWidth: 480,
            padding: '10px 12px',
            fontSize: 16,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#fff',
          }}
        >
          <option value="">— Select topic —</option>
          {topics.map(t => (
            <option key={t.id} value={t.bankId}>
              {t.topic} ({t.questionCount} questions)
            </option>
          ))}
        </select>
      </div>

      {bankId && questions.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <span style={{ fontWeight: 600, color: '#334155', marginRight: 8 }}>Question:</span>
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => loadQuestion(q.id)}
              style={{
                margin: '4px 6px 4px 0',
                padding: '6px 12px',
                borderRadius: 8,
                border: activeId === q.id ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                background: activeId === q.id ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '1.25rem',
            background: '#fafafa',
          }}
        >
          {topicMeta?.skill && (
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: '0.75rem' }}>
              <strong>Skill:</strong> {topicMeta.skill}
            </p>
          )}
          {active.svgData && (
            <div
              style={{ marginBottom: '1rem', maxWidth: '100%', overflow: 'auto' }}
              role="img"
              aria-label={active.imageAltText || 'Question diagram'}
              dangerouslySetInnerHTML={{ __html: active.svgData }}
            />
          )}
          <div
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 17,
              lineHeight: 1.5,
              color: '#0f172a',
              marginBottom: '1.25rem',
            }}
          >
            {active.questionText}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {active.options.map(opt => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSelectedOption(opt.label)}
                style={{
                  textAlign: 'left',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border:
                    selectedOption === opt.label ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                  background: selectedOption === opt.label ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                <strong>{opt.label}.</strong> {opt.value}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowAnswer(v => !v)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: '#6366f1',
                color: '#fff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showAnswer ? 'Hide correct answer' : 'Show correct answer'}
            </button>
            <button
              type="button"
              onClick={() => setShowExplanation(v => !v)}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #6366f1',
                background: '#fff',
                color: '#4338ca',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showExplanation ? 'Hide explanation' : 'Show explanation'}
            </button>
          </div>

          {showAnswer && (
            <div
              style={{
                marginTop: '1rem',
                padding: '12px 14px',
                background: '#ecfdf5',
                borderRadius: 8,
                border: '1px solid #6ee7b7',
              }}
            >
              <strong style={{ color: '#047857' }}>Correct answer:</strong>{' '}
              <span style={{ color: '#065f46' }}>
                {active.correctAnswer}
                {correctOption ? ` — ${correctOption.value}` : ''}
              </span>
              {active.working && (
                <div style={{ marginTop: 8, fontSize: 14, color: '#047857' }}>
                  <strong>Working:</strong> {active.working}
                </div>
              )}
            </div>
          )}

          {showExplanation && (
            <div
              style={{
                marginTop: '1rem',
                padding: '12px 14px',
                background: '#fffbeb',
                borderRadius: 8,
                border: '1px solid #fcd34d',
                whiteSpace: 'pre-wrap',
                fontSize: 15,
                lineHeight: 1.55,
                color: '#78350f',
              }}
            >
              {active.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MathPractice;

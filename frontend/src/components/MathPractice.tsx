import React, { useCallback, useEffect, useState } from 'react';
import config from '../config/api';
import authService from '../services/authService';
import './MathPractice.css';

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
      <div className="games-app math-practice math-practice--loading">
        <div
          className="math-practice__loading-card"
          role="status"
          aria-label="Loading maths topics"
        >
          <div className="math-practice__spinner" aria-hidden />
          <p style={{ margin: 0 }}>Loading maths topics…</p>
        </div>
      </div>
    );
  }

  if (error && topics.length === 0) {
    return (
      <div className="games-app math-practice">
        <div className="math-practice__error-panel">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <div className="games-app math-practice">
        <div className="math-practice__empty-panel">
          <h2>11+ Maths</h2>
          <p style={{ color: 'var(--math-muted)', lineHeight: 1.6 }}>
            No topics in the database yet. Ask a parent to run{' '}
            <code>npm run seed:math</code> in the backend folder, then restart the server.
          </p>
        </div>
      </div>
    );
  }

  const correctOption = active?.options.find(o => o.label === active.correctAnswer);
  const topicMeta = topics.find(t => t.bankId === bankId);

  return (
    <div className="games-app math-practice">
      <div className="math-practice__hero">
        <h2 className="math-practice__title">11+ Maths practice</h2>
        <p className="math-practice__intro">
          Pick a topic, then a question. Tap an option to choose. Reveal the answer and explanation only when you
          are ready.
        </p>
      </div>

      <div className="math-practice__topic-panel math-practice__panel">
        <h3 className="math-practice__panel-title">Choose your topic</h3>
        <label htmlFor="math-topic" className="math-practice__label">
          Topic
        </label>
        <select
          id="math-topic"
          className="math-practice__select"
          value={bankId || ''}
          onChange={e => setBankId(e.target.value || null)}
        >
          <option value="">— Select topic —</option>
          {topics.map(t => (
            <option key={t.id} value={t.bankId}>
              {t.topic} ({t.questionCount} questions)
            </option>
          ))}
        </select>

        {bankId && questions.length > 0 && (
          <div className="math-practice__q-nav" style={{ marginTop: '1.25rem' }}>
            <span className="math-practice__q-nav-label">Question</span>
            {questions.map((q, i) => (
              <button
                key={q.id}
                type="button"
                className={`math-practice__q-pill${activeId === q.id ? ' math-practice__q-pill--active' : ''}`}
                onClick={() => loadQuestion(q.id)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div className="math-practice__question-shell">
          <div className="math-practice__question-card">
            {topicMeta?.skill && (
              <p className="math-practice__skill" title="Skill focus">
                {topicMeta.skill}
              </p>
            )}
            {active.svgData && (
              <div
                className="math-practice__diagram"
                role="img"
                aria-label={active.imageAltText || 'Question diagram'}
                dangerouslySetInnerHTML={{ __html: active.svgData }}
              />
            )}
            <div className="math-practice__question-text">{active.questionText}</div>

            <div className="math-practice__options">
              {active.options.map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  className={`option-button math-practice__option${
                    selectedOption === opt.label ? ' selected' : ''
                  }`}
                  onClick={() => setSelectedOption(opt.label)}
                >
                  <strong>{opt.label}.</strong> {opt.value}
                </button>
              ))}
            </div>

            <div className="math-practice__actions">
              <button
                type="button"
                className="math-practice__btn-primary"
                onClick={() => setShowAnswer(v => !v)}
              >
                {showAnswer ? 'Hide correct answer' : 'Show correct answer'}
              </button>
              <button
                type="button"
                className="math-practice__btn-secondary"
                onClick={() => setShowExplanation(v => !v)}
              >
                {showExplanation ? 'Hide explanation' : 'Show explanation'}
              </button>
            </div>

            {showAnswer && (
              <div className="math-practice__answer-box">
                <strong>Correct answer:</strong>{' '}
                <span>
                  {active.correctAnswer}
                  {correctOption ? ` — ${correctOption.value}` : ''}
                </span>
                {active.working && (
                  <div style={{ marginTop: 8 }}>
                    <strong>Working:</strong> {active.working}
                  </div>
                )}
              </div>
            )}

            {showExplanation && (
              <div className="math-practice__explain-box">{active.explanation}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MathPractice;

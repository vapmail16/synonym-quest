import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import MathPractice from './MathPractice';
import authService from '../services/authService';
import config from '../config/api';

jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    getToken: jest.fn(() => 'test-token'),
  },
}));

const topicsPayload = {
  success: true,
  data: [
    {
      id: 't1',
      bankId: 'combinations_counting',
      topic: 'Combinations',
      difficulty: 'medium',
      skill: 'Count pairs',
      imageRequired: false,
      questionCount: 1,
    },
  ],
};

const questionsPayload = {
  success: true,
  data: [
    {
      id: 'q1',
      externalId: 'comb_001',
      questionText: 'How many?',
      options: [
        { label: 'A', value: '6' },
        { label: 'B', value: '10' },
      ],
      correctAnswer: 'B',
      explanation: 'Step by step.',
      working: 'n(n+1)/2',
      svgData: null,
      imageAltText: null,
      imageRequired: false,
    },
  ],
};

describe('MathPractice', () => {
  beforeAll(() => {
    global.fetch = jest.fn() as jest.Mock;
  });

  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('shows empty state when no topics', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });

    const { container } = render(<MathPractice />);
    await waitFor(() => {
      expect(screen.getByText(/No topics in the database/i)).toBeInTheDocument();
    });
    expect(container.querySelector('.math-practice__empty-panel')).toBeTruthy();
  });

  it('shows a themed loading state', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    const { container } = render(<MathPractice />);
    expect(container.querySelector('.math-practice--loading')).toBeTruthy();
    expect(screen.getByRole('status', { name: /loading maths/i })).toBeInTheDocument();
  });

  it('uses vocabulary-style hero and panels when topics load', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => topicsPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => questionsPayload,
      });

    const { container } = render(<MathPractice />);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /^Topic$/i })).toBeInTheDocument()
    );

    expect(container.querySelector('.math-practice__hero')).toBeTruthy();
    expect(container.querySelector('.math-practice__topic-panel')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /11\+ Maths practice/i })).toBeInTheDocument();
  });

  it('styles MCQ options like vocabulary option buttons', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => topicsPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => questionsPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: questionsPayload.data[0] }),
      });

    const { container } = render(<MathPractice />);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: /^Topic$/i })).toBeInTheDocument()
    );
    fireEvent.change(screen.getByRole('combobox', { name: /^Topic$/i }), {
      target: { value: 'combinations_counting' },
    });
    await waitFor(() => expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    await waitFor(() => expect(screen.getByText('How many?')).toBeInTheDocument());

    const card = container.querySelector('.math-practice__question-card');
    expect(card).toBeTruthy();
    const options = card ? within(card as HTMLElement).getAllByRole('button') : [];
    const choiceButtons = options.filter(
      b => b.textContent?.includes('6') || b.textContent?.includes('10')
    );
    expect(choiceButtons.length).toBe(2);
    choiceButtons.forEach(btn => {
      expect(btn.className).toMatch(/option-button/);
      expect(btn.className).toMatch(/math-practice__option/);
    });
  });

  it('loads topics and shows question after selection', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => topicsPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => questionsPayload,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: questionsPayload.data[0] }),
      });

    render(<MathPractice />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: /^Topic$/i })).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox', { name: /^Topic$/i }), {
      target: { value: 'combinations_counting' },
    });

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      config.MATH_ENDPOINTS.QUESTIONS('combinations_counting'),
      expect.any(Object)
    ));

    await waitFor(() => expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '1' }));

    await waitFor(() => expect(screen.getByText('How many?')).toBeInTheDocument());

    expect(screen.queryByText('Step by step.')).not.toBeInTheDocument();
    expect(screen.queryByText('Correct answer:')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show correct answer/i }));
    expect(screen.getByText((t) => t.includes('B') && t.includes('10'))).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show explanation/i }));
    expect(screen.getByText('Step by step.')).toBeInTheDocument();
  });
});

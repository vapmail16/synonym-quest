import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

    render(<MathPractice />);
    await waitFor(() => {
      expect(screen.getByText(/No topics in the database/i)).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByLabelText(/Topic/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Topic/i), { target: { value: 'combinations_counting' } });

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

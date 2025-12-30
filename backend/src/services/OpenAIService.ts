import OpenAI from 'openai';
import { AISuggestionRequest, AIValidationRequest, AIValidationResponse } from '../types';

export class OpenAIService {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    this.client = new OpenAI({
      apiKey: apiKey,
    });

    this.model = process.env['OPENAI_MODEL'] || 'gpt-4';
  }

  /**
   * Generate synonyms for a given word using OpenAI
   */
  async suggestSynonyms(request: AISuggestionRequest): Promise<string[]> {
    try {
      const prompt = this.buildSynonymPrompt(request.word, request.context, request.maxSynonyms);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a vocabulary expert. Provide accurate synonyms for words. Return only the synonyms as a comma-separated list, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: parseInt(process.env['OPENAI_MAX_TOKENS'] || '1000'),
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the comma-separated synonyms
      const synonyms = content
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0 && s !== request.word.toLowerCase())
        .slice(0, request.maxSynonyms || 10);

      return synonyms;
    } catch (error) {
      console.error('Error generating synonyms:', error);
      throw new Error('Failed to generate synonyms');
    }
  }

  /**
   * Validate user's answer against correct synonyms
   */
  async validateAnswer(request: AIValidationRequest): Promise<AIValidationResponse> {
    try {
      const prompt = this.buildValidationPrompt(
        request.word,
        request.userAnswer,
        request.correctSynonyms
      );

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a vocabulary expert. Analyze user answers for synonym questions. Provide validation with confidence score and helpful feedback.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: parseInt(process.env['OPENAI_MAX_TOKENS'] || '1000'),
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      return this.parseValidationResponse(content);
    } catch (error) {
      console.error('Error validating answer:', error);
      throw new Error('Failed to validate answer');
    }
  }

  /**
   * Assess the difficulty level of a word
   */
  async assessDifficulty(word: string): Promise<'easy' | 'medium' | 'hard'> {
    try {
      const prompt = `Assess the difficulty level of the word "${word}" for vocabulary learning. Consider factors like:
- Frequency of use in common language
- Complexity of meaning
- Educational level required

Return only one word: "easy", "medium", or "hard"`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an educational expert. Assess word difficulty levels accurately.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 10,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content?.trim().toLowerCase();
      
      if (content === 'easy' || content === 'medium' || content === 'hard') {
        return content;
      }

      return 'medium'; // Default fallback
    } catch (error) {
      console.error('Error assessing difficulty:', error);
      return 'medium'; // Default fallback
    }
  }

  /**
   * Generate a hint for a word
   */
  async generateHint(word: string, missingSynonyms: string[]): Promise<string> {
    try {
      const prompt = `Generate a helpful hint for the word "${word}" to help someone remember these synonyms: ${missingSynonyms.join(', ')}. 
The hint should be educational and help with memory, but not give away the answer directly. Keep it under 50 words.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful vocabulary tutor. Generate educational hints that aid memory without giving direct answers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 100,
        temperature: 0.4,
      });

      return response.choices[0]?.message?.content || 'Try to think of words with similar meanings.';
    } catch (error) {
      console.error('Error generating hint:', error);
      return 'Try to think of words with similar meanings.';
    }
  }

  /**
   * Generate a simple, child-friendly meaning for a word
   */
  async generateMeaning(word: string, synonyms: string[] = []): Promise<string> {
    try {
      const synonymsText = synonyms.length > 0 ? `Synonyms: ${synonyms.slice(0, 3).join(', ')}.` : '';
      const prompt = `Provide a simple, easy-to-understand meaning for the word "${word}" in plain language that a child can understand. 
${synonymsText}
Keep it short (1-2 sentences, maximum 100 words). Use simple words and avoid complex explanations.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful vocabulary teacher for children. Explain word meanings in simple, clear language that is easy to understand.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
      });

      const meaning = response.choices[0]?.message?.content?.trim();
      if (!meaning) {
        throw new Error('No meaning generated');
      }

      return meaning;
    } catch (error) {
      console.error('Error generating meaning:', error);
      // Fallback meaning
      return `A word that means something similar to ${synonyms.length > 0 ? synonyms[0] : 'other related words'}.`;
    }
  }

  private buildSynonymPrompt(word: string, context?: string, maxSynonyms?: number): string {
    let prompt = `Generate ${maxSynonyms || 10} synonyms for the word "${word}".`;
    
    if (context) {
      prompt += ` Context: ${context}.`;
    }
    
    prompt += ' Return only the synonyms as a comma-separated list, no explanations.';
    
    return prompt;
  }

  private buildValidationPrompt(
    word: string,
    userAnswer: string,
    correctSynonyms: string[]
  ): string {
    return `Word: "${word}"
Correct synonyms: ${correctSynonyms.join(', ')}
User answer: ${userAnswer}

Analyze the user's answer and provide:
1. Is it mostly correct? (true/false)
2. Confidence score (0-100)
3. Brief feedback message
4. Suggestions for improvement

Format your response as JSON:
{
  "isValid": boolean,
  "confidence": number,
  "feedback": "string",
  "suggestions": ["string"]
}`;
  }

  private parseValidationResponse(content: string): AIValidationResponse {
    try {
      // Try to parse as JSON first
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          isValid: parsed.isValid || false,
          confidence: parsed.confidence || 0,
          feedback: parsed.feedback || 'Answer analyzed',
          suggestions: parsed.suggestions || [],
        };
      }

      // Fallback parsing if JSON is malformed
      return {
        isValid: content.toLowerCase().includes('correct') || content.toLowerCase().includes('valid'),
        confidence: 50,
        feedback: content,
        suggestions: [],
      };
    } catch (error) {
      console.error('Error parsing validation response:', error);
      return {
        isValid: false,
        confidence: 0,
        feedback: 'Unable to validate answer',
        suggestions: [],
      };
    }
  }
}

export const openAIService = new OpenAIService();

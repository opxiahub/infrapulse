import axios from 'axios';
import type { ChatMessage } from './types.js';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
const FALLBACK_OPENAI_MODEL = 'gpt-5.4';

function parseJsonContent(content: string): any {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }

    return JSON.parse(content);
  } catch (parseError) {
    console.error('Error parsing LLM response as JSON:', parseError);
    console.error('Content causing the issue:', content.substring(0, 200));
    return null;
  }
}

export async function callOpenAILLM(
  system: string,
  user: string,
  modelName = process.env.OPENAI_MODEL || FALLBACK_OPENAI_MODEL,
  expectJson = false,
  history: ChatMessage[] = []
): Promise<any> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Keep only the most recent turns to bound token usage, and never trust a
    // client-sent system role — only user/assistant turns are forwarded.
    const priorTurns = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    const model = modelName.replace(/^openai\//, '') || process.env.OPENAI_MODEL || FALLBACK_OPENAI_MODEL;
    const payload = {
      model,
      messages: [
        {
          role: 'developer',
          content: system,
        },
        ...priorTurns,
        {
          role: 'user',
          content: user,
        },
      ],
      stream: false,
      store: false,
      ...(expectJson ? { response_format: { type: 'json_object' } } : {}),
    };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    console.log(`Making API call to OpenAI with model: ${model}`);

    const response = await axios.post(OPENAI_CHAT_COMPLETIONS_URL, payload, { headers });
    const content = response.data?.choices?.[0]?.message?.content;

    if (typeof content !== 'string') {
      console.warn('Unexpected response format from OpenAI API:', response.data);
      throw new Error('Unexpected response format from LLM API');
    }

    if (expectJson) {
      return parseJsonContent(content);
    }

    return content;
  } catch (error: any) {
    const message = error.response?.data?.error?.message || error.message;
    console.error('Error calling OpenAI API:', message);
    throw new Error(`Failed to get LLM response: ${message}`);
  }
}

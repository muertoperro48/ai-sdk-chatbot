import { streamText } from 'ai';
import { google } from '@ai-sdk/google';
import { AI_CONFIG } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }

    // Stream the response from Gemini
    const result = streamText({
      model: google(AI_CONFIG.MODEL),
      messages,
      temperature: AI_CONFIG.TEMPERATURE,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

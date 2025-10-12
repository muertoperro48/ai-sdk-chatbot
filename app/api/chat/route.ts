import { google } from "@ai-sdk/google";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { createClient } from '@supabase/supabase-js';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    const body = await req.json();
    const { messages, conversationId } = body;

    const result = streamText({
        model: google('gemini-2.5-flash'),
        system: 'You are a helpful assistant.',
        messages: convertToModelMessages(messages),
        onFinish: async (result) => {
            // Add a small delay to ensure text is fully available
            await new Promise(resolve => setTimeout(resolve, 100));

            // Try to get content from different sources
            let contentToSave = '';
            
            // First try: result.text (standard approach)
            if (result.text) {
                contentToSave = result.text;
            }
            // Second try: result.message.parts with state "done" (your discovery!)
            else if ((result as any).message?.parts?.length > 0) {
                const donePart = (result as any).message.parts.find((part: any) => 
                    part.state === 'done' && part.type === 'text'
                );
                
                if (donePart?.text) {
                    contentToSave = donePart.text;
                }
            }
            // Third try: any text part in message.parts
            else if ((result as any).message?.parts?.length > 0) {
                const textPart = (result as any).message.parts.find((part: any) => 
                    part.type === 'text' && part.text
                );
                if (textPart?.text) {
                    contentToSave = textPart.text;
                }
            }

            // Save assistant message to database when stream finishes
            if (conversationId && contentToSave) {
                try {
                    const { data, error } = await supabase.from('ai_sdk_chatbot_messages').insert({
                        conversation_id: conversationId,
                        role: 'assistant',
                        content: contentToSave,
                    });

                    if (error) {
                        console.error('API: Error saving assistant message:', error);
                    } else {
                        // Update conversation timestamp
                        await supabase
                            .from('ai_sdk_chatbot_conversations')
                            .update({ updated_at: new Date().toISOString() })
                            .eq('id', conversationId);
                    }
                } catch (error) {
                    console.error('API: Error in onFinish callback:', error);
                }
            }
        }
    });

    return result.toUIMessageStreamResponse();
}

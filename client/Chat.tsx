'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { supabase } from '@/lib/supabase/client';
import { generateConversationTitle } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/lib/theme-context';
import type { Message } from '@/lib/supabase/types';

export function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  
  const { theme } = useTheme();

  const { messages: chatMessages, setMessages: setChatMessages, sendMessage, regenerate, status, stop, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    // throttle UI updates for smoother rendering on rapid streams
    experimental_throttle: 50,
    // Event callbacks from the docs: useful for analytics, logging, or additional UI updates
    onData: (data) => {
      // Called whenever a new data part arrives from the server stream
      // Useful for custom logging or side-effects (do NOT mutate messages here)
    },
    onError: (err) => {
      // Global error handler for the chat hook
      console.error('Chat onError:', err);
    },
    onFinish: (result) => {
      // Called when an assistant response has finished streaming
      // Save assistant message to database after streaming completes
      if (currentConversationId && (result as any).finishReason !== 'error' && (result as any).content) {
        saveAssistantMessageFromResult(result);
      }
    }
  });


  const saveAssistantMessageToDatabase = async (message: any) => {
    try {
      // Save assistant response
      // @ts-ignore - Supabase types issue
      const { data, error } = await supabase.from('ai_sdk_chatbot_messages').insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: message.parts?.[0]?.text || '',
      });

      if (error) {
        console.error('Error inserting assistant message:', error);
        throw error;
      }

      // Update conversation updated_at timestamp
      await supabase
        .from('ai_sdk_chatbot_conversations')
        // @ts-ignore - Supabase types issue
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);
    } catch (error) {
      console.error('Error saving assistant message:', error);
    }
  };

  const saveAssistantMessageFromState = async (message: any) => {
    try {

      // Try to find the done part first
      let contentToSave = '';
      
      if (message.parts?.length > 0) {
        const donePart = message.parts.find((part: any) => 
          part.state === 'done' && part.type === 'text'
        );
        
        if (donePart?.text) {
          contentToSave = donePart.text;
        } else {
          // Fallback to any text part
          const textPart = message.parts.find((part: any) => 
            part.type === 'text' && part.text
          );
          if (textPart?.text) {
            contentToSave = textPart.text;
          }
        }
      }

      if (!contentToSave) {
        console.error('No content found in message parts');
        return;
      }

      // Save assistant response
      // @ts-ignore - Supabase types issue
      const { data, error } = await supabase.from('ai_sdk_chatbot_messages').insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: contentToSave,
      });

      if (error) {
        console.error('Error inserting assistant message from state:', error);
        throw error;
      }

      console.log('Assistant message saved to database from state successfully:', data);

      // Update conversation updated_at timestamp
      await supabase
        .from('ai_sdk_chatbot_conversations')
        // @ts-ignore - Supabase types issue
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);
    } catch (error) {
      console.error('Error saving assistant message from state:', error);
    }
  };

  const saveAssistantMessageFromResult = async (result: any) => {
    try {
      console.log('🔍 saveAssistantMessageFromResult called with:', {
        result,
        conversationId: currentConversationId,
        content: result.content,
        contentLength: result.content?.length,
        text: result.text,
        textLength: result.text?.length,
        finishReason: result.finishReason
      });

      const contentToSave = result.content || '';
      console.log('📝 Content to save:', contentToSave);
      console.log('📏 Content length:', contentToSave.length);

      // Save assistant response using the complete content from result
      // @ts-ignore - Supabase types issue
      const { data, error } = await supabase.from('ai_sdk_chatbot_messages').insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: contentToSave,
      });

      if (error) {
        console.error('❌ Error inserting assistant message from result:', error);
        throw error;
      }

      console.log('✅ Assistant message saved to database from result successfully:', data);

      // Update conversation updated_at timestamp
      await supabase
        .from('ai_sdk_chatbot_conversations')
        // @ts-ignore - Supabase types issue
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentConversationId);
        
      console.log('✅ Conversation timestamp updated');
    } catch (error) {
      console.error('❌ Error saving assistant message from result:', error);
    }
  };

  // Auto-scroll to latest message when messages change
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    // Scroll to bottom smoothly when new messages arrive
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    // Convert chat messages to our Message format for display
    const formattedMessages = chatMessages.map((msg: any) => ({
      id: msg.id || '',
      conversation_id: currentConversationId || '',
      role: msg.role as 'user' | 'assistant',
      content: msg.parts?.[0]?.text || '',
      created_at: new Date().toISOString(),
    }));
    setMessages(formattedMessages);
  }, [chatMessages, currentConversationId]);

  // Save assistant messages when they're added to chatMessages
  useEffect(() => {
    if (chatMessages.length > 0 && currentConversationId) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      
      // Check if this is a new assistant message that needs to be saved
      if (lastMessage.role === 'assistant' && status === 'ready') {
        // Check if this message is already in our local messages state
        const isAlreadySaved = messages.some(msg => 
          msg.content === (lastMessage.parts?.[0] as any)?.text && 
          msg.role === 'assistant'
        );
        
        if (!isAlreadySaved) {
          saveAssistantMessageFromState(lastMessage);
        }
      }
    }
  }, [chatMessages, status, currentConversationId]);

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('ai_sdk_chatbot_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data || []);
      
      // Convert to AI SDK format and set messages
      const aiMessages = (data || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      }));
      
      // Clear existing messages and set new ones
      setChatMessages([]);
      aiMessages.forEach((msg: any) => {
        setChatMessages(prev => [...prev, {
          id: msg.id,
          role: msg.role,
          parts: [{ type: 'text', text: msg.content }]
        }]);
      });
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setChatMessages([]);
    // Trigger sidebar refresh by updating a state that Sidebar can watch
    window.dispatchEvent(new CustomEvent('conversationChanged'));
  };

  const handleConversationSelect = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    await loadMessages(conversationId);
  };

  const handleSubmitWithConversation = async () => {
    if (!input.trim()) return;

    let conversationId = currentConversationId;

    // Create new conversation if none exists
    if (!conversationId) {
      try {
        const title = generateConversationTitle(input);
        const { data, error } = await supabase
          .from('ai_sdk_chatbot_conversations')
          // @ts-ignore - Supabase types issue
          .insert({ title })
          .select()
          .single();

        if (error) throw error;
        // @ts-ignore - Supabase types issue
        conversationId = (data as any).id;
        setCurrentConversationId(conversationId);
        // Trigger sidebar refresh
        window.dispatchEvent(new CustomEvent('conversationChanged'));
      } catch (error) {
        console.error('Error creating conversation:', error);
        return;
      }
    }

    // Save user message to database immediately
    try {
      // @ts-ignore - Supabase types issue
      await supabase.from('ai_sdk_chatbot_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: input.trim(),
      });
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    // Submit the message using sendMessage with conversationId
    sendMessage({ 
      text: input,
      ...(conversationId && { data: { conversationId } })
    });
    
    setInput('');
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };


  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        currentConversationId={currentConversationId}
        onConversationSelect={handleConversationSelect}
        onNewChat={handleNewChat}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentConversationId ? 'Chat' : 'New Chat'}
          </h1>
          <ThemeToggle />
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 dark:bg-gray-900">
          {loadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Start a conversation by typing a message below. I can help you with questions, 
                writing, analysis, coding, and much more.
              </p>
            </div>
          ) : (
            chatMessages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user' 
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600' 
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                }`}>
                  {message.role === 'user' ? (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-[80%] ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block px-4 py-3 rounded-2xl shadow-sm ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' 
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}>
                    {/* Render different part types. The `parts` array can contain text, reasoning, file, and source parts. */}
                    {message.parts.map((part, index) => {
                      // plain text parts (most common)
                      if (part.type === 'text') {
                        return (
                          <div key={index} className="leading-relaxed">
                            <MarkdownRenderer content={part.text} />
                          </div>
                        );
                      }

                      // reasoning parts: show preformatted block to preserve whitespace
                      if (part.type === 'reasoning') {
                        return (
                          <pre key={index} className="whitespace-pre-wrap bg-gray-200 dark:bg-gray-700 rounded-lg p-3 text-sm overflow-x-auto mt-2 text-gray-800 dark:text-gray-200">{part.text}</pre>
                        );
                      }

                      // file parts: images are displayed inline; other file types show a link
                      if (part.type === 'file') {
                        if (part.mediaType?.startsWith('image/')) {
                          return (
                            <img key={index} src={part.url} alt={part.filename ?? 'generated image'} className="mt-2 max-w-full rounded-lg shadow-sm" />
                          );
                        }
                        return (
                          <a key={index} href={part.url} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 underline hover:no-underline">
                            {part.filename ?? part.url}
                          </a>
                        );
                      }

                      // source-url parts: show a link to the source (open in new tab)
                      if (part.type === 'source-url') {
                        return (
                          <div key={index} className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            Source: <a className="text-blue-600 dark:text-blue-400 hover:underline" href={part.url} target="_blank" rel="noreferrer">{part.title ?? new URL(part.url).hostname}</a>
                          </div>
                        );
                      }

                              // source-document parts: show the document title
                              if (part.type === 'source-document') {
                                return (
                                  <div key={index} className="mt-2 text-xs text-gray-600 dark:text-gray-400">Document: {part.title ?? `Document ${(part as any).id}`}</div>
                                );
                              }

                      // fallback: ignore unsupported part types in the UI
                      return null;
                    })}
                  </div>
                  
                          {/* Message metadata */}
                          <div className={`mt-1 text-xs text-gray-500 dark:text-gray-400 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <span>{new Date((message.metadata as any)?.createdAt ?? (message as any).createdAt ?? Date.now()).toLocaleTimeString()}</span>
                            {(message.metadata as any)?.totalUsage && (
                              <span className="ml-2">• {(message.metadata as any).totalUsage.totalTokens} tokens</span>
                            )}
                          </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Status and Controls */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {(status === 'submitted' || status === 'streaming') && (
            <div className="mb-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {status === 'submitted' ? 'Thinking...' : 'Typing...'}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => stop()} 
                className="group relative px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 text-sm transition-colors duration-200"
                title="Stop generation"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
                </svg>
                Stop
              </button>
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-center gap-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">An error occurred</span>
              </div>
                      <button 
                        type="button" 
                        onClick={() => regenerate()}
                        className="group relative px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 text-sm transition-colors duration-200"
                        title="Retry the last message"
                      >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={e => {
              e.preventDefault();
              if(input.trim()) {
                handleSubmitWithConversation();
              }
            }}
            className="flex gap-3 items-start"
          >
            <div className="flex-1 relative">
              <textarea 
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={status !== 'ready'}
                placeholder="Type your message here..."
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                }}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            
            <div className="flex gap-2 items-start">
              <button 
                type="submit" 
                disabled={status !== 'ready' || !input.trim()} 
                className="group relative px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center"
                title="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
              
              <button 
                type="button" 
                onClick={stop} 
                disabled={!(status === 'streaming' || status === 'submitted')} 
                className="group relative px-3 py-3 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                title="Stop generation"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9h6v6H9z" />
                </svg>
              </button>
              
                      <button
                        type="button"
                        onClick={() => regenerate()}
                        disabled={!(status === 'ready' || status === 'error')}
                        className="group relative px-3 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
                        title="Regenerate last response"
                      >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

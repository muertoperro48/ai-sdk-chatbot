'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { supabase } from '@/lib/supabase/client';
import { generateConversationTitle } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { Message } from '@/lib/supabase/types';

export function Chat() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const {
    messages: chatMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages: setChatMessages,
  } = useChat({
    api: '/api/chat',
    body: {
      conversationId: currentConversationId,
    },
    onFinish: async (message) => {
      // Save messages to database after streaming completes
      if (currentConversationId) {
        try {
          // Save user message
          const userMessage = chatMessages[chatMessages.length - 2]; // Second to last message
          if (userMessage?.role === 'user') {
            await supabase.from('ai_sdk_chatbot_messages').insert({
              conversation_id: currentConversationId,
              role: 'user',
              content: userMessage.content,
            });
          }

          // Save assistant response
          await supabase.from('ai_sdk_chatbot_messages').insert({
            conversation_id: currentConversationId,
            role: 'assistant',
            content: message.content,
          });

          // Update conversation updated_at timestamp
          await supabase
            .from('ai_sdk_chatbot_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentConversationId);
        } catch (error) {
          console.error('Error saving messages:', error);
        }
      }
    },
  });

  useEffect(() => {
    // Convert chat messages to our Message format for display
    const formattedMessages = chatMessages.map(msg => ({
      id: msg.id || '',
      conversation_id: currentConversationId || '',
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      created_at: new Date().toISOString(),
    }));
    setMessages(formattedMessages);
  }, [chatMessages, currentConversationId]);

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
      
      // Convert to AI SDK format
      const aiMessages = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
      }));
      setChatMessages(aiMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleNewChat = async () => {
    setCurrentConversationId(null);
    setMessages([]);
    setChatMessages([]);
  };

  const handleConversationSelect = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    await loadMessages(conversationId);
  };

  const handleSubmitWithConversation = async () => {
    if (!input.trim()) return;

    // Create new conversation if none exists
    if (!currentConversationId) {
      try {
        const title = generateConversationTitle(input);
        const { data, error } = await supabase
          .from('ai_sdk_chatbot_conversations')
          .insert({ title })
          .select()
          .single();

        if (error) throw error;
        setCurrentConversationId(data.id);
      } catch (error) {
        console.error('Error creating conversation:', error);
        return;
      }
    }

    handleSubmit();
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {currentConversationId ? 'Chat' : 'New Chat'}
          </h1>
          <ThemeToggle />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                How can I help you today?
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Start a conversation by typing a message below. I can help you with questions, 
                writing, analysis, coding, and much more.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                isStreaming={isLoading && message.role === 'assistant' && message === messages[messages.length - 1]}
              />
            ))
          )}
        </div>

        {/* Input */}
        <ChatInput
          value={input}
          onChange={handleInputChange}
          onSubmit={handleSubmitWithConversation}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

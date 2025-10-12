'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { generateConversationTitle, formatDate } from '@/lib/utils';
import type { Conversation } from '@/lib/supabase/types';

interface SidebarProps {
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({ currentConversationId, onConversationSelect, onNewChat }: SidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadConversations();
    
    // Listen for conversation changes
    const handleConversationChanged = () => {
      loadConversations();
    };
    
    window.addEventListener('conversationChanged', handleConversationChanged);
    
    return () => {
      window.removeEventListener('conversationChanged', handleConversationChanged);
    };
  }, []);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_sdk_chatbot_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('ai_sdk_chatbot_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setConversations(prev => prev.filter(conv => conv.id !== id));
      
      if (currentConversationId === id) {
        onNewChat();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  return (
    <div className={`bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Chat
          </h2>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {!isCollapsed && <span className="text-sm font-medium">New chat</span>}
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors relative ${
                  currentConversationId === conversation.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200'
                }`}
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversation.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(conversation.updated_at)}
                      </p>
                    </div>
                    
                    <button
                      onClick={(e) => deleteConversation(conversation.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-gray-500 dark:text-gray-400"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

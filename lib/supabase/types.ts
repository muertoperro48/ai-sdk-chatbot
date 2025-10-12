export interface Database {
  public: {
    Tables: {
      ai_sdk_chatbot_conversations: {
        Row: {
          id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_sdk_chatbot_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: 'user' | 'assistant';
          content?: string;
          created_at?: string;
        };
      };
    };
  };
}

export type Conversation = Database['public']['Tables']['ai_sdk_chatbot_conversations']['Row'];
export type Message = Database['public']['Tables']['ai_sdk_chatbot_messages']['Row'];
export type NewConversation = Database['public']['Tables']['ai_sdk_chatbot_conversations']['Insert'];
export type NewMessage = Database['public']['Tables']['ai_sdk_chatbot_messages']['Insert'];

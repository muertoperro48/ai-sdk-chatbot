-- AI SDK Chatbot Database Schema
-- This creates tables for the AI chatbot application with prefixed names

-- Create conversations table for AI SDK Chatbot
CREATE TABLE ai_sdk_chatbot_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for AI SDK Chatbot
CREATE TABLE ai_sdk_chatbot_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES ai_sdk_chatbot_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_ai_sdk_chatbot_messages_conversation_id ON ai_sdk_chatbot_messages(conversation_id);
CREATE INDEX idx_ai_sdk_chatbot_messages_created_at ON ai_sdk_chatbot_messages(created_at);
CREATE INDEX idx_ai_sdk_chatbot_conversations_updated_at ON ai_sdk_chatbot_conversations(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE ai_sdk_chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sdk_chatbot_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we don't have auth)
-- In production, you might want to implement proper authentication
CREATE POLICY "Allow all operations on ai_sdk_chatbot_conversations" ON ai_sdk_chatbot_conversations
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on ai_sdk_chatbot_messages" ON ai_sdk_chatbot_messages
  FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION ai_sdk_chatbot_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ai_sdk_chatbot_conversations_updated_at
  BEFORE UPDATE ON ai_sdk_chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION ai_sdk_chatbot_update_updated_at_column();

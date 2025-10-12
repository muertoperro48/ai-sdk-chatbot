// AI Model Configuration
export const AI_CONFIG = {
  MODEL: 'gemini-2.5-flash',
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.7,
} as const;

// UI Constants
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: 260,
  MAX_MESSAGE_LENGTH: 4000,
  CONVERSATION_TITLE_LENGTH: 50,
} as const;

// Theme Configuration
export const THEME_CONFIG = {
  STORAGE_KEY: 'chatbot-theme',
  DEFAULT_THEME: 'dark' as const,
} as const;

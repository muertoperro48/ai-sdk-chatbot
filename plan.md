# Build ChatGPT-like AI Chatbot with Gemini

## Project Structure Setup

Create the following folder structure:

```
app/
├── api/
│   └── chat/
│       └── route.ts          // Chat streaming API endpoint
├── client/
│   ├── Chat.tsx              // Main chat interface (useChat hook)
│   ├── ChatInput.tsx         // Message input with send button
│   ├── ChatMessage.tsx       // Individual message display
│   └── Sidebar.tsx           // Left sidebar with chat history
├── server/
│   └── actions.ts            // Server actions if needed
├── components/
│   ├── ui/
│   │   ├── Button.tsx        // Reusable button component
│   │   ├── ThemeToggle.tsx   // Dark/Light theme switcher
│   │   └── CodeBlock.tsx     // Code syntax highlighting
│   └── markdown/
│       └── MarkdownRenderer.tsx  // Markdown rendering
├── lib/
│   ├── supabase/
│   │   ├── client.ts         // Supabase client setup
│   │   └── types.ts          // Database types
│   ├── utils.ts              // Utility functions
│   └── constants.ts          // App constants
├── layout.tsx                // Root layout with theme provider
├── page.tsx                  // Main page (imports Chat component)
└── globals.css               // Global styles with theme variables
```

## Key Implementation Steps

### 1. Environment & Dependencies Setup

- Add Supabase client library: `@supabase/supabase-js`
- Add markdown rendering: `react-markdown`, `remark-gfm`
- Add syntax highlighting: `react-syntax-highlighter`
- Create `.env.local` with:
  - `GOOGLE_GENERATIVE_AI_API_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Supabase Database Setup

Create tables:

- **conversations**: `id`, `title`, `created_at`, `updated_at`
- **messages**: `id`, `conversation_id`, `role` (user/assistant), `content`, `created_at`

Schema will be provided in migration SQL.

### 3. API Route (`app/api/chat/route.ts`)

- Use `streamText` from `ai` package with `@ai-sdk/google` provider
- Configure `gemini-2.5-flash` model
- Handle POST requests with message history
- Return streaming response using `toDataStreamResponse()`
- Save messages to Supabase after streaming completes

### 4. Client Components

**Chat.tsx** (Main orchestrator):

- Use `useChat` hook from `@ai-sdk/react`
- Manage conversation state and switching
- Load conversation history from Supabase
- Handle new chat creation
- Integrate Sidebar and ChatMessage components

**ChatInput.tsx**:

- Textarea with auto-resize
- Send button (disabled while loading)
- Handle Enter key (Shift+Enter for newline)

**ChatMessage.tsx**:

- Render user/assistant messages differently
- Integrate MarkdownRenderer for assistant messages
- Add copy button for code blocks
- Show loading indicator for streaming

**Sidebar.tsx**:

- List all conversations from Supabase
- New chat button
- Delete conversation option
- Active conversation highlighting
- Collapsible on mobile

### 5. UI Components

**MarkdownRenderer.tsx**:

- Use `react-markdown` with `remark-gfm` plugin
- Custom renderers for code blocks (integrate CodeBlock)
- Style headings, lists, tables, blockquotes

**CodeBlock.tsx**:

- Use `react-syntax-highlighter` with dark/light themes
- Add copy-to-clipboard button
- Language detection from markdown

**ThemeToggle.tsx**:

- Toggle between light/dark themes
- Store preference in localStorage (client-side only)
- Update CSS variables in real-time

### 6. Layout & Styling

**layout.tsx**:

- Add ThemeProvider wrapper (context for theme state)
- Keep existing Geist fonts
- Update metadata

**globals.css**:

- Add comprehensive CSS variables for both themes
- ChatGPT-like color scheme (dark: #343541, #444654; light: whites/grays)
- Smooth transitions for theme switching

**page.tsx**:

- Simple import and render of Chat component
- No logic here

### 7. Library Setup

**lib/supabase/client.ts**:

- Initialize Supabase client with environment variables
- Export typed client

**lib/utils.ts**:

- Date formatting helpers
- Conversation title generation (first 50 chars of first message)
- Copy to clipboard function

**lib/constants.ts**:

- Model name: `gemini-2.5-flash`
- Max tokens, temperature settings
- UI constants (sidebar width, etc.)

## Technical Details

### AI SDK Integration

```typescript
// API route pattern
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages,
  });
  
  return result.toDataStreamResponse();
}
```

### useChat Hook Usage

```typescript
// In Chat.tsx
import { useChat } from '@ai-sdk/react';

const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
});
```

### Supabase Queries

- On component mount: fetch all conversations
- On conversation select: fetch messages for that conversation
- On new message: insert into messages table
- On new chat: create conversation entry

### Theme Implementation

- React Context for theme state
- CSS variables for colors (`--bg-primary`, `--text-primary`, etc.)
- localStorage to persist theme choice (not server-synced)
- System preference detection as fallback

## File Changes Summary

**New Files** (17 files):

- 1 API route
- 4 client components
- 5 UI/component files
- 4 lib files
- 1 types file
- 2 Supabase config files

**Modified Files** (3 files):

- `app/layout.tsx` - Add theme provider and update metadata
- `app/page.tsx` - Replace with Chat component import
- `app/globals.css` - Add comprehensive theme variables

## Environment Variables Required

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Deployment Notes

- Supabase project must be created and tables initialized
- Environment variables set in Vercel dashboard
- Edge runtime compatible (all serverless)
- No SQLite or file-system dependencies

### To-dos

- [ ] Install additional dependencies (Supabase, markdown, syntax highlighting) and create .env.local template
- [ ] Create lib folder with Supabase client, utils, constants, and type definitions
- [ ] Create Supabase database schema SQL file for conversations and messages tables
- [ ] Implement /api/chat route with streamText and Gemini 2.5 Flash integration
- [ ] Create theme context provider and ThemeToggle component with localStorage persistence
- [ ] Build reusable UI components (Button, CodeBlock, MarkdownRenderer)
- [ ] Implement main Chat.tsx component with useChat hook and Supabase integration
- [ ] Build Sidebar component with conversation list and management
- [ ] Create ChatInput component with textarea and send functionality
- [ ] Implement ChatMessage component with markdown rendering and copy buttons
- [ ] Update layout.tsx with theme provider and page.tsx to import Chat
- [ ] Update globals.css with comprehensive theme variables and ChatGPT-like styling
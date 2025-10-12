import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chat } from '@/client/Chat'
import { supabase } from '@/lib/supabase/client'
import { useChat } from '@ai-sdk/react'

// Mock the useChat hook
const mockUseChat = {
  messages: [],
  setMessages: jest.fn(),
  sendMessage: jest.fn(),
  regenerate: jest.fn(),
  status: 'ready',
  stop: jest.fn(),
  error: null,
}

jest.mock('@ai-sdk/react', () => ({
  useChat: jest.fn(() => mockUseChat),
}))

// Mock the supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ 
          data: [
            { id: '1', title: 'Test Conversation', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' }
          ], 
          error: null 
        })),
        eq: jest.fn(() => Promise.resolve({ 
          data: [
            { id: '1', conversation_id: '1', role: 'user', content: 'Hello', created_at: '2023-01-01T00:00:00Z' },
            { id: '2', conversation_id: '1', role: 'assistant', content: 'Hi there!', created_at: '2023-01-01T00:01:00Z' }
          ], 
          error: null 
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: [{ id: 'new-id' }], error: null })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}))

describe('Chat Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('should render chat interface', () => {
    render(<Chat />)
    
    expect(screen.getByText('New Chat')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('should render sidebar', () => {
    render(<Chat />)
    
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument()
  })

  it('should render theme toggle', () => {
    render(<Chat />)
    
    const themeToggle = screen.getByRole('button', { name: /switch to dark theme/i })
    expect(themeToggle).toBeInTheDocument()
  })

  it('should show empty state when no messages', () => {
    render(<Chat />)
    
    expect(screen.getByText('How can I help you today?')).toBeInTheDocument()
    expect(screen.getByText(/Start a conversation by typing a message below/)).toBeInTheDocument()
  })

  it('should handle input changes', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'Hello world')
    
    expect(input).toHaveValue('Hello world')
  })

  it('should submit message when form is submitted', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Hello')
    await user.click(submitButton)
    
    expect(mockUseChat.sendMessage).toHaveBeenCalled()
  })

  it('should not submit empty message', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const submitButton = screen.getByRole('button', { name: /send/i })
    await user.click(submitButton)
    
    expect(mockUseChat.sendMessage).not.toHaveBeenCalled()
  })

  it('should submit message with Enter key', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'Hello')
    await user.keyboard('{Enter}')
    
    expect(mockUseChat.sendMessage).toHaveBeenCalled()
  })

  it('should show loading state when streaming', () => {
    mockUseChat.status = 'streaming'
    render(<Chat />)
    
    expect(screen.getByText('Typing...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
  })

  it('should show error state when there is an error', () => {
    mockUseChat.error = new Error('API Error')
    render(<Chat />)
    
    expect(screen.getByText('An error occurred')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('should render messages when available', () => {
    mockUseChat.messages = [
      {
        id: '1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
        createdAt: new Date(),
      },
      {
        id: '2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Hi there!' }],
        createdAt: new Date(),
      },
    ]
    
    render(<Chat />)
    
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('should handle new chat creation', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const newChatButton = screen.getByRole('button', { name: /new chat/i })
    await user.click(newChatButton)
    
    // Should create new conversation
    expect(supabase.from).toHaveBeenCalledWith('ai_sdk_chatbot_conversations')
  })

  it('should load messages when conversation is selected', async () => {
    render(<Chat />)
    
    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('Test Conversation')).toBeInTheDocument()
    })
    
    const conversation = screen.getByText('Test Conversation')
    await userEvent.click(conversation)
    
    // Should load messages for the conversation
    expect(supabase.from).toHaveBeenCalledWith('ai_sdk_chatbot_messages')
  })

  it('should handle conversation selection', async () => {
    render(<Chat />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Conversation')).toBeInTheDocument()
    })
    
    const conversation = screen.getByText('Test Conversation')
    await userEvent.click(conversation)
    
    // Should update header
    expect(screen.getByText('Chat')).toBeInTheDocument()
  })

  it('should auto-resize textarea', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const textarea = screen.getByRole('textbox')
    
    // Mock scrollHeight
    Object.defineProperty(textarea, 'scrollHeight', {
      writable: true,
      value: 100,
    })
    
    await user.type(textarea, 'This is a long message that should cause the textarea to resize')
    
    // Should trigger resize
    fireEvent.input(textarea)
    
    expect(textarea.style.height).toBe('100px')
  })

  it('should handle stop generation', async () => {
    mockUseChat.status = 'streaming'
    const user = userEvent.setup()
    render(<Chat />)
    
    const stopButton = screen.getByRole('button', { name: /stop/i })
    await user.click(stopButton)
    
    expect(mockUseChat.stop).toHaveBeenCalled()
  })

  it('should handle regenerate', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
    await user.click(regenerateButton)
    
    expect(mockUseChat.regenerate).toHaveBeenCalled()
  })

  it('should handle theme toggle', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const themeToggle = screen.getByRole('button', { name: /switch to dark theme/i })
    await user.click(themeToggle)
    
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should save user message to database', async () => {
    const user = userEvent.setup()
    render(<Chat />)
    
    const input = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button', { name: /send/i })
    
    await user.type(input, 'Hello')
    await user.click(submitButton)
    
    // Should save user message
    expect(supabase.from).toHaveBeenCalledWith('ai_sdk_chatbot_messages')
  })

  it('should handle message rendering with different part types', () => {
    mockUseChat.messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Here is some code:' },
          { type: 'text', text: '```javascript\nconst hello = "world";\n```' },
        ],
        createdAt: new Date(),
      },
    ]
    
    render(<Chat />)
    
    expect(screen.getByText('Here is some code:')).toBeInTheDocument()
    expect(screen.getByText('const hello = "world";')).toBeInTheDocument()
  })

  it('should handle file parts in messages', () => {
    mockUseChat.messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          { 
            type: 'file', 
            url: 'https://example.com/image.jpg',
            mediaType: 'image/jpeg',
            filename: 'image.jpg'
          },
        ],
        createdAt: new Date(),
      },
    ]
    
    render(<Chat />)
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg')
    expect(image).toHaveAttribute('alt', 'image.jpg')
  })

  it('should handle source URL parts', () => {
    mockUseChat.messages = [
      {
        id: '1',
        role: 'assistant',
        parts: [
          { 
            type: 'source-url', 
            url: 'https://example.com',
            title: 'Example Site'
          },
        ],
        createdAt: new Date(),
      },
    ]
    
    render(<Chat />)
    
    expect(screen.getByText('Source:')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Example Site' })
    expect(link).toHaveAttribute('href', 'https://example.com')
  })
})

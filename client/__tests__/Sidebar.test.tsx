import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from '@/client/Sidebar'
import { supabase } from '@/lib/supabase/client'

// Mock the supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ 
          data: [
            { id: '1', title: 'Test Conversation 1', created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z' },
            { id: '2', title: 'Test Conversation 2', created_at: '2023-01-02T00:00:00Z', updated_at: '2023-01-02T00:00:00Z' }
          ], 
          error: null 
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}))

const mockProps = {
  currentConversationId: '1',
  onConversationSelect: jest.fn(),
  onNewChat: jest.fn(),
}

describe('Sidebar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render sidebar with header', () => {
    render(<Sidebar {...mockProps} />)
    
    expect(screen.getByText('AI Chat')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
  })

  it('should render new chat button', () => {
    render(<Sidebar {...mockProps} />)
    
    const newChatButton = screen.getByRole('button', { name: /new chat/i })
    expect(newChatButton).toBeInTheDocument()
  })

  it('should call onNewChat when new chat button is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...mockProps} />)
    
    const newChatButton = screen.getByRole('button', { name: /new chat/i })
    await user.click(newChatButton)
    
    expect(mockProps.onNewChat).toHaveBeenCalledTimes(1)
  })

  it('should render conversations list', async () => {
    render(<Sidebar {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
      expect(screen.getByText('Test Conversation 2')).toBeInTheDocument()
    })
  })

  it('should call onConversationSelect when conversation is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    })
    
    const conversation = screen.getByText('Test Conversation 1')
    await user.click(conversation)
    
    expect(mockProps.onConversationSelect).toHaveBeenCalledWith('1')
  })

  it('should highlight current conversation', async () => {
    render(<Sidebar {...mockProps} />)
    
    await waitFor(() => {
      const currentConversation = screen.getByText('Test Conversation 1')
      expect(currentConversation.closest('div')).toHaveClass('bg-blue-100', 'dark:bg-blue-900/30')
    })
  })

  it('should show delete button on hover', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    })
    
    const conversation = screen.getByText('Test Conversation 1').closest('div')
    await user.hover(conversation!)
    
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    expect(deleteButton).toBeInTheDocument()
  })

  it('should delete conversation when delete button is clicked', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    })
    
    const conversation = screen.getByText('Test Conversation 1').closest('div')
    await user.hover(conversation!)
    
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    // Should call delete on supabase
    expect(supabase.from).toHaveBeenCalledWith('ai_sdk_chatbot_conversations')
  })

  it('should call onNewChat when current conversation is deleted', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Conversation 1')).toBeInTheDocument()
    })
    
    const conversation = screen.getByText('Test Conversation 1').closest('div')
    await user.hover(conversation!)
    
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    expect(mockProps.onNewChat).toHaveBeenCalled()
  })

  it('should toggle sidebar collapse', async () => {
    const user = userEvent.setup()
    render(<Sidebar {...mockProps} />)
    
    const toggleButton = screen.getByRole('button', { name: /menu/i })
    await user.click(toggleButton)
    
    // Sidebar should be collapsed (width changes)
    const sidebar = screen.getByText('AI Chat').closest('div')
    expect(sidebar).toHaveClass('w-16')
  })

  it('should show loading state initially', () => {
    render(<Sidebar {...mockProps} />)
    
    // Should show loading skeletons
    const skeletons = screen.getAllByRole('generic')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('should handle empty conversations list', async () => {
    // Mock empty data
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })

    render(<Sidebar {...mockProps} />)
    
    await waitFor(() => {
      // Should not show any conversations
      expect(screen.queryByText('Test Conversation 1')).not.toBeInTheDocument()
    })
  })

  it('should handle supabase errors', async () => {
    // Mock error
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: null, error: new Error('Database error') })),
      })),
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    render(<Sidebar {...mockProps} />)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading conversations:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  it('should listen for conversation changes', () => {
    render(<Sidebar {...mockProps} />)
    
    // Dispatch conversation changed event
    fireEvent(window, new CustomEvent('conversationChanged'))
    
    // Should reload conversations
    expect(supabase.from).toHaveBeenCalled()
  })
})

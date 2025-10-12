import { generateConversationTitle, formatDate, copyToClipboard, debounce } from '@/lib/utils'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
})

describe('Utils', () => {
  describe('generateConversationTitle', () => {
    it('should generate a title from a short message', () => {
      const message = 'Hello world'
      const title = generateConversationTitle(message)
      expect(title).toBe('Hello world')
    })

    it('should truncate long messages', () => {
      const message = 'This is a very long message that should be truncated because it exceeds the maximum length allowed for conversation titles'
      const title = generateConversationTitle(message)
      expect(title.length).toBeLessThanOrEqual(50)
      expect(title).toMatch(/^This is a very long message that should be trunca/)
    })

    it('should handle empty messages', () => {
      const title = generateConversationTitle('')
      expect(title).toBe('New Chat')
    })

    it('should handle messages with only whitespace', () => {
      const title = generateConversationTitle('   ')
      expect(title).toBe('New Chat')
    })
  })

  describe('formatDate', () => {
    it('should format recent dates correctly', () => {
      const now = new Date()
      const recentDate = new Date(now.getTime() - 5 * 60 * 1000) // 5 minutes ago
      const formatted = formatDate(recentDate.toISOString())
      expect(formatted).toBe('5 minutes ago')
    })

    it('should format dates from today', () => {
      const now = new Date()
      const todayDate = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      const formatted = formatDate(todayDate.toISOString())
      expect(formatted).toBe('2 hours ago')
    })

    it('should format dates from yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const formatted = formatDate(yesterday.toISOString())
      expect(formatted).toBe('Yesterday')
    })

    it('should format older dates', () => {
      const oldDate = new Date('2023-01-15T10:30:00Z')
      const formatted = formatDate(oldDate.toISOString())
      expect(formatted).toMatch(/Jan 15, 2023/)
    })
  })

  describe('copyToClipboard', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should copy text to clipboard', async () => {
      const text = 'Test text to copy'
      await copyToClipboard(text)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(text)
    })

    it('should handle clipboard errors', async () => {
      const mockError = new Error('Clipboard error')
      ;(navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(mockError)
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      await copyToClipboard('test')
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy text: ', mockError)
      consoleSpy.mockRestore()
    })
  })

  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should debounce function calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1')
      debouncedFn('arg2')
      debouncedFn('arg3')

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg3')
    })

    it('should reset timer on subsequent calls', () => {
      const mockFn = jest.fn()
      const debouncedFn = debounce(mockFn, 100)

      debouncedFn('arg1')
      jest.advanceTimersByTime(50)
      
      debouncedFn('arg2')
      jest.advanceTimersByTime(50)

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)

      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('arg2')
    })
  })
})

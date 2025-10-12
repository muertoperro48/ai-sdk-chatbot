import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '@/lib/theme-context'

// Test component to access theme context
const TestComponent = () => {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  )
}

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('should provide default light theme', () => {
    renderWithTheme(<TestComponent />)
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('should load theme from localStorage', () => {
    localStorage.setItem('chatbot-theme', 'dark')
    renderWithTheme(<TestComponent />)
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
  })

  it('should toggle theme when button is clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<TestComponent />)
    
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    
    await user.click(screen.getByTestId('toggle'))
    
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    
    await user.click(screen.getByTestId('toggle'))
    
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('should save theme to localStorage when toggled', async () => {
    const user = userEvent.setup()
    renderWithTheme(<TestComponent />)
    
    await user.click(screen.getByTestId('toggle'))
    
    expect(localStorage.getItem('chatbot-theme')).toBe('dark')
  })

  it('should apply dark class to document when theme is dark', async () => {
    const user = userEvent.setup()
    renderWithTheme(<TestComponent />)
    
    await user.click(screen.getByTestId('toggle'))
    
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should remove dark class from document when theme is light', async () => {
    const user = userEvent.setup()
    localStorage.setItem('chatbot-theme', 'dark')
    renderWithTheme(<TestComponent />)
    
    // Initially dark
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    
    await user.click(screen.getByTestId('toggle'))
    
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should handle localStorage errors gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    // Mock localStorage to throw error
    const originalLocalStorage = global.localStorage
    global.localStorage = {
      ...localStorage,
      getItem: jest.fn(() => {
        throw new Error('localStorage error')
      }),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    }

    renderWithTheme(<TestComponent />)
    
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
    expect(consoleSpy).toHaveBeenCalled()
    
    global.localStorage = originalLocalStorage
    consoleSpy.mockRestore()
  })

  it('should throw error when useTheme is used outside ThemeProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useTheme must be used within a ThemeProvider')
    
    consoleSpy.mockRestore()
  })
})

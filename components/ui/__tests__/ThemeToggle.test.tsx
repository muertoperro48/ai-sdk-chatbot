import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { ThemeProvider } from '@/lib/theme-context'

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('should render theme toggle button', () => {
    renderWithTheme(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('should have correct aria-label for light theme', () => {
    renderWithTheme(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Switch to dark theme')
  })

  it('should have correct aria-label for dark theme', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(button).toHaveAttribute('aria-label', 'Switch to light theme')
  })

  it('should have correct title attribute', () => {
    renderWithTheme(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', 'Switch to dark theme')
  })

  it('should toggle theme when clicked', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    
    // Initially light theme
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    
    await user.click(button)
    
    // Should be dark theme now
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    
    await user.click(button)
    
    // Should be light theme again
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('should render moon icon for light theme', () => {
    renderWithTheme(<ThemeToggle />)
    const svg = screen.getByRole('button').querySelector('svg')
    expect(svg).toBeInTheDocument()
    
    // Check for moon icon path (dark theme icon)
    const path = svg?.querySelector('path')
    expect(path).toHaveAttribute('d', expect.stringContaining('M20.354 15.354A9 9 0 018.646 3.646'))
  })

  it('should render sun icon for dark theme', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    const svg = button.querySelector('svg')
    expect(svg).toBeInTheDocument()
    
    // Check for sun icon path (light theme icon)
    const path = svg?.querySelector('path')
    expect(path).toHaveAttribute('d', expect.stringContaining('M12 3v1m0 16v1m9-9h-1M4 12H3'))
  })

  it('should have correct CSS classes', () => {
    renderWithTheme(<ThemeToggle />)
    const button = screen.getByRole('button')
    
    expect(button).toHaveClass(
      'p-2',
      'rounded-lg',
      'hover:bg-gray-100',
      'dark:hover:bg-gray-700',
      'transition-colors',
      'duration-200',
      'text-gray-600',
      'dark:text-gray-300'
    )
  })

  it('should handle multiple rapid clicks', async () => {
    const user = userEvent.setup()
    renderWithTheme(<ThemeToggle />)
    
    const button = screen.getByRole('button')
    
    // Click multiple times rapidly
    await user.click(button)
    await user.click(button)
    await user.click(button)
    
    // Should end up in dark theme (odd number of clicks)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})

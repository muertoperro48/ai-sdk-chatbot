import { render, screen } from '@testing-library/react'
import { CodeBlock } from '@/components/ui/CodeBlock'

describe('CodeBlock Component', () => {
  it('should render code with syntax highlighting', () => {
    const code = 'const hello = "world";'
    render(<CodeBlock language="javascript">{code}</CodeBlock>)
    
    expect(screen.getByText(code)).toBeInTheDocument()
  })

  it('should render without language specified', () => {
    const code = 'plain text code'
    render(<CodeBlock>{code}</CodeBlock>)
    
    expect(screen.getByText(code)).toBeInTheDocument()
  })

  it('should render with different languages', () => {
    const code = 'def hello(): print("world")'
    render(<CodeBlock language="python">{code}</CodeBlock>)
    
    expect(screen.getByText(code)).toBeInTheDocument()
  })

  it('should render multiline code', () => {
    const code = `function hello() {
  console.log("world");
  return true;
}`
    render(<CodeBlock language="javascript">{code}</CodeBlock>)
    
    expect(screen.getByText(code)).toBeInTheDocument()
  })

  it('should render empty code', () => {
    render(<CodeBlock language="javascript"></CodeBlock>)
    
    // Should render without crashing
    expect(screen.getByRole('generic')).toBeInTheDocument()
  })

  it('should handle special characters in code', () => {
    const code = 'const special = "!@#$%^&*()";'
    render(<CodeBlock language="javascript">{code}</CodeBlock>)
    
    expect(screen.getByText(code)).toBeInTheDocument()
  })
})

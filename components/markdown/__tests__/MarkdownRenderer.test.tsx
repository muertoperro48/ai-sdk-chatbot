import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

describe('MarkdownRenderer Component', () => {
  it('should render plain text', () => {
    const content = 'This is plain text'
    render(<MarkdownRenderer content={content} />)
    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it('should render markdown headers', () => {
    const content = '# Header 1\n## Header 2\n### Header 3'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Header 1')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Header 2')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Header 3')
  })

  it('should render markdown paragraphs', () => {
    const content = 'This is paragraph 1.\n\nThis is paragraph 2.'
    render(<MarkdownRenderer content={content} />)
    
    const paragraphs = screen.getAllByText(/This is paragraph/)
    expect(paragraphs).toHaveLength(2)
  })

  it('should render markdown lists', () => {
    const content = '- Item 1\n- Item 2\n- Item 3'
    render(<MarkdownRenderer content={content} />)
    
    const list = screen.getByRole('list')
    expect(list).toBeInTheDocument()
    
    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(3)
    expect(listItems[0]).toHaveTextContent('Item 1')
    expect(listItems[1]).toHaveTextContent('Item 2')
    expect(listItems[2]).toHaveTextContent('Item 3')
  })

  it('should render markdown links', () => {
    const content = '[Google](https://google.com)'
    render(<MarkdownRenderer content={content} />)
    
    const link = screen.getByRole('link', { name: 'Google' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://google.com')
  })

  it('should render markdown bold text', () => {
    const content = 'This is **bold** text'
    render(<MarkdownRenderer content={content} />)
    
    const boldElement = screen.getByText('bold')
    expect(boldElement.tagName).toBe('STRONG')
  })

  it('should render markdown italic text', () => {
    const content = 'This is *italic* text'
    render(<MarkdownRenderer content={content} />)
    
    const italicElement = screen.getByText('italic')
    expect(italicElement.tagName).toBe('EM')
  })

  it('should render inline code', () => {
    const content = 'This is `inline code` text'
    render(<MarkdownRenderer content={content} />)
    
    const codeElement = screen.getByText('inline code')
    expect(codeElement.tagName).toBe('CODE')
    expect(codeElement).toHaveClass('bg-gray-100', 'dark:bg-gray-800')
  })

  it('should render code blocks', () => {
    const content = '```javascript\nconst hello = "world";\n```'
    render(<MarkdownRenderer content={content} />)
    
    // CodeBlock component should be rendered
    const codeElement = screen.getByText('const hello = "world";')
    expect(codeElement).toBeInTheDocument()
  })

  it('should render code blocks with different languages', () => {
    const content = '```python\ndef hello():\n    print("world")\n```'
    render(<MarkdownRenderer content={content} />)
    
    const codeElement = screen.getByText('def hello():')
    expect(codeElement).toBeInTheDocument()
  })

  it('should render blockquotes', () => {
    const content = '> This is a blockquote'
    render(<MarkdownRenderer content={content} />)
    
    const blockquote = screen.getByText('This is a blockquote')
    expect(blockquote.closest('blockquote')).toBeInTheDocument()
  })

  it('should render tables', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |'
    render(<MarkdownRenderer content={content} />)
    
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    
    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(2)
    expect(headers[0]).toHaveTextContent('Header 1')
    expect(headers[1]).toHaveTextContent('Header 2')
    
    const cells = screen.getAllByRole('cell')
    expect(cells).toHaveLength(2)
    expect(cells[0]).toHaveTextContent('Cell 1')
    expect(cells[1]).toHaveTextContent('Cell 2')
  })

  it('should handle empty content', () => {
    render(<MarkdownRenderer content="" />)
    // Should render without crashing
    expect(screen.getByRole('generic')).toBeInTheDocument()
  })

  it('should handle content with special characters', () => {
    const content = 'Special chars: <>&"\'`'
    render(<MarkdownRenderer content={content} />)
    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it('should render mixed content', () => {
    const content = '# Title\n\nThis is a **bold** paragraph with `code`.\n\n- List item 1\n- List item 2\n\n[Link](https://example.com)'
    render(<MarkdownRenderer content={content} />)
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title')
    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(screen.getByText('code')).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByRole('link')).toBeInTheDocument()
  })
})

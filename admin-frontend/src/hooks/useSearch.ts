import { useState } from 'react'
import { SearchResult } from '../types/UserGuide'

export const useSearch = (content: string) => {
  const [isSearching, setIsSearching] = useState(false)
  
  const searchContent = (content: string, searchTerm: string): SearchResult[] => {
    const results: SearchResult[] = []
    const lines = content.split('\n')
    const lowerSearchTerm = searchTerm.toLowerCase()
    
    lines.forEach((line, index) => {
      const lowerLine = line.toLowerCase()
      if (lowerLine.includes(lowerSearchTerm)) {
        // 清理标题文本，移除Markdown标记
        const cleanText = line.replace(/^#+\s*/, '').trim()
        const id = generateId(cleanText)
        
        results.push({
          type: line.startsWith('#') ? 'title' : 'content',
          text: cleanText,
          lineNumber: index,
          id: id,
          preview: getPreviewText(line, searchTerm)
        })
      }
    })
    
    // 标题匹配优先排序，限制结果数量
    return results
      .sort((a, b) => {
        if (a.type === 'title' && b.type !== 'title') return -1
        if (a.type !== 'title' && b.type === 'title') return 1
        return 0
      })
      .slice(0, 10) // 限制显示10条结果
  }
  
  const getPreviewText = (line: string, searchTerm: string): string => {
    const maxLength = 50
    const trimmedLine = line.trim()
    
    if (trimmedLine.length <= maxLength) {
      return trimmedLine
    }
    
    const index = trimmedLine.toLowerCase().indexOf(searchTerm.toLowerCase())
    if (index === -1) {
      return trimmedLine.substring(0, maxLength) + '...'
    }
    
    const start = Math.max(0, index - 20)
    const end = Math.min(trimmedLine.length, index + searchTerm.length + 20)
    
    let preview = trimmedLine.substring(start, end)
    if (start > 0) preview = '...' + preview
    if (end < trimmedLine.length) preview = preview + '...'
    
    return preview
  }
  
  const generateId = (text: string): string => {
    return text
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .toLowerCase()
      .substring(0, 50) // 限制长度
  }
  
  const performSearch = async (term: string): Promise<SearchResult[]> => {
    if (!term.trim()) {
      return []
    }
    
    setIsSearching(true)
    
    try {
      const results = searchContent(content, term)
      return results
    } finally {
      setIsSearching(false)
    }
  }
  
  const clearSearch = () => {
    // 清除高亮显示
    const highlights = document.querySelectorAll('.search-highlight')
    highlights.forEach(highlight => {
      const parent = highlight.parentNode
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight)
        parent.normalize()
      }
    })
  }
  
  return { 
    performSearch, 
    clearSearch,
    isSearching 
  }
}

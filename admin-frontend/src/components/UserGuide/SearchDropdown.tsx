// 功能：用户指南搜索结果下拉列表。
import { SearchResult } from '../../types/UserGuide'

interface SearchDropdownProps {
  results: SearchResult[]
  searchTerm: string
  onResultClick: (result: SearchResult) => void
  onClose: () => void
}

export default function SearchDropdown({ results, searchTerm, onResultClick, onClose }: SearchDropdownProps) {
  const highlightText = (text: string, term: string) => {
    if (!term) return text
    
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi')
    return text.replace(regex, '<mark class="search-highlight">$1</mark>')
  }
  
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  
  return (
    <div className="search-dropdown">
      <div className="search-dropdown-header">
        搜索结果 ({results.length} 条)
      </div>
      <div className="search-dropdown-list">
        {results.map((result, index) => (
          <div 
            key={index}
            className={`search-dropdown-item ${result.type}`}
            onClick={() => onResultClick(result)}
          >
            <div className="result-icon">
              {result.type === 'title' ? '📖' : '📄'}
            </div>
            <div className="result-content">
              <div 
                className="result-text"
                dangerouslySetInnerHTML={{ 
                  __html: highlightText(result.text, searchTerm) 
                }}
              />
              {result.preview && (
                <div className="result-preview">
                  {result.preview}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

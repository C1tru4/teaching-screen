import { useState, useEffect, useRef } from 'react'
import { Input, Button, Space } from 'antd'
import { ClearOutlined } from '@ant-design/icons'
import { TitleItem, SearchResult } from '../../types/UserGuide'
import SearchDropdown from './SearchDropdown'

interface TableOfContentsProps {
  titles: TitleItem[]
  activeId: string
  onTitleClick: (id: string) => void
  onSearch: (term: string, callback: (results: SearchResult[]) => void) => void
  onClear: () => void
  loading: boolean
}

export default function TableOfContents({ titles, activeId, onTitleClick, onSearch, onClear, loading }: TableOfContentsProps) {
  const [inputValue, setInputValue] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 添加调试信息
  console.log('TableOfContents received titles:', titles)
  console.log('Titles length:', titles.length)
  
  // 实时搜索 - 使用防抖
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (!inputValue.trim()) {
      setSearchResults([])
      setDropdownVisible(false)
      return
    }
    
    // 防抖延迟300ms
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(inputValue, (results) => {
        setSearchResults(results)
        setDropdownVisible(results.length > 0)
      })
    }, 300)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [inputValue, onSearch])
  
  const handleClear = () => {
    setInputValue('')
    setSearchResults([])
    setDropdownVisible(false)
    onClear()
  }
  
  const handleResultClick = (result: SearchResult) => {
    setDropdownVisible(false)
    // 触发跳转到对应位置
    const element = document.getElementById(result.id)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      })
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // 回车时立即搜索
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      onSearch(inputValue, (results) => {
        setSearchResults(results)
        setDropdownVisible(results.length > 0)
      })
    }
  }
  
  return (
    <div className="table-of-contents">
      <div className="toc-header">目录</div>
      
      {/* 搜索框 */}
      <div className="toc-search">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="搜索指南内容..."
          suffix={
            inputValue && (
              <Button 
                size="small" 
                icon={<ClearOutlined />}
                onClick={handleClear}
              >
                清空
              </Button>
            )
          }
        />
        
        {/* 搜索结果下拉列表 */}
        {dropdownVisible && searchResults.length > 0 && (
          <SearchDropdown
            results={searchResults}
            searchTerm={inputValue}
            onResultClick={handleResultClick}
            onClose={() => setDropdownVisible(false)}
          />
        )}
      </div>
      
      <div className="toc-list">
        {titles.map((title) => (
          <div
            key={title.id}
            className={`toc-item level-${title.level} ${
              activeId === title.id ? 'active' : ''
            }`}
            onClick={() => onTitleClick(title.id)}
          >
            {title.text}
          </div>
        ))}
      </div>
    </div>
  )
}

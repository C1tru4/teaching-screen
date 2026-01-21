import { useState, useEffect, useRef } from 'react'
import { Input, Button, Space } from 'antd'
import { SearchOutlined, ClearOutlined } from '@ant-design/icons'
import SearchDropdown from './UserGuide/SearchDropdown'
import { SearchResult } from '../types/UserGuide'

interface NavbarSearchProps {
  onSearch: (term: string, callback: (results: SearchResult[]) => void) => void
  onClear: () => void
  loading: boolean
}

export default function NavbarSearch({ onSearch, onClear, loading }: NavbarSearchProps) {
  const [inputValue, setInputValue] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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
  
  return (
    <div className="navbar-search">
      <Input
        value={inputValue}
        onChange={handleInputChange}
        placeholder="搜索指南内容..."
        style={{ width: 300 }}
        suffix={
          <Space>
            {inputValue && (
              <Button 
                size="small" 
                icon={<ClearOutlined />}
                onClick={handleClear}
              >
                清空
              </Button>
            )}
          </Space>
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
  )
}

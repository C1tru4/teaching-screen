// 功能：根据滚动位置返回当前激活的标题 ID。
import { useEffect, useState, RefObject } from 'react'

// 参数：contentRef 为可滚动内容容器。
export const useScrollSpy = (contentRef: RefObject<HTMLElement>) => {
  const [activeId, setActiveId] = useState<string>('')
  
  useEffect(() => {
    const handleScroll = () => {
      const headings = contentRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6')
      const scrollTop = contentRef.current?.scrollTop || 0
      
      let currentId = ''
      headings?.forEach((heading) => {
        const element = heading as HTMLElement
        if (element.offsetTop <= scrollTop + 100) {
          currentId = element.id
        }
      })
      
      setActiveId(currentId)
    }
    
    const contentElement = contentRef.current
    contentElement?.addEventListener('scroll', handleScroll)
    
    // 初始化时同步一次状态。
    handleScroll()
    
    return () => contentElement?.removeEventListener('scroll', handleScroll)
  }, [contentRef])
  
  return activeId
}

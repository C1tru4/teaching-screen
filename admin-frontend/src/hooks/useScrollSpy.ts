import { useEffect, useState, RefObject } from 'react'

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
    
    // 初始检查
    handleScroll()
    
    return () => contentElement?.removeEventListener('scroll', handleScroll)
  }, [contentRef])
  
  return activeId
}

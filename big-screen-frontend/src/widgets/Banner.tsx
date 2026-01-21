import type { BannerLevel } from '../lib/types'

interface BannerProps {
  content: string
  level?: BannerLevel
  scrollable?: boolean
  scrollTime?: number
}

export default function Banner({ content, level = 'urgent' as BannerLevel, scrollable = false, scrollTime = 15 }: BannerProps) {
  const cls = level === 'urgent' ? 'bg-red-600/80' : level === 'warning' ? 'bg-amber-600/80' : 'bg-sky-600/80'
  
  // 如果内容为空，不显示横幅
  if (!content || content.trim() === '') {
    return null
  }
  
  return (
    <div className={`w-full ${cls} text-white overflow-hidden`} style={{ minHeight: '48px' }}>
      <div className="w-full px-4 flex items-center justify-center" style={{ 
        minHeight: '48px',
        paddingTop: '9px',
        paddingBottom: '9px',
        fontSize: '36px',
        fontWeight: 700,
        letterSpacing: '0.05em'
      }}>
        {scrollable ? (
          <div className="relative w-full overflow-hidden">
            <div 
              className="animate-scroll-simple"
              style={{ animationDuration: `${scrollTime}s` }}
            >
              {content}
            </div>
          </div>
        ) : (
          <div className="text-center">
            {content}
          </div>
        )}
      </div>
    </div>
  )
}

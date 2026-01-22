// 功能：大屏“实验室聚焦”卡片与课表悬浮窗。
import React, { useState, useRef, useEffect } from 'react'
import type { SpotlightItem, SpotlightCourse } from '../lib/types'
import LabScheduleModal from '../components/LabScheduleModal'

export default function LabSpotlight({ items }: { items: SpotlightItem[] }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLab, setSelectedLab] = useState<{ id: number; name: string } | null>(null)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number; cardHeight?: number }>({ x: 0, y: 0 })
  const cardRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})
  const [currentTime, setCurrentTime] = useState(new Date()) // 用于计算课程状态

  // 每分钟更新一次当前时间，确保状态实时更新。
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // 每分钟更新一次
    
    return () => clearInterval(interval)
  }, [])

  // 打开课表悬浮窗。参数: labId 教室ID, labName 教室名称, event 点击事件。
  const handleCardClick = (labId: number, labName: string, event: React.MouseEvent) => {
    // 获取被点击的教室卡片元素。
    const clickedCard = event.currentTarget as HTMLElement
    const cardRect = clickedCard.getBoundingClientRect()
    
    // 计算悬浮窗位置：教室卡片右侧。
    const x = cardRect.right + 20 // 卡片右侧 20px 间距
    const y = Math.max(20, cardRect.top) // 顶部至少保留 20px 间距
    
    setModalPosition({ 
      x, 
      y,
      cardHeight: cardRect.height // 传递卡片高度用于计算
    })
    setSelectedLab({ id: labId, name: labName })
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setSelectedLab(null)
  }

  // 获取节次时间表（与后端 time.utils.ts 和 LabScheduleModal 保持一致）。
  const getPeriodRange = (date: Date) => {
    const y = date.getFullYear()
    const summerStart = new Date(y, 4, 1) // 5月1日
    const summerEnd = new Date(y, 9, 7, 23, 59, 59, 999) // 10月7日
    const isSummer = date >= summerStart && date <= summerEnd
    
    const am = [
      { p: 1, start: '08:00', end: '08:50' },
      { p: 2, start: '09:00', end: '09:50' },
      { p: 3, start: '10:10', end: '11:00' },
      { p: 4, start: '11:10', end: '12:00' }
    ]
    const pm = isSummer
      ? [
          { p: 5, start: '14:30', end: '15:20' },
          { p: 6, start: '15:30', end: '16:20' },
          { p: 7, start: '16:40', end: '17:30' },
          { p: 8, start: '17:40', end: '18:30' }
        ]
      : [
          { p: 5, start: '14:00', end: '14:50' },
          { p: 6, start: '15:00', end: '15:50' },
          { p: 7, start: '16:10', end: '17:00' },
          { p: 8, start: '17:10', end: '18:00' }
        ]
    return [...am, ...pm]
  }

  // 判断课程状态（与 LabScheduleModal 保持一致）。参数: spotlight 当前课程。
  const getSessionStatus = (spotlight: SpotlightCourse | null): 'ongoing' | 'upcoming' | 'completed' | null => {
    if (!spotlight || !spotlight.date || !spotlight.period) return null
    
    const now = currentTime
    // 解析日期字符串为本地时区的日期（避免 UTC 时区偏差）。
    const [year, month, day] = spotlight.date.split('-').map(Number)
    const sessionDate = new Date(year, month - 1, day) // 月份从0开始
    
    // 比较日期（仅年月日，忽略时间）。
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
    const dayDiff = sessionDay.getTime() - today.getTime()
    
    // 日期在过去，返回 completed。
    if (dayDiff < 0) {
      return 'completed'
    }
    // 日期在未来，返回 upcoming。
    if (dayDiff > 0) {
      return 'upcoming'
    }
    // 日期是今天，继续判断时间。
    
    const periods = getPeriodRange(now)
    const startPeriod = periods.find(p => p.p === spotlight.period)
    if (!startPeriod) return 'upcoming'
    
    const duration = spotlight.duration || 1
    const endPeriodNum = Math.min(spotlight.period + duration - 1, 8)
    const endPeriod = periods.find(p => p.p === endPeriodNum)
    const endTime = endPeriod?.end || startPeriod.end
    
    // 解析时间。
    const [startHour, startMin] = startPeriod.start.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startTime = startHour * 60 + startMin
    const endTimeMinutes = endHour * 60 + endMin
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes()
    
    if (currentTimeMinutes >= startTime && currentTimeMinutes <= endTimeMinutes) {
      return 'ongoing'
    } else if (currentTimeMinutes < startTime) {
      return 'upcoming'
    } else {
      return 'completed'
    }
  }

  return (
    <div className="grid grid-rows-5 gap-2 sm:gap-3 h-full">
      {items.map((l) => {
        // 从今日课程中选择第一个非 completed 的课程用于卡片展示。
        // 优先级：进行中 > 即将开始（已完成不展示）。
        let displayCourse: SpotlightCourse | null = null
        let status: 'ongoing' | 'upcoming' | 'completed' | null = null
        
        if (l.spotlight && Array.isArray(l.spotlight) && l.spotlight.length > 0) {
          // 遍历课程，找到第一个非 completed 的课程。
          for (const course of l.spotlight) {
            const courseStatus = getSessionStatus(course)
            if (courseStatus !== 'completed') {
              displayCourse = course
              status = courseStatus
              break
            }
          }
        }
        
        // 卡片不展示已完成课程；悬浮窗仍显示完整课程。
        // displayCourse 不为 null 表示找到了可展示课程。
        const shouldShowCourse = displayCourse !== null
        
        // 根据状态确定边框样式：进行中绿色、即将开始橙色、无课默认。
        const getStatusColor = () => {
          if (!shouldShowCourse || !status) return 'border-white/10 hover:border-white/20'
          if (status === 'ongoing') {
            return 'border-emerald-400/50 shadow-emerald-400/20 hover:border-emerald-400/70'
          }
          if (status === 'upcoming') {
            return 'border-amber-400/50 shadow-amber-400/20 hover:border-amber-400/70'
          }
          return 'border-white/10 hover:border-white/20'
        }

        const getStatusText = () => {
          if (!shouldShowCourse || !status) return '无排课'
          if (status === 'ongoing') return '进行中'
          if (status === 'upcoming') return '即将进行'
          return '无排课'
        }

        const getStatusPillColor = () => {
          if (!shouldShowCourse || !status) return 'bg-slate-600/40 text-slate-300'
          if (status === 'ongoing') {
            return 'bg-gradient-to-r from-emerald-400 to-green-500 text-white'
          }
          if (status === 'upcoming') {
            return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
          }
          return 'bg-slate-600/40 text-slate-300'
        }

        return (
          <div 
            key={l.lab_id} 
            ref={(el) => { cardRefs.current[l.lab_id] = el }}
            onClick={(e) => handleCardClick(l.lab_id, l.lab, e)}
            className={`flex flex-col rounded-2xl p-4 bg-gradient-to-br from-slate-900/80 to-slate-800/70 border select-none overflow-hidden relative shadow-2xl shadow-black/20 transition-all duration-300 hover:shadow-3xl hover:-translate-y-1 group cursor-pointer ${getStatusColor()}`}
          >
            {/* 课程进度条背景 */}
            {shouldShowCourse && displayCourse && status === 'ongoing' && <CourseProgressBar spotlight={displayCourse} status={status} />}
            
            {/* 顶部 - 教室名称与状态标签 */}
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="font-bold text-xl sm:text-2xl text-white">{l.lab}</div>
              {shouldShowCourse ? (
                <Pill
                  className={`text-xs sm:text-sm w-20 text-center ${getStatusPillColor()}`}
                >
                  {getStatusText()}
                </Pill>
              ) : (
                <Pill className="bg-slate-600/40 text-slate-300 w-20 text-center">无排课</Pill>
              )}
            </div>

            {shouldShowCourse && displayCourse ? (
              <div className="flex items-start gap-4 sm:gap-6 flex-1">
                {/* 左侧 65% - 文字信息 */}
                <div className="min-w-0" style={{ width: '65%', maxWidth: '65%' }}>
                  <div className="space-y-1 sm:space-y-2">
                    {/* 课程名称 - 限制 1 行 */}
                    <div className="text-base sm:text-lg font-bold opacity-95 leading-tight break-words line-clamp-1">
                      {displayCourse.course}
                    </div>
                    <div className="text-sm sm:text-base font-bold opacity-95 flex flex-wrap gap-x-3 gap-y-1 items-center">
                      <span>{displayCourse.time}</span>
                      <span className="text-sm sm:text-base font-semibold opacity-85 whitespace-normal break-words">
                        任课教师：{displayCourse.teacher}
                      </span>
                    </div>
                  </div>
                  {/* 内容区域 - 限制 3 行 */}
                  {displayCourse.content && (
                    <div className="mt-3 text-xs sm:text-sm font-semibold opacity-75 leading-relaxed whitespace-normal break-words line-clamp-3">
                      {displayCourse.content}
                    </div>
                  )}
                </div>

                {/* 右侧 35% - 人数信息与环形图 */}
                <div className="flex flex-col justify-center items-end gap-2" style={{ width: '35%' }}>
                  <div className="text-sm sm:text-base font-bold opacity-90 leading-relaxed w-20 text-center">
                    {displayCourse.planned}/{displayCourse.capacity}
                  </div>
                  <div className="w-20 flex justify-center">
                    <AttendanceRingChart
                      planned={displayCourse.planned}
                      capacity={displayCourse.capacity}
                      full={displayCourse.full}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-lg opacity-70 font-medium">无课</div>
              </div>
            )}
          </div>
        )
      })}
      
      {/* 课表悬浮窗 */}
      {selectedLab && (
        <LabScheduleModal
          labId={selectedLab.id}
          labName={selectedLab.name}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          position={modalPosition}
        />
      )}
    </div>
  )
}

// 环形图组件。参数: planned 计划人数, capacity 容量, full 是否满员。
function AttendanceRingChart({ planned, capacity, full }: { planned: number; capacity: number; full: boolean }) {
  const percentage = Math.round((planned / capacity) * 100)
  const radius = 35
  const strokeWidth = 6
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  // 根据使用率确定颜色。
  const getStrokeColor = () => {
    if (percentage > 100) return "#ef4444" // 红色 - 超员
    if (percentage >= 80) return "#f59e0b" // 黄色 - 接近满员
    return "#3b82f6" // 蓝色 - 正常
  }
  
  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* 背景圆环 */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* 进度圆环 */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {/* 中心文字 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm sm:text-base font-bold text-white">
          {percentage}%
        </span>
      </div>
    </div>
  )
}

// 课程进度条组件。参数: spotlight 当前课程, status 当前状态。
function CourseProgressBar({ spotlight, status }: { spotlight: any; status: 'ongoing' | 'upcoming' | 'completed' | null }) {
  const [progress, setProgress] = React.useState(0)
  
  React.useEffect(() => {
    if (status !== 'ongoing') {
      setProgress(0)
      return
    }
    
    // 解析时间。
    const [startTime, endTime] = spotlight.time.split('-')
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    const now = new Date()
    const start = new Date()
    start.setHours(startHour, startMin, 0, 0)
    const end = new Date()
    end.setHours(endHour, endMin, 0, 0)
    
    const totalDuration = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    
    if (elapsed < 0) {
      setProgress(0)
    } else if (elapsed > totalDuration) {
      setProgress(100)
    } else {
      setProgress((elapsed / totalDuration) * 100)
    }
    
    // 每分钟更新一次。
    const interval = setInterval(() => {
      const now = new Date()
      const elapsed = now.getTime() - start.getTime()
      
      if (elapsed < 0) {
        setProgress(0)
      } else if (elapsed > totalDuration) {
        setProgress(100)
      } else {
        setProgress((elapsed / totalDuration) * 100)
      }
    }, 60000)
    
    return () => clearInterval(interval)
  }, [spotlight.time, status])
  
  if (status !== 'ongoing') return null
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div 
        className="h-full bg-gradient-to-r from-blue-500/10 via-blue-400/15 to-blue-500/10 transition-all duration-1000 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

function Pill({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${className}`}>{children}</span>
}

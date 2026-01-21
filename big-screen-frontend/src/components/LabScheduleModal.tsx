import React, { useState, useEffect, useRef } from 'react'
import { X, Calendar, Clock, User, BookOpen } from 'lucide-react'

interface ScheduleItem {
  id: number
  course: string
  teacher: string
  time: string
  duration: number
  planned: number
  status: 'ongoing' | 'upcoming' | 'completed'
  content?: string
  period?: number // 用于去重
}

interface LabScheduleModalProps {
  labId: number
  labName: string
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number; cardHeight?: number }
}

export default function LabScheduleModal({ 
  labId, 
  labName, 
  isOpen, 
  onClose, 
  position 
}: LabScheduleModalProps) {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())

  // 获取课表数据
  useEffect(() => {
    if (isOpen && labId) {
      fetchSchedule()
    }
  }, [isOpen, labId, selectedDate])

  const fetchSchedule = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDate.toISOString().split('T')[0]
      // 使用管理端的课表API
      const response = await fetch(`/api/labs/${labId}/timetable?date=${dateStr}`)
      const result = await response.json()
      
      if (result && result.days) {
        // 找到指定日期的数据
        const targetDay = result.days.find((day: any) => day.date === dateStr)
        if (targetDay) {
          // 转换管理端数据格式为前端格式
          const scheduleData = targetDay.slots.map((slot: any) => {
            if (slot.session) {
              // 计算实际时间范围（考虑多课时）
              const timeRange = calculateTimeRange(slot.session.period, slot.session.duration || 1, selectedDate)
              return {
                id: slot.session.id,
                course: slot.session.course,
                teacher: slot.session.teacher,
                time: timeRange,
                duration: slot.session.duration || 1,
                planned: slot.session.planned || 0,
                status: getSessionStatus(slot.session, selectedDate),
                content: slot.session.content || '',
                period: slot.session.period // 保存period用于去重
              }
            }
            return null
          }).filter(Boolean)
          
          // 创建完整的1-8节课表
          const fullSchedule = createFullSchedule(scheduleData)
          setSchedule(fullSchedule)
        } else {
          // 没有找到指定日期的数据，显示空课表
          const fullSchedule = createFullSchedule([])
          setSchedule(fullSchedule)
        }
      } else {
        console.error('获取课表失败:', result)
        const fullSchedule = createFullSchedule([])
        setSchedule(fullSchedule)
      }
    } catch (error) {
      console.error('获取课表失败:', error)
      const fullSchedule = createFullSchedule([])
      setSchedule(fullSchedule)
    } finally {
      setLoading(false)
    }
  }

  // 获取节次时间表（与后端 time.utils.ts 保持一致）
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

  // 计算课程的实际时间范围（考虑多课时）
  const calculateTimeRange = (period: number, duration: number, date: Date) => {
    const periods = getPeriodRange(date)
    const startPeriod = periods.find(p => p.p === period)
    if (!startPeriod) return ''
    
    const endPeriodNum = Math.min(period + duration - 1, 8)
    const endPeriod = periods.find(p => p.p === endPeriodNum)
    
    return `${startPeriod.start}-${endPeriod?.end || startPeriod.end}`
  }

  // 判断课程状态
  const getSessionStatus = (session: any, date: Date) => {
    const now = new Date()
    // 解析日期字符串为本地时区的日期（避免UTC时区问题）
    const [year, month, day] = session.date.split('-').map(Number)
    const sessionDate = new Date(year, month - 1, day) // 月份从0开始
    
    // 比较日期（只比较年月日，忽略时间）
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate())
    const dayDiff = sessionDay.getTime() - today.getTime()
    
    // 如果日期是过去，返回completed
    if (dayDiff < 0) {
      return 'completed'
    }
    // 如果日期是未来，返回upcoming
    if (dayDiff > 0) {
      return 'upcoming'
    }
    // 如果日期是今天，继续判断时间
    
    const periods = getPeriodRange(date)
    const startPeriod = periods.find(p => p.p === session.period)
    if (!startPeriod) return 'upcoming'
    
    const duration = session.duration || 1
    const endPeriodNum = Math.min(session.period + duration - 1, 8)
    const endPeriod = periods.find(p => p.p === endPeriodNum)
    const endTime = endPeriod?.end || startPeriod.end
    
    // 解析时间
    const [startHour, startMin] = startPeriod.start.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startTime = startHour * 60 + startMin
    const endTimeMinutes = endHour * 60 + endMin
    const currentTime = now.getHours() * 60 + now.getMinutes()
    
    if (currentTime >= startTime && currentTime <= endTimeMinutes) {
      return 'ongoing'
    } else if (currentTime < startTime) {
      return 'upcoming'
    } else {
      return 'completed'
    }
  }

  // 创建课表，只显示有课程的时间段，并去重（只保留每个课程的第一节）
  const createFullSchedule = (scheduleData: ScheduleItem[]) => {
    // 去重：如果同一个课程跨越多节，只保留period最小的
    const seen = new Map<number, ScheduleItem>()
    scheduleData.forEach(item => {
      const existing = seen.get(item.id)
      if (!existing) {
        seen.set(item.id, item)
      }
    })
    
    return Array.from(seen.values())
  }

  // 获取状态标签颜色（只用于标签，不用于卡片背景）
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' // 进行中 - 绿色
      case 'upcoming':
        return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' // 即将开始 - 橙色
      case 'completed':
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white' // 已完成 - 灰色
      default:
        return 'bg-slate-600/40 text-slate-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ongoing':
        return '进行中'
      case 'upcoming':
        return '即将开始'
      case 'completed':
        return '已完成'
      default:
        return '未知'
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  if (!isOpen) return null

  // 定义固定高度常量
  const headerHeight = 80 // 头部高度（教室+日期）
  const footerHeight = 80 // 底部高度（共x节+时间切换）
  const courseHeight = 180 // 每节课的高度（增加高度以显示50个字的内容）
  
  // 计算内容区域高度
  const calculateContentHeight = () => {
    if (schedule.length === 0) {
      return 120 // 无课时显示"今日无课程安排"的高度
    } else if (schedule.length <= 2) {
      // 1-2节课时：课程高度 + 内边距 + 间距 + 缓冲空间
      const coursePadding = 16 * 2 // 上下内边距 p-4 = 16px * 2
      const courseSpacing = 12 * (schedule.length - 1) // 课程间距 space-y-3 = 12px
      const bufferSpace = 20 // 额外的缓冲空间，防止重叠
      return (schedule.length * courseHeight) + coursePadding + courseSpacing + bufferSpace
    } else {
      // 3节课以上时：显示2节课 + 内边距 + 间距 + 缓冲空间
      const coursePadding = 16 * 2 // 上下内边距 p-4 = 16px * 2
      const courseSpacing = 12 * 1 // 2节课之间的间距
      const bufferSpace = 20 // 额外的缓冲空间，防止重叠
      return (2 * courseHeight) + coursePadding + courseSpacing + bufferSpace
    }
  }
  
  // 计算悬浮窗总高度
  const calculateModalHeight = () => {
    const contentHeight = calculateContentHeight()
    const totalHeight = headerHeight + footerHeight + contentHeight
    return Math.min(totalHeight, window.innerHeight - 40) // 确保不超出屏幕
  }

  // 计算悬浮窗位置，如果向下会超出则向上调整
  const calculateModalPosition = () => {
    const modalHeight = calculateModalHeight()
    let y = position.y
    
    // 如果向下会超出屏幕底部，则向上调整
    if (y + modalHeight > window.innerHeight - 20) {
      y = Math.max(20, window.innerHeight - modalHeight - 20)
    }
    
    // 确保悬浮窗不会超出屏幕顶部
    y = Math.max(20, y)
    
    // 确保悬浮窗不会超出屏幕底部
    const maxY = window.innerHeight - modalHeight - 20
    if (y > maxY) {
      y = maxY
    }
    
    return { y, height: modalHeight }
  }

  const { y: finalY, height: modalHeight } = calculateModalPosition()

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/10 backdrop-blur-[0.5px] z-40"
        onClick={onClose}
      />
      
      {/* 悬浮窗 */}
      <div 
        className="fixed z-50 bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden flex flex-col"
        style={{
          left: `${Math.min(position.x, window.innerWidth - 420)}px`, // 确保不超出右边界
          top: `${finalY}px`, // 使用计算出的最终位置
          width: '400px',
          height: `${modalHeight}px` // 使用计算出的高度
        }}
      >
        {/* 头部 - 固定高度 */}
        <div 
          className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10 flex-shrink-0"
          style={{ height: `${headerHeight}px` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">{labName} 课表</h3>
              <p className="text-sm text-slate-400">{formatDate(selectedDate)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* 内容区域 - 精确高度控制 */}
        <div 
          className={`${schedule.length > 2 ? 'overflow-y-auto' : ''}`}
          style={{ height: `${calculateContentHeight()}px` }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-slate-400">加载中...</span>
            </div>
          ) : schedule.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="text-slate-400 text-lg mb-2">📅</div>
                <div className="text-slate-400">今日无课程安排</div>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {schedule.map((item, index) => {
                const periodNumber = index + 1
                
                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-xl border border-white/10 bg-slate-800/50 transition-all duration-300 hover:scale-[1.02] hover:border-white/20"
                  >
                    {/* 第一行：时间 + 课程情况 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold text-white">{item.time}</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                    
                    {/* 第二行：课程名称 + 老师名称（如果课程信息过长，老师名称会另起一行） */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 flex-shrink-0 text-slate-400" />
                        <span className="font-medium text-white break-words">{item.course}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 flex-shrink-0 text-slate-400" />
                        <span className="text-sm text-slate-300">{item.teacher}</span>
                      </div>
                    </div>
                    
                    {/* 第三行：课程信息（确保能显示50个字） */}
                    {item.content && (
                      <div className="text-sm font-medium leading-relaxed whitespace-normal break-words text-slate-300 min-h-[60px]">
                        {item.content}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 底部操作栏 - 固定高度 */}
        <div 
          className="p-4 border-t border-white/10 bg-slate-800/50 flex-shrink-0"
          style={{ height: `${footerHeight}px` }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              共 {schedule.length} 节课
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
                className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm transition-colors"
              >
                前一天
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-sm transition-colors"
              >
                今天
              </button>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                className="px-3 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-sm transition-colors"
              >
                后一天
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

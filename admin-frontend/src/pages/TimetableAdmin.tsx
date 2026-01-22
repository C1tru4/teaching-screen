// 功能：课表管理（网格编辑、批量导入、导出）。
import { useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Switch, message, Tabs } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import PageHeader from '../components/PageHeader'
import LabPeriodGrid from '../components/LabPeriodGrid'
import BatchUploader from '../components/BatchUploader'
import { fetchLabs, fetchTimetableWeek, saveSession, deleteSession, batchUploadTimetable, triggerScreenRefresh, fetchSemesterStart } from '../api/admin'
import { exportTimetableToExcelMultiLab, getCurrentSemester } from '../utils/export'
import type { Lab, TimetableCell } from '../types'

const WEEKDAYS = ['周一','周二','周三','周四','周五','周六','周日']

export default function TimetableAdmin() {
  const [labs, setLabs] = useState<Lab[]>([])
  const [activeLabId, setActiveLabId] = useState<number | null>(null)
  const [monday, setMonday] = useState<Dayjs>(() => {
    const now = dayjs()
    const dayOfWeek = now.day() // 0=周日, 1=周一, ..., 6=周六
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    return now.subtract(daysToMonday, 'day')
  }) // 当前周的周一
  const [cells, setCells] = useState<Record<string, TimetableCell | null>>({})
  const [visible, setVisible] = useState(false)
  const [form] = Form.useForm<TimetableCell & { weekday: number; p: number }>()
  const [editing, setEditing] = useState<{ weekday: number; p: number; exist?: TimetableCell } | null>(null)
  const [activeTab, setActiveTab] = useState('grid')
  const [semesterStartMonday, setSemesterStartMonday] = useState<string | null>(null)
  const [uploadErrors, setUploadErrors] = useState<Array<{ index: number; field?: string; message: string }>>([])

  const timetableColumns = [
    { title: '日期', dataIndex: '日期', key: '日期' },
    { title: '节次', dataIndex: '节次', key: '节次' },
    { title: '课程', dataIndex: '课程', key: '课程' },
    { title: '教师', dataIndex: '教师', key: '教师' },
    { title: '内容', dataIndex: '内容', key: '内容' },
    { title: '上课班级', dataIndex: '上课班级', key: '上课班级' },
    { title: '报课人数', dataIndex: '报课人数', key: '报课人数' },
    { title: '课时', dataIndex: '课时', key: '课时' },
    { title: '教室', dataIndex: '教室', key: '教室' },
  ]

  useEffect(() => {
    (async () => {
      const list = await fetchLabs()
      setLabs(list)
      setActiveLabId(list[0]?.id ?? null)
      
      // 读取学期开始日期配置，用于周次计算。
      try {
        const semesterConfig = await fetchSemesterStart()
        setSemesterStartMonday(semesterConfig.semesterStartMonday)
      } catch (error) {
        console.error('Failed to fetch semester start date:', error)
      }
    })()
  }, [])

  useEffect(() => {
    if (!activeLabId) return
    ;(async () => {
      const { days } = await fetchTimetableWeek(activeLabId!, monday.format('YYYY-MM-DD'))
      const d: Record<string, TimetableCell | null> = {}
      const currentLab = labs.find(l => l.id === activeLabId)
      const labCapacity = currentLab?.capacity || 30
      
      days.forEach(day => {
        day.slots.forEach(slot => {
          const key = `${day.dayOfWeek}-${slot.period}`
          const session = slot.session
          d[key] = session ? ({
            id: session.id,
            course: session.course,
            teacher: session.teacher,
            content: session.content,
            enrolled: session.planned,
            capacity: labCapacity, // 以当前教室容量为准
            allow_makeup: session.planned < labCapacity,
          duration: session.duration,
            classNames: (session as any).class_names || null,
          }) : null
        })
      })
      setCells(d)
    })()
  }, [activeLabId, monday, labs])

  // 打开某节次的编辑面板。参数: weekday 周几, p 节次。
  const onCellClick = (weekday: number, p: number) => {
    console.log('onCellClick triggered. weekday:', weekday, 'p:', p)
    const exist = cells[`${weekday}-${p}`] ?? undefined
    console.log('Cell data:', exist)
    
    setEditing({ weekday, p, exist: exist ?? undefined })
    
    // 重置并回填表单。
    form.resetFields()
    form.setFieldsValue({
      weekday, 
      p,
      course: exist?.course || '',
      teacher: exist?.teacher || '',
      content: exist?.content || '',
      enrolled: exist?.enrolled ?? 0,
      duration: exist?.duration ?? 2,
      classNames: exist?.classNames || '',
    })
    console.log('Form values set:', {
      weekday, 
      p,
      course: exist?.course || '',
      teacher: exist?.teacher || '',
      content: exist?.content || '',
      enrolled: exist?.enrolled ?? 0,
      duration: exist?.duration ?? 2,
    })
    setVisible(true)
  }

  // 保存单节或多节课程。参数: v 表单值。
  const save = async (v: any) => {
    if (!activeLabId) return
    
    // 判断是否更改了时间位置。
    const originalWeekday = editing?.weekday
    const originalPeriod = editing?.p
    const timeChanged = originalWeekday !== v.weekday || originalPeriod !== v.p
    
    // 编辑且时间变更时，走多课时移动逻辑。
    if (editing?.exist?.id && timeChanged) {
      console.log('🔄 检测到节次变化，调用多课时更新逻辑')
      await handleMultiDurationUpdate(v)
      return
    }
    
    // 新建课程时检查新位置是否冲突。
    if (timeChanged && !editing?.exist?.id) {
      const newKey = `${v.weekday}-${v.p}`
      const existingCourse = cells[newKey]
      
      if (existingCourse) {
        // 新位置已有课程，提示是否覆盖。
        Modal.confirm({
          title: '时间冲突',
          content: `新时间位置已有课程"${existingCourse.course}"，是否覆盖？`,
          okText: '覆盖',
          cancelText: '取消',
          onOk: async () => {
            // 用户确认覆盖后保存。
            await performSave(v)
          },
          onCancel: () => {
            // 用户取消，不保存。
            return
          }
        })
        return
      }
    }
    
    // 无冲突时直接保存。
    await performSave(v)
  }
  
  // 执行保存动作（新建或更新）。参数: v 表单值。
  const performSave = async (v: any) => {
    if (!activeLabId) return
    
    // 判断当前是否多课时课程的一部分。
    const currentKey = `${v.weekday}-${v.p}`
    const currentCell = cells[currentKey]
    
    // 编辑现有课程时处理多课时逻辑。
    if (editing?.exist?.id) {
      // 多课时课程保持原有课时数。
      console.log('🔄 多课时课程跳过自动调整，保持原有课时数:', v.duration)
      await handleMultiDurationUpdate(v)
    } else {
      // 新建课程时，按剩余节次自动调整课时数。
      const maxAvailablePeriods = 8 - v.p + 1 // 从当前节次到第 8 节的最大可用课时数
      const adjustedDuration = Math.min(v.duration, maxAvailablePeriods)
      
      if (adjustedDuration !== v.duration) {
        message.warning(`课时已自动调整为 ${adjustedDuration}，因为第${v.p}节最多只能设置 ${maxAvailablePeriods} 课时`)
        v.duration = adjustedDuration
      }
      
      await saveSession(activeLabId, v.weekday, v.p, {
        id: editing?.exist?.id,
        course: v.course,
        teacher: v.teacher,
        content: v.content,
        enrolled: v.enrolled,
        duration: v.duration,
        classNames: v.classNames || undefined,
      }, monday.format('YYYY-MM-DD'))
    }
    
    message.success('已保存')
    setVisible(false)
    
    // 刷新课表数据。
    await refreshTimetableData()
  }

  // 处理多课时课程更新与移动。参数: v 表单值。
  const handleMultiDurationUpdate = async (v: any) => {
    const originalDuration = editing?.exist?.duration || 1
    const newDuration = v.duration || 1
    const originalStartPeriod = editing?.p || v.p
    const originalWeekday = editing?.weekday || v.weekday
    const newStartPeriod = v.p
    const newWeekday = v.weekday
    
    console.log('🔄 处理多课时更新 - 详细参数:', {
      originalDuration,
      newDuration,
      originalStartPeriod,
      originalWeekday,
      newStartPeriod,
      newWeekday,
      course: v.course,
      id: editing?.exist?.id,
      'v对象完整内容': v
    })
    
    // 判断是否移动了起始时间。
    const positionChanged = originalStartPeriod !== newStartPeriod || originalWeekday !== newWeekday
    
    if (positionChanged) {
      console.log('🚚 检测到节次变化，使用新的移动逻辑')
      
      // 1) 暂存课程信息。
      console.log('💾 步骤1: 存储完整信息到中间变量')
      const tempCourseInfo = {
        course: v.course,
        teacher: v.teacher,
        content: v.content,
        enrolled: v.enrolled,
        duration: newDuration,
        weekday: newWeekday,
        startPeriod: newStartPeriod,
        classNames: v.classNames || undefined
      }
      console.log('💾 存储的课程信息:', tempCourseInfo)
      
      // 2) 删除原课程（与删除按钮同逻辑）。
      console.log('🗑️ 步骤2: 删除原课程')
      console.log('🗑️ 开始删除课程:', {
        startPeriod: originalStartPeriod,
        duration: originalDuration,
        weekday: originalWeekday,
        course: v.course
      })
      
      // 删除所有相关课时。
      for (let i = 0; i < originalDuration; i++) {
        const period = originalStartPeriod + i
        const key = `${originalWeekday}-${period}`
        const cell = cells[key]
        
        console.log(`🔍 检查第${period}节课:`, { key, cell })
        
        if (cell?.id) {
          try {
            console.log(`🗑️ 删除第${period}节课，ID: ${cell.id}`)
            await deleteSession(activeLabId!, cell.id, monday.format('YYYY-MM-DD'))
            console.log(`✅ 第${period}节课删除成功`)
          } catch (error) {
            console.warn(`❌ 删除第${period}节课失败:`, error)
          }
        } else {
          console.warn(`⚠️ 第${period}节课没有找到cell或id`)
        }
      }
      
      // 3) 等待删除完成并刷新数据。
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log('🔄 删除后强制刷新数据...')
      await refreshTimetableData()
      
      // 4) 在新位置创建课程（仅创建第一个课时，后端扩展多课时）。
      console.log('📋 步骤4: 在新位置生成课程')
      console.log(`📍 起始位置: 第${tempCourseInfo.weekday}周第${tempCourseInfo.startPeriod}节课`)
      console.log(`📍 课时数: ${tempCourseInfo.duration}课时`)
      
      // 仅创建第一个课时，后端根据 duration 扩展。
      try {
        console.log(`📝 创建第${tempCourseInfo.weekday}周第${tempCourseInfo.startPeriod}节课（${tempCourseInfo.duration}课时）`)
        await saveSession(activeLabId!, tempCourseInfo.weekday, tempCourseInfo.startPeriod, {
          course: tempCourseInfo.course,
          teacher: tempCourseInfo.teacher,
          content: tempCourseInfo.content,
          enrolled: tempCourseInfo.enrolled,
          duration: tempCourseInfo.duration,
          classNames: tempCourseInfo.classNames,
        }, monday.format('YYYY-MM-DD'))
        console.log(`✅ 第${tempCourseInfo.startPeriod}节课创建成功（${tempCourseInfo.duration}课时）`)
      } catch (error) {
        console.error(`❌ 第${tempCourseInfo.startPeriod}节课创建失败:`, error)
      }
      
    } else {
      // 未移动起始时间时，仅同步更新信息。
      console.log('📝 节次未变化，同步更新所有课时的信息...')
      for (let i = 0; i < originalDuration; i++) {
        const period = originalStartPeriod + i
        const key = `${originalWeekday}-${period}`
        const cell = cells[key]
        
        if (cell?.id) {
          try {
            console.log(`📝 更新第${period}节课，ID: ${cell.id}`)
            await saveSession(activeLabId!, originalWeekday, period, {
              id: cell.id,
              course: v.course,
              teacher: v.teacher,
              content: v.content,
              enrolled: v.enrolled,
              duration: newDuration,
              classNames: v.classNames || undefined,
            }, monday.format('YYYY-MM-DD'))
            console.log(`✅ 第${period}节课更新成功`)
          } catch (error) {
            console.warn(`❌ 更新第${period}节课失败:`, error)
          }
        }
      }
    }
    
    console.log('✅ 多课时更新完成')
    
    // 刷新课表数据以更新界面。
    await refreshTimetableData()
    
    // 关闭编辑卡片并提示。
    message.success('已保存')
    setVisible(false)
  }

  // 刷新课表数据。
  const refreshTimetableData = async () => {
    const { days } = await fetchTimetableWeek(activeLabId!, monday.format('YYYY-MM-DD'))
    const d: Record<string, TimetableCell | null> = {}
    const currentLab = labs.find(l => l.id === activeLabId)
    const labCapacity = currentLab?.capacity || 30
    
    days.forEach(day => {
      day.slots.forEach(slot => {
        const key = `${day.dayOfWeek}-${slot.period}`
        const session = slot.session
        d[key] = session ? ({
          id: session.id,
          course: session.course,
          teacher: session.teacher,
          content: session.content,
          enrolled: session.planned,
          capacity: labCapacity, // 以当前教室容量为准
          allow_makeup: session.planned < labCapacity,
          duration: session.duration,
        }) : null
      })
    })
    setCells(d)
    
    // 自动刷新大屏数据。
    try {
      await triggerScreenRefresh()
    } catch (error) {
      console.warn('刷新大屏失败:', error)
    }
  }

  const remove = async () => {
    if (!activeLabId || !editing?.exist?.id) return
    
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这节课程吗？',
      onOk: async () => {
        await removeEntireSession()
      }
    })
  }

  // 删除整段课时（包含所有相关课时）。
  const removeEntireSession = async () => {
    if (!activeLabId || !editing?.exist?.id) return
    
    const duration = editing.exist.duration || 1
    const startPeriod = editing.p
    
    console.log('🗑️ 开始删除课程:', {
      startPeriod,
      duration,
      weekday: editing.weekday,
      course: editing.exist.course
    })
    
    // 删除所有相关课时。
    for (let i = 0; i < duration; i++) {
      const period = startPeriod + i
      const key = `${editing.weekday}-${period}`
      const cell = cells[key]
      
      console.log(`🔍 检查第${period}节课:`, { key, cell })
      
      if (cell?.id) {
        try {
          console.log(`🗑️ 删除第${period}节课，ID: ${cell.id}`)
          await deleteSession(activeLabId!, cell.id, monday.format('YYYY-MM-DD'))
          console.log(`✅ 第${period}节课删除成功`)
        } catch (error) {
          console.warn(`❌ 删除第${period}节课失败:`, error)
        }
      } else {
        console.warn(`⚠️ 第${period}节课没有找到cell或id`)
      }
    }
    
    message.success(`已删除整个课时（${duration}节课）`)
    setVisible(false)
    await refreshTimetableData()
  }


  // 导出课表数据（多教室）。
  const handleExportTimetable = async () => {
    try {
      // 获取要导出的教室列表（最多前 5 个）。
      const allLabs = labs.slice(0, 5)
      if (allLabs.length === 0) {
        message.error('没有可用的实验室')
        return
      }

      // 学期时间范围（默认 9 月至次年 2 月）。
      const currentYear = new Date().getFullYear()
      const semesterStart = new Date(currentYear, 8, 1) // 9月1日
      const semesterEnd = new Date(currentYear + 1, 1, 28) // 次年2月28日
      
      // 为每个教室收集课表数据。
      const labTimetableData: Record<string, any[]> = {}
      
      for (const lab of allLabs) {
        labTimetableData[lab.name] = []
        const currentDate = new Date(semesterStart)
        
        while (currentDate <= semesterEnd) {
          const mondayDate = new Date(currentDate)
          const dayOfWeek = currentDate.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          mondayDate.setDate(currentDate.getDate() - daysToMonday)
          
          try {
            const { days } = await fetchTimetableWeek(lab.id, mondayDate.toISOString().split('T')[0])
            
            days.forEach(day => {
              day.slots.forEach(slot => {
                if (slot.session) {
                  labTimetableData[lab.name].push({
                    date: day.date,
                    period: slot.period,
                    course: slot.session.course,
                    teacher: slot.session.teacher,
                    content: slot.session.content,
                    planned: slot.session.planned,
                    lab: lab.name
                  })
                }
              })
            })
          } catch (error) {
            console.warn(`获取 ${lab.name} ${mondayDate.toISOString().split('T')[0]} 周课表失败:`, error)
          }
          
          // 移动到下一周。
          currentDate.setDate(currentDate.getDate() + 7)
        }
      }

      // 无数据时提示。
      const hasData = Object.values(labTimetableData).some(data => data.length > 0)
      if (!hasData) {
        message.warning('当前学期没有课表数据')
        return
      }

      // 导出到 Excel（每个教室一个工作表）。
      const semester = getCurrentSemester()
      exportTimetableToExcelMultiLab(labTimetableData, semester)
      message.success(`已导出 ${semester} 学期课表（包含 ${allLabs.length} 个教室）`)
    } catch (error) {
      console.error('导出课表失败:', error)
      message.error('导出课表失败')
    }
  }

  // 批量上传课表（跨周导入，容量/可补课由后端处理）。参数: data 表格行数据。
  const handleBatchUpload = async (data: any[]) => {
    if (!activeLabId) {
      message.error('请先选择实验室')
      return
    }

    const sessions = data.map(row => {
      const classNames = row.classNames || row['上课班级'] || undefined
      const plannedInput = row.planned ?? row['报课人数']
      
      // planned 规则：有人数字段优先；仅班级时由后端计算。
      return {
      date: row.date || row['日期'],
      period: Number(row.period || row['节次']),
      course: row.course || row['课程'],
      teacher: row.teacher || row['教师'],
      content: row.content || row['内容'] || '',
        classNames: classNames,
        planned: (plannedInput !== undefined && plannedInput !== null && plannedInput !== '') 
          ? Number(plannedInput) 
          : (classNames ? undefined : Number(plannedInput ?? 0)),
      duration: Number(row.duration ?? row['课时'] ?? 2),
      labId: Number(row.labId ?? row['labId'] ?? row['实验室id'] ?? row['教室id'] ?? NaN) || undefined,
      lab: row.lab || row['教室'] || row['实验室'] || undefined,
      }
    })

    // 预检（dryRun）。
    const dry = await batchUploadTimetable(activeLabId, monday.format('YYYY-MM-DD'), sessions, { dryRun: true })
    if (dry?.failed > 0 && Array.isArray(dry.errors)) {
      message.error(`预检失败 ${dry.failed} 条，请修正后再试`)
      return
    }

    console.log('上传数据:', sessions)
    console.log('上传参数:', { activeLabId, date: monday.format('YYYY-MM-DD'), sessions })
    
    const result = await batchUploadTimetable(activeLabId, monday.format('YYYY-MM-DD'), sessions)
    
    console.log('上传结果:', result)
    
    if (result.success > 0) {
      const inserted = result.inserted || 0
      const updated = result.updated || 0
      if (inserted > 0 && updated > 0) {
        message.success(`成功处理 ${result.success} 条课程数据：新增 ${inserted} 条，更新 ${updated} 条`)
      } else if (inserted > 0) {
        message.success(`成功新增 ${inserted} 条课程数据`)
      } else if (updated > 0) {
        message.success(`成功更新 ${updated} 条课程数据`)
      } else {
        message.success(`成功处理 ${result.success} 条课程数据`)
      }
      // 刷新课表。
      const { days } = await fetchTimetableWeek(activeLabId!, monday.format('YYYY-MM-DD'))
      const d: Record<string, TimetableCell | null> = {}
      const currentLab = labs.find(l => l.id === activeLabId)
      const labCapacity = currentLab?.capacity || 30
      
      days.forEach(day => {
        day.slots.forEach(slot => {
          const key = `${day.dayOfWeek}-${slot.period}`
          const session = slot.session
          d[key] = session ? ({
            id: session.id,
            course: session.course,
            teacher: session.teacher,
            content: session.content,
            enrolled: session.planned,
            capacity: labCapacity, // 以当前教室容量为准
            allow_makeup: session.planned < labCapacity,
          duration: session.duration,
            classNames: (session as any).class_names || null,
          }) : null
        })
      })
      setCells(d)
      
      // 自动刷新大屏数据。
      try {
        await triggerScreenRefresh()
      } catch (error: any) {
        console.warn('刷新大屏失败:', error)
      }
    }
    
    // 保存错误信息用于展示。
    if (result.failed > 0 && result.errors && result.errors.length > 0) {
      setUploadErrors(result.errors)
      const errorMessages = result.errors.slice(0, 5).map((error: any) => {
        if (typeof error === 'string') return error
        if (typeof error === 'object') {
          const index = error.index ? `第${error.index}行` : ''
          const field = error.field ? `${error.field}: ` : ''
          const msg = error.message || '未知错误'
          return index ? `${index} ${field}${msg}` : `${field}${msg}`
        }
        return String(error)
      }).join('; ')
      const moreErrors = result.errors.length > 5 ? ` 等共${result.errors.length}条错误` : ''
      message.warning(`部分数据上传失败：${errorMessages}${moreErrors}`)
    } else {
      setUploadErrors([])
      if (result.success === 0 && (!result.errors || result.errors.length === 0)) {
        message.error('上传失败，请检查数据格式')
      }
    }
    
    // 返回结果给 BatchUploader。
    return result
  }

  const weekRangeText = (() => {
    const d = monday.toDate()
    const dayOfWeek = d.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const mon = new Date(d); mon.setDate(d.getDate() - daysToMonday)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    const fmt = (x: Date) => `${x.getFullYear()}-${`${x.getMonth()+1}`.padStart(2,'0')}-${`${x.getDate()}`.padStart(2,'0')}`
    return `${fmt(mon)} ～ ${fmt(sun)}`
  })()

  // 计算周数（基于学期开始日期）。参数: date 日期。
  const getWeekNumber = (date: Dayjs) => {
    // 以配置的学期开始日期为准。
    const semesterStart = semesterStartMonday ? dayjs(semesterStartMonday) : dayjs('2025-09-01')
    const weekDiff = date.diff(semesterStart, 'week')
    const weekNo = Math.max(1, weekDiff + 1)
    
    // 调试输出周次计算过程。
    console.log('周数计算调试:', {
      selectedDate: date.format('YYYY-MM-DD'),
      semesterStart: semesterStart.format('YYYY-MM-DD'),
      semesterStartMonday,
      weekDiff,
      weekNo
    })
    
    return weekNo
  }

  const currentWeekNumber = getWeekNumber(monday)

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <div className="timetable-controls">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'grid',
                label: '课表网格',
              },
              {
                key: 'upload',
                label: '批量上传',
              },
            ]}
            style={{ flex: 1 }}
          />
          <Button 
            type="primary" 
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleExportTimetable}
            style={{ marginLeft: 16 }}
          >
            导出课表
          </Button>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Select
              value={activeLabId}
              onChange={setActiveLabId}
              style={{ width: 200 }}
              placeholder="选择教室"
            >
              {labs.map(lab => (
                <Select.Option key={lab.id} value={lab.id}>
                  {lab.name}
                </Select.Option>
              ))}
            </Select>
            <DatePicker
              value={monday}
              onChange={setMonday}
              picker="week"
              format="YYYY-MM-DD"
              style={{ width: 220 }}
              placeholder="选择周次"
              renderExtraFooter={() => (
                <div className="week-indicator">
                  第 {currentWeekNumber} 周 ({weekRangeText})
                </div>
              )}
              inputReadOnly
            />
          </div>
        </div>
      </div>

      {activeTab === 'grid' && (
        <div className="timetable-grid-container">
          <LabPeriodGrid
            data={cells}
            onCellClick={onCellClick}
          />
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="batch-upload-section">
          <BatchUploader
            title="课表数据"
            accept=".xlsx,.xls,.csv"
            onUpload={handleBatchUpload}
            columns={timetableColumns}
            dataKey="timetable"
            notice="支持跨周上传，文件中的日期决定上课时间。容量和可补课字段已移除，容量使用教室默认值，可补课根据报课人数自动计算。如果文件中有教室字段则使用指定教室，否则使用当前选中的教室。支持Excel(.xlsx/.xls)和CSV(.csv)格式。"
            validate={async (rows:any[])=>{
              const sessions = rows.map(row => {
                const classNames = row.classNames || row['上课班级'] || undefined
                const plannedInput = row.planned ?? row['报课人数']
                return {
                date: row.date || row['日期'],
                period: Number(row.period || row['节次']),
                course: row.course || row['课程'],
                teacher: row.teacher || row['教师'],
                content: row.content || row['内容'] || '',
                  classNames: classNames,
                  planned: (plannedInput !== undefined && plannedInput !== null && plannedInput !== '') 
                    ? Number(plannedInput) 
                    : (classNames ? undefined : Number(plannedInput ?? 0)),
                  duration: row.duration || row['课时'] || 2,
                labId: Number(row.labId ?? row['labId'] ?? row['实验室id'] ?? row['教室id'] ?? NaN) || undefined,
                lab: row.lab || row['教室'] || row['实验室'] || undefined,
                教室: row['教室'],
                实验室: row['实验室']
                }
              })
              const dry = await batchUploadTimetable(activeLabId!, monday.format('YYYY-MM-DD'), sessions, { dryRun: true })
              return { errors: Array.isArray(dry?.errors) ? dry.errors : [] }
            }}
          />
          {uploadErrors.length > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              background: '#fff1f0', 
              border: '1px solid #ffccc7', 
              borderRadius: 4,
              maxHeight: '60vh',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#cf1322', fontSize: 16 }}>
                上传错误详情（共 {uploadErrors.length} 条）：
              </div>
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                padding: '8px 0',
                minHeight: 0
              }}>
                {uploadErrors.map((error, idx) => (
                  <div key={idx} style={{ 
                    marginBottom: 8, 
                    padding: 10, 
                    background: '#fff', 
                    borderRadius: 4,
                    fontSize: 13,
                    lineHeight: 1.5
                  }}>
                    <span style={{ color: '#cf1322', fontWeight: 'bold', fontSize: 14 }}>
                      第{error.index}行
                    </span>
                    {error.field && (
                      <span style={{ color: '#595959', marginLeft: 10, fontSize: 13 }}>
                        [{error.field}]
                      </span>
                    )}
                    <span style={{ color: '#262626', marginLeft: 10, fontSize: 13 }}>
                      {error.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        title={editing?.exist ? '编辑课程' : '添加课程'}
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        className="timetable-modal"
      >
        <Form
          form={form}
          initialValues={editing?.exist ? {
            weekday: editing.weekday,
            p: editing.p,
            course: editing.exist.course,
            teacher: editing.exist.teacher,
            content: editing.exist.content,
            enrolled: editing.exist.enrolled,
            classNames: editing.exist.classNames || '',
          } : {
            weekday: editing?.weekday,
            p: editing?.p,
            course: '',
            teacher: '',
            content: '',
            enrolled: 0,
            classNames: '',
          }}
          onFinish={save}
          layout="vertical"
        >
          <Form.Item name="weekday" label="星期" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={1}>星期一</Select.Option>
              <Select.Option value={2}>星期二</Select.Option>
              <Select.Option value={3}>星期三</Select.Option>
              <Select.Option value={4}>星期四</Select.Option>
              <Select.Option value={5}>星期五</Select.Option>
              <Select.Option value={6}>星期六</Select.Option>
              <Select.Option value={0}>星期日</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="p" label="节次" rules={[{ required: true }]}>
            <Select>
              <Select.Option value={1}>第1节</Select.Option>
              <Select.Option value={2}>第2节</Select.Option>
              <Select.Option value={3}>第3节</Select.Option>
              <Select.Option value={4}>第4节</Select.Option>
              <Select.Option value={5}>第5节</Select.Option>
              <Select.Option value={6}>第6节</Select.Option>
              <Select.Option value={7}>第7节</Select.Option>
              <Select.Option value={8}>第8节</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="course" label="课程" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="teacher" label="教师" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="内容">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item 
            name="classNames" 
            label="上课班级"
            tooltip="多个班级用逗号或顿号分隔，如：计算机1班,计算机2班 或 计算机1班、计算机2班。如果只填写了班级，报课人数会自动计算。"
          >
            <Input placeholder="例如：计算机1班,计算机2班" />
          </Form.Item>
          <Form.Item 
            name="enrolled" 
            label="报课人数" 
            rules={[{ required: true }]}
            tooltip="如果同时填写了上课班级和报课人数，优先使用输入的报课人数。如果只填写了上课班级，会自动计算。"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="duration" label="课时" rules={[{ required: true }]} initialValue={2}>
            <InputNumber min={1} max={8} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editing?.exist ? '保存' : '添加'}
              </Button>
              {editing?.exist && (
                <Button danger onClick={remove}>
                  删除
                </Button>
              )}
              <Button onClick={() => setVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

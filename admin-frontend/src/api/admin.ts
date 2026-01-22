// 功能：管理端后端接口封装（实验室、课表、项目与全局配置）。
import { http } from './http'
import type { BannerConfig, Lab, Project, ProjectStatus, TimetableCell, TimetableWeekResponse, VisualizationConfig } from '../types'

// 实验室与课表
export async function fetchLabs(): Promise<Lab[]> {
  // 先请求 /labs；失败时从 /render 推断实验室列表。
  try {
    const { data } = await http.get('/labs')
    return data as Lab[]
  } catch {
    // 兜底：从渲染数据推断（后端未提供 /labs 列表时使用）。
    const { data } = await http.get('/render')
    const spot = (data?.spotlight ?? []) as Array<{ lab_id: number; lab: string; capacity: number }>
    return spot.map(s => ({ id: s.lab_id, name: s.lab, capacity: s.capacity }))
  }
}

export async function updateLabCapacity(id: number, capacity: number) {
  const { data } = await http.patch(`/labs/${id}`, { capacity })
  return data
}

export async function fetchCourses(): Promise<string[]> {
  const { data } = await http.get('/labs/courses')
  return data
}

export async function fetchTimetableWeek(labId: number, dateISO: string) {
  const { data } = await http.get(`/labs/${labId}/timetable`, { params: { date: dateISO } })
  return data as TimetableWeekResponse
}

// 保存单个课时：先取整周课表，替换目标课时后整体提交。
// 参数：labId 实验室ID，weekday 周几(1-7)，p 节次(1-8)，payload 课时内容，mondayDate 周一日期(可选)。
export async function saveSession(labId: number, weekday: number, p: number, payload: TimetableCell, mondayDate?: string) {
  try {
    // 计算周一日期（未传入时取当前周一）。
    let monday: Date
    if (mondayDate) {
      monday = new Date(mondayDate)
    } else {
      const currentDate = new Date()
      monday = new Date(currentDate)
      const dayOfWeek = currentDate.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      monday.setDate(currentDate.getDate() - daysToMonday)
    }
    
    const { data: weekData } = await http.get(`/labs/${labId}/timetable`, {
      params: { date: monday.toISOString().split('T')[0] }
    })
    
    // 构建当前周的 sessions 列表（保留已有内容，仅替换目标课时）。
    const sessions = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = i + 1 // 1-7
      
      for (let period = 1; period <= 8; period++) {
        const existingSession = weekData.days[i]?.slots[period - 1]?.session
        if (existingSession || (dayOfWeek === weekday && period === p)) {
          if (dayOfWeek === weekday && period === p) {
            // 目标课时：planned 以输入人数为优先；仅有班级时由后端计算。
            const classNames = payload.classNames || undefined
            const plannedInput = payload.enrolled
            
            sessions.push({
              date: dateStr,
              period,
              course: payload.course || '',
              teacher: payload.teacher || '',
              content: payload.content || '',
              planned: (plannedInput !== undefined && plannedInput !== null && plannedInput !== 0) 
                ? plannedInput 
                : (classNames ? undefined : (plannedInput ?? 0)),
              duration: payload.duration || 2,
              classNames: classNames,
              // capacity/allow_makeup 由后端计算
            })
          } else if (existingSession) {
            // 其他课时保持不变。
            sessions.push({
              date: dateStr,
              period,
              course: existingSession.course || '',
              teacher: existingSession.teacher || '',
              content: existingSession.content || '',
              planned: existingSession.planned || 0,
              duration: existingSession.duration || 2,
              classNames: (existingSession as any).class_names || undefined,
              // capacity/allow_makeup 由后端覆盖
            })
          }
        }
      }
    }
    
    // 提交整周课表。
    const { data } = await http.put(`/labs/${labId}/timetable`, { sessions }, {
      params: { date: monday.toISOString().split('T')[0] }
    })
    return data
  } catch (e:any) {
    throw new Error(e?.response?.data?.message ?? '保存课时失败')
  }
}

// 删除单个课时：从整周列表中过滤后整体提交。
// 参数：labId 实验室ID，sessionId 课时ID，mondayDate 周一日期(可选)。
export async function deleteSession(labId: number, sessionId: number, mondayDate?: string) {
  try {
    // 计算周一日期（未传入时取当前周一）。
    let monday: Date
    if (mondayDate) {
      monday = new Date(mondayDate)
    } else {
      const currentDate = new Date()
      monday = new Date(currentDate)
      const dayOfWeek = currentDate.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      monday.setDate(currentDate.getDate() - daysToMonday)
    }
    
    const { data: weekData } = await http.get(`/labs/${labId}/timetable`, {
      params: { date: monday.toISOString().split('T')[0] }
    })
    
    // 构建当前周 sessions（排除目标课时）。
    const sessions = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      for (let period = 1; period <= 8; period++) {
        const existingSession = weekData.days[i]?.slots[period - 1]?.session
        if (existingSession && existingSession.id !== sessionId) {
          // 保留其它课时。
          sessions.push({
            date: dateStr,
            period,
            course: existingSession.course || '',
            teacher: existingSession.teacher || '',
            content: existingSession.content || '',
            planned: existingSession.planned || 0,
            // capacity/allow_makeup 由后端覆盖
          })
        }
      }
    }
    
    // 提交整周课表（不包含目标课时）。
    const { data } = await http.put(`/labs/${labId}/timetable`, { sessions }, {
      params: { date: monday.toISOString().split('T')[0] }
    })
    return data
  } catch (e:any) {
    throw new Error(e?.response?.data?.message ?? '删除课时失败')
  }
}

// 项目管理
export async function fetchProjects(params?: { year?: number; excellent?: 0 | 1 }) {
  const { data } = await http.get('/projects', { params })
  return data as Project[]
}

export async function createProject(p: Omit<Project, 'id'>) {
    const { data } = await http.post('/projects', p)
    return data as Project
  }
  

export async function updateProject(id: number, patch: Partial<Project>) {
  const { data } = await http.patch(`/projects/${id}`, patch)
  return data as Project
}

export async function deleteProject(id: number, purgeImages: boolean = true) {
  const { data } = await http.delete(`/projects/${id}?purgeImages=${purgeImages}`)
  return data
}

export async function uploadProjectImage(projectId: number, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  
  const { data } = await http.post(`/projects/${projectId}/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  
  return data.cover_url
}

export async function uploadProjectPaper(projectId: number, file: File): Promise<{ paper_url: string; paper_filename: string }> {
  const formData = new FormData()
  formData.append('paper', file)
  
  const { data } = await http.post(`/projects/${projectId}/papers`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  
  return { paper_url: data.paper_url, paper_filename: data.paper_filename }
}

export async function deleteProjectPaper(projectId: number): Promise<{ message: string }> {
  const { data } = await http.delete(`/projects/${projectId}/papers`)
  return { message: data.message }
}

export async function uploadProjectVideo(projectId: number, file: File): Promise<{ video_url: string; video_filename: string }> {
  const formData = new FormData()
  formData.append('video', file)
  
  const { data } = await http.post(`/projects/${projectId}/videos`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  
  return { video_url: data.video_url, video_filename: data.video_filename }
}

export async function deleteProjectVideo(projectId: number): Promise<{ message: string }> {
  const { data } = await http.delete(`/projects/${projectId}/videos`)
  return { message: data.message }
}

export async function deleteProjectImage(projectId: number): Promise<{ message: string }> {
  const { data } = await http.delete(`/projects/${projectId}/images`)
  return { message: data.message }
}

export async function fixProjectPaperUrl(projectId: number): Promise<{ message: string; old_url: string; new_url: string }> {
  const { data } = await http.patch(`/projects/${projectId}/fix-paper-url`)
  return data
}

export async function batchCreateProjects(projects: any[]) {
  const { data } = await http.post('/projects/batch', { projects })
  return data
}

export async function clearAllData(): Promise<{ success: boolean; message: string }> {
  const { data } = await http.post('/projects/clear-all-data')
  return data
}

// 清空课表
export async function clearTimetableData(labId?: number): Promise<{ success: boolean; message: string }> {
  const { data } = await http.post('/labs/clear-timetable', { labId })
  return data
}

// 清空项目
export async function clearProjectsData(year?: number): Promise<{ success: boolean; message: string }> {
  const { data } = await http.post('/projects/clear-projects', { year })
  return data
}

// 清空项目视频
export async function clearAllVideos(): Promise<{ success: boolean; message: string }> {
  const { data } = await http.post('/projects/clear-all-videos')
  return data
}

// 获取项目年份列表
export async function fetchProjectYears(): Promise<number[]> {
  const { data } = await http.get('/projects/years')
  return data
}

// 班级管理
export interface Class {
  id: number
  name: string
  major: string | null
  student_count: number
}

export async function fetchClasses(): Promise<Class[]> {
  const { data } = await http.get('/classes')
  return data
}

export async function createClass(payload: { name: string; major?: string; student_count: number }): Promise<Class> {
  const { data } = await http.post('/classes', payload)
  return data
}

export async function updateClass(id: number, payload: { name?: string; major?: string; student_count?: number }): Promise<Class> {
  const { data } = await http.put(`/classes/${id}`, payload)
  return data
}

export async function deleteClass(id: number): Promise<void> {
  await http.delete(`/classes/${id}`)
}

export async function batchCreateClasses(classes: Array<{ name: string; major?: string; student_count: number }>): Promise<{ success: number; failed: number; errors: string[] }> {
  const { data } = await http.post('/classes/batch', { classes })
  return data
}

// 清空班级
export async function clearAllClasses(): Promise<{ success: boolean; message: string }> {
  const { data } = await http.post('/classes/clear-all-classes')
  return data
}

export async function batchUploadTimetable(labId: number, date: string, sessions: any[], opts?: { dryRun?: boolean }) {
  const { data } = await http.post(`/labs/${labId}/timetable/batch`, { sessions }, {
    params: { date, dryRun: opts?.dryRun ? 'true' : undefined }
  })
  return data
}

// 全局配置
export async function fetchBanner(): Promise<BannerConfig | null> {
  try {
    const { data } = await http.get('/announcement/banner')
    return data ?? null
  } catch {
    return null
  }
}

export async function updateBanner(b: BannerConfig) {
  const { data } = await http.put('/announcement/banner', b)
  return data
}

export async function fetchSeason() {
  const { data } = await http.get('/configs/season')
  return data as { summerStart: string; summerEnd: string }
}

export async function updateSeason(payload: { summerStart: string; summerEnd: string }) {
  const { data } = await http.put('/configs/season', payload)
  return data
}

export async function fetchSemesterStart() {
  const { data } = await http.get('/config/semesterStart')
  return data as { semesterStartMonday: string }
}

export async function updateSemesterStart(payload: { date: string }) {
  const { data } = await http.put('/config/semesterStart', payload)
  return data as { semesterStartMonday: string }
}

// 触发大屏配置版本号刷新
export async function triggerScreenRefresh() {
  const { data } = await http.post('/config/bump')
  return data as { value: number }
}

// 大屏显示模式
export async function fetchScreenDisplayMode() {
  const { data } = await http.get('/config/screen/display-mode')
  return data as { mode: 'fixed' | 'adaptive' }
}

export async function updateScreenDisplayMode(mode: 'fixed' | 'adaptive') {
  const { data } = await http.put('/config/screen/display-mode', { mode })
  return data as { mode: 'fixed' | 'adaptive' }
}

// 大屏固定模式参数
export async function fetchScreenFixedConfig() {
  const { data } = await http.get('/config/screen/fixed-config')
  return data as { width: number; height: number; scale: number }
}

export async function updateScreenFixedConfig(config: { width: number; height: number; scale: number }) {
  const { data } = await http.put('/config/screen/fixed-config', config)
  return data as { width: number; height: number; scale: number }
}

// 大屏可视化配置
export async function fetchVisualizationConfig() {
  const { data } = await http.get('/config/visualization')
  return data as VisualizationConfig
}

export async function updateVisualizationConfig(config: VisualizationConfig) {
  const { data } = await http.put('/config/visualization', config)
  return data as VisualizationConfig
}

// 训练营标题配置
export async function fetchProjectListTitle() {
  const { data } = await http.get('/config/project-list-title')
  return data as { title: string }
}

export async function updateProjectListTitle(title: string) {
  const { data } = await http.put('/config/project-list-title', { title })
  return data as { title: string }
}

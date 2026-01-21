import { http } from './http'
import type { BannerConfig, Lab, Project, ProjectStatus, TimetableCell, TimetableWeekResponse, VisualizationConfig } from '../types'

// ---- Labs ------------------------------------------------------------------
export async function fetchLabs(): Promise<Lab[]> {
  // 优先尝试 /api/labs；若没有该接口，可从 /api/render 补全名称与 id 的映射
  try {
    const { data } = await http.get('/labs')
    return data as Lab[]
  } catch {
    // 兜底：从渲染接口推断（若后端不提供 /labs 列表）
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

// 保存单个课时 - 需要先获取当前周课表，修改后重新提交
export async function saveSession(labId: number, weekday: number, p: number, payload: TimetableCell, mondayDate?: string) {
  try {
    // 获取指定周的课表，如果没有指定则使用当前周
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
    
    // 构建当前周的 sessions 数组
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
            // 这是我们要修改的课时
            // 如果同时填写了报课人数和班级，优先使用输入的报课人数
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
              // capacity/allow_makeup 后端自动计算
            })
          } else if (existingSession) {
            // 保持其他现有课时
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
    
    // 提交整个周的课表
    const { data } = await http.put(`/labs/${labId}/timetable`, { sessions }, { 
      params: { date: monday.toISOString().split('T')[0] } 
    })
    return data
  } catch (e:any) {
    throw new Error(e?.response?.data?.message ?? '保存课时失败')
  }
}

export async function deleteSession(labId: number, sessionId: number, mondayDate?: string) {
  try {
    // 获取指定周的课表，如果没有指定则使用当前周
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
    
    // 构建当前周的 sessions 数组，排除要删除的 session
    const sessions = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      for (let period = 1; period <= 8; period++) {
        const existingSession = weekData.days[i]?.slots[period - 1]?.session
        if (existingSession && existingSession.id !== sessionId) {
          // 保持其他现有课时，排除要删除的
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
    
    // 提交整个周的课表（不包含要删除的 session）
    const { data } = await http.put(`/labs/${labId}/timetable`, { sessions }, { 
      params: { date: monday.toISOString().split('T')[0] } 
    })
    return data
  } catch (e:any) {
    throw new Error(e?.response?.data?.message ?? '删除课时失败')
  }
}

// ---- Projects ---------------------------------------------------------------
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

// 删除课表数据
export async function clearTimetableData(labId?: number): Promise<{ success: boolean; message: string }> {
  const { data } = await http.post('/labs/clear-timetable', { labId })
  return data
}

// 删除项目数据
export async function clearProjectsData(year?: number): Promise<{ success: boolean; message: string }> {
  const { data } = await http.post('/projects/clear-projects', { year })
  return data
}

// 删除所有视频
export async function clearAllVideos(): Promise<{ success: boolean; message: string }> {
  const { data } = await http.post('/projects/clear-all-videos')
  return data
}

// 获取所有项目年份
export async function fetchProjectYears(): Promise<number[]> {
  const { data } = await http.get('/projects/years')
  return data
}

// ---- Classes ------------------------------------------------------------------
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

// 删除所有班级
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

// ---- Global Configs --------------------------------------------------------
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

// 刷新大屏版本号
export async function triggerScreenRefresh() {
  const { data } = await http.post('/config/bump')
  return data as { value: number }
}

// 大屏显示模式配置
export async function fetchScreenDisplayMode() {
  const { data } = await http.get('/config/screen/display-mode')
  return data as { mode: 'fixed' | 'adaptive' }
}

export async function updateScreenDisplayMode(mode: 'fixed' | 'adaptive') {
  const { data } = await http.put('/config/screen/display-mode', { mode })
  return data as { mode: 'fixed' | 'adaptive' }
}

// 大屏固定模式配置
export async function fetchScreenFixedConfig() {
  const { data } = await http.get('/config/screen/fixed-config')
  return data as { width: number; height: number; scale: number }
}

export async function updateScreenFixedConfig(config: { width: number; height: number; scale: number }) {
  const { data } = await http.put('/config/screen/fixed-config', config)
  return data as { width: number; height: number; scale: number }
}

// 可视化配置
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

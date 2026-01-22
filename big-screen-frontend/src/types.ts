// 功能：旧版大屏类型定义（部分兼容保留）。
export type Banner = {
    content: string
    level: 'info' | 'warning' | 'urgent'
    expiresAt?: string
  }
  
  export type Spotlight = {
    id: number
    time: string
    course: string
    teacher: string
    content: string
    planned: number
    capacity: number
    status: 'ongoing' | 'upcoming'
    full: boolean
  }
  
  export type LabSpot = {
    lab_id: number
    lab: string
    capacity: number
    spotlight: Spotlight | null
  }
  
  export type KPI = {
    courseTotals: number
    attendance: number
    utilization: number
  }
  
  export type Heatmap = {
    labs: string[]        // ['全部','西116',...]
    matrix: number[][]    // 8 x N（行：课时，列：周）
    weeks?: string[]      // 可选
  }
  
  export type Excellent = {
    id: number
    title: string
    year: number
    mentor?: string
    cover_url?: string
  }
  
  export type Project = {
    id: number
    title: string
    mentor: string
    member_count: number
    status: 'reviewing'|'ongoing'|'done'|'excellent' // excellent 仅作为徽标使用
    excellent?: boolean
  }
  
  export type Stats5y = { year: number; projects: number; participants: number }
  
  export type RenderPayload = {
    date: string
    banner: Banner | null
    spotlight: LabSpot[]
    kpi: KPI
    heatmap: Heatmap
    excellent: Excellent[]
    projects: Project[]
    projectStats5y: Stats5y[]
  }
  
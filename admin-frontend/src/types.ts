// 功能：管理端使用的共享类型定义。
export type BannerLevel = 'info' | 'warning' | 'urgent'

export interface BannerConfig {
  content: string
  level: BannerLevel
  expiresAt?: string | null
  visible: boolean
  scrollable: boolean
  scrollTime: number
}

export interface Lab { id: number; name: string; capacity: number }

export type ProjectStatus = 'reviewing' | 'ongoing' | 'done'

export interface Project {
  id: number
  title: string
  mentor: string
  member_count: number
  status: ProjectStatus
  year: number
  excellent: boolean
  cover_url: string | null
  description: string
  team_members: string[]
  paper_url: string | null
  paper_filename: string | null
  video_url: string | null
  video_filename: string | null
  project_start_date: string | null
  project_end_date: string | null
}

export interface TimetableCell {
  id?: number
  course: string
  teacher: string
  content?: string
  enrolled: number
  capacity?: number
  allow_makeup?: boolean
  duration?: number
  classNames?: string | null // 上课班级列表（逗号/顿号分隔）
}

export interface TimetableWeekResponse {
  lab: { id: number; name: string; capacity: number }
  week: { monday: string; sunday: string }
  periods: Array<{ p: number; start: string; end: string }>
  days: Array<{
    date: string
    dayOfWeek: number // 1..7（周一到周日）
    slots: Array<{
      period: number // 1..8（节次）
      start: string
      end: string
      session: {
        id: number
        course: string
        teacher: string
        content?: string
        planned: number
        capacity: number
        allow_makeup: number
        duration: number
      } | null
    }>
  }>
}

// 大屏显示模式
export type ScreenDisplayMode = 'fixed' | 'adaptive'

export interface ScreenFixedConfig {
  width: number
  height: number
  scale: number
}

// 大屏可视化配置
export interface VisualizationConfig {
  kpi: {
    available: string[]
    selected: string[]
  }
  middleSection: {
    mode: 'large' | 'four-small'
    largeChart: {
      type: string
      config: any
    }
    smallCharts: {
      charts: Array<{
        type: string
        title: string
        config?: any
      }>
    }
  }
}

// KPI 指标枚举
export type KPIMetric = 
  | 'courseTotals'      // 课程总数
  | 'attendance'        // 出勤人数
  | 'utilization'       // 使用率
  | 'projectCount'      // 项目总数
  | 'participantCount'  // 参与人数
  | 'labCount'          // 实验室数量
  | 'activeLabs'        // 活跃实验室
  | 'completionRate'    // 完成率
  | 'totalPlannedAttendance'  // 总预计出勤人数
  | 'totalClassHours'         // 总课时数
  | 'totalCourses'           // 总课程数
  | 'currentClassHours'      // 截止目前已上课时数
  | 'involvedMajors'         // 本学期总专业数
  | 'involvedClasses'        // 本学期总班级数
  | 'avgStudentsPerCourse'   // 平均每课程参与人次

// 数据分析类型
export type DataAnalysisType = 
  | 'labUtilization'        // 实验室使用率分析
  | 'projectStatusDist'     // 项目状态分布分析
  | 'timeTrend'             // 时间趋势分析
  | 'popularProjects'       // 热门项目分析
  | 'courseSchedule'        // 课程安排分析
  | 'attendancePattern'     // 出勤模式分析
  | 'resourceAllocation'    // 资源分配分析
  | 'performanceMetrics'    // 性能指标分析

// 数据分析结果配置
export interface DataAnalysisResult {
  type: DataAnalysisType
  title: string
  description: string
  chartType: ChartType
  chartTitle: string
  filters?: {
    timeRange?: boolean
    labFilter?: boolean
  }
}

// 数据分析结果列表
export const DATA_ANALYSIS_RESULTS: DataAnalysisResult[] = [
  {
    type: 'labUtilization',
    title: '实验室使用率分析',
    description: '分析各实验室的使用情况和效率',
    chartType: 'gauge',
    chartTitle: '实验室使用率',
    filters: { timeRange: true, labFilter: true }
  },
  {
    type: 'projectStatusDist',
    title: '项目状态分布分析',
    description: '展示不同状态项目的分布情况',
    chartType: 'pie',
    chartTitle: '项目状态分布',
    filters: { timeRange: true }
  },
  {
    type: 'timeTrend',
    title: '时间趋势分析',
    description: '分析数据随时间的变化趋势',
    chartType: 'line',
    chartTitle: '时间趋势',
    filters: { timeRange: true, labFilter: true }
  },
  {
    type: 'popularProjects',
    title: '热门项目分析',
    description: '展示最受欢迎和活跃的项目',
    chartType: 'ranking',
    chartTitle: '热门项目',
    filters: { timeRange: true }
  },
  {
    type: 'courseSchedule',
    title: '课程安排分析',
    description: '分析课程时间安排和密度分布',
    chartType: 'heatmap',
    chartTitle: '课程安排热力图',
    filters: { timeRange: true, labFilter: true }
  },
  {
    type: 'attendancePattern',
    title: '出勤模式分析',
    description: '分析学生出勤的模式和规律',
    chartType: 'bar',
    chartTitle: '出勤模式',
    filters: { timeRange: true, labFilter: true }
  },
  {
    type: 'resourceAllocation',
    title: '资源分配分析',
    description: '分析教学资源的分配和使用情况',
    chartType: 'pie',
    chartTitle: '资源分配',
    filters: { timeRange: true }
  },
  {
    type: 'performanceMetrics',
    title: '性能指标分析',
    description: '展示关键性能指标和达成情况',
    chartType: 'gauge',
    chartTitle: '性能指标',
    filters: { timeRange: true }
  }
]

// 图表类型枚举
export type ChartType = 
  | 'heatmap'    // 热力图
  | 'pie'        // 饼图
  | 'bar'        // 柱状图
  | 'line'       // 折线图
  | 'ranking'    // 排行榜
  | 'gauge'      // 仪表盘
  | 'teacher'    // 教师工作量分析
  | 'donut'      // 环形图（课程专业占比）
  | 'stackedBar' // 堆叠条形图（课程-专业）
  | 'majorStackedBar' // 堆叠条形图（专业-课程）
  | 'majorTrend' // 专业活跃度趋势
  | 'courseCoverage' // 课程覆盖度分析
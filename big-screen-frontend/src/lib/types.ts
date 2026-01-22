// 功能：大屏端通用类型定义。
export type BannerLevel = 'info' | 'warning' | 'urgent';

export interface Banner {
  content: string;
  level: BannerLevel;
  expiresAt: string;
  visible: boolean;
  scrollable: boolean;
  scrollTime: number;
}

export interface SpotlightCourse {
  id: number;
  date: string; // "YYYY-MM-DD"，用于判断课程状态
  period: number; // 节次 (1-8)
  duration: number; // 持续节数
  time: string; // "HH:mm-HH:mm"
  course: string;
  teacher: string;
  content?: string;
  planned: number;
  capacity: number;
  status?: 'ongoing' | 'upcoming' | 'completed'; // 可选，前端会计算
  full: boolean;
}

export interface SpotlightItem {
  lab_id: number;
  lab: string;
  capacity: number;
  spotlight: SpotlightCourse[] | null; // 今日课程列表
}

export interface KPIData {
  courseTotals: number;
  attendance: number;
  utilization: number; // 0~1
  projectCount: number;
  participantCount: number;
  labCount: number;
  activeLabs: number;
  completionRate: number; // 0~1
  totalPlannedAttendance: number; // 本学期预计出勤总数
  totalClassHours: number; // 本学期总课时
  totalCourses: number; // 本学期总课程
  currentClassHours: number; // 截止目前已上课时数
  involvedMajors: number; // 本学期总专业数
  involvedClasses: number; // 本学期总班级数
  avgStudentsPerCourse: number; // 平均每课程参与人次
}

export interface HeatmapData {
  labs: string[];     // ["全部","西116",...]
  matrix: number[][]; // row=P1..P8, col=weekday(1..7)，固定 8x7
  weeks: number[];    // 周数数组（兼容保留）
}

export type ProjectStatus = 'reviewing' | 'ongoing' | 'done';

export interface Project {
  id: number;
  title: string;
  mentor: string;
  member_count: number;
  status: ProjectStatus;
  year: number;
  excellent: boolean;
  cover_url: string | null;
  description: string;
  team_members: string[];
  paper_url: string | null;
  paper_filename: string | null;
  video_url: string | null;
  video_filename: string | null;
  project_start_date: string | null;
  project_end_date: string | null;
}

export interface RenderResponse {
  date: string; // "YYYY-MM-DD"
  banner: Banner | null;
  spotlight: SpotlightItem[];
  kpi: KPIData;
  heatmap: HeatmapData;
  excellent: Project[];
  projects: Project[];
  projectStats5y: Array<{ year: number; projects: number; participants: number }>;
  chartData: {
    projectStatusPie: Array<{ name: string; value: number }>; // 项目状态饼图
    weeklyTrend: Array<{ categories: string[]; values: number[] }>; // 周趋势折线图
    labUtilization: { categories: string[]; values: number[] }; // 实验室使用率柱状图
    topProjects: Array<{ categories: string[]; values: number[] }>; // 热门项目排行榜
    gaugeData: { value: number }; // 课容量利用率仪表盘数据
    teacherWorkload: Array<{ categories: string[]; values: number[] }>; // 教师工作量分析
    courseMajorDistribution: Array<{ name: string; value: number }>; // 课程专业占比（旧格式）
    courseMajorStacked: { categories: string[]; series: Array<{ name: string; data: number[] }> }; // 课程-专业堆叠图（旧格式）
    majorCourseStacked: { categories: string[]; series: Array<{ name: string; data: number[] }> }; // 专业-课程堆叠图（旧格式）
    majorTrend: { categories: string[]; series: Array<{ name: string; data: number[] }> }; // 专业活跃度趋势（旧格式）
    courseCoverage: Array<{ name: string; majors: number; classes: number; students: number }>; // 课程覆盖度分析（旧格式）
    // 新增：完整数据（供前端筛选）
    courseMajorDistributionMap?: Record<string, Array<{ name: string; value: number }>>; // 所有课程专业占比
    courseMajorStackedAll?: { categories: string[]; series: Array<{ name: string; data: number[] }> }; // 所有课程堆叠图
    majorCourseStackedAll?: { categories: string[]; series: Array<{ name: string; data: number[] }> }; // 所有专业堆叠图
    majorTrendAll?: { categories: string[]; series: Array<{ name: string; data: number[] }> }; // 所有专业趋势
    courseCoverageAll?: Array<{ name: string; majors: number; classes: number; students: number }>; // 所有课程覆盖度
    allCourses?: string[]; // 课程列表
    allMajors?: string[]; // 专业列表
  };
}

// 大屏显示配置类型。
export type ScreenDisplayMode = 'fixed' | 'adaptive';

export interface ScreenFixedConfig {
  width: number;
  height: number;
  scale: number;
}

// 可视化配置类型。
export interface VisualizationConfig {
  kpi: {
    available: string[];
    selected: string[];
  };
  middleSection: {
    mode: 'large' | 'four-small';
    largeChart: {
      type: string;
      config: any;
    };
    smallCharts: {
      charts: Array<{
        type: string;
        title: string;
        config?: any;
      }>;
    };
  };
}

// KPI 指标类型。
export type KPIMetric = 
  | 'courseTotals'      // 课程总数
  | 'attendance'        // 出勤人数
  | 'utilization'       // 使用率
  | 'projectCount'      // 项目总数
  | 'participantCount'  // 参与人数
  | 'labCount'          // 实验室数量
  | 'activeLabs'        // 活跃实验室
  | 'completionRate'    // 完成率
  | 'totalPlannedAttendance' // 本学期总预计出勤人数
  | 'totalClassHours'   // 本学期总课时
  | 'totalCourses'      // 本学期总课程
  | 'currentClassHours' // 截止目前已上课时数
  | 'involvedMajors'    // 本学期总专业数
  | 'involvedClasses'   // 本学期总班级数
  | 'avgStudentsPerCourse' // 平均每课程参与人次

// 数据分析结果类型。
export type DataAnalysisType = 
  | 'labUtilization'        // 实验室使用率分析
  | 'projectStatusDist'     // 项目状态分布分析
  | 'timeTrend'             // 时间趋势分析
  | 'popularProjects'       // 热门项目分析
  | 'courseSchedule'        // 课程安排分析
  | 'attendancePattern'     // 出勤模式分析
  | 'resourceAllocation'    // 资源分配分析
  | 'performanceMetrics'    // 性能指标分析

// 数据分析结果配置。
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

// 筛选条件。
export interface AnalysisFilters {
  timeRange?: {
    start: string
    end: string
  }
  labId?: string
}

// 图表类型。
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
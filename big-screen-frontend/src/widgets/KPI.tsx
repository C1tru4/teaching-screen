import type { KPIData, KPIMetric } from '../lib/types'
import { AnimatedNumber } from '../components/AnimatedComponents'

// KPI指标标签映射
const KPI_LABELS: Record<KPIMetric, string> = {
  courseTotals: '学期开课数',
  attendance: '实验人次',
  utilization: '实验室利用率',
  projectCount: '项目总数',
  participantCount: '参与人数',
  labCount: '实验室数量',
  activeLabs: '活跃实验室',
  completionRate: '完成率',
  totalPlannedAttendance: '学期总预计出勤',
  totalClassHours: '学期总课时数',
  totalCourses: '学期总课程数',
  currentClassHours: '已上课时数',
  involvedMajors: '本学期总专业数',
  involvedClasses: '本学期总班级数',
  avgStudentsPerCourse: '平均每课程参与人次'
};

// KPI指标值获取函数
function getKPIValue(data: KPIData, metric: KPIMetric): number {
  switch (metric) {
    case 'courseTotals':
      return data.courseTotals;
    case 'attendance':
      return data.attendance;
    case 'utilization':
      return data.utilization;
    case 'projectCount':
      return data.projectCount;
    case 'participantCount':
      return data.participantCount;
    case 'labCount':
      return data.labCount;
    case 'activeLabs':
      return data.activeLabs;
    case 'completionRate':
      return data.completionRate;
    case 'totalPlannedAttendance':
      return data.totalPlannedAttendance;
    case 'totalClassHours':
      return data.totalClassHours;
    case 'totalCourses':
      return data.totalCourses;
    case 'currentClassHours':
      return data.currentClassHours;
    case 'involvedMajors':
      return data.involvedMajors;
    case 'involvedClasses':
      return data.involvedClasses;
    case 'avgStudentsPerCourse':
      return data.avgStudentsPerCourse;
    default:
      return 0;
  }
}

interface KPIProps {
  data?: KPIData;
  loading?: boolean;
  selectedMetrics?: KPIMetric[];
}

export default function KPI({ data, loading, selectedMetrics = ['courseTotals', 'attendance', 'utilization'] }: KPIProps) {
  const skeleton = (
    <div className="rounded-2xl p-4 bg-slate-900/70 border border-white/10 h-full animate-pulse shadow-xl" />
  )
  
  if (!data) return (
    <div className="grid grid-cols-3 gap-3 h-full">{skeleton}{skeleton}{skeleton}</div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center justify-center h-full">
      {selectedMetrics.map((metric, index) => {
        const value = getKPIValue(data, metric);
        const label = KPI_LABELS[metric];
        
        if (metric === 'utilization' || metric === 'completionRate') {
          return <UtilizationCard key={index} utilization={value} label={label} />;
        }
        
        return <Card key={index} label={label} value={value} />;
      })}
    </div>
  )
}

function Card({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900/80 to-slate-800/70 border border-white/10 h-full flex flex-col justify-center items-center text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 group relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* 内容 */}
      <div className="relative z-10">
        <div className="text-2xl font-bold mb-4 group-hover:opacity-90 transition-opacity duration-300 tracking-wide text-sky-300">{label}</div>
        <div className="text-3xl font-bold group-hover:text-sky-200 transition-colors duration-300 kpi-number animate-number-countup">
          <AnimatedNumber value={typeof value === 'number' ? value : 0} className="kpi-number" />
        </div>
      </div>
      
      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
  )
}

function UtilizationCard({ utilization, label }: { utilization: number; label: string }) {
  const percentage = Math.round(utilization * 100);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (utilization * circumference);
  
  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900/80 to-slate-800/70 border border-white/10 h-full flex flex-col justify-center items-center text-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 group relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      {/* 内容 */}
      <div className="relative z-10">
        <div className="text-2xl font-bold mb-4 group-hover:opacity-90 transition-opacity duration-300 tracking-wide text-sky-300">{label}</div>
      <div className="flex items-center justify-center">
        <div className="relative w-24 h-24">
          {/* 圆形进度条 */}
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
            {/* 背景圆环 */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="6"
            />
            {/* 进度圆环 */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  animation: 'progressFill 1s ease-out'
                }}
              />
              {/* 进度条发光效果 */}
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="opacity-20 blur-sm"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                }}
            />
          </svg>
          {/* 中心百分比文字 */}
          <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-bold group-hover:text-sky-200 transition-colors duration-300 kpi-number animate-number-countup">{percentage}%</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
  )
}

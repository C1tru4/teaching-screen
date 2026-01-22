// 功能：近五年项目统计柱状图。
export default function ProjectStats({ stats }: { stats: Array<{ year: number; projects: number; participants: number }> }) {
    // 有数据时再输出日志，避免噪音。
    if (stats && stats.length > 0) {
        console.log('ProjectStats received:', stats.length, '条统计记录')
    }
    
    if (!stats || stats.length === 0) {
      return (
        <div className="rounded-2xl p-4 bg-slate-900/70 border border-white/10 h-full flex flex-col backdrop-blur-sm">
          <div className="font-semibold text-slate-100">近五年统计</div>
          <div className="mt-3 flex-1 flex items-center justify-center text-sm opacity-60">
            暂无数据
          </div>
        </div>
      )
    }
    
    // 计算项目数与参与人数的全局最大值。
    const maxP = Math.max(1, ...stats.map(s => s.projects))
    const maxM = Math.max(1, ...stats.map(s => s.participants))
    // 使用全局最大值，保证两组柱子同一尺度。
    const globalMax = Math.max(maxP, maxM)
    
    return (
      <div className="rounded-2xl px-2 pt-3 pb-2 bg-gradient-to-br from-slate-900/80 to-slate-800/70 border border-white/10 h-full flex flex-col backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
        <div className="text-xl font-bold text-green-400 mb-2 text-center flex-shrink-0">近五年统计</div>
        {/* 柱状图区域：使用 flex-1 占满剩余空间 */}
        <div className="flex-1 min-h-0 flex justify-center">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4 w-full h-full">
            {stats.map((s, index) => (
              <div key={s.year} className="flex flex-col items-center h-full group animate-slide-up" style={{ animationDelay: `${index * 150}ms` }}>
                {/* 柱状图容器：占满高度，底部对齐 */}
                <div className="w-full flex items-end gap-1.5 h-full relative" style={{ overflow: 'visible' }}>
                  {/* 项目数柱状图 */}
                  <div 
                    className="flex-1 rounded-lg bg-gradient-to-t from-sky-600 to-sky-400 shadow-lg hover:shadow-sky-500/25 transition-all duration-700 ease-out transform hover:scale-110 hover:-translate-y-2 group-hover:animate-glow relative"
                    style={{ 
                      height: `${Math.max(4, (s.projects / globalMax) * 90)}%`,
                      minHeight: '4px'
                    }}
                    title={`项目数: ${s.projects}`}
                  >
                    {/* 内部光效 */}
                    <div className="w-full h-full rounded-lg bg-gradient-to-t from-sky-700/50 to-transparent opacity-60"></div>
                    {/* 数值显示 - 在条形顶部 */}
                    <div 
                      className="absolute left-1/2 transform -translate-x-1/2 text-xs font-bold text-sky-300 whitespace-nowrap z-20 pointer-events-none"
                      style={{ 
                        top: '-20px',
                        opacity: 1
                      }}
                    >
                      {s.projects}
                    </div>
                  </div>
                  
                  {/* 参与人数柱状图 */}
                  <div 
                    className="flex-1 rounded-lg bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-lg hover:shadow-emerald-500/25 transition-all duration-700 ease-out transform hover:scale-110 hover:-translate-y-2 group-hover:animate-glow relative"
                    style={{ 
                      height: `${Math.max(4, (s.participants / globalMax) * 90)}%`,
                      minHeight: '4px'
                    }}
                    title={`参与人数: ${s.participants}`}
                  >
                    {/* 内部光效 */}
                    <div className="w-full h-full rounded-lg bg-gradient-to-t from-emerald-700/50 to-transparent opacity-60"></div>
                    {/* 数值显示 - 在条形顶部 */}
                    <div 
                      className="absolute left-1/2 transform -translate-x-1/2 text-xs font-bold text-emerald-300 whitespace-nowrap z-20 pointer-events-none"
                      style={{ 
                        top: '-20px',
                        opacity: 1
                      }}
                    >
                      {s.participants}
                    </div>
                  </div>
                </div>
                
                {/* 年份标签：固定在底部 */}
                <div className="text-xs text-slate-300 font-medium group-hover:text-white transition-all duration-300 group-hover:scale-110 mt-2 flex-shrink-0">
                  {s.year}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 图例：固定在底部 */}
        <div className="mt-2 flex items-center justify-center gap-6 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-sky-600 to-sky-400 shadow-md group-hover:shadow-sky-500/50 transition-all duration-300 group-hover:scale-110"></div>
            <span className="text-slate-300 group-hover:text-sky-300 transition-colors duration-300 font-medium">项目数</span>
          </div>
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-4 h-4 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-md group-hover:shadow-emerald-500/50 transition-all duration-300 group-hover:scale-110"></div>
            <span className="text-slate-300 group-hover:text-emerald-300 transition-colors duration-300 font-medium">参与人数</span>
          </div>
        </div>
      </div>
    )
  }
  
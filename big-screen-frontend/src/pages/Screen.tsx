import { useEffect, useMemo, useState } from 'react'
import { fetchRender, fetchAllConfig, type Scope } from '../lib/api'
import type { RenderResponse, SpotlightItem, Project, ScreenDisplayMode, ScreenFixedConfig, VisualizationConfig, KPIMetric } from '../lib/types'

import Banner from '../widgets/Banner'
import LabSpotlight from '../widgets/LabSpotlight'
import KPI from '../widgets/KPI'
import MiddleSection from '../widgets/MiddleSection'
import ExcellentCarousel from '../widgets/ExcellentCarousel'
import ProjectList from '../widgets/ProjectList'
import ProjectStats from '../widgets/ProjectStats'

export default function Screen() {
  const [data, setData] = useState<RenderResponse | null>(null)
  const [lab, setLab] = useState<'all' | number>('all')
  const [scope, setScope] = useState<Scope>('semester')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [screenMode, setScreenMode] = useState<ScreenDisplayMode>('adaptive')
  const [screenFixedConfig, setScreenFixedConfig] = useState<ScreenFixedConfig>({ width: 1920, height: 1080, scale: 100 })
  const [visualizationConfig, setVisualizationConfig] = useState<VisualizationConfig | null>(null)
  const [windowHeight, setWindowHeight] = useState(window.innerHeight)
  const [currentVersion, setCurrentVersion] = useState<number>(0)
  const [projectListTitle, setProjectListTitle] = useState<string>('第1期训练营')

  const labsOptions = useMemo(() => data?.heatmap?.labs ?? ['全部'], [data])
  
  // 实验室名称到ID的映射 - 从热力图数据获取
  const labNameToId = useMemo(() => {
    const mapping: Record<string, number> = {}
    if (data?.heatmap?.labs) {
      // 跳过第一个"全部"
      data.heatmap.labs.slice(1).forEach((labName, index) => {
        mapping[labName] = index + 1 // 实验室ID从1开始
      })
    }
    return mapping
  }, [data?.heatmap?.labs])

  // ID到实验室名称的映射 - 从热力图数据获取
  const labIdToName = useMemo(() => {
    const mapping: Record<number, string> = {}
    if (data?.heatmap?.labs) {
      // 跳过第一个"全部"
      data.heatmap.labs.slice(1).forEach((labName, index) => {
        mapping[index + 1] = labName // 实验室ID从1开始
      })
    }
    return mapping
  }, [data?.heatmap?.labs])

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let mounted = true
    
    // 加载大屏显示配置（使用合并接口）
    const loadScreenConfig = async () => {
      try {
        const allConfig = await fetchAllConfig()
        
        if (mounted) {
          setScreenMode(allConfig.displayMode.mode)
          setScreenFixedConfig(allConfig.fixedConfig)
          setVisualizationConfig(allConfig.visualization)
          setCurrentVersion(allConfig.version.value)
          setProjectListTitle(allConfig.projectListTitle || '第1期训练营')
        }
      } catch (error) {
        console.warn('Failed to load screen config:', error)
        if (mounted) {
          // 使用默认配置
          setScreenMode('adaptive')
          setScreenFixedConfig({ width: 1920, height: 1080, scale: 100 })
          setVisualizationConfig({
            kpi: {
              available: [
                "courseTotals",
                "attendance", 
                "utilization",
                "projectCount",
                "participantCount",
                "labCount",
                "activeLabs",
                "completionRate",
                "totalPlannedAttendance",
                "totalClassHours",
                "totalCourses",
                "currentClassHours"
              ],
              selected: [
                "courseTotals",
                "attendance",
                "utilization"
              ]
            },
            middleSection: {
              mode: 'four-small' as const,
              largeChart: {
                type: 'heatmap',
                config: {}
              },
              smallCharts: {
                charts: [
                  { type: 'gauge', title: '课容量利用率' },
                  { type: 'teacher', title: '教师工作量分析' },
                  { type: 'line', title: '时间趋势' },
                  { type: 'ranking', title: '热门项目' }
                ]
              }
            }
          })
        }
      }
    }
    
    loadScreenConfig()
    
    // 加载数据 - 增加防抖时间，减少重复请求
    setLoading(true); setError(null)
    const timer = setTimeout(() => {
      fetchRender({ lab, scope })
        .then(res => { 
          if (mounted) {
            console.log('数据加载成功:', res.projectStats5y?.length || 0, '条统计记录')
            setData(res) 
          }
        })
        .catch(e => { 
          if (mounted) {
            console.error('数据加载失败:', e)
            setError(String(e)) 
          }
        })
        .finally(() => { if (mounted) setLoading(false) })
    }, 300) // 增加到300ms防抖，减少重复请求
    
    return () => { 
      mounted = false
      clearTimeout(timer)
    }
  }, [lab, scope])

  // 版本号检查：每 5 秒检查一次版本号变化
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const allConfig = await fetchAllConfig()
        if (allConfig.version.value > currentVersion) {
          console.log(`版本号变化: ${currentVersion} -> ${allConfig.version.value}, 刷新数据`)
          setCurrentVersion(allConfig.version.value)
          setLoading(true)
          const dataRes = await fetchRender({ lab, scope })
          setData(dataRes)
          setVisualizationConfig(allConfig.visualization)
          setLoading(false)
        }
      } catch (error) {
        console.warn('版本号检查失败:', error)
      }
    }

    const interval = setInterval(checkVersion, 5000) // 5 秒检查一次
    return () => clearInterval(interval)
  }, [lab, scope, currentVersion])

  const showBanner = useMemo(() => {
    if (!data?.banner) return false
    if (data.banner.visible === false) return false
    if (!data.banner.expiresAt) return true
    return Date.now() < new Date(data.banner.expiresAt).getTime()
  }, [data])

  return (
    <div 
      className="bg-slate-950 text-slate-100"
      style={{
        ...(screenMode === 'fixed' ? {
          width: `${screenFixedConfig.width}px`,
          height: `${screenFixedConfig.height}px`,
          transform: `scale(${screenFixedConfig.scale / 100})`,
          transformOrigin: 'top left',
          overflow: 'hidden'
        } : {
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        })
      }}
    >
      {showBanner && data?.banner && (
        <Banner 
          content={data.banner.content} 
          level={data.banner.level} 
          scrollable={data.banner.scrollable}
          scrollTime={data.banner.scrollTime}
        />
      )}

      <main 
        className={`screen-container ${showBanner ? 'with-banner' : 'no-banner'}`}
        style={{
          ...(screenMode === 'fixed' && {
            width: `${screenFixedConfig.width}px`,
            height: `${screenFixedConfig.height}px`,
            transform: `scale(${screenFixedConfig.scale / 100})`,
            transformOrigin: 'top left'
          }),
          ...(screenMode === 'adaptive' && {
            flex: 1,
            minHeight: 0
          })
        }}
      >
        {screenMode === 'adaptive' ? (
          /* 相对比例布局 - 自适应屏幕大小 */
          <>
            {/* 左列：实验室卡片 */}
            <section className="column-container">
              {loading && !data ? <SkeletonCardRows count={5} /> : (
                <LabSpotlight items={(data?.spotlight ?? []) as SpotlightItem[]} />
              )}
            </section>
            
            {/* 中列：KPI + 图表 + 轮播 */}
            <section className="middle-column">
              <div className="component-container">
                <KPI 
                  data={data?.kpi} 
                  loading={loading} 
                  selectedMetrics={visualizationConfig?.kpi?.selected as KPIMetric[]}
                />
              </div>
              <div className="component-container">
                <MiddleSection
                  heatmap={data?.heatmap ?? { labs: ['全部'], matrix: defaultMatrix(), weeks: [] }}
                  selectedLab={lab}
                  labIdToName={labIdToName}
                  onChangeLab={(v) => setLab(v === '全部' ? 'all' : labNameToId[v] || 1)}
                  scope={scope}
                  onChangeScope={setScope}
                  loading={loading}
                  config={visualizationConfig?.middleSection}
                  chartData={data?.chartData}
                />
              </div>
              <div className="component-container">
                <ExcellentCarousel items={(data?.excellent ?? []) as Project[]} />
              </div>
            </section>
            
            {/* 右列：项目列表 + 统计 */}
            <section className="column-container">
              <div style={{ flex: '0.605', minHeight: 0 }}>
                <ProjectList items={(data?.projects ?? []) as Project[]} loading={loading} title={projectListTitle} />
              </div>
              <div style={{ flex: '0.395', minHeight: 0 }}>
                <ProjectStats stats={data?.projectStats5y ?? []} />
              </div>
            </section>
          </>
        ) : (
          /* 固定布局 - 使用相对比例 */
          <>
            {/* 左列：实验室卡片 */}
            <section className="column-container">
              {loading && !data ? <SkeletonCardRows count={5} /> : (
                <LabSpotlight items={(data?.spotlight ?? []) as SpotlightItem[]} />
              )}
            </section>
            
            {/* 中列：KPI + 图表 + 轮播 */}
            <section className="middle-column">
              <div className="component-container">
                <KPI 
                  data={data?.kpi} 
                  loading={loading} 
                  selectedMetrics={visualizationConfig?.kpi?.selected as KPIMetric[]}
                />
              </div>
              <div className="component-container">
                <MiddleSection
                  heatmap={data?.heatmap ?? { labs: ['全部'], matrix: defaultMatrix(), weeks: [] }}
                  selectedLab={lab}
                  labIdToName={labIdToName}
                  onChangeLab={(v) => setLab(v === '全部' ? 'all' : labNameToId[v] || 1)}
                  scope={scope}
                  onChangeScope={setScope}
                  loading={loading}
                  config={visualizationConfig?.middleSection}
                  chartData={data?.chartData}
                />
              </div>
              <div className="component-container">
                <ExcellentCarousel items={(data?.excellent ?? []) as Project[]} />
              </div>
            </section>
            
            {/* 右列：项目列表 + 统计 */}
            <section className="column-container">
              <div style={{ flex: '0.605', minHeight: 0 }}>
                <ProjectList items={(data?.projects ?? []) as Project[]} loading={loading} title={projectListTitle} />
              </div>
              <div style={{ flex: '0.395', minHeight: 0 }}>
                <ProjectStats stats={data?.projectStats5y ?? []} />
              </div>
            </section>
          </>
        )}

        {/* 原始固定布局代码 - 已注释，方便后续切换回固定版本 */}
        {/* 
        <div className="grid gap-4" style={{ gridTemplateColumns: '3fr 4fr 3fr', height: 'calc(100vh - 72px)' }}>
          <section className="h-full">
            {loading && !data ? <SkeletonCardRows count={5} /> : (
              <LabSpotlight items={(data?.spotlight ?? []) as SpotlightItem[]} />
            )}
          </section>

          <section className="h-full flex flex-col gap-3">
            <KPI data={data?.kpi} loading={loading} />
            <div className="flex-1">
              <Heatmap
                matrix={data?.heatmap?.matrix ?? defaultMatrix()}
                labs={labsOptions}
                selectedLab={lab}
                labIdToName={labIdToName}
                onChangeLab={(v) => setLab(v === '全部' ? 'all' : labNameToId[v] || 1)}
                scope={scope}
                onChangeScope={setScope}
                loading={loading}
              />
            </div>
            <ExcellentCarousel items={(data?.excellent ?? []) as Project[]} />
          </section>

          <section className="h-full grid" style={{ gridTemplateRows: '7fr 3fr', gap: 12 }}>
            <ProjectList items={(data?.projects ?? []) as Project[]} loading={loading} />
            <ProjectStats stats={data?.projectStats5y ?? []} />
          </section>
        </div>
        */}

        {error && <div className="mt-2 text-sm text-red-400">加载失败：{error}</div>}
      </main>
    </div>
  )
}

function defaultMatrix() {
  // 8x7 全 0
  return Array.from({ length: 8 }, () => Array.from({ length: 7 }, () => 0))
}

function SkeletonCardRows({ count }: { count: number }) {
  return (
    <div className="grid grid-rows-5 gap-3 h-full animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl h-full bg-slate-800/40 border border-white/10" />
      ))}
    </div>
  )
}

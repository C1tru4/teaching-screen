// 功能：项目列表展示（含文件预览与成员轮播）。
import { useState } from 'react'
import type { Project } from '../lib/types'
import PDFViewer from '../components/PDFViewer'

// 团队成员轮播组件。参数: members 成员列表。
function TeamMembersCarousel({ members }: { members: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const maxVisible = 3
  
  const goToPrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1))
  }
  
  const goToNext = () => {
    if (currentIndex < members.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }
  
  const visibleMembers = members.slice(currentIndex, currentIndex + maxVisible)
  const canGoNext = members.length > 2 && currentIndex < members.length - 1
  const canGoPrevious = currentIndex > 0
  
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={goToPrevious}
        disabled={!canGoPrevious}
        className="p-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        ←
      </button>
      
      <div className="flex-1 flex items-center gap-3 overflow-hidden">
        {visibleMembers.map((member, index) => {
          const actualIndex = currentIndex + index
          const isCaptain = actualIndex === 0
          
          return (
            <div 
              key={actualIndex}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-shrink-0 ${
                isCaptain 
                  ? 'bg-yellow-500/10 border-yellow-500/30' 
                  : 'bg-slate-700/30 border-slate-600/50'
              }`}
            >
              <span className={`text-sm ${isCaptain ? 'text-yellow-400' : 'text-slate-400'}`}>
                {isCaptain ? '👑' : '👤'}
              </span>
              <span className={`text-sm font-medium ${isCaptain ? 'text-yellow-200' : 'text-slate-200'}`}>
                {member}
              </span>
              {isCaptain && (
                <span className="text-xs text-yellow-400 bg-yellow-500/20 px-1 py-0.5 rounded">
                  队长
                </span>
              )}
            </div>
          )
        })}
      </div>
      
      <button
        onClick={goToNext}
        disabled={!canGoNext}
        className="p-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        →
      </button>
    </div>
  )
}

function Pill({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${className}`}>{children}</span>
}

const badgeText = (s: Project['status']) =>
  s === 'ongoing' ? '进行中' : s === 'reviewing' ? '审核中' : '已完成'

const badgeCls = (s: Project['status']) =>
  s === 'ongoing' ? 'bg-blue-600/20 text-blue-300 border-blue-600/40' :
  s === 'reviewing' ? 'bg-amber-600/20 text-amber-300 border-amber-600/40' : 
  'bg-emerald-600/20 text-emerald-300 border-emerald-600/40'

function ProjectDetailModal({ project, open, onClose, onOpenPaper }: { 
  project: Project | null; 
  open: boolean; 
  onClose: () => void;
  onOpenPaper: () => void;
}) {
  if (!project) return null

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置'
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-start justify-center pt-8 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div 
        className="relative bg-slate-800 rounded-2xl p-6 max-w-5xl w-full mx-4 h-[calc(100vh-4rem)] flex flex-col border border-slate-600/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题区域 */}
        <div className="flex justify-between items-start mb-6 flex-shrink-0">
          <h2 className="text-3xl font-bold text-slate-100 pr-4">{project.title}</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-3xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* 主要内容区域：左侧图片+简介，右侧基本信息+团队成员 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6 flex-1 min-h-0">
          {/* 左侧：项目图片和简介 */}
          <div className="space-y-6">
            {/* 项目图片 */}
            {project.cover_url ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-slate-700 shadow-lg">
                <img 
                  src={project.cover_url} 
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-xl bg-slate-700/50 border-2 border-dashed border-slate-500 flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <div className="w-16 h-16 mx-auto mb-3 opacity-60">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                  </div>
                  <div className="text-lg">暂无封面图片</div>
                </div>
              </div>
            )}
            

            {/* 项目简介 */}
            <div>
              <h3 className="text-xl font-semibold text-slate-200 border-b border-slate-600 pb-2 mb-3">项目简介</h3>
              <div className="bg-slate-700/30 rounded-lg p-4 min-h-32 flex items-start">
                <p className="text-slate-100 leading-relaxed text-sm">
                  {project.description || '暂无项目简介'}
                </p>
              </div>
            </div>
          </div>

          {/* 右侧：基本信息和团队成员 */}
          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-slate-200 border-b border-slate-600 pb-2">基本信息</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">导师：</span>
                  <span className="text-slate-100 font-medium">{project.mentor}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">参与人数：</span>
                  <span className="text-slate-100 font-medium">{project.member_count}人</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">年份：</span>
                  <span className="text-slate-100 font-medium">{project.year}</span>
                </div>
              </div>
            </div>

            {/* 团队成员 */}
            {project.team_members && project.team_members.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-slate-200 border-b border-slate-600 pb-2 mb-3">团队成员</h3>
                <TeamMembersCarousel members={project.team_members} />
              </div>
            )}

            {/* 时间信息 */}
            <div>
              <h3 className="text-xl font-semibold text-slate-200 border-b border-slate-600 pb-2 mb-3">时间信息</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">立项时间：</span>
                  <span className="text-slate-100 font-medium">{formatDate(project.project_start_date)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">完成时间：</span>
                  <span className="text-slate-100 font-medium">{formatDate(project.project_end_date)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 论文展示区域 */}
        {project.paper_url && (
          <div className="border-t border-slate-600 pt-6 flex-1 min-h-0 flex flex-col">
            <h3 className="text-xl font-semibold text-slate-200 mb-4 flex items-center gap-2 flex-shrink-0">
              <span className="text-blue-400">📄</span>
              论文展示
            </h3>
            <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 overflow-hidden flex-1 min-h-0 flex flex-col">
              <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600/50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-slate-200 font-medium">{project.paper_filename}</span>
                  <button 
                    onClick={onOpenPaper}
                    className="text-blue-400 hover:text-blue-300 underline text-sm"
                  >
                    详细查看论文
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {project.paper_url ? (
                  <PDFViewer
                    src={`/api/projects/${project.id}/paper`}
                    title="论文预览"
                    className="w-full h-full"
                    onError={(e) => {
                      console.error('PDF加载失败:', e);
                      console.error('项目ID:', project.id);
                      console.error('项目标题:', project.title);
                      console.error('论文URL:', project.paper_url);
                    }}
                    onLoad={(e) => {
                      console.log('PDF加载成功:', `/api/projects/${project.id}/paper`);
                      console.log('项目ID:', project.id);
                      console.log('项目标题:', project.title);
                      console.log('论文URL:', project.paper_url);
                    }}
                  />
                ) : (
                  <div className="h-full bg-slate-800/50 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <div className="text-4xl mb-2">📄</div>
                      <p>暂无论文文件</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// 论文详细查看组件。参数: project 项目, open 是否显示, onClose 关闭回调。
function PaperDetailModal({ project, open, onClose }: { project: Project | null; open: boolean; onClose: () => void }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  if (!project || !project.paper_url) return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-start justify-center pt-4 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative bg-slate-800 rounded-2xl p-6 max-w-6xl w-full mx-4 h-[calc(100vh-4rem)] flex flex-col border border-slate-600/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <span className="text-blue-400">📄</span>
            {project.paper_filename}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden border border-slate-600/50 rounded-lg">
          <iframe
            src={`/api/projects/${project.id}/paper`}
            className="w-full h-full"
            title={project.paper_filename || '论文预览'}
            onError={(e) => {
              console.error('PDF详细查看加载失败:', e);
              // 预留：可在此补充错误提示。
            }}
            onLoad={(e) => {
              console.log('PDF详细查看加载成功:', `/api/projects/${project.id}/paper`);
            }}
          />
        </div>

        <div className="flex justify-between items-center mt-4 flex-shrink-0">
          <div className="text-slate-400 text-sm">
            支持PDF、DOC、DOCX格式文件查看
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-slate-700/60 border border-slate-500/30 rounded hover:bg-slate-600/80 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <span className="text-slate-300 text-sm px-2">
              第 {currentPage} 页，共 {totalPages} 页
            </span>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-slate-700/60 border border-slate-500/30 rounded hover:bg-slate-600/80 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProjectList({ items, loading, title = '第1期训练营' }: { items: Project[]; loading?: boolean; title?: string }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [paperModalOpen, setPaperModalOpen] = useState(false)

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setModalOpen(true)
  }

  return (
    <>
      <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-900/80 to-slate-800/70 border border-white/10 overflow-hidden flex flex-col h-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
        <div 
          className="text-2xl font-bold mb-2 text-green-400 text-center break-words"
          style={{
            lineHeight: '1.3',
            maxWidth: '100%',
            wordBreak: 'break-word'
          }}
        >
          {title}
        </div>
        <div className="flex-1 overflow-auto pr-1">
          <div className="space-y-2">
            {(loading && !items.length ? Array.from({ length: 6 }) : items).map((p: any, i: number) => (
              <div 
                key={p?.id ?? i} 
                className="rounded-xl px-3 py-2 bg-gradient-to-r from-slate-700/60 to-slate-600/40 border border-slate-500/30 flex items-center justify-between animate-[fadeIn_200ms_ease] hover:bg-gradient-to-r hover:from-slate-600/80 hover:to-slate-500/60 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-lg hover:border-slate-400/50"
                onClick={() => p?.id && handleProjectClick(p)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate text-slate-100">{p?.title ?? '——'}</div>
                  <div className="text-xs opacity-80 truncate text-slate-300">{p?.mentor ?? '——'} · {(p?.member_count ?? 0)}人</div>
                </div>
                <div className="flex-shrink-0 ml-2">
                  <Pill className={badgeCls(p?.status ?? 'reviewing')}>{badgeText(p?.status ?? 'reviewing')}</Pill>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ProjectDetailModal 
        project={selectedProject}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onOpenPaper={() => setPaperModalOpen(true)}
      />

      <PaperDetailModal 
        project={selectedProject}
        open={paperModalOpen}
        onClose={() => setPaperModalOpen(false)}
      />
    </>
  )
}

// 功能：优秀项目轮播展示（含论文与成员信息）。
import { useState, useRef, useEffect } from 'react'
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

function ProjectDetailModal({ project, open, onClose, onOpenPaper, onOpenVideo }: { 
  project: Project | null; 
  open: boolean; 
  onClose: () => void;
  onOpenPaper: () => void;
  onOpenVideo: () => void;
}) {
  if (!project) return null

  // 判断是否有论文或视频。
  const hasPaper = !!project.paper_url
  const hasVideo = !!project.video_url

  // 默认显示：有论文优先论文，否则显示视频。
  const [displayMode, setDisplayMode] = useState<'paper' | 'video'>(() => {
    if (hasPaper) return 'paper'
    if (hasVideo) return 'video'
    return 'paper'
  })
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  // 项目或显示模式变化时重置视频状态。
  useEffect(() => {
    if (displayMode === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0
      setIsPlaying(false)
    } else if (displayMode === 'paper' && videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [displayMode, project?.id])

  // 关闭弹窗时暂停视频。
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [open])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置'
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  const handleVideoPlay = () => {
    if (videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleVideoPause = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value)
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newVolume = parseFloat(e.target.value)
      videoRef.current.volume = newVolume
      setVolume(newVolume)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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

        {/* 主要内容区域：上半部分项目信息，下半部分论文展示 */}
        <div className="flex-1 min-h-0 flex flex-col gap-6">
          {/* 上半部分：项目信息 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-shrink-0">
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

          {/* 下半部分：论文/视频展示区域 - 占一半高度 */}
          {(hasPaper || hasVideo) && (
            <div className="border-t border-slate-600 pt-6 flex-1 min-h-0 flex flex-col">
              {/* 切换按钮 */}
              <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <h3 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
                  {displayMode === 'paper' ? (
                    <span className="text-blue-400">📄</span>
                  ) : (
                    <span className="text-purple-400">🎬</span>
                  )}
                  {displayMode === 'paper' ? '论文展示' : '视频展示'}
                </h3>
                {hasPaper && hasVideo && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDisplayMode('paper')}
                      className={`px-4 py-1 rounded-lg text-sm transition-colors ${
                        displayMode === 'paper'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                      }`}
                    >
                      论文
                    </button>
                    <button
                      onClick={() => setDisplayMode('video')}
                      className={`px-4 py-1 rounded-lg text-sm transition-colors ${
                        displayMode === 'video'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                      }`}
                    >
                      视频
                    </button>
                  </div>
                )}
                <div className="ml-auto flex gap-3">
                  {displayMode === 'paper' && hasPaper && (
                    <button 
                      onClick={onOpenPaper}
                      className="text-blue-400 hover:text-blue-300 underline text-sm"
                    >
                      详细查看论文
                    </button>
                  )}
                  {displayMode === 'video' && hasVideo && (
                    <button 
                      onClick={onOpenVideo}
                      className="text-purple-400 hover:text-purple-300 underline text-sm"
                    >
                      详细查看视频
                    </button>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-700/30 rounded-xl border border-slate-600/50 overflow-hidden flex-1 min-h-0 flex flex-col">
                {displayMode === 'paper' ? (
                  <>
                    <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600/50 flex-shrink-0">
                      <span className="text-slate-200 font-medium">{project.paper_filename || '论文文件'}</span>
                    </div>
                    <div className="flex-1 min-h-0">
                      {project.paper_url ? (
                        <PDFViewer
                          src={`/api/projects/${project.id}/paper`}
                          title="论文预览"
                          className="w-full h-full"
                          onError={(e) => {
                            console.error('PDF加载失败:', e);
                          }}
                          onLoad={(e) => {
                            console.log('PDF加载成功');
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
                  </>
                ) : (
                  <>
                    <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600/50 flex-shrink-0">
                      <span className="text-slate-200 font-medium">{project.video_filename || '演示视频'}</span>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col">
                      {project.video_url ? (
                        <>
                          <div className="flex-1 min-h-0 bg-black/50 flex items-center justify-center relative" style={{ minHeight: '200px' }}>
                            <video
                              ref={videoRef}
                              src={`/api/projects/${project.id}/video`}
                              className="w-full h-full object-contain"
                              style={{ zIndex: 1, minHeight: '150px', display: 'block' }}
                              onTimeUpdate={handleTimeUpdate}
                              onLoadedMetadata={handleLoadedMetadata}
                              onEnded={() => setIsPlaying(false)}
                              onError={(e) => {
                                console.error('视频加载失败:', e)
                                console.error('项目ID:', project.id)
                                console.error('视频URL:', project.video_url)
                                if (videoRef.current) {
                                  const video = videoRef.current
                                  console.error('视频错误代码:', video.error?.code)
                                  console.error('视频错误消息:', video.error?.message)
                                  console.error('网络状态:', video.networkState)
                                  console.error('就绪状态:', video.readyState)
                                  console.error('视频尺寸:', video.videoWidth, 'x', video.videoHeight)
                                  console.error('视频时长:', video.duration)
                                  console.error('视频编码信息:', {
                                    canPlayType: {
                                      'video/mp4': video.canPlayType('video/mp4'),
                                      'video/mp4; codecs="avc1.42E01E"': video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
                                      'video/mp4; codecs="hev1.1.6.L93.B0"': video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'),
                                    }
                                  })
                                }
                              }}
                              onCanPlay={() => {
                                if (videoRef.current) {
                                  const width = videoRef.current.videoWidth
                                  const height = videoRef.current.videoHeight
                                  console.log('预览视频可以播放')
                                  console.log('视频尺寸:', width, 'x', height)
                                  if (width === 0 || height === 0) {
                                    console.warn('⚠️ 警告：视频尺寸为 0x0，可能是视频文件只有音频轨道，没有视频轨道')
                                    console.warn('⚠️ 建议：请检查视频文件，确保包含视频轨道，或重新编码视频')
                                  }
                                }
                              }}
                              onLoadedData={() => {
                                if (videoRef.current) {
                                  const width = videoRef.current.videoWidth
                                  const height = videoRef.current.videoHeight
                                  console.log('预览视频数据加载完成')
                                  console.log('视频尺寸:', width, 'x', height)
                                  if (width === 0 || height === 0) {
                                    console.warn('⚠️ 警告：视频尺寸为 0x0，可能是视频文件只有音频轨道，没有视频轨道')
                                  }
                                }
                              }}
                              preload="metadata"
                              playsInline
                              controls={false}
                            />
                            {!isPlaying && (
                              <button
                                onClick={handleVideoPlay}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-10"
                                style={{ zIndex: 10 }}
                              >
                                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                                  <svg className="w-12 h-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </button>
                            )}
                          </div>
                          {/* 视频控制栏 */}
                          <div className="bg-slate-800/80 px-4 py-3 border-t border-slate-600/50 flex-shrink-0">
                            <div className="flex items-center gap-4">
                              {/* 播放/暂停按钮 */}
                              <button
                                onClick={isPlaying ? handleVideoPause : handleVideoPlay}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white transition-colors"
                              >
                                {isPlaying ? (
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                              </button>
                              
                              {/* 进度条 */}
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-xs text-slate-400 w-12 text-right">{formatTime(currentTime)}</span>
                                <input
                                  type="range"
                                  min="0"
                                  max={duration || 0}
                                  value={currentTime}
                                  onChange={handleSeek}
                                  className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                                <span className="text-xs text-slate-400 w-12">{formatTime(duration)}</span>
                              </div>
                              
                              {/* 音量控制 */}
                              <div className="flex items-center gap-2 w-32">
                                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                </svg>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.1"
                                  value={volume}
                                  onChange={handleVolumeChange}
                                  className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="h-full bg-slate-800/50 flex items-center justify-center text-slate-400">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🎬</div>
                            <p>暂无演示视频</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 视频详细查看组件。参数: project 项目, open 是否显示, onClose 关闭回调。
function VideoDetailModal({ project, open, onClose }: { project: Project | null; open: boolean; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)

  // 关闭弹窗时暂停视频。
  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
      setCurrentTime(0)
    }
  }, [open])

  const handleVideoPlay = () => {
    if (videoRef.current) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleVideoPause = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newTime = parseFloat(e.target.value)
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const newVolume = parseFloat(e.target.value)
      videoRef.current.volume = newVolume
      setVolume(newVolume)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!project || !project.video_url) return null

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
            <span className="text-purple-400">🎬</span>
            {project.video_filename || '演示视频'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col bg-black/50 rounded-lg overflow-hidden">
          <div className="flex-1 min-h-0 flex items-center justify-center relative" style={{ minHeight: '300px' }}>
            <video
              ref={videoRef}
              src={`/api/projects/${project.id}/video`}
              className="w-full h-full object-contain"
              style={{ zIndex: 1, minHeight: '200px' }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              onError={(e) => {
                console.error('视频加载失败:', e)
                console.error('项目ID:', project.id)
                console.error('视频URL:', project.video_url)
                if (videoRef.current) {
                  const video = videoRef.current
                  console.error('视频错误代码:', video.error?.code)
                  console.error('视频错误消息:', video.error?.message)
                  console.error('网络状态:', video.networkState)
                  console.error('就绪状态:', video.readyState)
                  console.error('视频尺寸:', video.videoWidth, 'x', video.videoHeight)
                  console.error('视频时长:', video.duration)
                  console.error('视频编码信息:', {
                    canPlayType: {
                      'video/mp4': video.canPlayType('video/mp4'),
                      'video/mp4; codecs="avc1.42E01E"': video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
                      'video/mp4; codecs="hev1.1.6.L93.B0"': video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'),
                    }
                  })
                }
              }}
              onCanPlay={() => {
                if (videoRef.current) {
                  const width = videoRef.current.videoWidth
                  const height = videoRef.current.videoHeight
                  console.log('视频可以播放')
                  console.log('视频尺寸:', width, 'x', height)
                  console.log('视频时长:', videoRef.current.duration)
                  if (width === 0 || height === 0) {
                    console.warn('⚠️ 警告：视频尺寸为 0x0，可能是视频文件只有音频轨道，没有视频轨道')
                    console.warn('⚠️ 建议：请检查视频文件，确保包含视频轨道，或重新编码视频')
                  }
                }
              }}
              onLoadedData={() => {
                if (videoRef.current) {
                  const width = videoRef.current.videoWidth
                  const height = videoRef.current.videoHeight
                  console.log('视频数据加载完成')
                  console.log('视频尺寸:', width, 'x', height)
                  if (width === 0 || height === 0) {
                    console.warn('⚠️ 警告：视频尺寸为 0x0，可能是视频文件只有音频轨道，没有视频轨道')
                  }
                }
              }}
              preload="metadata"
              playsInline
              controls={false}
            />
            {!isPlaying && (
              <button
                onClick={handleVideoPlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors z-10"
                style={{ zIndex: 10 }}
              >
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors">
                  <svg className="w-16 h-16 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </button>
            )}
          </div>
          {/* 视频控制栏 */}
          <div className="bg-slate-800/90 px-4 py-3 border-t border-slate-600/50 flex-shrink-0">
            <div className="flex items-center gap-4">
              {/* 播放/暂停按钮 */}
              <button
                onClick={isPlaying ? handleVideoPause : handleVideoPlay}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              
              {/* 进度条 */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-slate-300 w-14 text-right">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-sm text-slate-300 w-14">{formatTime(duration)}</span>
              </div>
              
              {/* 音量控制 */}
              <div className="flex items-center gap-2 w-40">
                <svg className="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>
          </div>
        </div>
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

export default function ExcellentCarousel({ items }: { items: Project[] }) {
  const pageSize = 3
  const [page, setPage] = useState(0)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [paperModalOpen, setPaperModalOpen] = useState(false)
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const slice = items.slice(page * pageSize, page * pageSize + pageSize)

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project)
    setModalOpen(true)
  }

  return (
    <>
      <div className="rounded-2xl p-4 bg-gradient-to-br from-slate-900/80 to-slate-800/70 border border-white/10 h-full flex flex-col shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-bold text-red-400">往届优秀成果</div>
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => setPage(p => Math.max(0, p - 1))} 
              className="px-2 py-1 rounded bg-slate-700/60 border border-slate-500/30 hover:bg-slate-600/80 text-slate-200 transition-colors"
            >
              上一页
            </button>
            <div className="opacity-70 text-slate-300">{page + 1}/{pages}</div>
            <button 
              onClick={() => setPage(p => Math.min(pages - 1, p + 1))} 
              className="px-2 py-1 rounded bg-slate-700/60 border border-slate-500/30 hover:bg-slate-600/80 text-slate-200 transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0">
          {slice.map(card => (
            <div 
              key={card.id} 
              className="excellent-card rounded-xl bg-slate-700/70 border border-slate-500/40 h-full shadow-sm hover:border-slate-400/50 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              onClick={() => handleProjectClick(card)}
              style={{ 
                backgroundImage: card.cover_url && card.cover_url.trim() !== '' ? `url(${card.cover_url})` : 'none', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
              }}
            >
              {/* 渐变遮罩层，确保文字可读性 */}
              <div className="excellent-card-overlay"></div>
              
              {/* 无图片时的占位符 */}
              {(!card.cover_url || card.cover_url.trim() === '') && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-600/50 z-10">
                  <div className="w-12 h-12 mb-2 opacity-60">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                  </div>
                  <div className="text-sm">暂无封面</div>
                </div>
              )}
              
              {/* 文字内容叠加在图片上 */}
              <div className="excellent-card-content">
                {/* 项目标题 */}
                <div className="excellent-card-title">
                  {card.title || '项目标题'}
                </div>
                
                {/* 项目信息 */}
                <div className="excellent-card-meta">
                  {card.year || '2025'} · {card.mentor || '指导教师'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProjectDetailModal 
        project={selectedProject}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onOpenPaper={() => setPaperModalOpen(true)}
        onOpenVideo={() => setVideoModalOpen(true)}
      />

      <PaperDetailModal 
        project={selectedProject}
        open={paperModalOpen}
        onClose={() => setPaperModalOpen(false)}
      />

      <VideoDetailModal 
        project={selectedProject}
        open={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
      />
    </>
  )
}

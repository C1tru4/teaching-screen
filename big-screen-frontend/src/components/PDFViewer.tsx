import React, { useState } from 'react'

interface PDFViewerProps {
  src: string
  title?: string
  className?: string
  style?: React.CSSProperties
  onError?: (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => void
  onLoad?: (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => void
}

export default function PDFViewer({ 
  src, 
  title = "PDF预览", 
  className = "", 
  style = {},
  onError,
  onLoad 
}: PDFViewerProps) {
  const [useDirectLink, setUseDirectLink] = useState(false)
  const [hasError, setHasError] = useState(false)

  const handleError = (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.error('PDF加载失败:', e)
    setHasError(true)
    onError?.(e)
  }

  const handleLoad = (e: React.SyntheticEvent<HTMLIFrameElement, Event>) => {
    console.log('PDF加载成功:', src)
    setHasError(false)
    onLoad?.(e)
  }

  const handleRetry = () => {
    setHasError(false)
    setUseDirectLink(!useDirectLink)
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-slate-800/50 ${className}`} style={style}>
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-2">📄</div>
          <p className="mb-2">未能加载 PDF 文档</p>
          <button 
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <iframe
      src={useDirectLink ? src : `${src}#toolbar=0&navpanes=0&scrollbar=0`}
      className={`w-full h-full ${className}`}
      title={title}
      style={{ border: 'none', ...style }}
      onError={handleError}
      onLoad={handleLoad}
    />
  )
}

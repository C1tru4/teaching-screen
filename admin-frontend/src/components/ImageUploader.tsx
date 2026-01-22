// 功能：项目封面图片上传与删除控件。
import { useState } from 'react'
import { Upload, message } from 'antd'
import { InboxOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadProps } from 'antd'

const { Dragger } = Upload

interface ImageUploaderProps {
  value?: string
  onChange?: (url: string) => void
  projectId?: number
  onUpload?: (file: File) => Promise<string>
  onDelete?: () => Promise<void>
}

export default function ImageUploader({ value, onChange, projectId, onUpload, onDelete }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = async (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('只能上传图片文件！')
      return false
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5
    if (!isLt5M) {
      message.error('图片大小不能超过5MB！')
      return false
    }

    if (onUpload) {
      setUploading(true)
      try {
        const url = await onUpload(file)
        onChange?.(url)
        message.success('图片上传成功！')
      } catch (error) {
        message.error('图片上传失败：' + (error as Error).message)
      } finally {
        setUploading(false)
      }
    } else {
      message.error('上传功能未配置')
    }
  }

  const uploadProps: UploadProps = {
    name: 'image',
    multiple: false,
    accept: 'image/jpeg,image/png,image/jpg,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp',
    showUploadList: false,
    beforeUpload: async (file) => {
      await handleFileSelect(file)
      return false // 阻止 Upload 组件自动上传
    }
  }

  const handleRemove = async () => {
    if (onDelete) {
      try {
        await onDelete()
        onChange?.('')
      } catch (error) {
        message.error('删除图片失败：' + (error as Error).message)
      }
    } else {
      onChange?.('')
    }
  }

  return (
    <div>
      {value ? (
        <div className="relative inline-block group cursor-pointer">
          <input
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileSelect(file);
                e.target.value = ''; // 重置输入框以允许重复选择
              }
            }}
            id="image-upload-input"
            aria-label="上传图片文件"
          />
          <div onClick={() => {
            if (!uploading) {
              const fileInput = document.getElementById('image-upload-input') as HTMLInputElement;
              fileInput?.click();
            }
          }}>
            <img 
              src={value} 
              alt="项目封面" 
              style={{ 
                width: 200, 
                height: 120, 
                objectFit: 'cover', 
                borderRadius: 8,
                border: '1px solid #d9d9d9'
              }} 
              className="transition-opacity group-hover:opacity-80"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            {/* 悬停提示：点击重新上传 */}
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
              <div className="text-white text-center">
                <InboxOutlined className="text-2xl mb-2" />
                <div className="text-sm">点击重新上传</div>
              </div>
            </div>
            {/* 删除按钮 */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10"
              style={{ fontSize: '12px' }}
              title="删除图片"
              aria-label="删除图片"
            >
              <DeleteOutlined />
            </button>
          </div>
        </div>
      ) : (
        <Dragger {...uploadProps} disabled={uploading}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {uploading ? '上传中...' : '点击或拖拽图片到此区域上传'}
          </p>
          <p className="ant-upload-hint">
            支持 JPG、PNG 格式，文件大小不超过 5MB
          </p>
        </Dragger>
      )}
    </div>
  )
}
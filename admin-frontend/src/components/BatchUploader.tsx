// 功能：通用批量导入组件（Excel/CSV 预览、校验与提交）。
import React, { useMemo, useState } from 'react'
import { Upload, Button, Modal, Table, message, Progress, Space, Typography } from 'antd'
import { UploadOutlined, FileExcelOutlined, FileTextOutlined, EyeOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { fetchLabs } from '../api/admin'
import type { Lab } from '../types'

const { Text } = Typography

interface BatchUploaderProps {
  title: string
  accept: string
  templateUrl?: string
  onUpload: (data: any[]) => Promise<{ success: number; failed: number; errors?: any[] }>
  columns: any[]
  dataKey: string
  notice?: React.ReactNode
  validate?: (data: any[]) => Promise<{ errors?: Array<{ index: number; field?: string; message: string }> } | void>
  onUploadComplete?: (result: { success: number; failed: number; errors?: any[] }) => void
}

export default function BatchUploader({ 
  title, 
  accept, 
  templateUrl, 
  onUpload, 
  columns, 
  dataKey, 
  notice,
  validate,
  onUploadComplete
}: BatchUploaderProps) {
  const [fileList, setFileList] = useState<any[]>([])
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errors, setErrors] = useState<Array<{ index: number; field?: string; message: string }>>([])

  // 表头别名映射：将常见字段统一为标准中文键名。
  const headerAliasMap = useMemo(() => {
    const map: Record<string, string> = {
      // 课表字段
      '日期': '日期', 'date': '日期', '时间': '日期', '上课日期': '日期', '日期*': '日期',
      '节次': '节次', 'period': '节次', '节': '节次', '第几节': '节次', '节次*': '节次',
      '课程': '课程', 'course': '课程', '课程名称': '课程', '科目': '课程', '课程*': '课程',
      '教师': '教师', 'teacher': '教师', '讲师': '教师', '教师*': '教师',
      '内容': '内容', 'content': '内容', '实验内容': '内容',
      '上课班级': '上课班级', 'classNames': '上课班级', '班级列表': '上课班级', '上课班级*': '上课班级', 'classes': '上课班级', '班级信息': '上课班级', '参与班级': '上课班级',
      '报课人数': '报课人数', 'planned': '报课人数', '报名人数': '报课人数', '计划人数': '报课人数',
      // 班级字段（用于班级管理批量上传）
      '专业': '专业', 'major': '专业', '专业名称': '专业', '专业*': '专业', '专业名': '专业', 'major_name': '专业', '专业类别': '专业',
      '人数': '人数', 'student_count': '人数', '学生人数': '人数', '班级人数': '人数', '人数*': '人数', '学生数': '人数', '班级学生数': '人数', 'count': '人数', '学生数量': '人数',
      '班级名称': '班级名称', '班级名称*': '班级名称', 'name': '班级名称', '班级*': '班级名称', 'class_name': '班级名称', '班级名': '班级名称',
      // '班级'/'class' 在不同场景含义不同，通过 dataKey 区分。
      '课时': '课时', 'duration': '课时', '课时数': '课时', '持续课时': '课时',
      '教室': '教室', '实验室': '教室', 'lab': '教室', 'labid': 'labId', '实验室id': 'labId', '教室id': 'labId',
      
      // 项目字段
      '项目标题': '项目标题', 'title': '项目标题', '项目名称': '项目标题', '标题': '项目标题', '项目*': '项目标题', '项目标题*': '项目标题',
      '导师': '导师', 'mentor': '导师', '指导教师': '导师', '导师*': '导师',
      '状态': '状态', 'status': '状态', '项目状态': '状态', '状态*': '状态',
      '年份': '年份', 'year': '年份', '年度': '年份', '年份*': '年份',
      '优秀': '优秀', 'excellent': '优秀', '是否优秀': '优秀', '优秀项目': '优秀',
      '简介': '简介', 'description': '简介', '项目简介': '简介', '描述': '简介', '项目描述': '简介',
      '团队成员': '团队成员', 'team_members': '团队成员', '成员': '团队成员', '队员': '团队成员', '团队成员*': '团队成员'
    }
    // 统一 key 为小写且去空格，便于快速查找。
    const normalized: Record<string, string> = {}
    for (const k of Object.keys(map)) {
      const normalizedKey = k.trim().toLowerCase()
      normalized[normalizedKey] = map[k]
    }
    return normalized
  }, [])

  // 归一化表头名称。参数: header 原始表头值。
  function normalizeHeader(header: any): string | undefined {
    if (!header) return undefined
    const key = String(header).trim().toLowerCase()
    // 先尝试完整 key 匹配。
    let result = headerAliasMap[key]
    // 若带 * 且未匹配，去掉 * 再尝试。
    if (!result && key.endsWith('*')) {
      const keyWithoutStar = key.slice(0, -1)
      result = headerAliasMap[keyWithoutStar]
    }
    return result
  }

  // 宽松布尔值解析。参数: v 任意输入值。
  function toBooleanLoose(v: any): boolean {
    if (v === true) return true
    if (v === false) return false
    const s = String(v).trim().toLowerCase()
    if (!s) return false
    const truthy = new Set(['是','y','yes','1','true','可','允许','ok'])
    const falsy = new Set(['否','n','no','0','false','不可','不允许'])
    if (truthy.has(s)) return true
    if (falsy.has(s)) return false
    // 非空默认 true（贴近“勾选”语义）。
    return true
  }

  // 转为整数。参数: v 输入值, fallback 默认值。
  function toInt(v: any, fallback = 0): number {
    const n = Number(v)
    return Number.isFinite(n) ? Math.floor(n) : fallback
  }

  // 解析日期为 YYYY-MM-DD。参数: input 日期输入。
  function normalizeDate(input: any): string | undefined {
    if (!input && input !== 0) return undefined
    // Excel 日期序列号处理。
    if (typeof input === 'number') {
      const d = XLSX.SSF.parse_date_code(input)
      if (d) {
        const y = String(d.y).padStart(4, '0')
        const m = String(d.m).padStart(2, '0')
        const day = String(d.d).padStart(2, '0')
        return `${y}-${m}-${day}`
      }
    }
    // 统一分隔符格式。
    const s = String(input).trim().replace(/[./]/g, '-').replace(/年|月/g, '-').replace(/日/g, '')
    // 解析 yyyy-mm-dd 或 yyyy-m-d。
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m) {
      const y = m[1]
      const mo = m[2].padStart(2, '0')
      const da = m[3].padStart(2, '0')
      return `${y}-${mo}-${da}`
    }
    return undefined
  }

  // 处理文件选择变化。参数: info Upload 事件信息。
  const handleFileChange = (info: any) => {
    setFileList(info.fileList.slice(-1)) // 仅保留最新文件
    
    // 文件被清空时重置状态。
    if (info.fileList.length === 0) {
      setPreviewData([])
      setPreviewVisible(false)
      setErrors([])
      return
    }
    
    // beforeUpload 已阻止自动上传，直接解析文件内容。
    if (info.fileList.length > 0) {
      const file = info.file.originFileObj || info.file
      if (file) {
        if (file.name.toLowerCase().endsWith('.csv')) {
          readCsvFile(file)
        } else {
          readExcelFile(file)
        }
      }
    }
  }

  // 读取 CSV 文件并生成预览数据。参数: file 选择的文件。
  const readCsvFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        let text = e.target?.result as string
        
        // 去除 BOM。
        if (text.charCodeAt(0) === 0xFEFF) {
          text = text.slice(1)
        }
        
        // 统一换行符并去除空行。
        const lines = text.split(/\r?\n/).filter(line => line.trim())
        
        if (lines.length < 2) {
          message.error('CSV文件至少需要包含表头和一行数据')
          return
        }

        // 解析 CSV 行（处理引号与逗号）。
        const parseCsvLine = (line: string): string[] => {
          const result: string[] = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            if (char === '"') {
              // 处理转义的引号。
              if (i + 1 < line.length && line[i + 1] === '"') {
                current += '"'
                i++ // 跳过下一个引号
              } else {
                inQuotes = !inQuotes
              }
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          result.push(current.trim())
          return result
        }

        const headers = parseCsvLine(lines[0]).map(h => h.replace(/"/g, '').trim())
        const rows = lines.slice(1).map(line => parseCsvLine(line))
        
        console.log('CSV原始表头:', headers)
        console.log('CSV原始数据行数:', rows.length)
        if (rows.length > 0) {
          console.log('CSV第一行数据:', rows[0])
        }
        
        // 调试输出：表头识别情况。
        console.log('=== 表头识别测试 ===')
        headers.forEach((header, index) => {
          const normalized = normalizeHeader(header)
          console.log(`表头${index}: "${header}" -> "${normalized}"`)
        })
        
        // 调试输出：headerAliasMap 关键字段。
        console.log('=== headerAliasMap内容 ===')
        console.log('项目标题相关映射:', {
          '项目标题': headerAliasMap['项目标题'],
          'title': headerAliasMap['title'],
          '项目名称': headerAliasMap['项目名称'],
          '标题': headerAliasMap['标题']
        })
        
        // 调试输出：表头处理过程。
        console.log('=== 表头处理过程 ===')
        headers.forEach((header, index) => {
          const trimmed = String(header).trim()
          const lowercased = trimmed.toLowerCase()
          const mapped = headerAliasMap[lowercased]
          console.log(`表头${index}: 原始="${header}" -> 去空格="${trimmed}" -> 小写="${lowercased}" -> 映射="${mapped}"`)
        })
        
        // 表头为空或无效时直接报错。
        if (headers.length === 0 || headers.every(h => !h)) {
          message.error('CSV文件表头为空或无效')
          return
        }
        
        // 没有数据行时直接报错。
        if (rows.length === 0) {
          message.error('CSV文件没有数据行')
          return
        }

        const processedData = rows.map((row, index) => {
          const raw: Record<string, any> = {}
          
          headers.forEach((header, colIndex) => {
            const v = row[colIndex]?.replace(/"/g, '') || ''
            if (header && v !== undefined) {
              raw[header] = v
            }
          })


          // 1) 归一化为标准中文键名。
          const normalized: Record<string, any> = {}
          for (const key of Object.keys(raw)) {
            const std = normalizeHeader(key)
            if (std) {
              normalized[std] = raw[key]
            } else {
              // 未识别字段保留原始键名。
              normalized[key] = raw[key]
            }
          }
          
          // 2) 根据 dataKey 选择字段映射规则。
          const result: Record<string, any> = {}
          
          if (dataKey === 'timetable') {
            // 课表字段映射。
            result['日期'] = raw['日期'] || raw['date'] || raw['时间'] || raw['上课日期'] || normalized['日期']
            result['节次'] = raw['节次'] || raw['period'] || raw['节'] || raw['第几节'] || normalized['节次']
            result['课程'] = raw['课程'] || raw['course'] || raw['课程名称'] || raw['科目'] || normalized['课程']
            result['教师'] = raw['教师'] || raw['teacher'] || raw['讲师'] || normalized['教师']
            result['内容'] = raw['内容'] || raw['content'] || raw['实验内容'] || normalized['内容']
            result['上课班级'] = raw['上课班级'] || raw['classNames'] || raw['班级'] || raw['班级名称'] || raw['班级列表'] || raw['班级*'] || raw['上课班级*'] || raw['class'] || raw['classes'] || raw['班级信息'] || raw['参与班级'] || normalized['上课班级']
            result['报课人数'] = raw['报课人数'] || raw['planned'] || raw['报名人数'] || raw['计划人数'] || normalized['报课人数']
            result['课时'] = raw['课时'] || raw['duration'] || raw['课时数'] || raw['持续课时'] || normalized['课时'] || 2
            // 教室字段可能包含名称或 ID。
            result['教室'] = raw['教室'] || raw['实验室'] || raw['lab'] || raw['教室*'] || 
                            raw['教室(可填labId或名称)'] || raw['教室名称'] || raw['实验室名称'] || 
                            raw['classroom'] || raw['room'] || normalized['教室']
            result['labId'] = raw['labId'] || raw['实验室id'] || raw['教室id'] || normalized['labId']
          } else if (dataKey === 'classes') {
            // 班级字段映射。
            result['班级名称'] = normalized['班级名称'] || raw['班级名称'] || raw['班级'] || raw['name'] || normalized['班级名称']
            result['专业'] = normalized['专业'] || raw['专业'] || raw['专业名称'] || raw['major'] || normalized['专业']
            result['人数'] = normalized['人数'] || raw['人数'] || raw['班级人数'] || raw['学生人数'] || raw['student_count'] || normalized['人数']
          } else if (dataKey === 'projects') {
            // 项目字段映射（保留中文预览与英文提交字段）。
            const title = normalized['项目标题'] || raw['项目标题'] || raw['title'] || raw['项目名称'] || raw['标题']
            const mentor = normalized['导师'] || raw['导师'] || raw['mentor'] || raw['指导教师']
            const status = normalized['状态'] || raw['状态'] || raw['status'] || raw['项目状态']
            const year = normalized['年份'] || raw['年份'] || raw['year'] || raw['年度']
            const excellent = normalized['优秀'] || raw['优秀'] || raw['excellent'] || raw['是否优秀'] || raw['优秀项目']
            const description = normalized['简介'] || raw['简介'] || raw['description'] || raw['项目简介'] || raw['描述'] || raw['项目描述']
            const teamMembers = normalized['团队成员'] || raw['团队成员'] || raw['team_members'] || raw['成员'] || raw['队员']
            
            // 自动计算人数。
            let memberCount = 1 // 默认值
            if (teamMembers) {
              if (typeof teamMembers === 'string') {
                const members = teamMembers.split(',').map(m => m.trim()).filter(Boolean)
                memberCount = members.length
              } else if (Array.isArray(teamMembers)) {
                memberCount = teamMembers.filter(Boolean).length
              }
            }
            
            // 中文字段用于预览展示。
            result['项目标题'] = title
            result['导师'] = mentor
            result['人数'] = memberCount
            result['状态'] = status
            result['年份'] = year
            result['优秀'] = excellent
            result['简介'] = description
            result['团队成员'] = teamMembers
            
            // 英文字段用于 API 提交。
            result['title'] = title
            result['mentor'] = mentor
            result['member_count'] = memberCount
            result['status'] = status
            result['year'] = year
            result['excellent'] = excellent
            result['description'] = description
            result['team_members'] = teamMembers
          }
          

          // 3) 值的容错与归一化。
          if (dataKey === 'timetable') {
            // 课表字段处理。
            if (result['日期']) {
              const d = normalizeDate(result['日期'])
              if (d) result['日期'] = d
            }
            if (result['节次']) result['节次'] = toInt(result['节次'], NaN)
            if (result['报课人数']) result['报课人数'] = toInt(result['报课人数'], 0)
          } else if (dataKey === 'projects') {
            // 项目字段处理。
            if (result['人数']) result['人数'] = toInt(result['人数'], 1)
            if (result['年份']) result['年份'] = toInt(result['年份'], new Date().getFullYear())
            if (result['优秀']) result['优秀'] = toBooleanLoose(result['优秀'])
            if (result['状态']) {
              // 状态值标准化。
              const status = String(result['状态']).toLowerCase()
              if (status.includes('审核') || status.includes('review')) result['状态'] = 'reviewing'
              else if (status.includes('进行') || status.includes('ongoing')) result['状态'] = 'ongoing'
              else if (status.includes('完成') || status.includes('done')) result['状态'] = 'done'
              else result['状态'] = 'reviewing' // 默认值
            }
          }
          
          // 4) 补齐英文字段名（用于 API 提交）。
          if (dataKey === 'timetable') {
            // 课表英文字段映射。
            if (result['日期']) result['date'] = result['日期']
            if (result['节次']) result['period'] = result['节次']
            if (result['课程']) result['course'] = result['课程']
            if (result['教师']) result['teacher'] = result['教师']
            if (result['内容']) result['content'] = result['内容']
            if (result['上课班级']) result['classNames'] = result['上课班级']
            if (result['报课人数']) result['planned'] = result['报课人数']
            if (result['教室']) result['lab'] = result['教室']
            if (result['labId']) result['labId'] = result['labId']
          } else if (dataKey === 'projects') {
            // 项目英文字段映射。
            if (result['项目标题']) result['title'] = result['项目标题']
            if (result['导师']) result['mentor'] = result['导师']
            if (result['人数']) result['member_count'] = result['人数']
            if (result['状态']) result['status'] = result['状态']
            if (result['年份']) result['year'] = result['年份']
            if (result['优秀']) result['excellent'] = result['优秀']
            if (result['简介']) result['description'] = result['简介']
            if (result['团队成员']) result['team_members'] = result['团队成员']
          }

          // 附加源行号，便于错误定位。
          result._rowIndex = index + 2 // CSV行号（从2开始，因为跳过了表头）
          
          console.log(`CSV第${index + 1}行最终结果:`, result)
          console.log(`CSV第${index + 1}行教室字段:`, result['教室'])
          
          return result
        }).filter(item => {
          // 仅保留有效行（有行号即视为有效）。
          const hasData = item._rowIndex !== undefined
          console.log(`CSV第${item._rowIndex}行数据检查:`, { hasData, item })
          if (!hasData) {
            console.log('CSV过滤掉空行:', item)
          } else {
            console.log('CSV保留数据行:', item)
          }
          return hasData
        }) // 过滤空行
        
        console.log('CSV最终处理数据:', processedData)
        console.log('CSV数据条数:', processedData.length)
        if (processedData.length > 0) {
          console.log('CSV第一行数据:', processedData[0])
          console.log('CSV第一行键名:', Object.keys(processedData[0]))
          console.log('CSV第一行中文字段:', {
            日期: processedData[0]['日期'],
            节次: processedData[0]['节次'],
            课程: processedData[0]['课程'],
            教师: processedData[0]['教师'],
            内容: processedData[0]['内容'],
            报课人数: processedData[0]['报课人数'],
            教室: processedData[0]['教室']
          })
        }
        console.log('CSV设置预览数据:', processedData)
        setPreviewData(processedData)
        setPreviewVisible(true)
      } catch (error) {
        message.error('CSV文件读取失败，请检查文件格式')
        console.error('CSV读取错误:', error)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  // 读取 Excel 文件并生成预览数据。参数: file 选择的文件。
  const readExcelFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        // 跳过表头，从第二行开始解析。
        const headers = (jsonData[0] as string[]).map(h => (h ?? '').toString().trim())
        const rows = jsonData.slice(1) as any[][]

        const processedData = rows.map((row, index) => {
          const raw: Record<string, any> = {}
          headers.forEach((header, colIndex) => {
            const v = row[colIndex]
            if (header && v !== undefined) {
              raw[header] = v
            }
          })

           // 1) 归一化为标准中文键名。
           const normalized: Record<string, any> = {}
           for (const key of Object.keys(raw)) {
             const std = normalizeHeader(key)
             if (std) {
               normalized[std] = raw[key]
             } else {
               // 未识别字段保留原始键名。
               normalized[key] = raw[key]
             }
           }
           
           // 2) 根据 dataKey 选择字段映射规则。
           const result: Record<string, any> = {}
           
           if (dataKey === 'timetable') {
             // 课表字段映射。
             result['日期'] = raw['日期'] || raw['date'] || raw['时间'] || raw['上课日期'] || normalized['日期']
             result['节次'] = raw['节次'] || raw['period'] || raw['节'] || raw['第几节'] || normalized['节次']
             result['课程'] = raw['课程'] || raw['course'] || raw['课程名称'] || raw['科目'] || normalized['课程']
             result['教师'] = raw['教师'] || raw['teacher'] || raw['讲师'] || normalized['教师']
             result['内容'] = raw['内容'] || raw['content'] || raw['实验内容'] || normalized['内容']
             result['报课人数'] = raw['报课人数'] || raw['planned'] || raw['报名人数'] || raw['计划人数'] || normalized['报课人数']
             // 教室字段可能包含名称或 ID。
             result['教室'] = raw['教室'] || raw['实验室'] || raw['lab'] || raw['教室*'] || 
                             raw['教室(可填labId或名称)'] || raw['教室名称'] || raw['实验室名称'] || 
                             raw['classroom'] || raw['room'] || normalized['教室']
             result['labId'] = raw['labId'] || raw['实验室id'] || raw['教室id'] || normalized['labId']
           } else if (dataKey === 'projects') {
             // 项目字段映射（保留中文预览与英文提交字段）。
             const title = normalized['项目标题'] || raw['项目标题'] || raw['title'] || raw['项目名称'] || raw['标题']
            const mentor = normalized['导师'] || raw['导师'] || raw['mentor'] || raw['指导教师']
            const status = normalized['状态'] || raw['状态'] || raw['status'] || raw['项目状态']
            const year = normalized['年份'] || raw['年份'] || raw['year'] || raw['年度']
            const excellent = normalized['优秀'] || raw['优秀'] || raw['excellent'] || raw['是否优秀'] || raw['优秀项目']
            const description = normalized['简介'] || raw['简介'] || raw['description'] || raw['项目简介'] || raw['描述'] || raw['项目描述']
            const teamMembers = normalized['团队成员'] || raw['团队成员'] || raw['team_members'] || raw['成员'] || raw['队员']
            
            // 自动计算人数。
            let memberCount = 1 // 默认值
            if (teamMembers) {
              if (typeof teamMembers === 'string') {
                const members = teamMembers.split(',').map(m => m.trim()).filter(Boolean)
                memberCount = members.length
              } else if (Array.isArray(teamMembers)) {
                memberCount = teamMembers.filter(Boolean).length
              }
            }
            
            // 中文字段用于预览展示。
            result['项目标题'] = title
            result['导师'] = mentor
            result['人数'] = memberCount
            result['状态'] = status
            result['年份'] = year
            result['优秀'] = excellent
            result['简介'] = description
            result['团队成员'] = teamMembers
            
            // 英文字段用于 API 提交。
            result['title'] = title
            result['mentor'] = mentor
            result['member_count'] = memberCount
            result['status'] = status
            result['year'] = year
            result['excellent'] = excellent
            result['description'] = description
             result['team_members'] = teamMembers
           }

          // 3) 值的容错与归一化。
          if (dataKey === 'timetable') {
            // 课表字段处理。
            if (result['日期']) {
              const d = normalizeDate(result['日期'])
              if (d) result['日期'] = d
            }
            if (result['节次']) result['节次'] = toInt(result['节次'], NaN)
            if (result['报课人数']) result['报课人数'] = toInt(result['报课人数'], 0)
          } else if (dataKey === 'projects') {
            // 项目字段处理。
            if (result['人数']) result['人数'] = toInt(result['人数'], 1)
            if (result['年份']) result['年份'] = toInt(result['年份'], new Date().getFullYear())
            if (result['优秀']) result['优秀'] = toBooleanLoose(result['优秀'])
            if (result['状态']) {
              // 状态值标准化。
              const status = String(result['状态']).toLowerCase()
              if (status.includes('审核') || status.includes('review')) result['状态'] = 'reviewing'
              else if (status.includes('进行') || status.includes('ongoing')) result['状态'] = 'ongoing'
              else if (status.includes('完成') || status.includes('done')) result['状态'] = 'done'
              else result['状态'] = 'reviewing' // 默认值
            }
          }
          
          // 4) 补齐英文字段名（用于 API 提交）。
          if (dataKey === 'timetable') {
            // 课表英文字段映射。
            if (result['日期']) result['date'] = result['日期']
            if (result['节次']) result['period'] = result['节次']
            if (result['课程']) result['course'] = result['课程']
            if (result['教师']) result['teacher'] = result['教师']
            if (result['内容']) result['content'] = result['内容']
            if (result['上课班级']) result['classNames'] = result['上课班级']
            if (result['报课人数']) result['planned'] = result['报课人数']
            if (result['教室']) result['lab'] = result['教室']
            if (result['labId']) result['labId'] = result['labId']
          } else if (dataKey === 'projects') {
            // 项目英文字段映射。
            if (result['项目标题']) result['title'] = result['项目标题']
            if (result['导师']) result['mentor'] = result['导师']
            if (result['人数']) result['member_count'] = result['人数']
            if (result['状态']) result['status'] = result['状态']
            if (result['年份']) result['year'] = result['年份']
            if (result['优秀']) result['excellent'] = result['优秀']
            if (result['简介']) result['description'] = result['简介']
            if (result['团队成员']) result['team_members'] = result['团队成员']
          }

          // 附加源行号，便于错误定位。
          result._rowIndex = index + 2 // Excel行号（从2开始，因为跳过了表头）
          return result
        }).filter(item => {
          // 仅保留有效行（有行号即视为有效）。
          const hasData = item._rowIndex !== undefined
          console.log(`Excel第${item._rowIndex}行数据检查:`, { hasData, item })
          if (!hasData) {
            console.log('Excel过滤掉空行:', item)
          } else {
            console.log('Excel保留数据行:', item)
          }
          return hasData
        }) // 过滤空行
        
        console.log('Excel最终处理数据:', processedData)
        console.log('Excel数据条数:', processedData.length)
        if (processedData.length > 0) {
          console.log('Excel第一行数据:', processedData[0])
          console.log('Excel第一行键名:', Object.keys(processedData[0]))
          console.log('Excel第一行中文字段:', {
            日期: processedData[0]['日期'],
            节次: processedData[0]['节次'],
            课程: processedData[0]['课程'],
            教师: processedData[0]['教师'],
            内容: processedData[0]['内容'],
            报课人数: processedData[0]['报课人数'],
            教室: processedData[0]['教室']
          })
        }
        console.log('Excel设置预览数据:', processedData)
        setPreviewData(processedData)
        setPreviewVisible(true)
      } catch (error) {
        message.error('文件读取失败，请检查文件格式')
        console.error('Excel读取错误:', error)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // 上传预览数据。参数: 无。
  const handleUpload = async () => {
    if (previewData.length === 0) {
      message.warning('没有可上传的数据')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // 预检（可选）。
      if (validate) {
        const r = await validate(previewData)
        const errs = r?.errors || []
        if (errs.length > 0) {
          setErrors(errs)
          message.error(`预检失败 ${errs.length} 条，请修正后再试`)
          return
        } else {
          setErrors([])
        }
      }

      // 展示上传进度（模拟）。
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

       // 转换数据格式，确保使用英文字段名进行 API 调用。
       let uploadData: any[]
       
       if (dataKey === 'timetable') {
         // 课表数据转换。
         console.log('上传前的预览数据:', previewData.slice(0, 2))
         uploadData = previewData.map(item => {
           const classNames = item.classNames || item['上课班级'] || undefined
           const plannedInput = item.planned ?? item['报课人数']
           
           // planned 规则：有人数字段优先；只有班级时交给后端计算。
           return {
           date: item.date || item['日期'],
           period: item.period || item['节次'],
           course: item.course || item['课程'],
           teacher: item.teacher || item['教师'],
           content: item.content || item['内容'] || '',
             classNames: classNames,
             planned: (plannedInput !== undefined && plannedInput !== null && plannedInput !== '') 
               ? Number(plannedInput) 
               : (classNames ? undefined : Number(plannedInput ?? 0)),
             duration: item.duration || item['课时'] || 2,
           labId: item.labId || item['labId'],
           lab: item.lab || item['教室'] || item['实验室'],
           教室: item['教室'] || item['实验室'],
           实验室: item['实验室'] || item['教室']
           }
         })
         console.log('转换后的上传数据:', uploadData.slice(0, 2))
       } else if (dataKey === 'classes') {
         // 班级数据转换与校验。
         const errors: Array<{ index: number; field?: string; message: string }> = []
         uploadData = previewData.map((item, index) => {
           const name = item.name || item['班级名称'] || item['班级'] || item['name']
           const major = item.major || item['专业'] || item['专业名称'] || item['major']
           const studentCount = item.student_count || item['人数'] || item['班级人数'] || item['学生人数'] || item['student_count']
           
           // 必填校验。
           if (!name || !name.trim()) {
             errors.push({ index: index + 1, field: '班级名称', message: '班级名称不能为空' })
           }
           if (!major || !major.trim()) {
             errors.push({ index: index + 1, field: '专业', message: '专业不能为空' })
           }
           if (!studentCount || Number(studentCount) <= 0) {
             errors.push({ index: index + 1, field: '人数', message: '人数必须大于0' })
           }
           
           return {
             name: name?.trim() || '',
             major: major?.trim() || '',
             student_count: Number(studentCount) || 0
           }
         })
         
         // 校验失败则直接返回。
         if (errors.length > 0) {
           setErrors(errors)
           message.error(`数据验证失败：${errors.length} 条记录有问题，请修正后再试`)
           setUploading(false)
           clearInterval(progressInterval)
           return
         }
       } else if (dataKey === 'projects') {
         // 项目数据转换。
         uploadData = previewData.map(item => ({
           title: item.title || item['项目标题'],
           mentor: item.mentor || item['导师'],
           member_count: item.member_count || item['人数'],
           status: item.status || item['状态'],
           year: item.year || item['年份'],
           excellent: item.excellent || item['优秀'],
           description: item.description || item['简介'] || '',
           team_members: item.team_members || item['团队成员']
         }))
       } else {
         // 默认使用原始数据。
         uploadData = previewData
       }
      
      const result = await onUpload(uploadData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // 基于结果显示反馈信息。
      if (result.failed > 0) {
        message.success(`上传完成：成功 ${result.success} 条，失败 ${result.failed} 条`)
      } else {
        message.success(`成功上传 ${result.success} 条数据`)
      }
      
      // 回调：上传完成通知。
      if (onUploadComplete) {
        onUploadComplete(result)
      }
      
      // 上传成功后清理文件与预览状态。
      try {
        // 清空文件列表，会触发 Upload 组件状态重置。
        console.log('开始清理上传的文件...')
        setFileList([])
        console.log('文件清理完成')
      } catch (error) {
        console.warn('清理文件时出现错误:', error)
      }
      
      setPreviewVisible(false)
      setPreviewData([])
    } catch (error) {
      message.error(`上传失败: ${error}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const uploadProps = {
    fileList,
    onChange: handleFileChange,
    beforeUpload: () => false, // 阻止自动上传
    accept,
    multiple: false
  }

   // 下载 CSV 模板。参数: 无。
   const handleDownloadTemplate = async () => {
     if (templateUrl) {
       window.open(templateUrl, '_blank')
       return
     }
     
     let headers: string[]
     let sample: string[][]
     
     if (dataKey === 'timetable') {
      // 课表模板。
      headers = ['日期*','节次*','课程*','教师*','内容','上课班级','报课人数','课时','教室*']
       
       // 获取教室列表。
       let labs: Lab[] = []
       try {
         labs = await fetchLabs()
       } catch (error) {
         console.warn('获取教室列表失败，使用默认教室信息:', error)
         // 使用默认教室信息作为备选。
         labs = [
           { id: 1, name: '西116', capacity: 40 },
           { id: 2, name: '西108', capacity: 36 },
           { id: 3, name: '西106', capacity: 32 },
           { id: 4, name: '西102', capacity: 30 },
           { id: 5, name: '东131', capacity: 28 }
         ]
       }
       
       sample = [
        ['必填','必填','必填','必填','可选','可选','可选','可选','必填'],
        ['YYYY-MM-DD格式','1-8','课程名称','教师姓名','实验内容','班级列表','数字','课时数','教室名称或ID'],
        ['2025-09-08','1','嵌入式实验','陈老师','RTOS任务训练', '计算机1班,计算机2班', '36', '2', '东131'],
        ['2025-09-08','2','数字逻辑实验','张老师','组合逻辑与门电路', '计算机1班', '24', '2', '西116'],
        ['2025-09-09','3','电路实验','李老师','运算放大器应用', '', '27', '1', '西108'],
        ['2025-09-10','5','单片机实验','王老师','GPIO与中断编程', '计算机1班、计算机2班', '30', '3', '西106'],
        ['','','','','','','','',''],
        ['字段说明：','','','','','','','',''],
        ['日期：上课日期，格式为YYYY-MM-DD','','','','','','','',''],
        ['节次：1-8，对应第1-8节课','','','','','','','',''],
        ['课程：课程名称','','','','','','','',''],
        ['教师：授课教师姓名','','','','','','','',''],
        ['内容：实验内容描述（可选）','','','','','','','',''],
        ['上课班级：班级名称，多个班级用逗号或顿号分隔（可选）','','','','','','','',''],
        ['报课人数：计划报课人数（可选，如果填写了上课班级会自动计算）','','','','','','','',''],
        ['课时：课程持续课时数（可选，默认2课时）','','','','','','','',''],
        ['教室：教室名称-id（必填），可在全局设置中查看教室和id','','','','','','','',''],
         ['','','','','','','','',''],
         ['现有教室列表：','','','','','','','',''],
         ['教室ID','教室名称','容量','','','','','',''],
         ...labs.map(lab => [lab.id.toString(), lab.name, lab.capacity.toString(), '', '', '', '', '', '']),
         ['','','','','','','','',''],
         ['使用说明：','','','','','','','',''],
         ['1. 教室字段可以填写教室名称（如：西116）或教室ID（如：1）','','','','','','','',''],
         ['2. 教室字段为必填项，必须指定具体的教室','','','','','','','',''],
         ['3. 教室名称和ID的对应关系请参考上方的教室列表','','','','','','','',''],
         ['4. 上课班级：填写班级名称，多个班级用逗号（,）或顿号（、）分隔','','','','','','','',''],
         ['5. 如果同时填写了上课班级和报课人数，优先使用输入的报课人数','','','','','','','',''],
         ['6. 如果只填写了上课班级，报课人数会自动根据班级人数计算','','','','','','','',''],
         ['7. 如果没有填写上课班级，需要手动填写报课人数','','','','','','','',''],
       ]
     } else if (dataKey === 'projects') {
       // 项目模板。
       headers = ['项目标题*','导师*','状态','年份','优秀','简介','团队成员*']
       sample = [
         ['必填','必填','可选','可选','可选','可选','必填'],
         ['项目名称','教师姓名','状态值','年份','是/否','项目描述','姓名列表'],
         ['智能家居控制系统','张教授','进行中','2025','是','基于物联网的智能家居控制平台','张三,李四,王五'],
         ['机器学习算法优化','李教授','审核中','2025','否','深度学习模型性能优化研究','赵六,钱七,孙八,周九'],
         ['区块链应用开发','王教授','已完成','2024','是','基于区块链的供应链管理系统','吴十,郑十一'],
         ['','','','','','','',''],
         ['字段说明：','','','','','','',''],
         ['项目标题：项目名称（必填）','','','','','','',''],
         ['导师：指导教师姓名（必填）','','','','','','',''],
         ['状态：项目状态（可选，默认审核中）','','','','','','',''],
         ['年份：项目年份（可选，默认当前年份）','','','','','','',''],
         ['优秀：是否为优秀项目（可选，默认否）','','','','','','',''],
         ['简介：项目描述（可选）','','','','','','',''],
         ['团队成员：用逗号分隔的姓名列表（必填），系统将自动计算人数','','','','','','',''],
         ['','','','','','','',''],
         ['状态字段支持值：','','','','','','',''],
         ['审核中 → reviewing','','','','','','',''],
         ['进行中 → ongoing','','','','','','',''],
         ['已完成 → done','','','','','','',''],
         ['（也支持英文：reviewing, ongoing, done）','','','','','','',''],
         ['','','','','','','',''],
         ['优秀字段支持值：','','','','','','',''],
         ['是 → true','','','','','','',''],
         ['否 → false','','','','','','',''],
         ['（也支持英文：true, false）','','','','','','',''],
       ]
     } else if (dataKey === 'classes') {
       // 班级模板。
       headers = ['班级名称*','专业*','人数*']
       sample = [
         ['必填','必填','必填'],
         ['班级名称','专业名称','学生人数'],
         ['计算机1班','计算机科学与技术','30'],
         ['计算机2班','计算机科学与技术','28'],
         ['软件工程1班','软件工程','32'],
         ['软件工程2班','软件工程','29'],
         ['','',''],
         ['字段说明：','',''],
         ['班级名称：班级名称（必填）','',''],
         ['专业：专业名称（必填）','',''],
         ['人数：班级学生人数，必须为正整数（必填）','',''],
         ['','',''],
         ['使用说明：','',''],
         ['1. 所有字段均为必填项，请确保填写完整','',''],
         ['2. 班级名称参考格式：专业名+数字+班，如"计算机1班"（不强制要求此格式）','',''],
         ['3. 专业名称应与班级名称中的专业部分一致','',''],
         ['4. 人数必须为正整数，不能为0或负数','',''],
       ]
     } else {
       // 默认模板。
       headers = ['字段1','字段2','字段3']
       sample = [['示例1','示例2','示例3']]
     }
     
     // 生成 CSV 内容。
     const csvContent = [headers, ...sample]
       .map(row => row.map(cell => `"${cell}"`).join(','))
       .join('\n')
     
     // 创建 CSV 文件并触发下载。
     const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
     const url = URL.createObjectURL(blob)
     const a = document.createElement('a')
     a.href = url
     a.download = `${dataKey}-模板.csv`
     a.click()
     URL.revokeObjectURL(url)
   }

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>选择文件</Button>
          </Upload>
          <Button 
            icon={<FileTextOutlined />} 
            onClick={handleDownloadTemplate}
          >
            下载CSV模板
          </Button>
          {previewData.length > 0 && (
            <Button 
              icon={<EyeOutlined />} 
              onClick={() => setPreviewVisible(true)}
            >
              预览数据 ({previewData.length} 条)
            </Button>
          )}
        </Space>

        {uploading && (
          <div>
            <Text>正在上传...</Text>
            <Progress percent={uploadProgress} status="active" />
          </div>
        )}
      </Space>

      <Modal
        title={`预览 ${title} 数据`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        onOk={handleUpload}
        okText="确认上传"
        cancelText="取消"
        width={1000}
        confirmLoading={uploading}
        okButtonProps={{ disabled: uploading }}
      >
        {notice && (
          <div style={{ marginBottom: 8, color: '#cf1322' }}>
            {notice}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <Text>共 {previewData.length} 条数据，请确认无误后点击"确认上传"</Text>
        </div>
        <Table
          columns={[
            ...columns,
            ...(errors.length ? [{
              title: '错误', dataIndex: '__error__', key: '__error__',
              render: (_: any, row: any) => {
                const rowErrs = errors.filter(e => e.index === row._rowIndex)
                if (!rowErrs.length) return null
                return rowErrs.map((e, i) => <div key={i}>{e.field ? `${e.field}: ${e.message}` : e.message}</div>)
              }
            }] : [])
          ]}
          dataSource={previewData}
          rowKey="_rowIndex"
          rowClassName={(row: any) => errors.some(e => e.index === row._rowIndex) ? 'table-row-error' : ''}
          scroll={{ x: true, y: 400 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
        <style>{`.table-row-error td{background: #fff1f0 !important;}`}</style>
      </Modal>
    </div>
  )
}

import * as XLSX from 'xlsx'

// 导出课表数据到Excel
export function exportTimetableToExcel(timetableData: any[], labName: string, semester: string) {
  // 创建工作簿
  const workbook = XLSX.utils.book_new()
  
  // 准备数据
  const worksheetData = [
    ['日期', '节次', '课程', '教师', '内容', '上课班级', '报课人数', '教室'],
    ...timetableData.map(item => [
      item.date || item['日期'] || '',
      item.period || item['节次'] || '',
      item.course || item['课程'] || '',
      item.teacher || item['教师'] || '',
      item.content || item['内容'] || '',
      item.classNames || item['上课班级'] || '',
      item.planned || item['报课人数'] || 0,
      item.lab || item['教室'] || ''
    ])
  ]
  
  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  
  // 设置列宽
  const colWidths = [
    { wch: 12 }, // 日期
    { wch: 8 },  // 节次
    { wch: 20 }, // 课程
    { wch: 12 }, // 教师
    { wch: 30 }, // 内容
    { wch: 20 }, // 上课班级
    { wch: 10 }, // 报课人数
    { wch: 12 }  // 教室
  ]
  worksheet['!cols'] = colWidths
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, `${labName}课表`)
  
  // 生成文件名
  const fileName = `${labName}_${semester}学期课表_${new Date().toISOString().split('T')[0]}.xlsx`
  
  // 导出文件
  XLSX.writeFile(workbook, fileName)
}

// 导出多教室课表数据到Excel
export function exportTimetableToExcelMultiLab(labTimetableData: Record<string, any[]>, semester: string) {
  // 创建工作簿
  const workbook = XLSX.utils.book_new()
  
  // 为每个教室创建工作表
  Object.entries(labTimetableData).forEach(([labName, timetableData]) => {
    // 准备数据
    const worksheetData = [
      ['日期', '节次', '课程', '教师', '内容', '上课班级', '报课人数', '教室'],
      ...timetableData.map(item => [
        item.date || item['日期'] || '',
        item.period || item['节次'] || '',
        item.course || item['课程'] || '',
        item.teacher || item['教师'] || '',
        item.content || item['内容'] || '',
        item.classNames || item['上课班级'] || '',
        item.planned || item['报课人数'] || 0,
        item.lab || item['教室'] || ''
      ])
    ]
    
    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    
    // 设置列宽
    const colWidths = [
      { wch: 12 }, // 日期
      { wch: 8 },  // 节次
      { wch: 20 }, // 课程
      { wch: 12 }, // 教师
      { wch: 30 }, // 内容
      { wch: 20 }, // 上课班级
      { wch: 10 }, // 报课人数
      { wch: 12 }  // 教室
    ]
    worksheet['!cols'] = colWidths
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, `${labName}课表`)
  })
  
  // 生成文件名
  const fileName = `${semester}学期课表_${new Date().toISOString().split('T')[0]}.xlsx`
  
  // 导出文件
  XLSX.writeFile(workbook, fileName)
}

// 导出项目数据到Excel
export function exportProjectsToExcel(projects: any[], exportType: string, semester?: string) {
  // 创建工作簿
  const workbook = XLSX.utils.book_new()
  
  // 准备数据
  const worksheetData = [
    ['项目标题', '导师', '人数', '状态', '年份', '优秀', '简介', '团队成员', '论文文件名'],
    ...projects.map(project => [
      project.title || '',
      project.mentor || '',
      project.member_count || 0,
      project.status || '',
      project.year || '',
      project.excellent ? '是' : '否',
      project.description || '',
      Array.isArray(project.team_members) ? project.team_members.join(', ') : (project.team_members || ''),
      project.paper_filename || ''
    ])
  ]
  
  // 创建工作表
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  
  // 设置列宽
  const colWidths = [
    { wch: 25 }, // 项目标题
    { wch: 12 }, // 导师
    { wch: 8 },  // 人数
    { wch: 10 }, // 状态
    { wch: 8 },  // 年份
    { wch: 8 },  // 优秀
    { wch: 40 }, // 简介
    { wch: 30 }, // 团队成员
    { wch: 20 }  // 论文文件名
  ]
  worksheet['!cols'] = colWidths
  
  // 添加工作表到工作簿
  const sheetName = exportType.includes('优秀') ? '优秀项目' : '项目列表'
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  // 生成文件名
  let fileName = ''
  if (exportType.includes('本学期')) {
    fileName = `${semester}学期${exportType.includes('优秀') ? '优秀' : ''}项目_${new Date().toISOString().split('T')[0]}.xlsx`
  } else {
    fileName = `所有学期${exportType.includes('优秀') ? '优秀' : ''}项目_${new Date().toISOString().split('T')[0]}.xlsx`
  }
  
  // 导出文件
  XLSX.writeFile(workbook, fileName)
}

// 获取当前学期信息
export function getCurrentSemester(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  // 简单判断：9-12月为秋季学期，1-8月为春季学期
  if (month >= 9) {
    return `${year}年秋季`
  } else {
    return `${year}年春季`
  }
}

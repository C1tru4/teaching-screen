import { TitleItem } from '../types/UserGuide'

export const extractTitles = (markdown: string): TitleItem[] => {
  // 先清理换行符，统一处理
  const cleanMarkdown = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = cleanMarkdown.split('\n')
  const titles: TitleItem[] = []
  
  console.log('extractTitles: Processing markdown with', lines.length, 'lines')
  console.log('extractTitles: First 10 lines:', lines.slice(0, 10))
  
  lines.forEach((line, index) => {
    console.log(`Line ${index}: "${line}"`)
    const match = line.match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      const title = {
        level: match[1].length,
        text: match[2],
        id: generateId(match[2]),
        lineNumber: index
      }
      titles.push(title)
      console.log('Found title:', title)
    }
  })
  
  console.log('extractTitles: Total titles found:', titles.length)
  console.log('extractTitles: All titles:', titles)
  
  // 暂时返回所有标题，不进行优化
  return titles
}

const optimizeTitles = (titles: TitleItem[]): TitleItem[] => {
  // 暂时返回所有标题，不进行优化，确保目录能正常显示
  return titles
}

export const generateId = (text: string): string => {
  return text
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '') // 保留中文、英文、数字、空格、连字符
    .replace(/\s+/g, '-') // 空格替换为连字符
    .toLowerCase()
    .replace(/^-+|-+$/g, '') // 移除开头和结尾的连字符
    .substring(0, 50) // 限制长度
}

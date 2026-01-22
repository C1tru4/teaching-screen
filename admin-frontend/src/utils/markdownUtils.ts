// 功能：解析 Markdown 标题并生成目录数据。
import { TitleItem } from '../types/UserGuide'

// 参数：markdown 为原始 Markdown 字符串。
export const extractTitles = (markdown: string): TitleItem[] => {
  // 统一换行符，避免平台差异。
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
  
  // 当前直接返回全部标题（保持层级信息）。
  return titles
}

const optimizeTitles = (titles: TitleItem[]): TitleItem[] => {
  // 预留扩展：必要时可在此精简目录结构。
  return titles
}

export const generateId = (text: string): string => {
  return text
    .replace(/[^\w\s\u4e00-\u9fff-]/g, '') // 保留中英文、数字与连字符
    .replace(/\s+/g, '-') // 空格替换为连字符
    .toLowerCase()
    .replace(/^-+|-+$/g, '') // 移除首尾连字符
    .substring(0, 50) // 限制长度
}

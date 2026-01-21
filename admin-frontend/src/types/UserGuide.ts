export interface TitleItem {
  level: number
  text: string
  id: string
  lineNumber: number
}

export interface SearchResult {
  type: 'title' | 'content'
  text: string
  lineNumber: number
  id: string
  preview?: string
}

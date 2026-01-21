import { useEffect, useRef, useState } from 'react'
import { Layout, Typography } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TableOfContents from '../components/UserGuide/TableOfContents'
import SearchDropdown from '../components/UserGuide/SearchDropdown'
import { useScrollSpy } from '../hooks/useScrollSpy'
import { useSearch } from '../hooks/useSearch'
import { extractTitles, generateId } from '../utils/markdownUtils'
import { TitleItem, SearchResult } from '../types/UserGuide'
import './UserGuide.css'

export default function UserGuide() {
  const contentRef = useRef<HTMLDivElement>(null)
  const [markdownContent, setMarkdownContent] = useState('')
  const [titles, setTitles] = useState<TitleItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [dropdownVisible, setDropdownVisible] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  
  const activeId = useScrollSpy(contentRef)
  const { performSearch, clearSearch } = useSearch(markdownContent)
  
  useEffect(() => {
    loadMarkdownContent()
  }, [])
  
  const loadMarkdownContent = async () => {
    try {
      // 从API获取用户指南内容
      const response = await fetch('/api/user-guide');
      if (response.ok) {
        const data = await response.json();
        setMarkdownContent(data.content);
        // 提取标题生成目录
        const extractedTitles = extractTitles(data.content);
        setTitles(extractedTitles);
        console.log('用户指南来源:', data.source);
        console.log('提取到标题数量:', extractedTitles.length);
        console.log('提取的标题:', extractedTitles);
      } else {
        throw new Error('获取用户指南失败');
      }
    } catch (error) {
      console.error('加载用户指南失败:', error);
      // 使用默认内容作为后备
      const defaultContent = `# 🎓 教学屏幕应用使用说明

> **系统简介**：教学屏幕应用是一个基于Web的智能教学管理系统，专为实验室和教学环境设计。系统采用前后端分离架构，提供管理端和大屏端两个主要界面，支持实时数据同步和可视化展示。

## 📋 系统概述

### 🏗️ 系统架构

教学屏幕应用采用现代化的技术栈构建：

| 架构层次 | 技术栈 | 说明 |
|------|----------|------|
| 前端 | React + TypeScript + Ant Design | 提供丰富的用户界面和交互体验 |
| 后端 | Node.js + Express + TypeScript | 提供API服务和业务逻辑处理 |
| 数据库 | MySQL / PostgreSQL / SQLite | 支持多种关系型数据库 |
| 部署 | Docker | 支持容器化部署，简化环境配置 |

### 🎯 核心功能模块

#### 📊 项目管理
- **项目信息管理**：支持项目信息的增删改查操作，提供完整的项目生命周期管理
- **批量导入**：支持Excel文件批量导入项目数据，提供数据验证和错误提示
- **数据导出**：支持项目数据导出为Excel、CSV等多种格式
- **文件管理**：支持项目相关文件的上传、分类、版本控制和管理

#### 🏢 实验室管理
- **实验室配置**：配置实验室基本信息和容量设置，支持多实验室管理
- **时间安排**：设置实验室使用时间表，支持预约和冲突检测
- **状态监控**：实时监控实验室使用状态，提供使用率统计和分析
- **设备管理**：管理实验室设备和资源，支持设备状态跟踪

#### 📅 课表管理
- **课程安排**：设置课程时间表和特殊安排，支持多种课程类型
- **课表编辑**：支持拖拽式课表编辑，提供直观的可视化操作界面
- **批量操作**：支持课表数据的批量导入导出，提供模板下载功能
- **多课时管理**：支持跨时段的长课程安排，处理复杂的时间冲突

#### 📢 公告管理
- **公告发布**：发布和管理教学公告，支持富文本编辑和多媒体内容
- **公告分类**：支持公告分类和优先级设置，提供灵活的公告组织方式
- **定时发布**：支持定时发布公告功能，可预设发布时间
- **公告推送**：支持多种推送方式，确保重要信息及时传达

#### 🖥️ 大屏展示
- **实时显示**：实时显示当前课程和项目信息，支持自动刷新
- **可视化图表**：支持多种图表类型展示，包括柱状图、折线图、饼图等
- **响应式布局**：适配不同尺寸的显示设备，支持横屏和竖屏模式
- **全屏模式**：支持全屏显示模式，提供沉浸式的观看体验

## 🚀 系统启动

### 🏭 安装版启动（推荐用户）

> **适用场景**：生产环境、正式使用、企业部署

#### 📦 安装步骤

**第一步：系统安装**
1. **获取安装包**
   - 下载最新版本的安装包
   - 确保安装包完整性

2. **运行安装程序**
   - 以管理员身份运行 \`install.bat\`
   - 按照安装向导完成系统安装
   - 选择安装路径和组件

3. **完成安装**
   - 安装完成后会在桌面创建快捷方式
   - 系统会自动配置环境变量

**第二步：启动系统**
1. **启动服务**
   - 双击桌面快捷方式启动系统
   - 系统将自动启动所有必要服务
   - 服务启动后会自动打开浏览器

2. **验证安装**
   - 检查所有服务是否正常运行
   - 验证数据库连接是否正常
   - 测试系统功能是否完整

**第三步：访问系统**
- **管理端**：http://localhost:3000/admin
- **大屏端**：http://localhost:3000/screen
- **API文档**：http://localhost:3000/api-docs
- **系统会自动打开默认浏览器**

## 📚 详细使用说明

### 第一部分：系统初始化配置

**访问路径**：管理端 → 全局管理

**配置项目**：

**横幅公告管理**
- 设置系统首页横幅公告内容
- 支持富文本编辑和图片上传
- 可设置公告显示时间和优先级

**夏令时区间设置**
- 配置夏令时开始和结束时间
- 系统会自动调整时间显示
- 支持多时区设置

**开学日期配置**
- 设置学期开始和结束日期
- 影响课表显示和课程安排
- 支持多学期管理

**大屏显示设置**
- 配置大屏刷新频率
- 设置大屏显示内容
- 调整大屏布局参数

**实验室容量设置**
- 设置各实验室的最大容量
- 配置实验室使用规则
- 设置容量预警阈值

**数据管理**
- 系统数据备份和恢复
- 数据清理和维护
- 系统日志管理

### 第二部分：项目管理

**访问路径**：管理端 → 项目管理

**功能详解**：

**项目列表管理**
- 查看所有项目的基本信息
- 支持按状态、类型、时间筛选
- 提供项目搜索功能
- 支持项目排序和分页显示

**项目信息编辑**
- 添加新项目：填写项目名称、描述、时间等信息
- 编辑项目：修改项目详细信息
- 删除项目：支持单个或批量删除
- 项目状态管理：设置项目进行状态

**批量上传项目**
- 支持Excel格式文件上传
- 提供模板下载功能
- 数据验证和错误提示
- 上传进度显示

**数据导出**
- 支持按条件导出项目数据
- 提供多种导出格式（Excel、CSV）
- 支持自定义导出字段
- 导出历史记录管理

**文件管理**
- 项目相关文件上传
- 文件分类和标签管理
- 文件版本控制
- 文件下载和预览

### 第三部分：课表管理

**访问路径**：管理端 → 课表管理

**功能详解**：

**课表网格管理**
- 可视化课表网格界面
- 支持拖拽式课程安排
- 时间冲突检测和提示
- 课表模板保存和加载

**课程信息编辑**
- 课程基本信息设置
- 教师和教室分配
- 课程类型和学分设置
- 课程备注和特殊要求

**批量上传课表**
- Excel格式课表数据导入
- 数据格式验证和清洗
- 导入结果统计和报告
- 错误数据修正建议

**课表数据导出**
- 支持多种导出格式
- 自定义导出内容
- 课表打印功能
- 导出模板定制

**多课时课程管理**
- 跨时段长课程支持
- 课程分段管理
- 课程连续性检查
- 特殊课程类型处理

### 第四部分：可视化控制

**访问路径**：管理端 → 可视化控制

**功能详解**：

**KPI指标配置**
- 设置关键绩效指标
- 配置指标计算公式
- 设置指标更新频率
- 指标趋势分析

**中间部分展示配置**
- 配置大屏中间区域内容
- 设置展示布局和样式
- 内容切换动画效果
- 展示时间控制

**图表类型选择**
- 支持柱状图、折线图、饼图等
- 图表颜色和样式自定义
- 数据标签和图例设置
- 图表交互功能配置

**大屏刷新控制**
- 设置自动刷新间隔
- 手动刷新功能
- 刷新状态监控
- 刷新日志记录

### 第五部分：大屏显示

**访问路径**：http://localhost:3000/screen

**功能详解**：

**实时数据展示**
- 当前课程信息实时显示
- 项目进度状态展示
- 系统运行状态监控
- 数据更新动画效果

**响应式布局**
- 适配不同尺寸显示器
- 自动调整布局比例
- 支持横屏和竖屏模式
- 移动设备兼容

**自动刷新**
- 定时自动更新数据
- 网络状态检测
- 离线模式支持
- 刷新失败重试机制

**全屏模式**
- 一键进入全屏显示
- 全屏状态指示
- 键盘快捷键支持
- 全屏退出功能

## 🐛 故障排除

### 常见问题

#### 端口被占用
**问题描述**：启动时提示端口3000被占用

**解决方案**：
1. **检查端口占用**
   \`\`\`bash
   netstat -an | findstr :3000
   \`\`\`

2. **停止占用进程**
   \`\`\`bash
   taskkill /F /IM node.exe
   \`\`\`

3. **重启系统服务**
   - 重启计算机
   - 重新运行启动脚本

#### Node.js未安装或版本过低
**问题描述**：提示Node.js未安装或版本过低

**解决方案**：
1. **下载安装Node.js**
   - 访问：https://nodejs.org/
   - 选择LTS版本（推荐18.x）
   - 下载并安装

2. **验证安装**
   \`\`\`bash
   node --version
   npm --version
   \`\`\`

3. **重启命令行**
   - 关闭当前命令行窗口
   - 重新打开命令行
   - 重新运行启动脚本

#### 依赖安装失败
**问题描述**：npm install 失败

**解决方案**：
1. **清理缓存**
   \`\`\`bash
   npm cache clean --force
   \`\`\`

2. **使用国内镜像**
   \`\`\`bash
   npm config set registry https://registry.npmmirror.com
   \`\`\`

3. **重新安装**
   \`\`\`bash
   npm install
   \`\`\`

#### 数据库连接失败
**问题描述**：系统无法连接数据库

**解决方案**：
1. **检查数据库服务**
   - 确认数据库服务已启动
   - 检查数据库端口是否开放

2. **检查配置文件**
   - 验证数据库连接参数
   - 确认用户名密码正确

3. **重启服务**
   - 重启数据库服务
   - 重启应用服务

---

**最后更新**：2025年10月18日
**版本**：1.0.0`
      
      setMarkdownContent(defaultContent)
      setTitles(extractTitles(defaultContent))
    }
  }
  
  const handleSearch = async (term: string, callback: (results: SearchResult[]) => void) => {
    setIsSearching(true)
    
    try {
      const results = await performSearch(term)
      callback(results)
    } catch (error) {
      console.error('Search failed:', error)
      callback([])
    } finally {
      setIsSearching(false)
    }
  }
  
  const handleClear = () => {
    setSearchTerm('')
    setSearchResults([])
    setDropdownVisible(false)
    clearSearch()
  }
  
  const handleResultClick = (result: SearchResult) => {
    setDropdownVisible(false)
    scrollToElement(result.id)
    highlightSearchTerm(result.text, searchTerm)
  }
  
  const handleTitleClick = (id: string) => {
    scrollToElement(id)
  }
  
  const scrollToElement = (id: string) => {
    const element = document.getElementById(id)
    if (element && contentRef.current) {
      // 计算元素相对于内容容器的位置
      const containerRect = contentRef.current.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const scrollTop = contentRef.current.scrollTop + elementRect.top - containerRect.top - 20
      
      contentRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      })
    }
  }
  
  const highlightSearchTerm = (text: string, term: string) => {
    // 这里可以实现文本高亮逻辑
    console.log('Highlighting:', text, term)
  }
  
  
  return (
    <div className="user-guide-container">
      <div className="guide-layout">
        {/* 左侧目录 */}
        <div className="guide-sidebar">
          <TableOfContents 
            titles={titles}
            activeId={activeId}
            onTitleClick={handleTitleClick}
            onSearch={handleSearch}
            onClear={handleClear}
            loading={isSearching}
          />
        </div>
        
        {/* 右侧内容 */}
        <div className="guide-content" ref={contentRef}>
          <div className="guide-content-inner">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // 自定义标题组件，确保ID正确生成
                h1: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateId(text)
                  return <h1 id={id} className="markdown-h1" {...props}>{children}</h1>
                },
                h2: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateId(text)
                  return <h2 id={id} className="markdown-h2" {...props}>{children}</h2>
                },
                h3: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateId(text)
                  return <h3 id={id} className="markdown-h3" {...props}>{children}</h3>
                },
                h4: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateId(text)
                  return <h4 id={id} className="markdown-h4" {...props}>{children}</h4>
                },
                h5: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateId(text)
                  return <h5 id={id} className="markdown-h5" {...props}>{children}</h5>
                },
                h6: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateId(text)
                  return <h6 id={id} className="markdown-h6" {...props}>{children}</h6>
                },
                // 代码块样式
                code({node, inline, className, children, ...props}: any) {
                  return inline ? (
                    <code className="markdown-inline-code" {...props}>
                      {children}
                    </code>
                  ) : (
                    <pre className="markdown-pre">
                      <code className="markdown-code" {...props}>
                        {children}
                      </code>
                    </pre>
                  )
                },
                // 表格样式
                table: ({ children, ...props }) => (
                  <div className="markdown-table-wrapper">
                    <table className="markdown-table" {...props}>
                      {children}
                    </table>
                  </div>
                ),
                // 引用块样式
                blockquote: ({ children, ...props }) => (
                  <blockquote className="markdown-blockquote" {...props}>
                    {children}
                  </blockquote>
                ),
                // 段落样式
                p: ({ children, ...props }) => (
                  <p className="markdown-p" {...props}>
                    {children}
                  </p>
                ),
                // 列表样式
                ul: ({ children, ...props }) => (
                  <ul className="markdown-ul" {...props}>
                    {children}
                  </ul>
                ),
                ol: ({ children, ...props }) => (
                  <ol className="markdown-ol" {...props}>
                    {children}
                  </ol>
                ),
                li: ({ children, ...props }) => (
                  <li className="markdown-li" {...props}>
                    {children}
                  </li>
                ),
                // 链接样式
                a: ({ children, ...props }) => (
                  <a className="markdown-link" target="_blank" rel="noopener noreferrer" {...props}>
                    {children}
                  </a>
                ),
                // 强调样式
                strong: ({ children, ...props }) => (
                  <strong className="markdown-strong" {...props}>
                    {children}
                  </strong>
                ),
                em: ({ children, ...props }) => (
                  <em className="markdown-em" {...props}>
                    {children}
                  </em>
                )
              }}
            >
              {markdownContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
      
      {/* 搜索下拉列表 */}
      {dropdownVisible && searchResults.length > 0 && (
        <SearchDropdown
          results={searchResults}
          searchTerm={searchTerm}
          onResultClick={handleResultClick}
          onClose={() => setDropdownVisible(false)}
        />
      )}
    </div>
  )
}

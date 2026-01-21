import { useEffect, useMemo, useState } from 'react'
import { Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, message, Tabs, Dropdown } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined, StarFilled, StarOutlined, UploadOutlined, DownloadOutlined, DownOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import PageHeader from '../components/PageHeader'
import ImageUploader from '../components/ImageUploader'
import BatchUploader from '../components/BatchUploader'
import { createProject, deleteProject, fetchProjects, updateProject, uploadProjectImage, uploadProjectPaper, deleteProjectPaper, deleteProjectImage, uploadProjectVideo, deleteProjectVideo, batchCreateProjects, triggerScreenRefresh } from '../api/admin'
import { exportProjectsToExcel, getCurrentSemester } from '../utils/export'
import type { Project, ProjectStatus } from '../types'

export default function ProjectsAdmin() {
  const [list, setList] = useState<Project[]>([])
  const [year, setYear] = useState<number | 'all'>('all')
  const [status, setStatus] = useState<ProjectStatus | 'all' | 'excellent'>('all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('list')
  const [form] = Form.useForm<Project>()
  const [uploadErrors, setUploadErrors] = useState<Array<{ index: number; field?: string; message: string }>>([])

  useEffect(() => {
    ;(async () => {
      const res = await fetchProjects()
      setList(res)
    })()
  }, [])

  const display = useMemo(() => {
    const filtered = list.filter(p => {
      // 年份筛选
      const yearMatch = year === 'all' || p.year === year
      
      // 状态筛选
      let statusMatch = true
      if (status === 'excellent') {
        statusMatch = p.excellent === true
      } else if (status !== 'all') {
        statusMatch = p.status === status
      }
      
      // 搜索筛选
      const searchMatch = p.title.includes(search) || p.mentor.includes(search)
      
      return yearMatch && statusMatch && searchMatch
    })
    return filtered // 顺序由后端保证：ongoing > reviewing > done，再按 id 倒序
  }, [list, year, status, search])

  const years = useMemo(() => Array.from(new Set(list.map(p=>p.year))).sort((a,b)=>b-a), [list])

  const openEdit = (p?: Project) => {
    const init: Project = p ?? {
      id: 0, title: '', mentor: '', member_count: 1,
      status: 'reviewing', year: new Date().getFullYear(),
      excellent: false, cover_url: null, description: '',
      team_members: [''], paper_url: null, paper_filename: null,
      video_url: null, video_filename: null,
      project_start_date: null, project_end_date: null
    }
    form.setFieldsValue(init)
    setOpen(true)
  }
  
  // 保存（新建时去掉 id）
  const save = async (v: Project) => {
    try {
      if (v.id && v.id !== 0) {
        const upd = await updateProject(v.id, v)
        setList(prev => prev.map(x => x.id === upd.id ? upd : x))
        message.success('已保存')
      } else {
        const { id, ...payload } = v
        const created = await createProject(payload as Omit<Project,'id'>)
        setList(prev => [created, ...prev])
        message.success('已创建')
      }
      setOpen(false)
      
      // 自动刷新大屏
      try {
        await triggerScreenRefresh()
      } catch (error) {
        console.warn('刷新大屏失败:', error)
      }
    } catch (error) {
      message.error('保存失败：' + (error as Error).message)
    }
  }

  // 处理图片上传
  const handleImageUpload = async (file: File): Promise<string> => {
    const currentProject = form.getFieldValue('id')
    if (!currentProject || currentProject === 0) {
      throw new Error('请先保存项目基本信息，再上传图片')
    }
    const url = await uploadProjectImage(currentProject, file)
    
    // 更新列表中的项目数据
    setList(prev => prev.map(p => 
      p.id === currentProject 
        ? { ...p, cover_url: url }
        : p
    ))
    
    return url
  }

  // 处理论文上传
  const handlePaperUpload = async (file: File): Promise<{ paper_url: string; paper_filename: string }> => {
    const currentProject = form.getFieldValue('id')
    if (!currentProject || currentProject === 0) {
      throw new Error('请先保存项目基本信息，再上传论文')
    }
    const result = await uploadProjectPaper(currentProject, file)
    
    // 更新列表中的项目数据
    setList(prev => prev.map(p => 
      p.id === currentProject 
        ? { ...p, paper_url: result.paper_url, paper_filename: result.paper_filename }
        : p
    ))
    
    return result
  }

  // 处理论文删除
  const handlePaperDelete = async () => {
    const currentProject = form.getFieldValue('id')
    if (!currentProject || currentProject === 0) {
      message.error('请先选择项目')
      return
    }
    
    try {
      await deleteProjectPaper(currentProject)
      message.success('论文删除成功')
      
      // 更新列表中的项目数据
      setList(prev => prev.map(p => 
        p.id === currentProject 
          ? { ...p, paper_url: null, paper_filename: null }
          : p
      ))
      
      // 更新表单数据
      form.setFieldsValue({
        paper_url: null,
        paper_filename: null
      })
    } catch (error) {
      message.error('删除论文失败')
    }
  }

  // 处理视频上传
  const handleVideoUpload = async (file: File): Promise<{ video_url: string; video_filename: string }> => {
    const currentProject = form.getFieldValue('id')
    if (!currentProject || currentProject === 0) {
      throw new Error('请先保存项目基本信息，再上传视频')
    }
    const result = await uploadProjectVideo(currentProject, file)
    
    // 更新列表中的项目数据
    setList(prev => prev.map(p => 
      p.id === currentProject 
        ? { ...p, video_url: result.video_url, video_filename: result.video_filename }
        : p
    ))
    
    return result
  }

  // 处理视频删除
  const handleVideoDelete = async () => {
    const currentProject = form.getFieldValue('id')
    if (!currentProject || currentProject === 0) {
      message.error('请先选择项目')
      return
    }
    
    try {
      await deleteProjectVideo(currentProject)
      message.success('视频删除成功')
      
      // 更新列表中的项目数据
      setList(prev => prev.map(p => 
        p.id === currentProject 
          ? { ...p, video_url: null, video_filename: null }
          : p
      ))
      
      // 更新表单数据
      form.setFieldsValue({
        video_url: null,
        video_filename: null
      })
    } catch (error) {
      message.error('删除视频失败')
    }
  }

  // 处理图片删除
  const handleImageDelete = async () => {
    const currentProject = form.getFieldValue('id')
    if (!currentProject || currentProject === 0) {
      message.error('请先选择项目')
      return
    }
    
    try {
      await deleteProjectImage(currentProject)
      message.success('图片删除成功')
      
      // 更新列表中的项目数据
      setList(prev => prev.map(p => 
        p.id === currentProject 
          ? { ...p, cover_url: null }
          : p
      ))
      
      // 更新表单数据
      form.setFieldsValue({
        cover_url: null
      })
    } catch (error) {
      message.error('删除图片失败')
    }
  }


  const remove = (p: Project) => {
    Modal.confirm({
      title: '确认删除该项目？', 
      content: '此操作将删除项目数据及其相关文件，此操作不可恢复！',
      icon: <ExclamationCircleOutlined />,
      onOk: async () => {
        await deleteProject(p.id, true) // 明确传递 purgeImages=true
        setList(prev => prev.filter(x => x.id !== p.id))
        message.success('项目及其相关文件已删除')
        
        // 自动刷新大屏
        try {
          await triggerScreenRefresh()
        } catch (error) {
          console.warn('刷新大屏失败:', error)
        }
      }
    })
  }

  const toggleExcellent = async (p: Project) => {
    const upd = await updateProject(p.id, { excellent: !p.excellent })
    setList(prev => prev.map(x => x.id === p.id ? upd : x))
    
    // 自动刷新大屏
    try {
      await triggerScreenRefresh()
    } catch (error) {
      console.warn('刷新大屏失败:', error)
    }
  }

  // 导出项目数据
  const handleExportProjects = async (exportType: string) => {
    try {
      let projects: Project[] = []
      const currentYear = new Date().getFullYear()
      const semester = getCurrentSemester()

      if (exportType.includes('本学期')) {
        // 获取本学期项目
        projects = await fetchProjects({ year: currentYear })
      } else {
        // 获取所有学期项目
        projects = await fetchProjects()
      }

      if (exportType.includes('优秀')) {
        // 筛选优秀项目
        projects = projects.filter(p => p.excellent)
      }

      if (projects.length === 0) {
        message.warning('没有符合条件的数据')
        return
      }

      // 导出到Excel
      exportProjectsToExcel(projects, exportType, semester)
      message.success(`已导出${exportType}数据`)
    } catch (error) {
      console.error('导出项目失败:', error)
      message.error('导出项目失败')
    }
  }

  // 导出菜单项
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'current-semester',
      label: '本学期',
      onClick: () => handleExportProjects('本学期')
    },
    {
      key: 'all-semesters',
      label: '所有学期',
      onClick: () => handleExportProjects('所有学期')
    },
    {
      key: 'current-semester-excellent',
      label: '本学期优秀',
      onClick: () => handleExportProjects('本学期优秀')
    },
    {
      key: 'all-semesters-excellent',
      label: '所有学期优秀',
      onClick: () => handleExportProjects('所有学期优秀')
    }
  ]

  // 批量上传项目
  const handleBatchUpload = async (data: any[]) => {
    const projects = data.map(row => {
      // 处理团队成员字段
      let team_members: string[] = []
      if (row.team_members || row['团队成员']) {
        const membersStr = row.team_members || row['团队成员']
        if (typeof membersStr === 'string') {
          team_members = membersStr.split(',').map((m: string) => m.trim()).filter(Boolean)
        } else if (Array.isArray(membersStr)) {
          team_members = membersStr.filter(Boolean)
        }
      }
      
      // 处理状态字段：将中文状态映射为英文
      const statusMap: Record<string, string> = {
        '审核中': 'reviewing',
        '进行中': 'ongoing', 
        '已完成': 'done',
        'reviewing': 'reviewing',
        'ongoing': 'ongoing',
        'done': 'done'
      }
      const rawStatus = row.status || row['状态'] || 'reviewing'
      const mappedStatus = statusMap[rawStatus] || 'reviewing'
      
      // 处理优秀字段：将中文布尔值映射为布尔值
      const excellentMap: Record<string, boolean> = {
        '是': true,
        '否': false,
        'true': true,
        'false': false
      }
      const rawExcellent = row.excellent || row['优秀'] || false
      const mappedExcellent = excellentMap[rawExcellent] ?? Boolean(rawExcellent)
      
      return {
        title: row.title || row['项目标题'],
        mentor: row.mentor || row['导师'],
        member_count: Number(row.member_count || row['人数'] || 1),
        status: mappedStatus,
        year: Number(row.year || row['年份'] || new Date().getFullYear()),
        excellent: mappedExcellent,
        description: row.description || row['简介'] || '',
        team_members: team_members,
        paper_filename: row.paper_filename || row['论文文件名'] || null
      }
    })

    const result = await batchCreateProjects(projects)
    
    if (result.success > 0) {
      // 刷新列表
      const res = await fetchProjects()
      setList(res)
      
      // 自动刷新大屏
      try {
        await triggerScreenRefresh()
      } catch (error) {
        console.warn('刷新大屏失败:', error)
      }
    }
    
    // 保存错误信息到状态，用于在下方显示
    if (result.errors && result.errors.length > 0) {
      // 将错误信息转换为统一格式
      const formattedErrors = result.errors.map((error: any, idx: number) => {
        if (typeof error === 'string') {
          return { index: idx + 1, message: error }
        } else if (typeof error === 'object') {
          return {
            index: error.index || idx + 1,
            field: error.field,
            message: error.message || '未知错误'
          }
        }
        return { index: idx + 1, message: String(error) }
      })
      setUploadErrors(formattedErrors)
      
      const errorMessages = result.errors.slice(0, 5).map((error: any) => 
        typeof error === 'string' ? error : 
        typeof error === 'object' ? `${error.message || '未知错误'}` : 
        String(error)
      ).join(', ')
      const moreErrors = result.errors.length > 5 ? ` 等共${result.errors.length}条错误` : ''
      message.warning(`部分数据上传失败：${errorMessages}${moreErrors}`)
    } else {
      setUploadErrors([])
    }
    
    // 返回结果给BatchUploader
    return result
  }

  const columns = [
    { title: '标题', dataIndex: 'title', width: 200, render: (v:string, r:Project) => <span style={{ maxWidth: 180 }} className="truncate">{v}</span> },
    { title: '优秀', dataIndex: 'excellent', width: 80, render: (excellent: boolean) => excellent ? <Tag color="gold">优秀</Tag> : <span style={{opacity:.5}}>—</span> },
    { title: '导师', dataIndex: 'mentor', width: 120 },
    { title: '人数', dataIndex: 'member_count', width: 80 },
    { title: '状态', dataIndex: 'status', width: 110, render: (s:ProjectStatus) => s==='ongoing'?<Tag color="green">进行中</Tag>:s==='reviewing'?<Tag color="orange">审核中</Tag>:<Tag>已完成</Tag> },
    { title: '年份', dataIndex: 'year', width: 90 },
    { 
      title: '简介', 
      dataIndex: 'description', 
      width: 200, 
      render: (desc: string) => (
        <div style={{ maxWidth: 180 }} title={desc}>
          {desc ? (
            <span className="truncate" style={{ display: 'block' }}>
              {desc.length > 20 ? `${desc.substring(0, 20)}...` : desc}
            </span>
          ) : (
            <span style={{opacity:.5}}>—</span>
          )}
        </div>
      )
    },
    { 
      title: '团队成员', 
      dataIndex: 'team_members', 
      width: 150, 
      render: (members: string[]) => (
        <div style={{ maxWidth: 130 }}>
          {members && members.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 显示前3个成员，竖着排列 */}
              {members.slice(0, 3).map((member, index) => (
                <div 
                  key={index}
                  style={{ 
                    fontSize: '12px', 
                    color: index === 0 ? '#1890ff' : '#333',
                    fontWeight: index === 0 ? 'bold' : 'normal',
                    lineHeight: '1.2',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {index === 0 ? '👑 ' : ''}{member}
                </div>
              ))}
              {/* 如果超过3个成员，显示省略标注 */}
              {members.length > 3 && (
                <div style={{ 
                  fontSize: '11px', 
                  color: '#666', 
                  fontStyle: 'italic',
                  lineHeight: '1.2'
                }}>
                  等{members.length}人
                </div>
              )}
            </div>
          ) : (
            <span style={{opacity:.5}}>—</span>
          )}
        </div>
      )
    },
    { 
      title: '论文', 
      dataIndex: 'paper_filename', 
      width: 120, 
      render: (filename: string) => (
        <div style={{ maxWidth: 100 }}>
          {filename ? (
            <div style={{ fontSize: '12px' }}>
              <span style={{ color: '#52c41a' }}>📄</span>
              <span className="truncate" style={{ display: 'block', marginTop: 2 }}>
                {filename.length > 12 ? `${filename.substring(0, 12)}...` : filename}
              </span>
            </div>
          ) : (
            <span style={{opacity:.5}}>—</span>
          )}
        </div>
      )
    },
    { title: '封面', dataIndex: 'cover_url', width: 100, render: (url:string) => url ? <img src={url} alt="项目封面" style={{ width: 72, height: 44, objectFit:'cover', borderRadius:6 }} /> : <span style={{opacity:.5}}>无</span> },
    {
      title: '操作', key: 'action', width: 260,
      render: (_:any, r:Project) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>编辑</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(r)}>删除</Button>
          <Button size="small" type={r.excellent? 'default':'primary'} icon={r.excellent ? <StarFilled /> : <StarOutlined />} onClick={() => toggleExcellent(r)}>
            {r.excellent ? '取消优秀' : '设为优秀'}
          </Button>
        </Space>
      )
    }
  ]

  const projectColumns = [
    { title: '项目标题', dataIndex: '项目标题', key: '项目标题', width: 200 },
    { title: '导师', dataIndex: '导师', key: '导师', width: 120 },
    { title: '人数', dataIndex: '人数', key: '人数', width: 80 },
    { title: '状态', dataIndex: '状态', key: '状态', width: 110,
      render: (value: string) => {
        const statusMap: Record<string, string> = {
          'reviewing': '审核中',
          'ongoing': '进行中', 
          'done': '已完成'
        }
        return statusMap[value] || value
      }
    },
    { title: '年份', dataIndex: '年份', key: '年份', width: 90 },
    { title: '优秀', dataIndex: '优秀', key: '优秀', width: 80,
      render: (value: boolean) => value ? '是' : '否'
    },
    { title: '简介', dataIndex: '简介', key: '简介', width: 200 },
    { title: '团队成员', dataIndex: '团队成员', key: '团队成员', width: 150,
      render: (members: string | string[]) => {
        if (!members) return ''
        if (Array.isArray(members)) {
          return members.join(', ')
        }
        return String(members)
      }
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'list',
              label: '项目列表',
            },
            {
              key: 'batch',
              label: '批量上传',
            }
          ]}
          style={{ flex: 1 }}
        />
        <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
          <Button 
            type="primary" 
            size="small"
            icon={<DownloadOutlined />}
            style={{ marginLeft: 16 }}
          >
            导出数据 <DownOutlined />
          </Button>
        </Dropdown>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Select style={{ width: 120 }} value={year} onChange={setYear}
            options={[{ label:'全部', value:'all' }, ...years.map(y=>({ label:String(y), value:y }))]} />
          <Select style={{ width: 120 }} value={status} onChange={setStatus}
            options={[
              { label:'全部', value:'all' },
              { label:'优秀', value:'excellent' },
              { label:'审核中', value:'reviewing' },
              { label:'进行中', value:'ongoing' },
              { label:'已完成', value:'done' }
            ]} />
          <Input.Search allowClear style={{ width: 260 }} placeholder="按标题/导师搜索" onSearch={setSearch} />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增项目</Button>
        </div>
      </div>

      {activeTab === 'list' && (
        <div>
          <Table rowKey="id" dataSource={display} columns={columns} pagination={{ pageSize: 10 }} />
        </div>
      )}

      {activeTab === 'batch' && (
        <div>
          <BatchUploader
            title="训练营项目"
            accept=".xlsx,.xls,.csv"
            onUpload={handleBatchUpload}
            columns={projectColumns}
            dataKey="projects"
            notice="支持Excel(.xlsx/.xls)和CSV(.csv)格式。请确保CSV文件使用UTF-8编码，字段用逗号分隔，包含引号的字段会被正确处理。团队成员字段支持逗号分隔的多个姓名，第一个为队长。"
          />
          {uploadErrors.length > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 16, 
              background: '#fff1f0', 
              border: '1px solid #ffccc7', 
              borderRadius: 4,
              maxHeight: '60vh',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ marginBottom: 12, fontWeight: 'bold', color: '#cf1322', fontSize: 16 }}>
                上传错误详情（共 {uploadErrors.length} 条）：
              </div>
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                padding: '8px 0',
                minHeight: 0
              }}>
                {uploadErrors.map((error, idx) => (
                  <div key={idx} style={{ 
                    marginBottom: 8, 
                    padding: 10, 
                    background: '#fff', 
                    borderRadius: 4,
                    fontSize: 13,
                    lineHeight: 1.5
                  }}>
                    <span style={{ color: '#cf1322', fontWeight: 'bold', fontSize: 14 }}>
                      第{error.index}行
                    </span>
                    {error.field && (
                      <span style={{ color: '#595959', marginLeft: 10, fontSize: 13 }}>
                        [{error.field}]
                      </span>
                    )}
                    <span style={{ color: '#262626', marginLeft: 10, fontSize: 13 }}>
                      {error.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal 
        open={open} 
        title="项目编辑" 
        onCancel={()=>setOpen(false)} 
        onOk={()=>form.submit()} 
        okText="保存" 
        destroyOnClose
        width={1000}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="id" hidden><Input /></Form.Item>
          
          <div style={{ display: 'flex', gap: 24 }}>
            {/* 左侧：基本信息 */}
            <div style={{ flex: 1 }}>
              <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="mentor" label="导师" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <div style={{ display:'flex', gap:12 }}>
                <Form.Item name="member_count" label="人数" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: 120 }} />
                </Form.Item>
                <Form.Item name="status" label="状态" rules={[{ required: true }]}>
                  <Select style={{ width: 160 }} options={[{value:'reviewing', label:'审核中'},{value:'ongoing', label:'进行中'},{value:'done', label:'已完成'}]} />
                </Form.Item>
                <Form.Item name="year" label="年份" rules={[{ required: true }]}>
                  <InputNumber min={2020} max={2100} style={{ width: 120 }} />
                </Form.Item>
              </div>
              <Form.Item name="description" label="项目简介">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item label="团队成员">
                <Form.List name="team_members">
                  {(fields, { add, remove }) => (
                    <div>
                      {fields.map((field, index) => (
                        <div key={field.key} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                          <Form.Item
                            {...field}
                            style={{ flex: 1, marginBottom: 0 }}
                            rules={[{ required: true, message: '请输入成员姓名' }]}
                          >
                            <Input 
                              placeholder={index === 0 ? '队长姓名' : `成员${index + 1}姓名`}
                              prefix={index === 0 ? '👑' : '👤'}
                            />
                          </Form.Item>
                          {fields.length > 1 && (
                            <Button 
                              type="text" 
                              danger 
                              onClick={() => remove(field.name)}
                              style={{ marginLeft: 8 }}
                            >
                              删除
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button 
                        type="dashed" 
                        onClick={() => add('')}
                        style={{ width: '100%' }}
                        disabled={fields.length >= form.getFieldValue('member_count')}
                      >
                        添加成员
                      </Button>
                    </div>
                  )}
                </Form.List>
              </Form.Item>
              <Form.Item name="excellent" label="设为优秀" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>

            {/* 右侧：文件上传 */}
            <div style={{ flex: 1 }}>
              <Form.Item name="cover_url" label="封面图片">
                <ImageUploader 
                  value={form.getFieldValue('cover_url')}
                  onChange={(url) => {
                    form.setFieldValue('cover_url', url)
                  }}
                  onUpload={handleImageUpload}
                  onDelete={handleImageDelete}
                />
              </Form.Item>
              <Form.Item name="paper_url" label="论文文件">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.getFieldValue('paper_filename') ? (
                    <div style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                      <span style={{ color: '#1890ff' }}>📄 {form.getFieldValue('paper_filename')}</span>
                    </div>
                  ) : (
                    <div style={{ color: '#999', padding: '8px 12px', border: '1px dashed #d9d9d9', borderRadius: '6px', textAlign: 'center' }}>
                      暂无论文文件
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      id="paper-upload"
                      aria-label="上传论文文件"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const nameLower = file.name.toLowerCase()
                          if (!nameLower.endsWith('.pdf') || file.type !== 'application/pdf') {
                            message.error('仅支持 PDF 文件，请先转换为 PDF 再上传')
                            e.currentTarget.value = ''
                            return
                          }
                          try {
                            const result = await handlePaperUpload(file)
                            form.setFieldsValue({
                              paper_url: result.paper_url,
                              paper_filename: result.paper_filename
                            })
                            message.success('论文上传成功')
                          } catch (error) {
                            message.error('论文上传失败：' + (error as Error).message)
                          }
                        }
                      }}
                    />
                    <Button 
                      icon={<UploadOutlined />} 
                      onClick={() => document.getElementById('paper-upload')?.click()}
                      disabled={!form.getFieldValue('id') || form.getFieldValue('id') === 0}
                      style={{ flex: 1 }}
                    >
                      上传论文
                    </Button>
                    {form.getFieldValue('paper_url') && (
                      <Button 
                        danger
                        icon={<DeleteOutlined />} 
                        onClick={handlePaperDelete}
                      >
                        删除论文
                      </Button>
                    )}
                  </div>
                </div>
              </Form.Item>
              <Form.Item name="video_url" label="演示视频">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {form.getFieldValue('video_filename') ? (
                    <div style={{ padding: '8px 12px', border: '1px solid #d9d9d9', borderRadius: '6px', backgroundColor: '#fafafa' }}>
                      <span style={{ color: '#1890ff' }}>🎬 {form.getFieldValue('video_filename')}</span>
                    </div>
                  ) : (
                    <div style={{ color: '#999', padding: '8px 12px', border: '1px dashed #d9d9d9', borderRadius: '6px', textAlign: 'center' }}>
                      暂无演示视频
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov"
                      style={{ display: 'none' }}
                      id="video-upload"
                      aria-label="上传视频文件"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const videoMimeTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
                          const videoExts = ['.mp4', '.webm', '.ogg', '.mov']
                          const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
                          if (!videoMimeTypes.includes(file.type) && !videoExts.includes(fileExt)) {
                            message.error('仅支持视频格式文件（MP4、WebM、OGG、MOV）')
                            e.currentTarget.value = ''
                            return
                          }
                          if (file.size > 100 * 1024 * 1024) {
                            message.error('视频文件大小不能超过 100MB')
                            e.currentTarget.value = ''
                            return
                          }
                          try {
                            const result = await handleVideoUpload(file)
                            form.setFieldsValue({
                              video_url: result.video_url,
                              video_filename: result.video_filename
                            })
                            message.success('视频上传成功')
                          } catch (error) {
                            message.error('视频上传失败：' + (error as Error).message)
                          }
                        }
                      }}
                    />
                    <Button 
                      icon={<UploadOutlined />} 
                      onClick={() => document.getElementById('video-upload')?.click()}
                      disabled={!form.getFieldValue('id') || form.getFieldValue('id') === 0}
                      style={{ flex: 1 }}
                    >
                      上传视频
                    </Button>
                    {form.getFieldValue('video_url') && (
                      <Button 
                        danger
                        icon={<DeleteOutlined />} 
                        onClick={handleVideoDelete}
                      >
                        删除视频
                      </Button>
                    )}
                  </div>
                </div>
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  )
}
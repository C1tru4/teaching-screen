// 功能：全局配置与数据维护页面（横幅、学期配置、大屏设置、清理数据）。
import { useEffect, useState } from 'react'
import { Button, DatePicker, Form, Input, InputNumber, Select, Space, Switch, Tag, Typography, message, Card, Divider, Modal, Dropdown } from 'antd'
import { ExclamationCircleOutlined, DeleteOutlined, DownOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'
import PageHeader from '../components/PageHeader'
import { fetchBanner, fetchSeason, fetchSemesterStart, updateBanner, updateSeason, updateSemesterStart, triggerScreenRefresh, fetchLabs, updateLabCapacity, fetchScreenDisplayMode, updateScreenDisplayMode, fetchScreenFixedConfig, updateScreenFixedConfig, clearAllData, clearTimetableData, clearProjectsData, fetchProjectYears, fetchProjectListTitle, updateProjectListTitle, clearAllClasses, clearAllVideos } from '../api/admin'
import type { BannerConfig, ScreenDisplayMode, ScreenFixedConfig } from '../types'

const { Title, Text } = Typography

export default function GlobalAdmin() {
  const [banner, setBanner] = useState<BannerConfig | null>(null)
  const [season, setSeason] = useState<{ summerStart: string; summerEnd: string } | null>(null)
  const [semester, setSemester] = useState<{ semesterStartMonday: string } | null>(null)
  const [labs, setLabs] = useState<Array<{ id:number; name:string; capacity:number }>>([])
  const [projectYears, setProjectYears] = useState<number[]>([])
  const [screenMode, setScreenMode] = useState<ScreenDisplayMode>('adaptive')
  const [screenFixedConfig, setScreenFixedConfig] = useState<ScreenFixedConfig>({ width: 1920, height: 1080, scale: 100 })

  const [formBanner] = Form.useForm()
  const [formSeason] = Form.useForm()
  const [formSem] = Form.useForm()
  const [formScreenFixed] = Form.useForm()
  const [formProjectListTitle] = Form.useForm()
  const [projectListTitle, setProjectListTitle] = useState<string>('第1期训练营')

  useEffect(() => {
    ;(async () => {
      try {
        const b = await fetchBanner()
        console.log('Fetched banner:', b)
        setBanner(b)
        
        const s = await fetchSeason().catch(()=>null)
        if (s) setSeason(s)
        const sem = await fetchSemesterStart().catch(()=>null)
        if (sem) setSemester(sem)

        formBanner.setFieldsValue({
          content: b?.content || '',
          level: b?.level ?? 'info',
          scrollable: b?.scrollable ?? false,
          scrollTime: b?.scrollTime ?? 15,
          expiresAt: b?.expiresAt ? dayjs(b.expiresAt) : null,
        })
        if (s) formSeason.setFieldsValue({ summerStart: dayjs(s.summerStart), summerEnd: dayjs(s.summerEnd) })
        if (sem) formSem.setFieldsValue({ start: dayjs(sem.semesterStartMonday) })

        const list = await fetchLabs().catch(()=>[])
        setLabs(list)

        // 加载项目年份列表。
        const years = await fetchProjectYears().catch(()=>[])
        setProjectYears(years)

        // 加载大屏显示配置。
        const mode = await fetchScreenDisplayMode().catch(() => ({ mode: 'adaptive' as ScreenDisplayMode }))
        setScreenMode(mode.mode)
        
        const fixedConfig = await fetchScreenFixedConfig().catch(() => ({ width: 1920, height: 1080, scale: 100 }))
        setScreenFixedConfig(fixedConfig)
        formScreenFixed.setFieldsValue(fixedConfig)

        // 加载训练营标题配置。
        const titleConfig = await fetchProjectListTitle().catch(() => ({ title: '第1期训练营' }))
        setProjectListTitle(titleConfig.title)
        formProjectListTitle.setFieldsValue({ title: titleConfig.title })

      } catch (error) {
        console.error('Error loading banner:', error)
      }
    })()
  }, [])

  // 保存横幅配置。参数: v 表单值。
  const saveBannerForm = async (v:any) => {
    const payload: BannerConfig = {
      content: v.content,
      level: v.level,
      // 固定为 true，保持旧字段兼容。
      visible: true,
      scrollable: !!v.scrollable,
      scrollTime: v.scrollTime || 15,
      expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
    }
    await updateBanner(payload)
    setBanner(payload)
    message.success('横幅已保存')
    
    // 自动刷新大屏数据。
    try {
      await triggerScreenRefresh()
      message.success('大屏数据已更新')
    } catch (error) {
      console.warn('刷新大屏失败:', error)
    }
  }

  // 取消横幅并重置表单。
  const cancelBanner = async () => {
    try {
      const payload: BannerConfig = {
        content: '',
        level: 'info',
        visible: true,
        scrollable: false,
        scrollTime: 15,
        expiresAt: null,
      }
      await updateBanner(payload)
      setBanner(payload)
      formBanner.setFieldsValue({
        content: '',
        level: 'info',
        scrollable: false,
        scrollTime: 15,
        expiresAt: null,
      })
      message.success('横幅已取消')
      
      // 自动刷新大屏数据。
      try {
        await triggerScreenRefresh()
        message.success('大屏数据已更新')
      } catch (error) {
        console.warn('刷新大屏失败:', error)
      }
    } catch (error) {
      message.error('取消横幅失败')
      console.error('Error canceling banner:', error)
    }
  }

  // 保存夏令时区间。参数: v 表单值。
  const saveSeasonForm = async (v:any) => {
    await updateSeason({ summerStart: v.summerStart.toISOString(), summerEnd: v.summerEnd.toISOString() })
    message.success('夏令时段已保存')
  }

  // 保存开学周一日期。参数: v 表单值。
  const saveSemesterForm = async (v:any) => {
    await updateSemesterStart({ date: v.start.format('YYYY-MM-DD') })
    message.success('开学日已保存')
  }

  // 保存大屏显示模式。参数: mode 显示模式。
  const saveScreenMode = async (mode: ScreenDisplayMode) => {
    try {
      await updateScreenDisplayMode(mode)
      setScreenMode(mode)
      message.success('大屏显示模式已保存')
      
      // 自动刷新大屏
      try {
        await triggerScreenRefresh()
        message.success('大屏数据已更新')
      } catch (error) {
        console.warn('刷新大屏失败:', error)
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  // 保存固定模式配置。参数: v 表单值。
  const saveScreenFixedConfig = async (v: any) => {
    try {
      const config = { width: v.width, height: v.height, scale: v.scale }
      await updateScreenFixedConfig(config)
      setScreenFixedConfig(config)
      message.success('固定模式配置已保存')
      
      // 自动刷新大屏
      try {
        await triggerScreenRefresh()
        message.success('大屏数据已更新')
      } catch (error) {
        console.warn('刷新大屏失败:', error)
      }
    } catch (error) {
      message.error('保存失败')
    }
  }

  // 统一删除确认弹窗。参数: title 标题, content 提示文案, onConfirm 确认回调。
  const confirmDelete = (title: string, content: string, onConfirm: () => Promise<void>) => {
    Modal.confirm({
      title,
      content,
      icon: <ExclamationCircleOutlined />,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: onConfirm,
    })
  }

  // 清空全部业务数据（保留配置）。
  const handleClearAllData = () => {
    confirmDelete(
      '确认清空所有数据',
      '此操作将清空所有课表数据、项目数据、横幅数据，但保留实验室配置和系统设置。此操作不可恢复！',
      async () => {
        try {
          await clearAllData()
          message.success('所有数据已清空，配置信息已保留')
          await triggerScreenRefresh()
        } catch (e: any) {
          message.error(e?.message || '清空数据失败')
        }
      }
    )
  }


  // 删除课表数据（可按教室）。
  const handleClearTimetable = (labId?: number) => {
    const labName = labId ? labs.find(l => l.id === labId)?.name : '所有教室'
    confirmDelete(
      '确认删除课表数据',
      `此操作将删除${labName}的课表数据。此操作不可恢复！`,
      async () => {
        try {
          await clearTimetableData(labId)
          message.success(`${labName}的课表数据已删除`)
          await triggerScreenRefresh()
        } catch (e: any) {
          message.error(e?.message || '删除课表数据失败')
        }
      }
    )
  }

  // 删除项目数据（可按年份）。
  const handleClearProjects = (year?: number) => {
    const yearText = year ? `${year}年` : '所有年份'
    confirmDelete(
      '确认删除项目数据',
      `此操作将删除${yearText}的训练营项目数据。此操作不可恢复！`,
      async () => {
        try {
          await clearProjectsData(year)
          message.success(`${yearText}的项目数据已删除`)
          await triggerScreenRefresh()
        } catch (e: any) {
          message.error(e?.message || '删除项目数据失败')
        }
      }
    )
  }

  // 删除所有班级。
  const handleClearAllClasses = () => {
    confirmDelete(
      '确认删除所有班级',
      '此操作将删除所有班级数据。此操作不可恢复！',
      async () => {
        try {
          await clearAllClasses()
          message.success('所有班级已删除')
          await triggerScreenRefresh()
        } catch (e: any) {
          message.error(e?.message || '删除所有班级失败')
        }
      }
    )
  }

  // 删除所有项目视频文件。
  const handleClearAllVideos = () => {
    confirmDelete(
      '确认删除所有视频',
      '此操作将删除所有项目的视频文件和数据库记录。此操作不可恢复！',
      async () => {
        try {
          const result = await clearAllVideos()
          message.success(result.message || '所有视频已删除')
          await triggerScreenRefresh()
        } catch (e: any) {
          message.error(e?.message || '删除所有视频失败')
        }
      }
    )
  }

  // 课表删除菜单项。
  const timetableDeleteMenuItems: MenuProps['items'] = [
    ...labs.slice(0, 5).map(lab => ({
      key: `lab-${lab.id}`,
      label: lab.name,
      onClick: () => handleClearTimetable(lab.id)
    })),
    {
      type: 'divider'
    },
    {
      key: 'all-labs',
      label: '所有教室',
      onClick: () => handleClearTimetable()
    }
  ]

  // 项目删除菜单项。
  const projectsDeleteMenuItems: MenuProps['items'] = [
    ...projectYears.map(year => ({
      key: `year-${year}`,
      label: `${year}年`,
      onClick: () => handleClearProjects(year)
    })),
    ...(projectYears.length > 0 ? [{
      type: 'divider' as const
    }] : []),
    {
      key: 'all-years',
      label: '所有年份',
      onClick: () => handleClearProjects()
    }
  ]

  return (
    <div>
      <div className="admin-block mb-16">
        <Space align="center" style={{ marginBottom: 8 }}>
          <Title level={5} style={{ margin: 0 }}>横幅公告</Title>
          <Tag color={formBanner.getFieldValue('visible') ? 'processing' : 'default'}>
            {formBanner.getFieldValue('visible') ? '显示中' : '未显示'}
          </Tag>
        </Space>
        <Form form={formBanner} layout="vertical" onFinish={saveBannerForm}>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="公告内容" />
          </Form.Item>
          <Space size={12} wrap>
            <Form.Item name="level" label="级别" rules={[{ required: true }]}>
              <Select style={{ width: 160 }} options={[{value:'info', label:'普通'},{value:'warning', label:'提醒'},{value:'urgent', label:'紧急'}]} />
            </Form.Item>
            <Form.Item name="scrollable" label="滚动显示" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item 
              name="scrollTime" 
              label="滚动时间（秒）" 
              rules={[{ required: true, message: '请输入滚动时间' }]}
            >
              <InputNumber 
                min={5} 
                max={60} 
                placeholder="15" 
                style={{ width: 120 }}
                addonAfter="秒"
              />
            </Form.Item>
            <Form.Item name="expiresAt" label="到期时间（可选）">
              <DatePicker 
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                placeholder="不设置则永久显示"
                style={{ width: 220 }} 
              />
            </Form.Item>
          </Space>
          <Space>
            <Button type="primary" onClick={()=>formBanner.submit()}>保存横幅</Button>
            <Button danger onClick={cancelBanner}>取消横幅</Button>
            <Button onClick={() => {
              formBanner.setFieldsValue({
                content: '这是一个测试横幅，支持滚动显示功能',
                level: 'info',
                scrollable: true,
                scrollTime: 15,
                expiresAt: null
              })
            }}>设置测试横幅</Button>
          </Space>
        </Form>
      </div>

      <div className="admin-block mb-16">
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>夏令时区间</Title>
        <Form form={formSeason} layout="inline" onFinish={saveSeasonForm}>
          <Form.Item name="summerStart" label="开始"><DatePicker /></Form.Item>
          <Form.Item name="summerEnd" label="结束"><DatePicker /></Form.Item>
          <Form.Item><Button type="primary" onClick={()=>formSeason.submit()}>保存</Button></Form.Item>
          <Form.Item><span style={{ color: '#000000' }}>默认 5/1 – 10/7；冬令时为其他日期。</span></Form.Item>
        </Form>
      </div>

      <div className="admin-block mb-16">
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>开学日期（第 1 周的周一对齐）</Title>
        <Form form={formSem} layout="inline" onFinish={saveSemesterForm}>
          <Form.Item name="start" label="开学日"><DatePicker /></Form.Item>
          <Form.Item><Button type="primary" onClick={()=>formSem.submit()}>保存</Button></Form.Item>
          <Form.Item><span style={{ color: '#000000' }}>用于计算学期周号（默认 16 周）。</span></Form.Item>
        </Form>
      </div>

      <div className="admin-block mb-16">
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>训练营标题</Title>
        <Form form={formProjectListTitle} layout="inline" onFinish={async (v) => {
          try {
            await updateProjectListTitle(v.title)
            setProjectListTitle(v.title)
            message.success('训练营标题已保存')
            await triggerScreenRefresh()
            message.success('大屏数据已更新')
          } catch (e: any) {
            message.error(e?.message || '保存失败')
          }
        }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入训练营标题' }]}>
            <Input placeholder="例如：第12期创意电子训练营项目展示" style={{ width: 300 }} />
          </Form.Item>
          <Form.Item><Button type="primary" onClick={()=>formProjectListTitle.submit()}>保存</Button></Form.Item>
          <Form.Item><span style={{ color: '#000000' }}>此标题将显示在大屏右侧训练营列表的顶部，居中显示。支持长标题，字体大小会自动调整以适应容器宽度。</span></Form.Item>
        </Form>
      </div>

      <div className="admin-block mb-16">
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>大屏显示设置</Title>
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <Text strong>显示模式：</Text>
              <Space style={{ marginLeft: 16 }}>
                <Button 
                  type={screenMode === 'adaptive' ? 'primary' : 'default'}
                  onClick={() => saveScreenMode('adaptive')}
                >
                  自适应模式
                </Button>
                <Button 
                  type={screenMode === 'fixed' ? 'primary' : 'default'}
                  onClick={() => saveScreenMode('fixed')}
                >
                  固定模式
                </Button>
              </Space>
            </div>
            
            {screenMode === 'fixed' && (
              <div>
                <Text strong>固定模式配置：</Text>
                <Form form={formScreenFixed} layout="inline" onFinish={saveScreenFixedConfig} style={{ marginTop: 8 }}>
                  <Form.Item name="width" label="宽度" rules={[{ required: true }]}>
                    <InputNumber min={800} max={3840} placeholder="800-3840" />
                  </Form.Item>
                  <Form.Item name="height" label="高度" rules={[{ required: true }]}>
                    <InputNumber min={600} max={2160} placeholder="600-2160" />
                  </Form.Item>
                  <Form.Item name="scale" label="缩放%" rules={[{ required: true }]}>
                    <InputNumber min={50} max={200} placeholder="50-200" />
                  </Form.Item>
                  <Form.Item>
                    <Button type="primary" onClick={() => formScreenFixed.submit()}>保存配置</Button>
                  </Form.Item>
                </Form>
                <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                  固定模式：大屏将按照指定尺寸显示，不会根据屏幕大小自动调整
                </div>
              </div>
            )}
            
            {screenMode === 'adaptive' && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                自适应模式：大屏将根据实际屏幕尺寸自动调整布局，确保在不同设备上都有良好的显示效果
              </div>
            )}
          </Space>
        </Card>
      </div>

      <div className="admin-block">
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>实验室容量设置</Title>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
          {labs.map(lab => (
            <div key={lab.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
              <span style={{ minWidth: 60, textAlign: 'right' }}>{lab.name}</span>
              <InputNumber 
                min={1} 
                value={lab.capacity} 
                onChange={(v)=>{
                  setLabs(prev=>prev.map(x=>x.id===lab.id?{...x, capacity:Number(v)}:x))
                }}
                style={{ width: 80 }}
              />
              <Button 
                size="small"
                onClick={async()=>{
                  try {
                    await updateLabCapacity(lab.id, lab.capacity)
                    message.success('已更新')
                  } catch (e:any) {
                    message.error(e?.message || '更新失败')
                  }
                }}
              >
                保存
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* 数据管理区域 */}
      <div>
        <Title level={4}>数据管理</Title>
        <Card>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>数据删除操作，请谨慎使用。所有删除操作都不可恢复！</Text>
            
             <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

               {/* 清空所有数据 */}
               <Button 
                 type="primary" 
                 danger 
                 icon={<DeleteOutlined />}
                 onClick={handleClearAllData}
                 style={{ minWidth: 140 }}
               >
                 清空所有数据
               </Button>

               {/* 删除课表数据 */}
               <Dropdown menu={{ items: timetableDeleteMenuItems }} trigger={['click']}>
                 <Button 
                   danger 
                   icon={<DeleteOutlined />}
                   style={{ minWidth: 140 }}
                 >
                   删除课表数据 <DownOutlined />
                 </Button>
               </Dropdown>

               {/* 删除项目数据 */}
               <Dropdown menu={{ items: projectsDeleteMenuItems }} trigger={['click']}>
                 <Button 
                   danger 
                   icon={<DeleteOutlined />}
                   style={{ minWidth: 140 }}
                 >
                   删除项目数据 <DownOutlined />
                 </Button>
               </Dropdown>

               {/* 删除所有班级 */}
               <Button 
                 danger 
                 icon={<DeleteOutlined />}
                 onClick={handleClearAllClasses}
                 style={{ minWidth: 140 }}
               >
                 删除所有班级
               </Button>

               {/* 删除所有视频 */}
               <Button 
                 danger 
                 icon={<DeleteOutlined />}
                 onClick={handleClearAllVideos}
                 style={{ minWidth: 140 }}
               >
                 删除所有视频
               </Button>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
               <Text type="secondary" style={{ fontSize: '12px' }}>
                 <strong>清空所有数据：</strong>删除所有课表数据、项目数据、横幅数据，但保留实验室配置和系统设置
               </Text>
               <Text type="secondary" style={{ fontSize: '12px' }}>
                 <strong>删除课表数据：</strong>可选择删除单个教室或所有教室的课表数据
               </Text>
               <Text type="secondary" style={{ fontSize: '12px' }}>
                 <strong>删除项目数据：</strong>可选择删除当前年份或所有年份的训练营项目数据
               </Text>
               <Text type="secondary" style={{ fontSize: '12px' }}>
                 <strong>删除所有班级：</strong>删除所有班级数据
               </Text>
               <Text type="secondary" style={{ fontSize: '12px' }}>
                 <strong>删除所有视频：</strong>删除所有项目的视频文件和数据库记录
               </Text>
             </div>
          </Space>
        </Card>
      </div>
    </div>
  )
}